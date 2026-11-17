import { TAMV_CANONICAL_ATTRIBUTION } from "@/lib/tamv-attribution";
import { TamvLogo } from "@/components/branding/TamvLogo";

export function TamvAttribution() {
  return (
    <footer
      aria-label="Atribución institucional TAMV"
      className="border-t border-border bg-background px-6 py-8"
      data-tamv-attribution="v1"
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
      </div>
    </footer>
  );
}
