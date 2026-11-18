import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectPolicyCheck } from "@/components/project-policy-check";
import { changeProject } from "@/lib/project.functions";
import type { GovernedProject } from "@/lib/project-schema";
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/project.functions", () => ({ changeProject: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const project: GovernedProject = { id: "00000000-0000-4000-8000-000000000001", owner_id: "00000000-0000-4000-8000-000000000002", name: "Research", use_case: "Research assistance for public sources", config: {}, version: 3, approved_version: null, assessment: null, created_at: "2026-11-18", updated_at: "2026-11-18" };
describe("project policy declarations", () => {
  it("defaults to denial evidence and submits the expected project version without forged authority", async () => {
    vi.mocked(changeProject).mockResolvedValue(project);
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<ProjectPolicyCheck project={project} onChange={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar comprobación" }));
    await waitFor(() => expect(changeProject).toHaveBeenCalledWith({ data: { action: "evaluate", projectId: project.id, expectedVersion: 3, evidence: { consent: false, rightsCleared: false, containsSensitiveData: true, disclosure: false } } }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
  it("records explicit declarations without adding approval or certification", async () => {
    vi.mocked(changeProject).mockResolvedValue(project);
    render(<ProjectPolicyCheck project={project} onChange={async () => {}} />);
    screen.getAllByRole("checkbox").forEach(control => fireEvent.click(control));
    fireEvent.click(screen.getByRole("button", { name: "Registrar comprobación" }));
    await waitFor(() => expect(changeProject).toHaveBeenCalledWith({ data: { action: "evaluate", projectId: project.id, expectedVersion: 3, evidence: { consent: true, rightsCleared: true, containsSensitiveData: false, disclosure: true } } }));
  });
  it("does not refresh after a rejected version conflict", async () => {
    vi.mocked(changeProject).mockRejectedValue(new Error("Version conflict"));
    const refresh = vi.fn();
    render(<ProjectPolicyCheck project={project} onChange={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar comprobación" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(refresh).not.toHaveBeenCalled();
  });
});