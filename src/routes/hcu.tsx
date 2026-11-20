import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hcu")({
  head: () => ({
    meta: [
      { title: "TAMV Ω∞ HCU — Instrumento de transformación sistémica" },
      { name: "description", content: "Hipergrafo dirigido de átomos cognitivos con simulación determinista 2026–2050. Modelo exploratorio con hipótesis declaradas; no certifica nada." },
    ],
  }),
  component: HcuPage,
});

function HcuPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 p-3 sm:p-4">
      <p className="text-sm text-muted-foreground" role="note">
        Instrumento exploratorio: los pesos, rezagos y escenarios son hipótesis del autor. El estado de integridad es local al navegador y no constituye firma ni certificación. Interfaz programática: <code>/api/hcu/graph</code>, <code>/api/hcu/simulate</code>, <code>/api/hcu/lint</code>, <code>/api/hcu/spec</code>.
      </p>
      <iframe
        title="TAMV Ω∞ HCU"
        src="/hcu/index.html"
        className="h-[calc(100vh-7rem)] min-h-[640px] w-full rounded-md border border-border bg-background"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </main>
  );
}
