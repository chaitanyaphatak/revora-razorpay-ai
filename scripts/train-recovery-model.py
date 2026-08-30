#!/usr/bin/env python3
"""Train and evaluate bounded RecoverAI recovery-probability candidates from Supabase source data.

The script is read-only against Supabase. It creates only repository artifacts:
an evaluation report, selected-model metadata, and a compact XGBoost model artifact.
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import requests
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
DATASET_VERSION = "supabase-payments-2026-08-27"
RANDOM_SEED = 20260827
FEATURE_COLUMNS = [
    "amount",
    "attempt_number",
    "previous_failures",
    "customer_success_history",
    "customer_tenure",
    "hour_of_day",
    "is_recurring_payment",
    "days_since_last_success",
    "payment_method",
    "gateway",
    "failure_reason",
    "merchant_category",
    "device_type",
    "country",
]
NUMERIC_COLUMNS = [
    "amount",
    "attempt_number",
    "previous_failures",
    "customer_success_history",
    "customer_tenure",
    "hour_of_day",
    "days_since_last_success",
]
CATEGORICAL_COLUMNS = ["payment_method", "gateway", "failure_reason", "merchant_category", "device_type", "country"]


def fetch_payments() -> pd.DataFrame:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be server-side environment variables.")

    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}", "Accept": "application/json"}
    columns = ",".join(FEATURE_COLUMNS + ["payment_id", "recoverable"])
    rows: list[dict[str, Any]] = []
    offset = 0
    batch_size = 1000
    while True:
        response = requests.get(
            f"{url}/rest/v1/payments",
            headers=headers,
            params={"select": columns, "order": "payment_id.asc", "limit": batch_size, "offset": offset},
            timeout=30,
        )
        response.raise_for_status()
        batch = response.json()
        rows.extend(batch)
        if len(batch) < batch_size:
            break
        offset += batch_size
    if not rows:
        raise RuntimeError("Supabase payments table returned no rows.")
    return pd.DataFrame(rows)


def prepare_features(payments: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    frame = payments.copy()
    frame = frame.dropna(subset=["recoverable"])
    if frame["recoverable"].nunique() < 2:
        raise RuntimeError("Recovery model evaluation requires both recoverable and non-recoverable examples.")
    frame["is_recurring_payment"] = frame["is_recurring_payment"].fillna(False).astype(int)
    for column in CATEGORICAL_COLUMNS:
        frame[column] = frame[column].fillna("unknown").astype(str)
    for column in NUMERIC_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame[FEATURE_COLUMNS], frame["recoverable"].astype(int)


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(steps=[("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]),
                NUMERIC_COLUMNS + ["is_recurring_payment"],
            ),
            (
                "categorical",
                Pipeline(steps=[("impute", SimpleImputer(strategy="most_frequent")), ("encode", OneHotEncoder(handle_unknown="ignore"))]),
                CATEGORICAL_COLUMNS,
            ),
        ],
        remainder="drop",
    )


def metrics_for(y_true: pd.Series, probabilities: np.ndarray, threshold: float) -> dict[str, Any]:
    predictions = (probabilities >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
    return {
        "threshold": round(float(threshold), 4),
        "accuracy": round(float(accuracy_score(y_true, predictions)), 4),
        "precision": round(float(precision_score(y_true, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, predictions, zero_division=0)), 4),
        "rocAuc": round(float(roc_auc_score(y_true, probabilities)), 4),
        "confusionMatrix": {"trueNegative": int(tn), "falsePositive": int(fp), "falseNegative": int(fn), "truePositive": int(tp)},
    }


def choose_threshold(y_true: pd.Series, probabilities: np.ndarray) -> float:
    candidates = np.arange(0.25, 0.76, 0.01)
    ranked = []
    for threshold in candidates:
        metric = metrics_for(y_true, probabilities, float(threshold))
        ranked.append((metric["f1"], -abs(float(threshold) - 0.5), float(threshold)))
    return max(ranked)[2]


def to_typescript_literal(report: dict[str, Any], export_name: str) -> str:
    payload = json.dumps(report, indent=2, sort_keys=True)
    return f"// Generated by scripts/train-recovery-model.py from read-only Supabase source data.\nexport const {export_name} = {payload} as const;\n"


def portable_logistic_predictor(model: Pipeline) -> dict[str, Any]:
    preprocessor: ColumnTransformer = model.named_steps["preprocess"]
    numeric_pipeline: Pipeline = preprocessor.named_transformers_["numeric"]
    numeric_imputer: SimpleImputer = numeric_pipeline.named_steps["impute"]
    numeric_scaler: StandardScaler = numeric_pipeline.named_steps["scale"]
    categorical_pipeline: Pipeline = preprocessor.named_transformers_["categorical"]
    categorical_imputer: SimpleImputer = categorical_pipeline.named_steps["impute"]
    categorical_encoder: OneHotEncoder = categorical_pipeline.named_steps["encode"]
    logistic: LogisticRegression = model.named_steps["model"]
    return {
        "model": "logisticRegression",
        "numericFeatures": [
            {
                "name": name,
                "median": float(median),
                "mean": float(mean),
                "scale": float(scale) if float(scale) != 0 else 1.0,
            }
            for name, median, mean, scale in zip(
                NUMERIC_COLUMNS + ["is_recurring_payment"],
                numeric_imputer.statistics_,
                numeric_scaler.mean_,
                numeric_scaler.scale_,
            )
        ],
        "categoricalFeatures": [
            {
                "name": name,
                "fillValue": str(fill_value),
                "categories": [str(category) for category in categories],
            }
            for name, fill_value, categories in zip(
                CATEGORICAL_COLUMNS,
                categorical_imputer.statistics_,
                categorical_encoder.categories_,
            )
        ],
        "coefficients": [float(coefficient) for coefficient in logistic.coef_[0]],
        "intercept": float(logistic.intercept_[0]),
    }


def write_report(report: dict[str, Any], portable_predictor: dict[str, Any]) -> None:
    report_path = ROOT / "docs" / "evaluation.md"
    selected = report["selectedModel"]
    held_out = report["models"][selected]["heldOutTest"]
    baseline = report["models"]["logisticRegression"]["heldOutTest"]
    candidate = report["models"]["xgboost"]["heldOutTest"]
    report_path.write_text(
        f"""# RecoverAI Model Evaluation\n\n## Scope and Reproducibility\n\nThis report was generated from **{report['dataset']['records']:,} existing Supabase payment records** using a read-only data pull. The target is the existing `payments.recoverable` field. The workflow uses a fixed random seed of `{RANDOM_SEED}`, a stratified 70% train / 15% validation / 15% held-out test split, and never writes model predictions back to the source table.\n\n| Item | Value |\n|---|---|\n| Dataset version | `{DATASET_VERSION}` |\n| Source target | `payments.recoverable` |\n| Training records | {report['dataset']['trainRecords']:,} |\n| Validation records | {report['dataset']['validationRecords']:,} |\n| Held-out test records | {report['dataset']['testRecords']:,} |\n| Selected candidate | **{selected}** |\n| Validation-selected threshold | **{report['selectedThreshold']:.2f}** |\n\n## Held-Out Test Performance\n\n| Metric | Logistic Regression | XGBoost |\n|---|---:|---:|\n| Accuracy | {baseline['accuracy']:.2%} | {candidate['accuracy']:.2%} |\n| Precision | {baseline['precision']:.2%} | {candidate['precision']:.2%} |\n| Recall | {baseline['recall']:.2%} | {candidate['recall']:.2%} |\n| F1 score | {baseline['f1']:.2%} | {candidate['f1']:.2%} |\n| ROC-AUC | {baseline['rocAuc']:.2%} | {candidate['rocAuc']:.2%} |\n\n## Selected Model Confusion Matrix\n\n| Actual / Prediction | Non-recoverable | Recoverable |\n|---|---:|---:|\n| Non-recoverable | {held_out['confusionMatrix']['trueNegative']} | {held_out['confusionMatrix']['falsePositive']} |\n| Recoverable | {held_out['confusionMatrix']['falseNegative']} | {held_out['confusionMatrix']['truePositive']} |\n\n## Business Interpretation\n\nThe selected threshold is optimized on the validation partition for F1 score, then reported unchanged on the held-out test set. RecoverAI presents the source-table recovery probability through its API for traceability; this offline model comparison validates the feature strategy and informs the future controlled prediction service. Any recommended action remains subject to deterministic policy validation and a simulated allowlisted tool.\n\n> **Simulation-only rule:** model output supports recovery decisioning only. It cannot initiate a real payment, access unrestricted tools, or override policy.\n""",
        encoding="utf-8",
    )
    # Runtime coefficients are committed in the standard TypeScript modules so
    # a normal project clone starts without generated artifacts. This script is
    # evaluation-only and produces documentation plus a local JSON record.
    model_dir = ROOT / "ml" / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "recoverai_model_metadata.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    payments = fetch_payments()
    features, target = prepare_features(payments)
    x_train_full, x_test, y_train_full, y_test = train_test_split(
        features, target, test_size=0.15, random_state=RANDOM_SEED, stratify=target
    )
    x_train, x_validation, y_train, y_validation = train_test_split(
        x_train_full, y_train_full, test_size=(0.15 / 0.85), random_state=RANDOM_SEED, stratify=y_train_full
    )

    models: dict[str, Any] = {
        "logisticRegression": Pipeline(
            steps=[
                ("preprocess", make_preprocessor()),
                ("model", LogisticRegression(max_iter=2000, random_state=RANDOM_SEED, class_weight="balanced")),
            ]
        ),
        "xgboost": Pipeline(
            steps=[
                ("preprocess", make_preprocessor()),
                (
                    "model",
                    XGBClassifier(
                        n_estimators=180,
                        max_depth=4,
                        learning_rate=0.05,
                        subsample=0.9,
                        colsample_bytree=0.9,
                        random_state=RANDOM_SEED,
                        eval_metric="logloss",
                        n_jobs=1,
                    ),
                ),
            ]
        ),
    }

    model_results: dict[str, Any] = {}
    fitted_models: dict[str, Pipeline] = {}
    for name, model in models.items():
        model.fit(x_train, y_train)
        validation_probabilities = model.predict_proba(x_validation)[:, 1]
        threshold = choose_threshold(y_validation, validation_probabilities)
        test_probabilities = model.predict_proba(x_test)[:, 1]
        model_results[name] = {
            "validation": metrics_for(y_validation, validation_probabilities, threshold),
            "heldOutTest": metrics_for(y_test, test_probabilities, threshold),
        }
        fitted_models[name] = model

    selected_model = max(model_results, key=lambda name: (model_results[name]["validation"]["rocAuc"], model_results[name]["validation"]["f1"]))
    selected_threshold = model_results[selected_model]["validation"]["threshold"]
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "version": DATASET_VERSION,
            "records": int(len(features)),
            "trainRecords": int(len(x_train)),
            "validationRecords": int(len(x_validation)),
            "testRecords": int(len(x_test)),
            "randomSeed": RANDOM_SEED,
            "features": FEATURE_COLUMNS,
        },
        "selectedModel": selected_model,
        "selectedThreshold": selected_threshold,
        "models": model_results,
    }
    if selected_model != "logisticRegression":
        raise RuntimeError("The server runtime exports only the selected portable Logistic Regression candidate; update the exporter before deploying another model family.")
    write_report(report, portable_logistic_predictor(fitted_models[selected_model]))
    print(json.dumps({"selectedModel": selected_model, "selectedThreshold": selected_threshold, "records": len(features)}, indent=2))


if __name__ == "__main__":
    main()
