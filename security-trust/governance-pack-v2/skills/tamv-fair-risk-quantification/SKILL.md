---
name: tamv-fair-risk-quantification
description: Estimates cyber and operational loss exposure with FAIR-style frequency, magnitude and uncertainty. Not for compliance certification or automatic remediation.
license: Proprietary
metadata:
  owner: TAMV Security and Trust
  version: "2.0.0"
  supervision: human-review
  risk_class: high
  output_binding: advisory
---

# TAMV FAIR-style risk quantification
No TAMV incident, financial, asset, insurance or creator data is presumed to exist. Never invent values. Simulation propagates supplied distributions; it does not make assumptions empirically valid.

1. Define product, asset, threat community, loss event, effects, horizon, currency and owner.
2. State boundaries and exclusions; do not conflate separate TAMV components.
3. Model only factors justified by evidence: loss-event frequency, susceptibility, primary loss and secondary-loss frequency/magnitude.
4. Label inputs measured, estimated or derived; record source, date, scope, uncertainty, owner and dependencies.
5. Justify distributions; min/max/most-likely alone do not automatically justify Beta-PERT. Model material correlation.
6. Record implementation, seed, iterations, diagnostics and sensitivity; avoid unsupported precision and double counting.
7. Separate inherent/residual/target estimates, control cost and unquantified effects.
8. Risk acceptance remains with named human authority.

Never fabricate incidents, revenue, fines or losses. Do not present estimates as legal advice, compliance determinations or guaranteed forecasts. Minimize data and require authorization before external processing.
