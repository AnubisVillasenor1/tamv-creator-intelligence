import { TAMV_CANONICAL_ATTRIBUTION } from "@/lib/tamv-attribution";

export function TamvAttribution() {
  return (
    <footer
      aria-label="Atribución institucional TAMV"
      className="border-t border-border bg-background px-6 py-8"
      data-tamv-attribution="v1"
    >
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-sm leading-6 text-muted-foreground">{TAMV_CANONICAL_ATTRIBUTION}</p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          PLAY &amp; GO — Creator Operating System™
        </p>
      </div>
    </footer>
  );
}
