import { useEffect, useRef, useState } from "react";
import { TAMV_CANONICAL_ATTRIBUTION } from "@/lib/tamv-attribution";
import { TamvLogo } from "@/components/branding/TamvLogo";

/**
 * Public pin of the canonical attribution text. It is a hash, not a secret:
 * anyone can recompute it, but changing the text changes this value and breaks
 * the signed manifest.
 */
export const TAMV_ATTRIBUTION_SHA256 =
  "sha256:ae0ef2a55f14c869da77581f9e68f457d5ec73028d6146b516e6b873f46891c6";

type CertificationState = "checking" | "certified" | "uncertified" | "unavailable";

export function TamvAttribution() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [certification, setCertification] = useState<CertificationState>("checking");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/tamv/status", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("status unavailable");
        return response.json() as Promise<{ certified?: unknown }>;
      })
      .then((payload) => {
        if (active) setCertification(payload.certified === true ? "certified" : "uncertified");
      })
      .catch(() => {
        if (active) setCertification("unavailable");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const footer = footerRef.current;
    if (!host || !footer || typeof MutationObserver === "undefined") return;
    // Keep the institutional attribution in the DOM even if a script or browser
    // extension removes the node. This is visible preservation, not proof of
    // non-repudiation: a client can still alter or hide rendered content.
    const observer = new MutationObserver(() => {
      if (!footer.isConnected) host.appendChild(footer);
    });
    observer.observe(host, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef}>
      <footer
        ref={footerRef}
        aria-label="Atribución institucional TAMV"
        className="border-t border-border bg-background px-6 py-8"
        data-tamv-attribution="v1"
        data-tamv-attribution-sha256={TAMV_ATTRIBUTION_SHA256}
        data-tamv-certification={certification}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
          <TamvLogo
            className="h-14 w-14 rounded-lg border border-border bg-card object-contain"
            size={56}
          />
          <p className="text-sm leading-6 text-muted-foreground">{TAMV_CANONICAL_ATTRIBUTION}</p>
          <p className="text-xs tracking-wide text-muted-foreground">
            TAMV ONLINE NETWORK · Creator Intelligence — gobernanza agnóstica de sector y proveedor
          </p>
          <p className="text-xs text-muted-foreground" data-tamv-attribution-status>
            {certification === "certified"
              ? "Distribución verificada: hashes, firma y aprobación comprobados."
              : certification === "checking"
                ? "Comprobando el estado de la distribución…"
                : "Distribución no certificada: la atribución permanece, pero no se afirma verificación."}
          </p>
        </div>
      </footer>
    </div>
  );
}
