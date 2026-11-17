import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { readBoundedRequestBody } from "@/lib/hypercore-turbo/governance-request-guards";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
async function handle(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 8192)
    return Response.json({ error: "Authentication required" }, { status: 401, headers });
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key)
    return Response.json({ error: "Project service unavailable" }, { status: 503, headers });
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: identity, error: authError } = await client.auth.getUser(token);
  if (authError || !identity.user)
    return Response.json({ error: "Invalid session" }, { status: 401, headers });
  try {
    if (request.method === "GET") {
      const projectId = new URL(request.url).searchParams.get("projectId");
      if (projectId) {
        z.string().uuid().parse(projectId);
        const { data, error } = await client
          .from("tamv_project_audit")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return Response.json({ schema: "tamv.project.audit.v1", events: data }, { headers });
      }
      const { data, error } = await client
        .from("tamv_ai_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Response.json({ projects: data }, { headers });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
      return Response.json({ error: "JSON required" }, { status: 415, headers });
    const body = await readBoundedRequestBody(request, 24 * 1024);
    if (!body.ok)
      return Response.json({ error: "Invalid or oversized body" }, { status: 413, headers });
    const { applyProjectAction } = await import("@/lib/project-service.server");
    return Response.json(
      { project: await applyProjectAction(client, JSON.parse(body.text)), executionStarted: false },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid request"
            : error instanceof Error && error.message.includes("configuración cambió")
              ? "Version conflict"
              : "Project operation failed",
      },
      { status: error instanceof z.ZodError ? 400 : 409, headers },
    );
  }
}
export const Route = createFileRoute("/api/public/tamv/projects")({
  server: {
    handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) },
  },
});
