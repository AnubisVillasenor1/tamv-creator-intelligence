import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceGuide } from "@/components/workspace-guide";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("workspace tutorial", () => {
  it("completes six steps, persists, resumes and restarts without executing capabilities", () => {
    const first = render(<WorkspaceGuide />);
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
    for (let i = 0; i < 5; i++)
      fireEvent.click(screen.getByRole("button", { name: /Entendido, continuar/ }));
    expect(screen.getByRole("link", { name: /Abrir auditoría/ })).toHaveAttribute("href", "/audit");
    fireEvent.click(screen.getByRole("button", { name: /Finalizar recorrido/ }));
    expect(screen.getByRole("heading", { name: "Tu recorrido está completo." })).toHaveFocus();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "6");
    first.unmount();
    render(<WorkspaceGuide />);
    expect(
      screen.getByRole("heading", { name: "Tu recorrido está completo." }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reiniciar recorrido/ }));
    expect(
      screen.getByRole("heading", { name: "Tu creatividad, con dirección" }),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tamv.guide.v1")!)).toEqual({
      index: 0,
      completed: false,
    });
  });
  it("supports direct step navigation and back with real links", () => {
    render(<WorkspaceGuide />);
    fireEvent.click(screen.getByRole("button", { name: /Paso 4 Conecta/ }));
    expect(screen.getByRole("link", { name: /Explorar integraciones/ })).toHaveAttribute(
      "href",
      "/integrations",
    );
    fireEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(screen.getByRole("link", { name: /Abrir el estudio/ })).toHaveAttribute(
      "href",
      "/studio",
    );
  });
  it.each(['{"index":99}', '{"index":-1}', '{"index":"2"}', "null"])(
    "ignores invalid saved state %s",
    (saved) => {
      localStorage.setItem("tamv.guide.v1", saved);
      render(<WorkspaceGuide />);
      expect(
        screen.getByRole("heading", { name: "Tu creatividad, con dirección" }),
      ).toBeInTheDocument();
    },
  );
  it("remains usable when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<WorkspaceGuide />);
    fireEvent.click(screen.getByRole("button", { name: /Entendido, continuar/ }));
    expect(screen.getByRole("heading", { name: "Dale un lugar a cada idea" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("no permite guardar");
  });
});
