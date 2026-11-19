import { bigint, char, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Drizzle mapping for the append-only HyperCore audit ledger.
 * SQL constraints, RLS, append boundary and mutation guards remain owned by
 * the versioned SQL migrations; this mapping does not replace those controls.
 */
export const tamvHypercoreAuditEvents = pgTable(
  "tamv_hypercore_audit_events",
  {
    sequenceId: bigint("sequence_id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: uuid("event_id").notNull().defaultRandom(),
    traceId: text("trace_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    core: text("core").notNull(),
    eventName: text("event_name").notNull(),
    phase: text("phase").notNull(),
    lane: text("lane"),
    inputHash: char("input_hash", { length: 64 }).notNull(),
    details: jsonb("details").notNull().default({}),
    previousHash: char("previous_hash", { length: 64 }).notNull(),
    eventHash: char("event_hash", { length: 64 }).notNull().unique(),
  },
  (table) => [
    index("tamv_hypercore_audit_trace_idx").on(table.traceId, table.sequenceId),
    index("tamv_hypercore_audit_time_idx").on(table.occurredAt),
  ],
);
