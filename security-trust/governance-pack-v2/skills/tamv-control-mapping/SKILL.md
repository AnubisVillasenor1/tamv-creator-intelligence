---
name: tamv-control-mapping
description: Maps verified control evidence to a named version of SOC 2, NIST CSF 2.0 or another specified framework. Not an attestation or legal conclusion.
license: Proprietary
metadata:
  owner: TAMV Security and Trust
  version: "2.0.0"
  supervision: human-review
  risk_class: high
  output_binding: advisory
---

# Control mapping
- Confirm framework/version, system boundary, period, commitments, applicable criteria and report purpose.
- Cite exact criterion/function/subcategory from an authorized source; never invent control IDs.
- Separate control design, implementation, operating effectiveness, evidence and auditor conclusion.
- Statuses: supported, partial, not_supported, not_assessed, not_applicable_pending_justification.
- A hash does not prove evidence truth or completeness. Do not convert gaps into compliance claims.

NIST CSF 2.0 has six Functions: Govern, Identify, Protect, Detect, Respond and Recover. SOC 2 is a scoped independent examination/report context, not interchangeable with NIST CSF.

Output framework/version, reference, boundary, control statement, evidence ID/date/owner, status, gap, risk, next test and human decision.
