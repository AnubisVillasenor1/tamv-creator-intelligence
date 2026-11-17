import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

import { useAuthSession } from "@/hooks/use-auth-session";

type ChangeHandler = (event: string, session: { user?: { email?: string } } | null) => void;

let handler: ChangeHandler | undefined;

beforeEach(() => {
  handler = undefined;
  mocks.getSession.mockReset();
  mocks.onAuthStateChange.mockReset();
  mocks.unsubscribe.mockReset();
  mocks.onAuthStateChange.mockImplementation((callback: ChangeHandler) => {
    handler = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});

afterEach(() => {
  cleanup();
});

describe("useAuthSession", () => {
  it("reports the email of an existing session", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { email: "creator@example.com" } } },
      error: null,
    });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.email).toBe("creator@example.com");
  });

  it("degrades to anonymous when the hosted configuration is unavailable", async () => {
    mocks.getSession.mockRejectedValue(new Error("Missing Supabase environment variable(s)"));

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.email).toBeNull();
  });

  it("follows sign-in and sign-out events", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    act(() => handler?.("SIGNED_IN", { user: { email: "creator@example.com" } }));
    expect(result.current.status).toBe("authenticated");
    expect(result.current.email).toBe("creator@example.com");

    act(() => handler?.("SIGNED_OUT", null));
    expect(result.current.status).toBe("anonymous");
  });

  it("does not resurrect an old session when bootstrap resolves after sign-out", async () => {
    let finish!: (value: unknown) => void;
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(useAuthSession);
    act(() => handler?.("SIGNED_OUT", null));
    await act(async () => {
      finish({ data: { session: { user: { email: "previous@example.com" } } }, error: null });
    });
    expect(result.current.status).toBe("anonymous");
  });

  it("unsubscribes when the component unmounts", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { unmount } = renderHook(() => useAuthSession());
    await waitFor(() => expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1));

    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
