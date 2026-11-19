import { describe, expect, it } from "vitest";
import { readBoundedResponseText } from "@/lib/bounded-response.server";

describe("readBoundedResponseText", () => {
  it("reads a valid UTF-8 response under the configured byte limit", async () => {
    const response = new Response(JSON.stringify({ answer: "hola" }), { headers: { "content-type": "application/json" } });
    await expect(readBoundedResponseText(response, 128)).resolves.toBe(JSON.stringify({ answer: "hola" }));
  });
  it("rejects a declared content length above the limit without reading the body", async () => {
    const response = new Response("too large", { headers: { "content-length": "9" } });
    await expect(readBoundedResponseText(response, 8)).resolves.toBeNull();
  });
  it("rejects streamed content that exceeds the limit", async () => {
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("1234")); controller.enqueue(new TextEncoder().encode("5678")); controller.close(); } }));
    await expect(readBoundedResponseText(response, 7)).resolves.toBeNull();
  });
  it("rejects invalid UTF-8", async () => {
    const response = new Response(new Uint8Array([0xc3, 0x28]));
    await expect(readBoundedResponseText(response, 8)).resolves.toBeNull();
  });
  it("rejects invalid maximums", async () => {
    const response = new Response("ok");
    await expect(readBoundedResponseText(response, -1)).resolves.toBeNull();
  });
});
