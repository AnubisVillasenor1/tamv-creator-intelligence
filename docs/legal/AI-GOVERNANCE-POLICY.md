# Política de Gobernanza de Inteligencia Artificial TAMV

**Versión:** 1.0.0 · **Estado:** propuesta interna; aprobación formal de responsables y asesoría jurídica pendiente.

## 1. Propósito y límites
Establece controles para diseño, compra, integración, evaluación, despliegue, operación y retirada de IA. Se inspira en UNESCO, el AI Act europeo, NIST AI RMF, OCDE y WEF. La referencia a estas entidades no implica afiliación, respaldo, certificación ni cumplimiento demostrado.

La IA es una capacidad asistiva. Las decisiones legales, médicas, financieras, laborales, educativas de alto impacto o de seguridad permanecen bajo responsabilidad de personas autorizadas. No se atribuye al sistema conciencia, autoridad jurídica ni soberanía decisoria.

## 2. Principios obligatorios
1. Legalidad, derechos humanos, dignidad, no discriminación y accesibilidad.
2. Finalidad legítima y proporcionalidad; evaluar alternativas menos intrusivas.
3. Supervisión humana significativa, reversión y responsabilidad definida.
4. Transparencia sobre interacción con IA y contenido sintético cuando proceda.
5. Privacidad desde el diseño, minimización, retención y acceso restringido.
6. Seguridad, robustez, pruebas adversariales y comportamiento seguro ante fallos.
7. Trazabilidad de modelo, proveedor, versión, configuración y aprobaciones, evitando registros excesivos.
8. Respeto a copyright, derechos conexos, voz, imagen, marcas y licencias.
9. Equidad, accesibilidad, diversidad lingüística y revisión de impactos desiguales.
10. Consideración de impactos ambientales, culturales y territoriales.
11. Prohibición de falsificar métricas, fuentes, firmas, certificaciones o resultados.
12. Mecanismos de queja, impugnación, corrección y reparación proporcional.

## 3. Inventario y clasificación de riesgo
Cada sistema debe tener identificador, propietario, finalidad, usuarios afectados, modelo/proveedor, versión, datos, retención, impacto de error, amenazas, controles, riesgo residual, supervisión, fallback, rollback y evidencia.

Escala interna:
- **R0:** función determinista sin inferencia de IA.
- **R1:** asistencia creativa de bajo impacto y salida revisable.
- **R2:** impacto significativo en acceso, reputación, ingresos, oportunidades o derechos; requiere evaluación y revisión humana.
- **R3:** alto impacto o contexto regulado, incluidos derechos, seguridad, empleo, educación, servicios esenciales, menores o biometría; requiere evaluación formal, asesoría jurídica y aprobación antes de pruebas con usuarios.
- **No permitido:** uso ilegal, contrario a derechos o contratos, o prohibido por la ley aplicable.

Esta escala interna no sustituye la clasificación legal del AI Act ni la de otras jurisdicciones.

## 4. Puerta de aprobación
No habilitar en producción hasta documentar: finalidad legítima y alternativas; impactos en derechos, privacidad y seguridad; permisos y licencias; pruebas de calidad, robustez, sesgo y abuso; avisos y limitaciones; supervisión, quejas y rollback; modelo y procedencia; límites de consumo y observabilidad; aprobación de producto, seguridad, privacidad y asesoría jurídica cuando aplique.

## 5. Contenido creativo
- Exigir confirmación de derechos sobre materiales aportados cuando corresponda.
- No prometer que una salida es única, no infractora o jurídicamente despejada sin evidencia suficiente.
- No habilitar clonación o suplantación de voz/imagen sin base legal y autorización válidas.
- No reutilizar contenido o prompts para entrenamiento secundario sin evaluar base jurídica, transparencia y consentimiento cuando sea exigible.
- Registrar procedencia proporcionalmente, sin almacenar el contenido completo por defecto cuando basten metadatos.
- Mantener proceso de reclamación, revisión y restricción proporcionada.
- Diferenciar contenido generado, editado, recomendado y verificado.

## 6. Evaluación y monitorización
Definir pruebas y umbrales para calidad, robustez ante prompt injection, fuga de datos, sesgo, protección de menores, latencia, disponibilidad, coste, abuso, trazabilidad y rollback. Registrar limitaciones y fallos. Un hash o test unitario no equivale a evaluación de impacto ni auditoría independiente.

## 7. Incidentes y cambios
Pausar o restringir una función ante riesgo grave creíble, uso ilícito, fuga de datos, vulneración de derechos o fallo de control. Preservar evidencia segura, limitar acceso, escalar y cumplir notificaciones aplicables. Cambios de modelo, proveedor, finalidad, datos, permisos, arquitectura o mercado activan revisión proporcional.

## 8. Responsabilidades
Las funciones siguientes deben designarse formalmente; no se consideran nombramientos ya realizados:
- Producto: necesidad, alcance, usuarios y aceptación.
- Ingeniería: diseño, pruebas, integridad, disponibilidad y reversión.
- Seguridad: amenazas, vulnerabilidades e incidentes.
- Privacidad: inventario, bases jurídicas, retención y transferencias.
- Derechos/licencias: titularidad, permisos, avisos y reclamaciones.
- Asesoría jurídica: aplicabilidad por país, contratos y obligaciones.
- Revisor humano autorizado: decisiones de impacto y apelaciones.
- Dirección: aceptación del riesgo residual dentro de su autoridad.

No permitir que una única persona apruebe sin revisión independiente un sistema de alto impacto que diseñó y evaluó.

## 9. Evidencia por release
Inventario IA, evaluación de riesgo, SBOM cuando corresponda, modelo/proveedor/versión, pruebas, aprobaciones, cambios, incidentes, retención, licencias, avisos y estado de controles. Cada evidencia debe tener fecha, responsable y versión.

## 10. Referencias
- UNESCO: https://www.unesco.org/en/legal-affairs/recommendation-ethics-artificial-intelligence
- EU AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- OECD AI Principles: https://oecd.ai/en/ai-principles
- WEF AI Governance Alliance: https://initiatives.weforum.org/ai-governance-alliance/home
