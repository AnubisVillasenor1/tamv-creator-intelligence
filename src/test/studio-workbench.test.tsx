import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioWorkbench } from "@/components/studio-workbench";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  callStudioEndpoint,
  StudioApiError,
  type AgentOrchestrationResult,
  type AudioRenderResult,
} from "@/lib/studio-client";

vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: vi.fn() }));

vi.mock("@/lib/studio-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studio-client")>();
  return {
    ...actual,
    callStudioEndpoint: vi.fn(),
    getStudioAccessToken: vi.fn(async () => "test-token"),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const audioResult: AudioRenderResult = {
  schema: "tamv.audiocore.advanced.response.v1",
  job: {
    jobId: "job-studio-1",
    status: "succeeded",
    artifact: {
      key: "artifact-1",
      sha256: "c".repeat(64),
      bytes: 705644,
      contentType: "audio/wav",
      sampleRate: 44100,
      durationSeconds: 8,
      provider: "tamv-local-procedural-synth",
      createdAt: "2026-11-17T00:00:00.000Z",
    },
    analysis: {
      status: "computed",
      truePeakDb: -1.2,
      integratedLufs: -18.5,
      chroma: [0.1, 0.2],
      notes: [],
    },
  },
  audio: { contentType: "audio/wav", encoding: "base64", data: btoa("RIFFfake-wav") },
  disclosure: {
    provider: "tamv-local-procedural-synth",
    kind: "sintesis procedural determinista local",
    neuralModel: false,
    voice: false,
    dsp: "ITU-R BS.1770-4",
    actorRef: "actor-test",
    quota: { source: "upstash", remainingToday: 29 },
  },
};

const agentResult: AgentOrchestrationResult = {
  schema: "tamv.agent.orchestration.response.v1",
  result: {
    schema: "tamv.agent.result.v1",
    status: "succeeded",
    steps: [
      {
        stepId: "digest-1",
        tool: "digest.sha256",
        status: "succeeded",
        output: { sha256: `sha256:${"d".repeat(64)}` },
      },
      {
        stepId: "audio-1",
        tool: "audio.render",
        status: "succeeded",
        output: { jobId: "job-2", artifact: { sha256: "e".repeat(64), bytes: 441044 } },
      },
    ],
    disclosure: {
      kind: "orquestacion local determinista",
      llm: false,
      externalEffects: false,
      tools: ["audio.render", "digest.sha256"],
    },
  },
  disclosure: {
    kind: "orquestacion local determinista",
    llm: false,
    externalEffects: false,
    tools: ["audio.render", "digest.sha256"],
    actorRef: "actor-test",
    quota: { source: "upstash", remainingToday: 59 },
  },
};

function fillAudioForm() {
  fireEvent.change(screen.getByLabelText("Prompt"), {
    target: { value: "Un pad ambiental en Do mayor" },
  });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Pad de prueba" } });
  fireEvent.change(screen.getByLabelText("ID de atestación de derechos"), {
    target: { value: "rights-studio-0001" },
  });
  fireEvent.click(screen.getByLabelText("Consentimiento de render de audio"));
}

function audioSubmitButton() {
  return screen.getByRole("button", { name: /Renderizar WAV/ });
}

beforeEach(() => {
  vi.mocked(useAuthSession).mockReturnValue({
    status: "authenticated",
    email: "creator@example.com",
  });
  vi.mocked(callStudioEndpoint).mockReset();
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("Studio workbench access and consent", () => {
  it("shows the private-studio state for anonymous sessions", () => {
    vi.mocked(useAuthSession).mockReturnValue({ status: "anonymous", email: null });
    render(<StudioWorkbench />);
    expect(screen.getByRole("heading", { name: "Estudio privado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Renderizar WAV/ })).not.toBeInTheDocument();
  });

  it("keeps rendering disabled until explicit consent is granted", () => {
    render(<StudioWorkbench />);
    expect(audioSubmitButton()).toBeDisabled();
    fillAudioForm();
    expect(audioSubmitButton()).toBeEnabled();
  });

  it("validates the prompt locally without calling the endpoint", async () => {
    render(<StudioWorkbench />);
    fireEvent.click(screen.getByLabelText("Consentimiento de render de audio"));
    fireEvent.click(audioSubmitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("prompt");
    expect(callStudioEndpoint).not.toHaveBeenCalled();
  });
});

describe("Studio audio render feedback", () => {
  it("renders the real artifact, analysis and disclosure after a successful call", async () => {
    vi.mocked(callStudioEndpoint).mockResolvedValue(audioResult);
    render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());

    expect(await screen.findByRole("heading", { name: "Render completado" })).toBeInTheDocument();
    expect(callStudioEndpoint).toHaveBeenCalledTimes(1);
    const [path, payload] = vi.mocked(callStudioEndpoint).mock.calls[0] as unknown as [
      string,
      { schema: string; consent: { granted: boolean } },
    ];
    expect(path).toBe("/api/audiocore/advanced");
    expect(payload.schema).toBe("tamv.audio.request.v1");
    expect(payload.consent.granted).toBe(true);
    expect(screen.getByText("c".repeat(64))).toBeInTheDocument();
    expect(screen.getByText(/tamv-local-procedural-synth/)).toBeInTheDocument();
    expect(screen.getByText(/Modelo neuronal: no/)).toBeInTheDocument();
    expect(screen.getByText(/Cuota restante hoy: 29/)).toBeInTheDocument();
    expect(await screen.findByLabelText("Reproducir WAV renderizado")).toBeInTheDocument();
    expect(screen.getByText(/-18\.50 LUFS/)).toBeInTheDocument();
  });

  it("reports a 429 with Retry-After and never retries automatically", async () => {
    vi.mocked(callStudioEndpoint).mockRejectedValue(
      new StudioApiError(429, "TAMV_QUOTA_EXCEEDED", "quota exhausted", 30),
    );
    render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Espera 30 segundos");
    expect(screen.getByRole("alert")).toHaveTextContent("no se reintentará automáticamente");
    expect(callStudioEndpoint).toHaveBeenCalledTimes(1);
  });

  it("reports an uncertified distribution as fail closed", async () => {
    vi.mocked(callStudioEndpoint).mockRejectedValue(
      new StudioApiError(403, "TAMV_ATTRIBUTION_INTEGRITY_FAILED", "not certified", null),
    );
    render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("no está certificada");
  });

  it("reports instance concurrency honestly on 503 busy", async () => {
    vi.mocked(callStudioEndpoint).mockRejectedValue(
      new StudioApiError(503, "TAMV_AUDIOCORE_BUSY", "busy", null),
    );
    render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("concurrentes");
  });

  it("offers sign-in again when the session token is rejected with 401", async () => {
    vi.mocked(callStudioEndpoint).mockRejectedValue(
      new StudioApiError(401, null, "Authentication failed", null),
    );
    render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("sesión válida");
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});

describe("studio consent and request lifecycle", () => {
  it("rejects programmatic submission without consent", () => {
    const { container } = render(<StudioWorkbench />);
    fireEvent.submit(container.querySelectorAll("form")[0]!);
    fireEvent.submit(container.querySelectorAll("form")[1]!);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(callStudioEndpoint).not.toHaveBeenCalled();
  });
  it("requires audio consent when an agent plan includes audio", () => {
    const { container } = render(<StudioWorkbench />);
    fireEvent.click(screen.getByLabelText("Consentimiento del plan de agente"));
    fireEvent.submit(container.querySelectorAll("form")[1]!);
    expect(screen.getByRole("alert")).toHaveTextContent("consentimiento de audio");
    expect(callStudioEndpoint).not.toHaveBeenCalled();
  });
  it("blocks duplicate submits and ignores an aborted response after account switch", async () => {
    let finish!: (value: AudioRenderResult) => void;
    vi.mocked(callStudioEndpoint).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve as typeof finish;
        }),
    );
    const view = render(<StudioWorkbench />);
    fillAudioForm();
    const form = view.container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(callStudioEndpoint).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(callStudioEndpoint).mock.calls[0]![3]!;
    vi.mocked(useAuthSession).mockReturnValue({
      status: "authenticated",
      email: "other@example.com",
    });
    view.rerender(<StudioWorkbench />);
    expect(signal.aborted).toBe(true);
    await act(async () => finish(audioResult));
    expect(screen.queryByText("Render completado")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue("");
  });
  it("revokes playback URLs and removes private results on sign-out", async () => {
    vi.mocked(callStudioEndpoint).mockResolvedValue(audioResult);
    const view = render(<StudioWorkbench />);
    fillAudioForm();
    fireEvent.click(audioSubmitButton());
    await screen.findByLabelText("Reproducir WAV renderizado");
    vi.mocked(useAuthSession).mockReturnValue({ status: "anonymous", email: null });
    view.rerender(<StudioWorkbench />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(screen.queryByLabelText("Reproducir WAV renderizado")).not.toBeInTheDocument();
  });
});

describe("Studio agent plan feedback", () => {
  function fillPlan() {
    fireEvent.change(screen.getByLabelText("Texto para digest SHA-256"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByLabelText("Consentimiento del plan de agente"));
  }

  it("executes the plan and shows step outputs with the no-LLM disclosure", async () => {
    vi.mocked(callStudioEndpoint).mockResolvedValue(agentResult);
    render(<StudioWorkbench />);
    fillAudioForm();
    fillPlan();
    fireEvent.click(screen.getByRole("button", { name: /Ejecutar plan local/ }));

    expect(await screen.findByRole("heading", { name: "Plan completado" })).toBeInTheDocument();
    const [path, payload] = vi.mocked(callStudioEndpoint).mock.calls[0] as unknown as [
      string,
      { schema: string; steps: { tool: string }[] },
    ];
    expect(path).toBe("/api/agent");
    expect(payload.schema).toBe("tamv.agent.plan.v1");
    expect(payload.steps.map((s) => s.tool)).toEqual(["digest.sha256", "audio.render"]);
    expect(screen.getByText(`sha256:${"d".repeat(64)}`)).toBeInTheDocument();
    expect(screen.getByText(/e{64}/)).toBeInTheDocument();
    expect(screen.getByText(/LLM: no/)).toBeInTheDocument();
    expect(screen.getByText(/Efectos externos: no/)).toBeInTheDocument();
  });

  it("surfaces a mid-run certification revocation without claiming success", async () => {
    vi.mocked(callStudioEndpoint).mockRejectedValue(
      new StudioApiError(502, "TAMV_AGENT_EFFECT_DENIED", "denied", null),
    );
    render(<StudioWorkbench />);
    fillAudioForm();
    fillPlan();
    fireEvent.click(screen.getByRole("button", { name: /Ejecutar plan local/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("revocada");
    expect(screen.queryByRole("heading", { name: "Plan completado" })).not.toBeInTheDocument();
  });
});
