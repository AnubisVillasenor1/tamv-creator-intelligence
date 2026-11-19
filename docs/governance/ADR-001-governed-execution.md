# ADR-001: Separación de capacidad, autoridad, ejecución y evidencia

- Estado: Proposed
- Fecha: 2026-11-15
- Autor de la propuesta: Edwin Oswaldo Castillo Trejo
- Identidad profesional: Anubis Villaseñor
- Implementación: parcial; sellado de paquete incluido
- Aprobaciones: pendientes; registrar fuera de este documento

## Contexto

Un skill, un prompt o una clave pueden proponer, conocer o firmar.
Ninguno de esos hechos, por sí solo, autoriza efectos en producción.

Se requiere separar:

CAPABILITY != AUTHORITY != EXECUTION != EVIDENCE != LEARNING != PRODUCTION

## Decisión

1. El verificador de integridad valida inventario, hashes y firma.
2. El registro de identidad resuelve identidad y revocación.
3. El Policy Decision Point evalúa acción, recurso, entorno y política.
4. El Execution Gateway consume un permiso de uso único.
5. El servicio de reservas evita duplicación financiera.
6. BOOKPI registra evidencia; no aprueba por sí mismo.
7. Los adaptadores ejecutan efectos externos.
8. El aprendizaje no modifica políticas automáticamente.

## Reglas

- Denegación por defecto ante datos ausentes o ambiguos.
- REVIEW no equivale a ALLOW.
- Un permiso es breve, delimitado, de un solo uso y con vencimiento.
- Un timeout externo es UNKNOWN, no un fallo que permita reintento ciego.
- Un hash no anonimiza un dato personal.
- Un archivo local con hashes no es almacenamiento WORM.
- La firma no certifica ausencia de vulnerabilidades ni legalidad.

## Criterios de aceptación

- Alteración, adición o eliminación de archivos firmados: rechazo.
- Clave sustituida: rechazo.
- Release anterior al esperado: rechazo.
- Permiso vencido o para otro entorno: rechazo.
- Reutilización concurrente de nonce: como máximo un consumo.
- Reservas concurrentes: no exceder presupuesto.
- Evidencia no disponible: impedir efecto crítico.
- Timeout externo: UNKNOWN y conciliación.
- Cambio de propuesta: invalidar aprobaciones.
- Revocación vigente: impedir nueva ejecución.
- Ninguna prueba de CI requiere la clave privada de release.
