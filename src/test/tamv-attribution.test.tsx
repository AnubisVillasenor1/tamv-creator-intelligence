import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TamvAttribution,
  TAMV_ATTRIBUTION_SHA256,
} from "@/components/branding/TamvAttribution";
import { TAMV_CANONICAL_ATTRIBUTION } from "@/lib/tamv-attribution";

function mockStatus(certified: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ certified, status: certified ? "certified" : "release-not-approved" })),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("institutional attribution in the DOM", () => {
  it("renders the exact text, the public pin and an honest uncertified state, and restores a removed node", async () => {
    mockStatus(false);
    render(<TamvAttribution />);

    expect(screen.getByText(TAMV_CANONICAL_ATTRIBUTION)).toBeInTheDocument();
    const footer = screen.getByRole("contentinfo", { name: "Atribución institucional TAMV" });
    expect(footer).toHaveAttribute("data-tamv-attribution-sha256", TAMV_ATTRIBUTION_SHA256);
    expect(await screen.findByText(/Distribución no certificada/)).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-tamv-certification", "uncertified");
    expect(screen.queryByText(/Distribución verificada/)).not.toBeInTheDocument();

    footer.remove();
    await waitFor(() => {
      expect(
        screen.getByRole("contentinfo", { name: "Atribución institucional TAMV" }),
      ).toBeInTheDocument();
    });
  });

  it("only shows a verified badge when the status endpoint confirms certification", async () => {
    mockStatus(true);
    render(<TamvAttribution />);

    expect(await screen.findByText(/Distribución verificada/)).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-tamv-certification", "certified");
  });
});
