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

describe("bounded request body reader", () => {
  it("accepts a body at the exact byte limit", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: "12345678",
    });
    await expect(readBoundedRequestBody(request, 8)).resolves.toEqual({
      ok: true,
      text: "12345678",
    });
  });

  it("rejects a body larger than the byte limit", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: "123456789",
    });
    await expect(readBoundedRequestBody(request, 8)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("handles fragmented streams and counts UTF-8 bytes rather than characters", async () => {
    const encoder = new TextEncoder();
    const parts = [encoder.encode("á"), encoder.encode("bc")];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of parts) controller.enqueue(part);
        controller.close();
      },
    });
    const request = new Request("https://example.test", { method: "POST", body });
    await expect(readBoundedRequestBody(request, 4)).resolves.toEqual({
      ok: true,
      text: "ábc",
    });
    const second = new Request("https://example.test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("á"));
          controller.enqueue(encoder.encode("bc"));
          controller.close();
        },
      }),
    });
    await expect(readBoundedRequestBody(second, 3)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("rejects invalid UTF-8 and invalid limits safely", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
        controller.close();
      },
    });
    const request = new Request("https://example.test", { method: "POST", body });
    await expect(readBoundedRequestBody(request, 8)).resolves.toEqual({
      ok: false,
      reason: "unreadable",
    });
    await expect(readBoundedRequestBody(new Request("https://example.test"), 0))
      .resolves.toEqual({ ok: false, reason: "unreadable" });
  });
});
