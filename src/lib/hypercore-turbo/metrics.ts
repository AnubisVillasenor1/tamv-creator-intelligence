/**
 * Dependency-free process-local metrics for the current server runtime.
 * These metrics are useful for diagnostics but are not durable, distributed,
 * or a substitute for Prometheus scraping across serverless instances.
 */
type Labels = Record<string, string>;
type MetricKind = "counter" | "gauge" | "histogram";
interface MetricDefinition {
  name: string;
  help: string;
  kind: MetricKind;
  labelNames: readonly string[];
  buckets?: readonly number[];
}
interface MetricState {
  definition: MetricDefinition;
  values: Map<string, { labels: Labels; value: number; buckets?: number[]; count?: number; sum?: number }>;
}
const metrics = new Map<string, MetricState>();
const MAX_SERIES_PER_METRIC = 256;

function keyFor(labels: Labels): string {
  return JSON.stringify(Object.keys(labels).sort().map((key) => [key, labels[key]])) ?? "[]";
}
function replaceUnsupportedControlCharacters(value: string): string {
  let sanitized = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const unsupported =
      (codePoint >= 0 && codePoint <= 8) ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      codePoint === 127;
    sanitized += unsupported ? "�" : character;
  }
  return sanitized;
}

function escapeLabel(value: string): string {
  return replaceUnsupportedControlCharacters(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/"/g, '\\"');
}
function state(definition: MetricDefinition): MetricState {
  const existing = metrics.get(definition.name);
  if (existing) return existing;
  const created = { definition, values: new Map() };
  metrics.set(definition.name, created);
  return created;
}
function labelsFor(definition: MetricDefinition, labels: Labels): Labels {
  const result: Labels = {};
  for (const name of definition.labelNames) {
    const value = labels[name] ?? "unknown";
    result[name] = value.slice(0, 80);
  }
  return result;
}
function entry(definition: MetricDefinition, labels: Labels) {
  const metric = state(definition);
  let normalized = labelsFor(definition, labels);
  let key = keyFor(normalized);
  let value = metric.values.get(key);

  // Reserve the final series slot for all overflowed label combinations. This
  // keeps process memory bounded even when upstream labels are untrusted.
  if (
    !value &&
    definition.labelNames.length > 0 &&
    metric.values.size >= MAX_SERIES_PER_METRIC - 1
  ) {
    normalized = Object.fromEntries(definition.labelNames.map((name) => [name, "overflow"]));
    key = keyFor(normalized);
    value = metric.values.get(key);
  }

  if (!value) {
    value = definition.kind === "histogram"
      ? { labels: normalized, value: 0, buckets: (definition.buckets ?? []).map(() => 0), count: 0, sum: 0 }
      : { labels: normalized, value: 0 };
    metric.values.set(key, value);
  }
  return value;
}
function define(name: string, help: string, kind: MetricKind, labelNames: readonly string[], buckets?: readonly number[]) {
  return { name, help, kind, labelNames, ...(buckets === undefined ? {} : { buckets }) } satisfies MetricDefinition;
}
const queuedDef = define("tamv_velocity_jobs_queued_total", "Total de trabajos encolados", "counter", ["capability", "queue", "federation"]);
const startedDef = define("tamv_velocity_jobs_started_total", "Total de trabajos iniciados", "counter", ["capability", "queue", "federation"]);
const completedDef = define("tamv_velocity_jobs_completed_total", "Total de trabajos completados", "counter", ["capability", "queue", "federation", "status"]);
const failedDef = define("tamv_velocity_jobs_failed_total", "Total de trabajos fallidos", "counter", ["capability", "queue", "federation", "reason"]);
const activeDef = define("tamv_velocity_jobs_active", "Trabajos actualmente activos", "gauge", ["capability", "queue", "federation"]);
const durationDef = define("tamv_velocity_job_duration_seconds", "Duración de ejecución en segundos", "histogram", ["capability", "queue", "federation"], [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600]);
const queueLatencyDef = define("tamv_velocity_queue_latency_seconds", "Latencia de espera en cola en segundos", "histogram", ["capability", "queue", "federation"], [0.1, 0.5, 1, 5, 10, 30, 60, 120]);
const integrityFailureDef = define("tamv_velocity_integrity_failures_total", "Fallos de integridad y certificación", "counter", ["capability", "reason"]);

export const velocityMetrics = {
  queued(labels: Labels) { entry(queuedDef, labels).value += 1; },
  started(labels: Labels) { entry(startedDef, labels).value += 1; entry(activeDef, labels).value += 1; },
  completed(labels: Labels, status = "completed") {
    entry(completedDef, { ...labels, status }).value += 1;
    const active = entry(activeDef, labels); active.value = Math.max(0, active.value - 1);
  },
  failed(labels: Labels, reason: string) {
    entry(failedDef, { ...labels, reason: reason.slice(0, 80) }).value += 1;
    const active = entry(activeDef, labels); active.value = Math.max(0, active.value - 1);
  },
  integrityFailure(labels: Labels, reason: string) {
    entry(integrityFailureDef, { ...labels, reason: reason.slice(0, 80) }).value += 1;
  },
  observeDuration(labels: Labels, seconds: number) { observe(durationDef, labels, seconds); },
  observeQueueLatency(labels: Labels, seconds: number) { observe(queueLatencyDef, labels, seconds); },
};
function observe(definition: MetricDefinition, labels: Labels, value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  const sample = entry(definition, labels);
  sample.count = (sample.count ?? 0) + 1;
  sample.sum = (sample.sum ?? 0) + value;
  sample.buckets = (sample.buckets ?? []).map((count, index) =>
    value <= (definition.buckets?.[index] ?? Number.POSITIVE_INFINITY) ? count + 1 : count);
}
export function renderPrometheusMetrics(): string {
  const lines: string[] = [];
  for (const metric of metrics.values()) {
    const d = metric.definition;
    lines.push("# HELP " + d.name + " " + d.help.replace(/[\r\n]/g, " "));
    lines.push("# TYPE " + d.name + " " + (d.kind === "histogram" ? "histogram" : d.kind));
    for (const sample of metric.values.values()) {
      const labelText = (extra: Labels = {}) => {
        const combined = { ...sample.labels, ...extra };
        const pairs = Object.entries(combined);
        return pairs.length ? "{" + pairs.map(([key, value]) => key + '="' + escapeLabel(value) + '"').join(",") + "}" : "";
      };
      if (d.kind !== "histogram") {
        lines.push(d.name + labelText() + " " + sample.value);
        continue;
      }
      const buckets = sample.buckets ?? [];
      (d.buckets ?? []).forEach((bound, index) => lines.push(d.name + "_bucket" + labelText({ le: String(bound) }) + " " + buckets[index]));
      lines.push(d.name + "_bucket" + labelText({ le: "+Inf" }) + " " + (sample.count ?? 0));
      lines.push(d.name + "_sum" + labelText() + " " + (sample.sum ?? 0));
      lines.push(d.name + "_count" + labelText() + " " + (sample.count ?? 0));
    }
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}
export function resetVelocityMetricsForTests(): void { metrics.clear(); }
