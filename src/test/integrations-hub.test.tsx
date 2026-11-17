import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationsHub } from "@/components/integrations-hub";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("integrations catalog", () => {
  it("filters providers and offers recovery from empty results", () => {
    render(<IntegrationsHub />);
    const catalog = within(screen.getByRole("region", { name: "Catálogo de integraciones" }));
    expect(catalog.getAllByRole("button")).toHaveLength(10);
    fireEvent.change(screen.getByLabelText("Categoría de integración"), {
      target: { value: "Mensajería" },
    });
    expect(catalog.getAllByRole("button")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Buscar integración"), {
      target: { value: "not-a-channel" },
    });
    expect(catalog.getByRole("status")).toHaveTextContent("No encontramos");
    fireEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
    expect(catalog.getAllByRole("button")).toHaveLength(10);
  });
  it("shows provider-specific callbacks without claiming an active connection", () => {
    render(<IntegrationsHub />);
    fireEvent.click(screen.getByRole("button", { name: /Instagram/ }));
    expect(screen.getByLabelText("URL del receptor")).toHaveValue(
      `${window.location.origin}/api/webhooks/instagram`,
    );
    expect(screen.getByText("TAMV_INSTAGRAM_APP_SECRET")).toBeInTheDocument();
    expect(screen.getByText("TAMV_INSTAGRAM_VERIFY_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("Requiere configuración de operador")).toBeInTheDocument();
    expect(screen.getByText(/no significa que tu cuenta esté conectada/)).toBeInTheDocument();
  });
  it("keeps Longe unavailable without inventing a callback contract", () => {
    render(<IntegrationsHub />);
    fireEvent.click(screen.getByRole("button", { name: /Longe.ai/ }));
    expect(screen.getByText("Integración no disponible")).toBeInTheDocument();
    expect(screen.getByText(/Su ruta devuelve 501/)).toBeInTheDocument();
    expect(screen.queryByLabelText("URL del receptor")).not.toBeInTheDocument();
  });
  it("copies only the callback and explains clipboard failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<IntegrationsHub />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar callback/ }));
    expect(await screen.findByText("URL copiada. No contiene credenciales.")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/api/webhooks/github`);
    writeText.mockRejectedValueOnce(new Error("blocked"));
    fireEvent.click(screen.getByRole("button", { name: /Copiar callback/ }));
    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument();
  });
});
