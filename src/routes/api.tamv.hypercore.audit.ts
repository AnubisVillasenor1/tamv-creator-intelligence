import { createFileRoute } from "@tanstack/react-router";
import { getTamvCertification } from "../lib/tamv-certification";
import { GOVERN_CORE_POLICY, validateGovernCorePolicy } from "../lib/hypercore-turbo/policy";
import { runTurboParallel } from "../lib/hypercore-turbo/parallel-runner";

export const Route = createFileRoute("/api/tamv/hypercore/audit")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = performance.now();
        const tasks = await runTurboParallel<unknown>([
          {
            id: "govern-core",
            critical: true,
            run: async () => validateGovernCorePolicy(),
          },
          {
            id: "integrity-core",
            critical: true,
            run: async () => getTamvCertification(),
          },
          {
            id: "velocity-core",
            critical: true,
            run: async () => {
              const probe = await runTurboParallel<boolean>([
                { id: "probe-a", run: async () => true },
                { id: "probe-b", run: async () => true },
                { id: "probe-c", run: async () => true },
              ], { maxConcurrency: 3, timeoutMs: 1500, failFast: true });
              return {
                passed: probe.length === 3 && probe.every((item) => item.status === "fulfilled" && item.value === true),
                completed: probe.filter((item) => item.status === "fulfilled").length,
                total: probe.length,
              };
            },
          },
        ], { maxConcurrency: 3, timeoutMs: 10000, failFast: false });

        const govern = tasks.find((item) => item.id === "govern-core");
        const integrity = tasks.find((item) => item.id === "integrity-core");
        const velocity = tasks.find((item) => item.id === "velocity-core");
        const governResult = govern?.value as ReturnType<typeof validateGovernCorePolicy> | undefined;
        const integrityResult = integrity?.value as Awaited<ReturnType<typeof getTamvCertification>> | undefined;
        const velocityResult = velocity?.value as { passed: boolean; completed: number; total: number } | undefined;

        // SLSA verification is intentionally NOT inferred from a manifest signature.
        // Until a trusted build attestation is wired into release/runtime, it remains unverified.
        const provenance = {
          status: "not-integrated" as const,
          verified: false,
          reason: "No se ha conectado un verificador SLSA de release confiable al runtime.",
        };
        const checks = {
          governCore: govern?.status === "fulfilled" && governResult?.valid === true,
          integrityCore: integrity?.status === "fulfilled" && integrityResult?.certified === true,
          velocityCore: velocity?.status === "fulfilled" && velocityResult?.passed === true,
          provenance: provenance.verified,
        };
        const certified = Object.values(checks).every(Boolean);

        return Response.json({
          product: "PLAY & GO",
          issuer: "TAMV ONLINE NETWORK",
          hypercore: "TAMV HyperCore Turbo",
          status: certified ? "certified" : "blocked",
          certified,
          certifiedFeaturesEnabled: certified,
          checkedAt: new Date().toISOString(),
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          policy: {
            id: GOVERN_CORE_POLICY.schema,
            version: GOVERN_CORE_POLICY.version,
            framework: GOVERN_CORE_POLICY.framework,
            validationErrors: governResult?.errors ?? ["Govern Core check did not complete"],
          },
          cores: {
            governCore: { status: checks.governCore ? "passed" : "failed", checks: governResult ?? null },
            integrityCore: {
              status: checks.integrityCore ? "passed" : "failed",
              certification: integrityResult ?? null,
            },
            velocityCore: { status: checks.velocityCore ? "passed" : "failed", probe: velocityResult ?? null },
          },
          provenance,
          checks,
          attribution: "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.",
          note: "Velocity Core ejecuta un probe de concurrencia en esta ruta; esto no representa una prueba de carga ni demuestra un despliegue BullMQ.",
        }, {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
        });
      },
    },
  },
});