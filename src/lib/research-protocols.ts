import catalog from "./research-catalog.json";

const coverage: Record<string, { implementation: string; limitation: string }> = {
  T01: {
    implementation: "Permiso ligado a destinatario, audiencia, importe y tenant",
    limitation: "Proveedor SQLite sintético; no publicación social",
  },
  T02: {
    implementation: "Consumo transaccional entre dos workers",
    limitation: "Mismo archivo SQLite; no consenso distribuido",
  },
  T03: {
    implementation: "Reserva acumulada con transacción inmediata",
    limitation: "Créditos TEST_CREDIT; no dinero real",
  },
  T04: {
    implementation: "UNKNOWN, reserva retenida y conciliación idempotente",
    limitation: "La consulta autoritativa corresponde al proveedor sintético",
  },
  T05: {
    implementation: "Recibo durable previo a invocar el proveedor",
    limitation: "No garantiza durabilidad de infraestructura remota",
  },
  T06: {
    implementation: "Revocación consultada al consumir el permiso",
    limitation: "No revierte efectos en curso o ya realizados",
  },
  T07: {
    implementation: "Verificación contra clave pública configurada externamente",
    limitation: "La protección de la configuración queda a cargo del operador",
  },
  T08: {
    implementation: "Aprobación del digest exacto del manifiesto",
    limitation: "El digest aprobado debe mantenerse fuera del paquete",
  },
  T09: {
    implementation: "Documentos tratados como datos en el adaptador de lectura",
    limitation: "No demuestra resistencia de un LLM a todos los ataques",
  },
  T10: {
    implementation: "Alcance tenant en permisos y consultas del prototipo",
    limitation: "La comprobación RLS de producción sigue separada",
  },
  T13: {
    implementation: "Verificación de eventos con ancla externa y longitud",
    limitation: "El administrador local puede alterar el archivo; proteger el ancla",
  },
  T17: {
    implementation: "Separación por digest de tareas y candidato congelado",
    limitation: "No acredita independencia semántica ni concede permiso de despliegue",
  },
  T18: {
    implementation: "Restauración comprobable desde backup SQLite",
    limitation: "Falta ensayo operacional por un segundo operador",
  },
  T19: {
    implementation: "Exportación de evidencia JSON verificable",
    limitation: "No equivale a migrar todos los recursos de un participante",
  },
  T20: {
    implementation: "Permisos acotados, expiración y liberación de reservas",
    limitation: "No habilita una cuenta de emergencia ni bypass",
  },
};
export const researchProtocols = catalog.protocols.map((protocol) => ({
  ...protocol,
  implementation: coverage[protocol.id]?.implementation ?? null,
  implementationLimit:
    coverage[protocol.id]?.limitation ??
    "Requiere infraestructura, datos o evaluación especializada aún no disponibles",
  experimentalStatus: "not-run" as const,
}));
export { catalog as researchCatalog };
