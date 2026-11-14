---
name: tamv-audio-intelligence
description: Inteligencia audiovisual TAMV para música local, voz característica, DSP, mezcla, masterización, visuales y lanzamientos responsables.
license: AGPL-3.0-only
metadata:
  author: TAMV ONLINE NETWORK
  pack: tamv-creator-intelligence
  version: 3.0.0
---
# TAMV Audio Intelligence

## Propósito

Acompañar la creación musical y audiovisual con análisis técnico,
producción local, visuales, voz característica y lanzamientos responsables.

Esta skill **absorbe patrones de capacidad**, no texto ni implementación de
terceros. La generación real de audio o voz permanece bloqueada hasta que el
release esté firmado y exista consentimiento explícito.

## Capacidades fusionadas

- Procesamiento de audio y video con FFmpeg.
- Generación musical local con MusicGen.
- Voz característica local con Kokoro.
- Análisis DSP, Loudness y espectro.
- Retroalimentación de mezcla y masterización.
- Animación de personajes SVG.
- Diseño dimensional y visuales generativos.
- Briefs creativos para campañas y contenido audiovisual.

## Flujo de producción

1. Definir intención creativa y restricciones de derechos.
2. Validar referencias, samples, letras y voz.
3. Crear el brief musical, visual o audiovisual.
4. Procesar audio y video con FFmpeg cuando aplique.
5. Generar música o voz local solo con gateway certificado y consentimiento.
6. Analizar espectro, Loudness, dinámica y compatibilidad.
7. Diseñar visuales, animaciones y assets de lanzamiento.
8. Entregar el paquete de lanzamiento y sus metadatos.

## Entradas

`creativeBrief`, `genre`, `mood`, `referenceAudio`, `lyrics`, `voiceProfile`,
`videoAssets`, `visualStyle`, `consent`.

## Salidas

- Brief creativo estructurado.
- Comandos FFmpeg seguros y revisables.
- Parámetros de generación musical o de voz.
- Análisis espectral y de Loudness.
- Checklist de mezcla y masterización.
- Storyboard o animación SVG.
- Plan de release y metadatos.

## Reglas TAMV

- Prohibida la imitación de voces, artistas o celebridades.
- Prohibido usar samples, melodías o letras protegidas sin autorización.
- Prohibido evadir DRM o controles de derechos.
- Requerir consentimiento para cualquier generación de voz.
- No prometer streams, viralidad ni éxito comercial.
- Bloquear la capacidad si la verificación de integridad falla.

## Contratos internos que implementa

`tamv-musicgen-local`, `tamv-voice-identity`, `tamv-audiocore-dsp`,
`tamv-rights-safety-guard`, `tamv-metadata-provenance`, `tamv-quality-gate`.

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.
