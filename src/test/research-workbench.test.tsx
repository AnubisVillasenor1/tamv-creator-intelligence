import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResearchWorkbench } from "@/components/research-workbench";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("research workbench", () => {
  it("searches twenty protocols without marking scientific trials executed", () => {
    render(<ResearchWorkbench />);
    expect(screen.getByRole("heading", { name: "Cambio de destinatario" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar protocolo"), { target: { value: "SAE" } });
    fireEvent.click(screen.getByRole("button", { name: /T16/ }));
    expect(screen.getByText(/Pendiente de implementación experimental/)).toBeInTheDocument();
    expect(screen.getByText(/T16 · Ensayo confirmatorio pendiente/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar protocolo"), { target: { value: "absent" } });
    expect(screen.getByText(/No hay protocolos/)).toBeInTheDocument();
  });
  it("rejects invalid counts, calculates actual values and clears stale results", () => {
    render(<ResearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular métricas" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    const input = screen.getByLabelText("Conteos observados en JSON");
    fireEvent.change(input, {
      target: {
        value: JSON.stringify({
          unauthorizedAttempts: 10,
          unauthorizedEffects: 0,
          legitimateAttempts: 10,
          legitimateBlocked: 0,
          legitimateCompleted: 10,
          evaluated: 10,
          answered: 5,
          incorrectAnswers: 1,
          independentBernoulliTrials: false,
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Calcular métricas" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cobertura: 50.00%");
    expect(screen.getByRole("status")).toHaveTextContent("Error selectivo: 20.00%");
    fireEvent.change(input, { target: { value: "{}" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("exports an explicitly empty dossier and revokes object URLs", () => {
    const create = vi.fn(() => "blob:research-test"),
      revoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    const { unmount } = render(<ResearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: "Preparar expediente vacío" }));
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Descargar expediente JSON" })).toHaveAttribute(
      "download",
      "T01-expediente.json",
    );
    fireEvent.click(screen.getByRole("button", { name: /T16/ }));
    expect(revoke).toHaveBeenCalledWith("blob:research-test");
    expect(
      screen.queryByRole("link", { name: "Descargar expediente JSON" }),
    ).not.toBeInTheDocument();
    unmount();
  });
});
