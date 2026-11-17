import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { projectSchema, projectActionSchema } from "./project-schema";
import { evaluateGovernance } from "../../sdk/index.mjs";
export async function applyProjectAction(client: SupabaseClient<Database>, input: unknown) {
  const data = projectActionSchema.parse(input);
  let payload: Record<string, unknown>;
  if (data.action === "create") payload = { name: data.name, useCase: data.useCase };
  else if (data.action === "configure") payload = { config: data.config };
  else if (data.action === "approve") payload = { reason: data.reason };
  else {
    const { data: row, error } = await client
      .from("tamv_ai_projects")
      .select("*")
      .eq("id", data.projectId)
      .single();
    if (error || !row) throw new Error("Proyecto no disponible.");
    const project = projectSchema.parse(row);
    const { getTamvCertification } = await import("./tamv-certification");
    const certification = await getTamvCertification();
    const decision = evaluateGovernance({
      ...data.evidence,
      humanApproved: project.approved_version === project.version,
      certified: certification.certified,
    });
    // This endpoint audits supplied evidence, but never runs AI or external side effects.
    payload = {
      decision,
      evidence: data.evidence,
      evidenceSource: "project-owner-declaration",
      executionStarted: false,
    };
  }
  const { data: result, error } = await client.rpc("tamv_project_action", {
    p_action: data.action,
    p_payload: JSON.parse(JSON.stringify(payload)),
    ...(data.action === "create"
      ? {}
      : { p_project_id: data.projectId, p_expected_version: data.expectedVersion }),
  });
  if (error)
    throw new Error(
      error.message.includes("Version conflict")
        ? "La configuración cambió. Actualiza el proyecto."
        : "No se pudo registrar la operación.",
    );
  return projectSchema.parse(result);
}
