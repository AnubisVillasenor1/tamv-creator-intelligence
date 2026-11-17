# TAMV Online / PLAY & GO — posicionamiento y copy

Este documento fija el mensaje público aprobado a partir de `paquetefinal.md`.
No declara que todas las secciones estén implementadas: separa el copy de la
arquitectura de producto y evita pruebas sociales, cifras o promesas inventadas.

## 1. Posicionamiento

**TAMV Online** es la infraestructura educativa y tecnológica.

**PLAY & GO** es el sistema operativo para creadores musicales.

Tagline principal:

> Aprende. Crea. Analiza. Publica.

Variante de producto:

> La primera plataforma donde la formación musical, la inteligencia artificial y
> el análisis profesional conviven en un único entorno.

Regla editorial: «primera» solo puede usarse si se puede sostener con una fuente
verificable. Si no, usar «un entorno que reúne…». En este repositorio no se
declara una posición de mercado.

## 2. Arquitectura de marca

```text
TAMV ONLINE
└── PLAY & GO
    ├── Academy        formación
    ├── Studio         creación
    ├── AI Lab         experimentación
    ├── AudioCore      generación y DSP
    ├── Creator Hub    comunidad y proyectos
    ├── Analytics      métricas del creador
    └── TAMV Research  investigación
```

## 3. Copy del Hero

### Versión recomendada

**Eyebrow:** SISTEMA OPERATIVO PARA CREADORES MUSICALES

**Título:** PLAY & GO

**Subtítulo:** Aprende. Crea. Analiza. Publica.

**Descripción:** Formación musical, inteligencia artificial y análisis de audio
en un solo espacio, con control humano y consentimiento explícito.

**CTA principal:** Revisar un borrador

**CTA secundario:** Explorar skills

### Variante emocional

> Tu música no necesita más ruido. Necesita un lugar donde aprender, crear y
> escuchar con criterio.

### Variante técnica

> Contratos de creación, análisis DSP honesto y gobernanza verificable para
> estudiar, producir y publicar música.

## 4. Pilares de navegación

| Pilar | Promesa | Límite explícito |
|---|---|---|
| Academy | Aprender fundamentos, producción, IA aplicada y DSP. | El catálogo y las certificaciones deben existir antes de anunciarse. |
| Studio | Convertir una idea en una maqueta editable. | La generación real depende de un proveedor conectado. |
| AI Lab | Experimentar con modelos y análisis. | No se promete acceso a modelos no integrados. |
| AudioCore | Generar, analizar y masterizar con métricas reales. | `truePeakDb`, LUFS y chroma permanecen `null` si no se midieron. |
| Creator Hub | Organizar proyectos y colaborar. | No hay comunidad ni almacenamiento desplegados por este cambio. |
| Analytics | Entender el progreso creativo. | No se muestran métricas simuladas. |
| TAMV Research | Documentar método y evidencia. | No implica revisión por pares ni validación académica. |

## 5. Microcopy

- **Consentimiento:** «Antes de enviar tu contenido a un modelo, decides qué se
  envía y para qué.»
- **Derechos:** «Solo se procesa audio original, licenciado o de dominio público
  con una atestación verificable.»
- **Incertidumbre:** «Si una métrica no se midió, se muestra como no calculada.»
- **Publicación:** «Nada se publica automáticamente. La aprobación es humana.»
- **Coste:** «El coste de una revisión se muestra antes de ejecutarla cuando el
  proveedor lo permite.»

## 6. CTAs que se evitan

- «Empieza gratis» si no hay plan gratuito configurado.
- «Miles de creadores» sin una fuente verificable.
- «Masterización profesional» si no hay motor DSP conectado.
- «Certificación oficial» si no hay institución que la emita.
- «IA que compone por ti»: la IA propone; el creador decide.

## 7. Estado real en la interfaz

La ruta `/` presenta TAMV Creator Intelligence como gobernanza agnóstica de
sector y proveedor, atribuida a TAMV ONLINE NETWORK. PLAY & GO es el ecosistema
de origen, no un requisito de integración. Este cambio ajusta el posicionamiento
escrito y documenta la arquitectura; **no** crea Academy, Studio, AI Lab,
Creator Hub, Analytics ni TAMV Research como secciones navegables. Crear una
sección vacía para aparentar producto sería una afirmación falsa.

## 8. Referencias internas

- Pipeline de audio: [`docs/AUDIO-PIPELINE.md`](AUDIO-PIPELINE.md).
- Gobernanza y sello: [`docs/SOVEREIGN-V3.md`](SOVEREIGN-V3.md).
- Evidencia y límites: [`docs/PUBLIC-FOOTPRINT.md`](PUBLIC-FOOTPRINT.md).
