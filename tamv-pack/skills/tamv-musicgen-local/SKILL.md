---
name: tamv-musicgen-local
description: Integrar generación musical local con MusicGen / AudioCraft.
license: AGPL-3.0-only
metadata:
  author: TAMV ONLINE NETWORK
  pack: tamv-creator-intelligence
---
# TAMV MusicGen Local

## Propósito

Integrar generación musical local con MusicGen / AudioCraft.

## Entradas requeridas

- descripción y estilo musical
- licencia del modelo y de las muestras
- hardware y límites de cómputo
- uso previsto de la salida

## Reglas

- Ejecutar inferencia fuera del frontend
- Validar prompts y duración
- Guardar hash SHA-256
- Registrar modelo, semilla y configuración
- No usar samples sin permiso
- No imitar artistas específicos

## Contrato de salida

- pipeline de inferencia local
- parámetros y semillas reproducibles
- licencias y atribuciones
- salvaguardas de uso

## Atribución

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.
Orgullosamente Realmontenses.
