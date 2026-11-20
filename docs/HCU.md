# TAMV Ω∞ HCU — instrumento, núcleo y API

Modelo exploratorio de transformación sistémica: hipergrafo dirigido de átomos cognitivos en seis dominios, con hiperaristas ponderadas y rezagadas, simulación anual determinista 2026–2050 (tres escenarios) y sensibilidad Monte Carlo con semilla fija.

**Límites.** Pesos, rezagos y parámetros de escenario son hipótesis del autor; no son predicción ni evidencia empírica. Los átomos `edu` y `trab` tienen puntuaciones provisionales. La raíz SHA3-512 y el registro encadenado detectan alteraciones locales; no son firma ni certificación, y el sello nunca lo emite el instrumento. Los DOI/ORCID solo se validan en formato y checksum, no contra el registro.

Código: `src/lib/hcu/`. Interfaz: `/hcu`. API: `/api/hcu/{graph,simulate,lint,spec}`. Manual de cierre: [MANUAL-CIERRE-100.md](MANUAL-CIERRE-100.md).
