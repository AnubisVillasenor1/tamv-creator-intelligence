import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  new URL("../lib/project.functions.ts", import.meta.url),
  new URL("../lib/content.functions.ts", import.meta.url),
  new URL("../lib/governance.functions.ts", import.meta.url),
];

describe("TanStack server-function validator API", () => {
  it("does not use the deprecated inputValidator API", async () => {
    const sources = await Promise.all(sourceFiles.map((url) => readFile(url, "utf8")));
    for (const source of sources) {
      expect(source).not.toContain(".inputValidator(");
      expect(source).not.toContain(".inputValidator (");
    }
    expect(sources.some((source) => source.includes(".validator("))).toBe(true);
  });
});
