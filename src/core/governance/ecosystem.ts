export const horizonActions = [
  { id: 'challenge_idea', label: 'Retos creativos', goal: 'Proponer un reto creativo colaborativo a partir de mis datos.' },
  { id: 'collaboration', label: 'Puentes Oníricos', goal: 'Preparar una propuesta de colaboración; no enviar invitaciones.' },
  { id: 'concert_help', label: 'Conciertos Sensoriales', goal: 'Preparar el brief de un concierto sensorial; no publicar ni vender entradas.' },
  { id: 'dreamspace_idea', label: 'DreamSpaces', goal: 'Proponer el concepto original de un DreamSpace; no afirmar que existe una escena XR.' },
  { id: 'auction_guide', label: 'Subastas', goal: 'Revisar una propuesta de subasta, sin acuñar NFT ni efectuar transacciones.' },
  { id: 'pet_advice', label: 'Quantum Pets', goal: 'Proponer un concepto de mascota digital original.' },
] as const;

export const ecosystemCapabilities = [
  { name: 'Isabella · ética y riesgo UAGP-1', source: 'Isabella Core Intelligence', state: 'Pendiente', next: 'Evaluación explicable; no sustituye aprobación humana.' },
  { name: 'Exagon · aprobación y BOOKPI', source: 'Creator Intelligence', state: 'Integrado', next: 'Cuenta verificada para aceptación completa.' },
  { name: 'Memoria consentida', source: 'Creator Intelligence', state: 'Integrado', next: 'Retención explícita y revocación; nunca conservar automáticamente.' },
  { name: 'Sello de entregable SHA-512', source: 'Creator Intelligence', state: 'Integrado', next: 'Integridad local; firma oficial de release pendiente.' },
  { name: 'GitHub · repositorio y ejecución de CI', source: 'GitHub', state: 'Conectado', next: 'Consulta real de solo lectura.' },
  { name: 'Isabella · revisión y voz', source: 'Isabella / Horizon', state: 'Bloqueado', next: 'Firma oficial y cuenta verificada; servicio de voz por conectar.' },
  { name: 'Conciertos, DreamSpaces, grupos, canales y posts', source: 'TAMV Horizon', state: 'Pendiente', next: 'Migrar contratos, permisos y datos; exportar CSV desde el chat de origen.' },
  { name: 'Banco TAMV, subastas, regalos y referidos', source: 'TAMV Horizon', state: 'Pendiente', next: 'Migrar libro transaccional y verificar proveedor financiero; no mostrar saldos ficticios.' },
  { name: 'Puentes, recomendaciones y Quantum Pets', source: 'TAMV Horizon', state: 'Pendiente', next: 'Migrar perfiles, relaciones y permisos; los briefs creativos no ejecutan estas operaciones.' },
  { name: 'TERMINUS, pasaportes y núcleo dual', source: 'Isabella Core Intelligence', state: 'Pendiente', next: 'Adaptar persistencia, identidad y límites de ejecución al núcleo existente.' },
  { name: 'Música y audio avanzado', source: 'Creator Intelligence', state: 'Pendiente', next: 'Implementar procesamiento, archivos reales y aceptación certificada.' },
] as const;