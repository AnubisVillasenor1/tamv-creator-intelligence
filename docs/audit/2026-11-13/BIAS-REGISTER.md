# Registro de sesgos

Un sesgo no es una mentira: es una inclinación que hace que cierta evidencia
parezca suficiente. Este registro incluye los sesgos del proyecto **y los del
auditor**.

## Del proyecto

| ID | Sesgo | Cómo se manifiesta | Antídoto aplicado |
|---|---|---|---|
| B-01 | **Automatización complaciente** | Un cuaderno de IA firma un «Reporte de auditoría» y se archiva como reconocimiento. | Se reclasifica como T1; solo T3/T4 cuenta como independiente. |
| B-02 | **Confirmación** | El corpus reúne blogs, PDFs y repositorios que repiten la misma tesis; la coherencia se lee como validación. | Se distingue coherencia narrativa de corroboración externa. |
| B-03 | **Volumen como prueba** | Horas, número de repositorios, PDFs y DOI se presentan como magnitud de logro. | Ningún artefacto se convierte en horas ni en calidad. |
| B-04 | **Autoridad prestada** | Títulos («arquitecto», «CEO fundador», «documento maestro») sustituyen método y evidencia. | El claim se evalúa por su cadena, no por el cargo. |
| B-05 | **Circularidad de fuentes** | GitHub, blogs, ORCID y portafolio son todos controlados por el autor. | Se marcan como autopublicados; no cuentan como independientes. |
| B-06 | **Sustitución de métrica** | «37 skills» se convierte en «37 capacidades operativas»; «23 DOI» en «23 obras validadas». | Se separan inventario, contrato y ejecutor. |
| B-07 | **Expansión de alcance** | Del curso de música se pasa a metaverso, ciudad inteligente, turismo, DRM y IA federada. | El MVP se define por una capacidad ejecutable, no por el mapa completo. |
| B-08 | **Optimismo de hoja de ruta** | El futuro se redacta en presente («opera como siete federaciones»). | Se añade el estado `declared` y la escalera M0–M5. |
| B-09 | **Inflación lingüística** | «Soberanía», «civilizatorio», «cero riesgo», «cuántico-emocional». | Se traducen a propiedades verificables o se marcan como metáfora. |
| B-10 | **Legitimidad académica como único fin** | Se busca que una institución «valide» sin haber producido evidencia evaluable. | Se construye un kit de evaluación reproducible, no una narrativa de presión. |
| B-11 | **Atribución heroica** | Todo el ecosistema se atribuye a una sola persona, aunque el corpus mencione colaboradores y herramientas. | El ledger registra autoría declarada y separa herramientas de coautoría. |
| B-12 | **Dependencia de plataforma** | La soberanía se declara sobre GitHub, Vercel, Supabase y Lovable. | Se documenta como dependencia operativa, no como soberanía plena. |

## Del auditor

| ID | Sesgo | Riesgo | Control |
|---|---|---|---|
| A-01 | **Negatividad adversarial** | Castigar ambición legítima por falta de evidencia. | Se reconoce lo que sí resistió: hashes, fail-closed, honestidad del README. |
| A-02 | **Falsa equivalencia** | Tratar un blog y un paper revisado como equivalentes. | Tiers explícitos T0–T4 y techos por claim. |
| A-03 | **Ceguera al contexto** | Ignorar recursos, idioma y condiciones de producción latinoamericanas. | Se evalúa ejecución, no acceso a infraestructura de élite. |
| A-04 | **Automatización del juicio** | Confiar en el CLI como si fuera un auditor independiente. | El CLI verifica consistencia; la Interpretación queda firmada por un humano. |
| A-05 | **Sesgo de simetría** | Exigir a un proyecto individual el mismo aparato que a una institución. | Las compuertas se gradúan por riesgo y etapa. |
| A-06 | **Autoridad del propio informe** | Este documento podría leerse como certificación. | Se declara límite: no es dictamen legal, académico ni de seguridad formal. |

## Regla de decisión

Ante duda entre dos estados, se elige **el más débil**. Un claim no sube de nivel
porque el autor insista, porque un modelo lo elogie o porque el documento sea
extenso. Sube cuando aparece un artefacto que un tercero puede recomputar.
