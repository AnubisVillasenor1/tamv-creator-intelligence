import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorReview } from "@/components/creator-review";
import { reviewContent } from "@/lib/content.functions";
import { listProjects, saveReviewToProject } from "@/lib/project.functions";
import type { GovernedProject } from "@/lib/project-schema";

vi.mock("@/lib/content.functions", () => ({ reviewContent: vi.fn() }));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-session" } },
        error: null,
      })),
    },
  },
}));

vi.mock("@/lib/project.functions", () => ({
  listProjects: vi.fn(),
  saveReviewToProject: vi.fn(),
}));

type ReviewResult = Awaited<ReturnType<typeof reviewContent>>;

const response = {
  ok: true as const,
  review: {
    diagnosis: "La propuesta puede aclarar su objetivo.",
    improvements: [
      { title: "Invitación", reason: "Explica el objetivo.", action: "Incluye una invitación." },
    ],
    revised: "Te invitamos a un taller original de composición.",
    safety: "Mantén el control creativo.",
  },
  audit: {
    hash: "a".repeat(64),
    runId: "00000000-0000-4000-8000-000000000001",
    model: "openai/gpt-6-astra",
    timestamp: "2026-11-13T12:00:00.000Z",
    governance: { policyVersion: "test-policy", decision: "POLICY_ALLOWED" as const },
    skills: [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-content-review",
      "tamv-audience-research",
      "tamv-quality-gate",
    ],
    skillEvidence: "resolved-contracts" as const,
  },
} satisfies Extract<ReviewResult, { ok: true }>;

const project = {
  id: "00000000-0000-4000-8000-000000000010",
  owner_id: "00000000-0000-4000-8000-000000000020",
  name: "Mi proyecto de taller",
  use_case: "Un caso de uso lo suficientemente largo para ser válido.",
  config: { requireConsent: true, requireHumanApproval: true, requireDisclosure: true },
  version: 3,
  approved_version: 2,
  assessment: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
} satisfies GovernedProject;

const draft = "Un taller original para aprender a componer música.";

async function submitSuccessfulReview() {
  vi.mocked(reviewContent).mockResolvedValue(response);
  render(<CreatorReview onComplete={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Contenido"), { target: { value: draft } });
  fireEvent.change(screen.getByLabelText("Tu audiencia"), {
    target: { value: "Músicos principiantes" },
  });
  fireEvent.change(screen.getByLabelText("¿Qué quieres lograr?"), {
    target: { value: "Invitar a mi comunidad al taller" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  const form = screen.getByRole("button", { name: /Proponer mejoras/ }).closest("form");
  if (!form) throw new Error("Review form missing");
  fireEvent.submit(form);
  await screen.findByText("Modelo: openai/gpt-6-astra");
}

async function loadProject() {
  fireEvent.click(screen.getByRole("button", { name: "Cargar mis proyectos" }));
  await screen.findByLabelText("Proyecto");
  fireEvent.change(screen.getByLabelText("Proyecto"), { target: { value: project.id } });
}

function grantSaveConsent() {
  fireEvent.click(screen.getByRole("checkbox", { name: /Autorizo guardar el registro/ }));
}

beforeEach(() => {
  vi.mocked(reviewContent).mockReset();
  vi.mocked(listProjects).mockReset().mockResolvedValue([project]);
  vi.mocked(saveReviewToProject).mockReset().mockResolvedValue({
    ok: true,
    projectId: project.id,
    runId: response.audit.runId,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("opt-in review persistence", () => {
  it("offers saving only after a result is available", () => {
    render(<CreatorReview onComplete={vi.fn()} />);
    expect(screen.queryByTestId("review-save-panel")).not.toBeInTheDocument();
  });

  it("does not call the persistence server function just because a review succeeded", async () => {
    await submitSuccessfulReview();
    expect(reviewContent).toHaveBeenCalledTimes(1);
    expect(saveReviewToProject).not.toHaveBeenCalled();
    expect(screen.getByTestId("review-save-panel")).toBeInTheDocument();
    expect(
      screen.getByText(/al enviar una revisión no se guarda nada/),
    ).toBeInTheDocument();
  });

  it("requires a separate consent before saving", async () => {
    await submitSuccessfulReview();
    await loadProject();
    fireEvent.click(screen.getByRole("button", { name: "Guardar en mi proyecto" }));
    expect(saveReviewToProject).not.toHaveBeenCalled();
    grantSaveConsent();
    fireEvent.click(screen.getByRole("button", { name: "Guardar en mi proyecto" }));
    await waitFor(() => expect(saveReviewToProject).toHaveBeenCalledTimes(1));
  });

  it("stores metadata and the proposal by default, without the private draft", async () => {
    await submitSuccessfulReview();
    await loadProject();
    grantSaveConsent();
    fireEvent.click(screen.getByRole("button", { name: "Guardar en mi proyecto" }));
    await waitFor(() => expect(saveReviewToProject).toHaveBeenCalledTimes(1));
    const input = vi.mocked(saveReviewToProject).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    const data = input.data;
    expect(data).toMatchObject({
      projectId: project.id,
      expectedVersion: project.version,
      saveConsent: true,
      includeDraft: false,
      review: response.review,
    });
    expect(data).not.toHaveProperty("draft");
    expect(data["audit"]).toMatchObject({
      runId: response.audit.runId,
      hash: response.audit.hash,
      skills: response.audit.skills,
    });
    expect(JSON.stringify(data)).not.toContain("test-session");
  });

  it("stores the draft only with its own explicit opt-in", async () => {
    await submitSuccessfulReview();
    await loadProject();
    grantSaveConsent();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Incluir también el texto de mi borrador/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar en mi proyecto" }));
    await waitFor(() => expect(saveReviewToProject).toHaveBeenCalledTimes(1));
    const input = vi.mocked(saveReviewToProject).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(input.data).toMatchObject({ includeDraft: true, draft });
  });

  it("keeps the draft and proposal intact when saving fails", async () => {
    vi.mocked(saveReviewToProject).mockRejectedValueOnce(new Error("Version conflict"));
    await submitSuccessfulReview();
    await loadProject();
    grantSaveConsent();
    fireEvent.click(screen.getByRole("button", { name: "Guardar en mi proyecto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu borrador y la propuesta siguen intactos");
    expect(screen.getByLabelText("Contenido")).toHaveValue(draft);
    expect(reviewContent).toHaveBeenCalledTimes(1);
    expect(saveReviewToProject).toHaveBeenCalledTimes(1);
  });
});
