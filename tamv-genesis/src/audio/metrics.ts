/**
 * Dependency-free Prometheus text exposition.
 *
 * Only observed events are exported. There are no "current loudness" gauges and
 * no synthetic zeros: if the worker never generated audio, the counters stay
 * absent instead of pretending that a provider is connected.
 */

import type { AudioMetricLabels, AudioMetrics } from "./ports.ts";

const METRIC_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const LABEL_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type Sample = {
  name: string;
  labels: AudioMetricLabels;
  value: number;
};

type Observation = {
  name: string;
  labels: AudioMetricLabels;
  count: number;
  sum: number;
};

function assertName(name: string): void {
  if (typeof name !== "string" || !METRIC_NAME.test(name)) {
    throw new Error(`Invalid Prometheus metric name: ${String(name)}`);
  }
}

function normalizeLabels(labels: AudioMetricLabels | undefined): AudioMetricLabels {
  if (labels === undefined) return {};
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
    throw new Error("Metric labels must be a plain object.");
  }
  const normalized: AudioMetricLabels = {};
  for (const [key, value] of Object.entries(labels)) {
    if (!LABEL_NAME.test(key) || key.startsWith("__")) {
      throw new Error(`Invalid Prometheus label name: ${key}`);
    }
    if (typeof value !== "string") {
      throw new Error(`Metric label ${key} must be a string.`);
    }
    normalized[key] = value;
  }
  return normalized;
}

function labelKey(labels: AudioMetricLabels): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${JSON.stringify(labels[key])}`)
    .join(",");
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function formatLabels(labels: AudioMetricLabels): string {
  const entries = Object.keys(labels)
    .sort()
    .map((key) => `${key}="${escapeLabelValue(labels[key] ?? "")}"`);
  return entries.length === 0 ? "" : `{${entries.join(",")}}`;
}

function assertNumber(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export class AudioMetricsRegistry implements AudioMetrics {
  readonly #counters = new Map<string, Sample>();
  readonly #gauges = new Map<string, Sample>();
  readonly #observations = new Map<string, Observation>();

  inc(name: string, labels?: AudioMetricLabels, value = 1): void {
    assertName(name);
    assertNumber(value, "counter increment");
    if (value < 0) throw new Error("Counters cannot decrease.");
    const normalized = normalizeLabels(labels);
    const key = `${name}|${labelKey(normalized)}`;
    const current = this.#counters.get(key);
    this.#counters.set(key, {
      name,
      labels: normalized,
      value: (current?.value ?? 0) + value,
    });
  }

  set(name: string, value: number, labels?: AudioMetricLabels): void {
    assertName(name);
    assertNumber(value, "gauge value");
    const normalized = normalizeLabels(labels);
    this.#gauges.set(`${name}|${labelKey(normalized)}`, {
      name,
      labels: normalized,
      value,
    });
  }

  observe(name: string, value: number, labels?: AudioMetricLabels): void {
    assertName(name);
    assertNumber(value, "observation");
    if (value < 0) throw new Error("Observations cannot be negative.");
    const normalized = normalizeLabels(labels);
    const key = `${name}|${labelKey(normalized)}`;
    const current = this.#observations.get(key);
    this.#observations.set(key, {
      name,
      labels: normalized,
      count: (current?.count ?? 0) + 1,
      sum: (current?.sum ?? 0) + value,
    });
  }

  render(): string {
    const lines: string[] = [];
    const counters = [...this.#counters.values()].sort(compareSamples);
    const gauges = [...this.#gauges.values()].sort(compareSamples);
    const observations = [...this.#observations.values()].sort(compareSamples);

    if (counters.length > 0) {
      const names = [...new Set(counters.map((sample) => sample.name))].sort();
      for (const name of names) {
        lines.push(`# TYPE ${name} counter`);
        for (const sample of counters.filter((entry) => entry.name === name)) {
          lines.push(`${sample.name}${formatLabels(sample.labels)} ${formatValue(sample.value)}`);
        }
      }
    }

    if (gauges.length > 0) {
      const names = [...new Set(gauges.map((sample) => sample.name))].sort();
      for (const name of names) {
        lines.push(`# TYPE ${name} gauge`);
        for (const sample of gauges.filter((entry) => entry.name === name)) {
          lines.push(`${sample.name}${formatLabels(sample.labels)} ${formatValue(sample.value)}`);
        }
      }
    }

    if (observations.length > 0) {
      const names = [...new Set(observations.map((sample) => sample.name))].sort();
      for (const name of names) {
        lines.push(`# TYPE ${name} summary`);
        for (const sample of observations.filter((entry) => entry.name === name)) {
          const suffix = formatLabels(sample.labels);
          lines.push(`${sample.name}_count${suffix} ${formatValue(sample.count)}`);
          lines.push(`${sample.name}_sum${suffix} ${formatValue(sample.sum)}`);
        }
      }
    }

    return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
  }
}

function compareSamples(a: Sample | Observation, b: Sample | Observation): number {
  const left = `${a.name}|${labelKey(a.labels)}`;
  const right = `${b.name}|${labelKey(b.labels)}`;
  return left.localeCompare(right);
}

function formatValue(value: number): string {
  if (Object.is(value, -0)) return "0";
  return String(value);
}
