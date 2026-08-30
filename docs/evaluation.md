# RecoverAI Model Evaluation

## Scope and Reproducibility

This report was generated from **2,981 existing Supabase payment records** using a read-only data pull. The target is the existing `payments.recoverable` field. The workflow uses a fixed random seed of `20260827`, a stratified 70% train / 15% validation / 15% held-out test split, and never writes model predictions back to the source table.

| Item | Value |
|---|---|
| Dataset version | `supabase-payments-2026-08-27` |
| Source target | `payments.recoverable` |
| Training records | 2,085 |
| Validation records | 448 |
| Held-out test records | 448 |
| Selected candidate | **logisticRegression** |
| Validation-selected threshold | **0.47** |

## Held-Out Test Performance

| Metric | Logistic Regression | XGBoost |
|---|---:|---:|
| Accuracy | 71.65% | 70.09% |
| Precision | 55.66% | 53.72% |
| Recall | 80.92% | 85.53% |
| F1 score | 65.95% | 65.99% |
| ROC-AUC | 81.74% | 80.22% |

## Selected Model Confusion Matrix

| Actual / Prediction | Non-recoverable | Recoverable |
|---|---:|---:|
| Non-recoverable | 198 | 98 |
| Recoverable | 29 | 123 |

## Business Interpretation

The selected threshold is optimized on the validation partition for F1 score, then reported unchanged on the held-out test set. RecoverAI presents the source-table recovery probability through its API for traceability; this offline model comparison validates the feature strategy and informs the future controlled prediction service. Any recommended action remains subject to deterministic policy validation and a simulated allowlisted tool.

> **Simulation-only rule:** model output supports recovery decisioning only. It cannot initiate a real payment, access unrestricted tools, or override policy.
