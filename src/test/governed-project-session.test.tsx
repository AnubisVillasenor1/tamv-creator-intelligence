import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGovernedProjects } from "@/hooks/use-governed-projects";
import { useAuthSession } from "@/hooks/use-auth-session";
import { listProjects } from "@/lib/project.functions";
import type { GovernedProject } from "@/lib/project-schema";
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: vi.fn() }));
vi.mock("@/lib/project.functions", () => ({ listProjects: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("project session isolation", () => {
  it("ignores a previous user's in-flight response after sign out", async () => {
    let finish!: (rows: GovernedProject[]) => void;
    vi.mocked(listProjects).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.mocked(useAuthSession).mockReturnValue({ status: "authenticated", email: "a@example.com" });
    const hook = renderHook(useGovernedProjects);
    await waitFor(() => expect(listProjects).toHaveBeenCalledOnce());
    vi.mocked(useAuthSession).mockReturnValue({ status: "anonymous", email: null });
    hook.rerender();
    await act(async () => {
      finish([{ id: "private-project" } as GovernedProject]);
    });
    expect(hook.result.current.projects).toEqual([]);
    expect(hook.result.current.loading).toBe(false);
  });
  it("reloads for account switches even when authentication status is unchanged", async () => {
    vi.mocked(listProjects)
      .mockResolvedValueOnce([{ id: "a" } as GovernedProject])
      .mockResolvedValueOnce([{ id: "b" } as GovernedProject]);
    vi.mocked(useAuthSession).mockReturnValue({ status: "authenticated", email: "a@example.com" });
    const hook = renderHook(useGovernedProjects);
    await waitFor(() => expect(hook.result.current.projects[0]?.id).toBe("a"));
    vi.mocked(useAuthSession).mockReturnValue({ status: "authenticated", email: "b@example.com" });
    hook.rerender();
    expect(hook.result.current.projects).toEqual([]);
    await waitFor(() => expect(hook.result.current.projects[0]?.id).toBe("b"));
  });
});
