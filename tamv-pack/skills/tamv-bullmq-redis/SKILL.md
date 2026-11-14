---
name: tamv-bullmq-redis
description: Diseñar colas de trabajo y workers para tareas pesadas.
license: AGPL-3.0-only
metadata:
  author: TAMV ONLINE NETWORK
  pack: tamv-creator-intelligence
---
# TAMV BullMQ + Redis

## Propósito

Diseñar colas de trabajo y workers para tareas pesadas.

## Entradas requeridas

- tipo y volumen de tareas
- latencia objetivo
- política de reintentos
- capacidad de Redis

## Reglas

- Reintentos con backoff
- Idempotencia por job id
- Métricas con prom-client
- Colas separadas por tipo de carga

## Contrato de salida

- diseño de colas y workers
- política de backoff e idempotencia
- métricas y alertas
- plan de recuperación

## Atribución

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.
Orgullosamente Realmontenses.
