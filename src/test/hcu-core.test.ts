import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { build, ledgerAppend, ledgerVerify, mc, orcid, isni, seedState, sha3, simulate, atomHashes, rootOf, doi } from "../lib/hcu/hcu-core.mjs";

describe("HCU core", () => {
  it("SHA3-512 propio coincide con node:crypto en los límites de bloque", () => {
    for (const s of ["", "abc", "a".repeat(71), "a".repeat(72), "a".repeat(73), "Ω∞ átomo ñ", "x".repeat(500)]) {
      expect(sha3(s)).toBe(createHash("sha3-512").update(s).digest("hex"));
    }
  });
  it("valida checksum ORCID/ISNI y rechaza dígito alterado", () => {
    expect(orcid("0000-0002-1825-0097")).toBe(true);
    expect(orcid("0000-0002-1825-0098")).toBe(false);
    expect(orcid("0009-0008-5050-1539")).toBe(true);
    expect(isni("0000 0005 3169 9229")).toBe(true);
    expect(doi("10.5281/zenodo.19436662")).toBe(true);
    expect(doi("no-es-doi")).toBe(false);
  });
  it("la simulación es determinista y respeta cuarentena", () => {
    const S = seedState(), M = build(S);
    const a = simulate(M, S.shocks, [], "B"), b = simulate(M, S.shocks, [], "B");
    expect(Array.from(a.a[10] ?? [])).toEqual(Array.from(b.a[10] ?? []));
    const q = simulate(M, S.shocks, ["ia"], "B");
    const j = M.idx["cib"] as number;
    const free = Math.abs((a.a[12] as Float64Array)[j] as number), held = Math.abs((q.a[12] as Float64Array)[j] as number);
    expect(held).toBeLessThanOrEqual(free);
    for (const row of a.a) for (const v of row) expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });
  it("Monte Carlo es reproducible con la misma semilla", () => {
    const S = seedState(), M = build(S);
    const x = mc(M, S.shocks, [], "B", 20, 7), y = mc(M, S.shocks, [], "B", 20, 7);
    expect(Array.from(x.md[8] ?? [])).toEqual(Array.from(y.md[8] ?? []));
  });
  it("el registro encadenado detecta edición de un campo", () => {
    const L: unknown[] = [];
    ledgerAppend(L, { name: "t" }, "a", {}); ledgerAppend(L, { name: "t" }, "b", {}); ledgerAppend(L, { name: "t" }, "c", {});
    expect((ledgerVerify(L) as { ok: boolean }).ok).toBe(true);
    (L[1] as { act: string }).act = "manipulado";
    expect((ledgerVerify(L) as { ok: boolean }).ok).toBe(false);
  });
  it("la raíz de integridad cambia si cambia un átomo", () => {
    const S = seedState(), r1 = rootOf(atomHashes(S, build(S)));
    (S.atoms[0] as { ev: number }).ev -= 1;
    expect(rootOf(atomHashes(S, build(S)))).not.toBe(r1);
  });
});
