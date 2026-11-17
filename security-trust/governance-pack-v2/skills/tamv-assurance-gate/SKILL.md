---
name: tamv-assurance-gate
description: Reviews evidence, approvals, versions and limitations before a governance package is ready for human decision. Read-only and non-certifying.
license: Proprietary
metadata:
  owner: TAMV Security and Trust
  version: "2.0.0"
  supervision: independent-review
  risk_class: high
  output_binding: advisory
---

# Assurance gate
Check schema, source/version, freshness, scope, owner, authorization, gaps, tests, licenses and human approvals. Return only READY_FOR_REVIEW, BLOCKED or INCOMPLETE. Never return PRODUCTION_APPROVED. Do not infer approval from a signature, DOI, status string or score.

Block when required evidence is missing, licenses conflict, required artifacts are unsigned, critical gaps are unreviewed or parameters mismatch. Human authority decides advancement.
