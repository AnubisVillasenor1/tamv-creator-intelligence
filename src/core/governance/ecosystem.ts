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
  { name: 'Exagon · aprobación y evidencia', source: 'Creator Intelligence', state: 'Integrado', next: 'Aprobación humana, evidencia y controles locales; aceptación operativa completa sujeta a configuración y verificación.' },
  { name: 'Memoria consentida', source: 'Creator Intelligence', state: 'Integrado', next: 'Retención explícita y revocación; nunca conservar automáticamente.' },
  { name: 'Sello de entregable SHA-512', source: 'Creator Intelligence', state: 'Integrado', next: 'Integridad local de artefactos; firma oficial de release pendiente de aprobación externa.' },
  { name: 'GitHub · repositorio y ejecución de CI', source: 'GitHub', state: 'Conectado', next: 'Consulta real de solo lectura cuando está configurada.' },
  { name: 'Isabella · revisión y voz', source: 'Isabella / Horizon', state: 'Bloqueado', next: 'Integración y servicios por conectar; no usar datos privados ni afirmar disponibilidad.' },
  { name: 'Conciertos, DreamSpaces, grupos, canales y posts', source: 'TAMV Horizon', state: 'Pendiente', next: 'Contratos, permisos y datos no migrados; exportar datos desde el origen cuando corresponda.' },
  { name: 'Banco TAMV, subastas, regalos y referidos', source: 'TAMV Horizon', state: 'Pendiente', next: 'Libro transaccional y proveedor financiero no integrados; no mostrar saldos ni transacciones ficticias.' },
  { name: 'Puentes, recomendaciones y Quantum Pets', source: 'TAMV Horizon', state: 'Pendiente', next: 'Perfiles, relaciones y permisos no migrados; los briefs creativos no ejecutan operaciones externas.' },
  { name: 'TERMINUS, pasaportes y núcleo dual', source: 'Isabella Core Intelligence', state: 'Pendiente', next: 'Persistencia, identidad y límites de ejecución por adaptar al núcleo existente.' },
  { name: 'Música y audio avanzado', source: 'Creator Intelligence', state: 'Pendiente', next: 'Procesamiento y archivos reales pendientes de implementación y verificación.' },
] as const;