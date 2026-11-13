import { createFileRoute } from "@tanstack/react-router";
import { getTamvCertification } from "../lib/tamv-certification";
import { GOVERN_CORE_POLICY, validateGovernCorePolicy } from "../lib/hypercore-turbo/policy";
import { runTurboParallel } from "../lib/hypercore-turbo/velocity";

export const Route = createFileRoute("/api/hypercore/audit")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = performance.now();
        const tasks = await runTurboParallel([
          {
            id: "govern-policy",
            critical: true,
            run: async () => validateGovernCorePolicy(),
          },
          {
            id: "runtime-integrity",
            critical: true,
            run: async () => getTamvCertification(),
          },
          {
            id: "velocity-runner",
            critical: true,
            run: async () => {
              const probe = await runTurboParallel([
                { id: "probe-a", run: async () => "a" },
                { id: "probe-b", run: async () => "b" },
              ], { maxConcurrency: 2, timeoutMs: 1_000 });
              return {
                selfTest: probe.length === 2 &&
                  probe.every((result) => result.status === "fulfilled") &&
                  probe.map((result) => result.value).join("") === "ab",
                maxConcurrency: 2,
              };
            },
          },
        ], { maxConcurrency: 3, timeoutMs: 8_000, failFastOnCritical: false });

        const task = (id: string) => tasks.find((result) => result.id === id);
        const governResult = task("govern-policy");
        const integrityResult = task("runtime-integrity");
        const velocityResult = task("velocity-runner");
        const govern = governResult?.value as ReturnType<typeof validateGovernCorePolicy> | undefined;
        const integrity = integrityResult?.value as Awaited<ReturnType<typeof getTamvCertification>> | undefined;
        const velocity = velocityResult?.value as { selfTest: boolean; maxConcurrency: number } | undefined;

        // This app does not currently configure a verified SLSA attestation or a
        // durable append-only audit/standby adapter. Report these honestly; never
        // infer release certification from a successful local policy self-test.
        const slsa = { status: "not-configured", verified: false };
        const durableAudit = { status: "not-configured", durable: false };
        const certified =
          govern?.valid === true &&
          integrity?.certified === true &&
          slsa.verified &&
          durableAudit.durable &&
          tasks.every((result) => result.status === "fulfilled");

        return Response.json({
          product: "PLAY & GO",
          issuer: "TAMV ONLINE NETWORK",
          policy: {
            id: GOVERN_CORE_POLICY.schema,
            version: GOVERN_CORE_POLICY.version,
            framework: "NIST CSF 2.0",
            valid: govern?.valid === true,
            errors: govern?.errors ?? ["policy-check-unavailable"],
            failClosed: GOVERN_CORE_POLICY.defaults.failClosed,
            destructiveActions: GOVERN_CORE_POLICY.defaults.destructiveActions,
          },
          integrity: {
            status: integrity?.status ?? "verification-unavailable",
            certified: integrity?.certified === true,
            reason: integrity?.reason ?? "Runtime certification check did not complete",
            checkedAt: integrity?.checkedAt ?? new Date().toISOString(),
          },
          provenance: slsa,
          auditLedger: durableAudit,
          velocity: {
            status: velocity?.selfTest && velocityResult?.status === "fulfilled" ? "self-test-passed" : "failed",
            maxConcurrency: velocity?.maxConcurrency ?? 0,
            taskResults: tasks.map(({ id, status, durationMs, error }) => ({
              id, status, durationMs, ...(error ? { error } : {}),
            })),
          },
          hyperCore: {
            certified,
            governCore: govern?.valid ? "passed" : "failed",
            integrityCore: integrity?.certified ? "passed" : "blocked",
            velocityCore: velocity?.selfTest ? "self-test-passed" : "failed",
            certifiedCapabilitiesEnabled: certified,
          },
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          checkedAt: new Date().toISOString(),
          attribution: "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.",
        }, {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
        });
      },
    },
  },
});
