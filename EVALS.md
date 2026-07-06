# EVALS.md — The Gate Scoring Rubric

_Last updated: 2026-07-06 · v1.1.0_

The Gate evaluates a **draft** against a **brief** (and optional **voice guide**)
and returns a **verdict** plus a **weighted scorecard**. This document describes
the evaluation model so results are transparent and reproducible.

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `brief` | ✅ | The requirements the draft must satisfy |
| `draft` | ✅ | The content being evaluated |
| `voice_guide` | optional | Brand/voice rules to check against |
| `mode` | optional | Evaluation profile (e.g. `content`) |

## Scoring dimensions

Each dimension is scored **1–5**. Scores are combined into a weighted total.

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| **Brief adherence** | 0.30 | Does the draft satisfy every requirement in the brief? |
| **Accuracy / evidence** | 0.20 | Are claims correct and supported (no hallucinated facts)? |
| **Voice & tone** | 0.20 | Consistency with the voice guide / audience fit |
| **Structure & clarity** | 0.15 | Logical flow, readability, formatting |
| **Engagement** | 0.15 | Hook, momentum, and value for the reader |

> Weights sum to 1.0. Each dimension returns a score, a short rationale, and
> evidence, so a reviewer can audit *why* a verdict was reached.

## Weighted score

```
weighted_score = Σ (dimension_score × dimension_weight)      # range 1.0–5.0
```

## Verdict thresholds

| Verdict | Condition |
|---------|-----------|
| **APPROVED** | weighted_score ≥ 4.0 and no dimension < 3 |
| **APPROVED_WITH_NOTES** | weighted_score ≥ 3.5 and no dimension < 2.5 |
| **REVISE** | weighted_score ≥ 2.5 (actionable notes returned) |
| **REJECTED** | weighted_score < 2.5 or a critical requirement unmet |

## Output shape (illustrative)

```json
{
  "verdict": "APPROVED_WITH_NOTES",
  "weighted_score": 4.15,
  "scores": {
    "brief_adherence": { "score": 4, "rationale": "...", "evidence": "..." },
    "accuracy":        { "score": 5, "rationale": "...", "evidence": "..." },
    "voice_tone":      { "score": 4, "rationale": "...", "evidence": "..." },
    "structure":       { "score": 4, "rationale": "...", "evidence": "..." },
    "engagement":      { "score": 4, "rationale": "...", "evidence": "..." }
  },
  "notes": ["Tighten the opening line.", "Add one concrete detail."]
}
```

## How the eval harness uses this

[`evals/`](./evals) ships a labeled dataset (brief+draft → expected verdict) and
a runner that calls the gate, compares actual vs expected, and reports a
**pass-rate** — treating the eval system itself as something you can measure and
regression-test.

> Note: exact weights/thresholds are configured in the API (the eval engine).
> This document reflects the model as deployed; update it when the engine changes.
