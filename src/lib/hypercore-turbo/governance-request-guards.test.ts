import { describe, expect, it } from "vitest";
import {
  isBearerTokenWithinLimit,
  isJsonContentType,
} from "./governance-request-guards";

describe("governance API request boundary guards", () => {
  it("accepts application/json with optional parameters", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true);
  });

  it("rejects media types that merely contain application/json", () => {
    expect(isJsonContentType("application/jsonp")).toBe(false);
    expect(isJsonContentType("text/application/json")).toBe(false);
    expect(isJsonContentType("application/json-malicious")).toBe(false);
    expect(isJsonContentType(null)).toBe(false);
  });

  it("accepts non-empty bearer tokens up to the configured boundary", () => {
    expect(isBearerTokenWithinLimit("valid-token")).toBe(true);
    expect(isBearerTokenWithinLimit("x".repeat(8192))).toBe(true);
  });

  it("rejects missing, empty and oversized bearer tokens", () => {
    expect(isBearerTokenWithinLimit(undefined)).toBe(false);
    expect(isBearerTokenWithinLimit("")).toBe(false);
    expect(isBearerTokenWithinLimit("x".repeat(8193))).toBe(false);
  });
});
