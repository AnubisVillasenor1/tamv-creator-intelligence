import {
  bigint,
  char,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Durable metadata-only Hyper-Core audit ledger.
 *
 * The database migration installs append-only/hash-chain triggers and RLS.
 * Do not insert through this schema without applying the migration first.
 * Do not put raw prompts, generated content, credentials, or personal data in details.
 */
export const tamvHypercoreAuditEvents = pgTable(
  "tamv_hypercore_audit_events",
  {
    sequenceId: bigint("sequence_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: uuid("event_id").notNull().unique().defaultRandom(),
    traceId: text("trace_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    core: text("core", { enum: ["governance", "execution", "verification"] }).notNull(),
    eventName: text("event_name").notNull(),
    phase: text("phase", { enum: ["accepted", "executing", "completed", "failed"] }).notNull(),
    lane: text("lane", { enum: ["hot", "cold"] }),
    inputHash: char("input_hash", { length: 64 }).notNull(),
    details: jsonb("details").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    previousHash: char("previous_hash", { length: 64 }).notNull(),
    eventHash: char("event_hash", { length: 64 }).notNull().unique(),
  },
  (table) => [
    index("tamv_hypercore_audit_trace_idx").on(table.traceId, table.sequenceId),
    index("tamv_hypercore_audit_time_idx").on(table.occurredAt),
  ],
);
