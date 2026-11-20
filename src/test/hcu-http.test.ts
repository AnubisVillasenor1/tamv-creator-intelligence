import { describe, expect, it } from "vitest";
import { readJsonBody } from "../lib/hcu/http";
import { HCU_LIMITS } from "../lib/hcu/hcu-service";

const req = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://x.test/api/hcu/simulate", { method: "POST", headers, body });

describe("HCU HTTP", () => {
  it("acepta JSON válido", async () => {
    const r = await readJsonBody(req('{"scenario":"A"}'));
    expect(r.ok).toBe(true);
  });
  it("rechaza tipo de contenido incorrecto con 415", async () => {
    const r = await readJsonBody(req("{}", { "content-type": "text/plain" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(415);
  });
  it("rechaza cuerpo excesivo con 413 aunque no declare longitud", async () => {
    const r = await readJsonBody(req(JSON.stringify({ pad: "a".repeat(HCU_LIMITS.maxBodyBytes + 10) })));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });
  it("rechaza JSON inválido con 400 y cabeceras no-store", async () => {
    const r = await readJsonBody(req("{no"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      expect(r.response.headers.get("cache-control")).toContain("no-store");
    }
  });
});
