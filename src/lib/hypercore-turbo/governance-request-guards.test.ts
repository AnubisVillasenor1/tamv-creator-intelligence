import { describe, expect, it } from "vitest";
import {
  isBearerTokenWithinLimit,
  isDeclaredContentLengthWithinLimit,
  isJsonContentType,
  isValidSupabaseIdentityPayload,
  readBoundedRequestBody,
  readBoundedResponseText,
} from "./governance-request-guards";

function streamingRequest(url: string, init: RequestInit & { duplex: "half" }) {
  return new Request(url, init);
}

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

  it("validates identity-provider JSON shape and UUID before property access", () => {
    expect(isValidSupabaseIdentityPayload({ id: "550e8400-e29b-41d4-a716-446655440000" })).toBe(
      true,
    );
    expect(isValidSupabaseIdentityPayload(null)).toBe(false);
    expect(isValidSupabaseIdentityPayload([])).toBe(false);
    expect(isValidSupabaseIdentityPayload("null")).toBe(false);
    expect(isValidSupabaseIdentityPayload({ id: null })).toBe(false);
    expect(isValidSupabaseIdentityPayload({ id: "not-a-uuid" })).toBe(false);
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

  it("validates declared Content-Length syntax and limit without trusting it for actual size", () => {
    expect(isDeclaredContentLengthWithinLimit(null, 16)).toBe(true);
    expect(isDeclaredContentLengthWithinLimit("0", 16)).toBe(true);
    expect(isDeclaredContentLengthWithinLimit("16", 16)).toBe(true);
    expect(isDeclaredContentLengthWithinLimit("17", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit("-1", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit("1e2", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit(" 8", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit("", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit("9007199254740992", 16)).toBe(false);
    expect(isDeclaredContentLengthWithinLimit("1", 0)).toBe(false);
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
    const request = streamingRequest("https://example.test", {
      method: "POST",
      body,
      duplex: "half",
    });
    await expect(readBoundedRequestBody(request, 4)).resolves.toEqual({
      ok: true,
      text: "ábc",
    });
    const second = streamingRequest("https://example.test", {
      method: "POST",
      duplex: "half",
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
    const request = streamingRequest("https://example.test", {
      method: "POST",
      body,
      duplex: "half",
    });
    await expect(readBoundedRequestBody(request, 8)).resolves.toEqual({
      ok: false,
      reason: "unreadable",
    });
    await expect(readBoundedRequestBody(new Request("https://example.test"), 0)).resolves.toEqual({
      ok: false,
      reason: "unreadable",
    });
  });
});

describe("bounded remote response reader", () => {
  it("accepts a response at the exact byte limit", async () => {
    await expect(readBoundedResponseText(new Response("12345678"), 8)).resolves.toBe("12345678");
  });

  it("rejects an oversized response without parsing the full body", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(9));
        controller.close();
      },
    });
    await expect(readBoundedResponseText(new Response(body), 8)).rejects.toThrow(
      "Response body exceeds configured size limit",
    );
  });

  it("rejects invalid UTF-8 and invalid response limits", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
        controller.close();
      },
    });
    await expect(readBoundedResponseText(new Response(body), 8)).rejects.toThrow();
    await expect(readBoundedResponseText(new Response("x"), 0)).rejects.toThrow(
      "Invalid response size limit",
    );
  });
});
