from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "public" / "Crop_recommendation.csv"
MODEL_PATH = Path(__file__).resolve().parent / "crop_model.joblib"
METRICS_PATH = Path(__file__).resolve().parent / "model_metrics.json"

FEATURES = [
    "N", "P", "K", "temperature", "humidity", "ph", "rainfall"
]
TARGET = "label"


def train():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}. "
            "Keep Crop_recommendation.csv in the project's public/ folder."
        )

    data = pd.read_csv(DATASET_PATH)
    missing = [name for name in FEATURES + [TARGET] if name not in data.columns]
    if missing:
        raise ValueError(f"Dataset is missing columns: {missing}")

    data = data[FEATURES + [TARGET]].dropna()
    X = data[FEATURES]
    y = data[TARGET].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", GaussianNB()),
    ])
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    labels = sorted(y.unique())
    report = classification_report(
        y_test, predictions, output_dict=True, zero_division=0
    )
    metrics = {
        "algorithm": "Gaussian Naive Bayes",
        "dataset_rows": int(len(data)),
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
        "number_of_crops": int(y.nunique()),
        "features": FEATURES,
        "random_state": 42,
        "test_accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "classification_report": report,
        "confusion_matrix_labels": labels,
        "confusion_matrix": confusion_matrix(
            y_test, predictions, labels=labels
        ).tolist(),
    }

    joblib.dump(
        {"model": model, "features": FEATURES, "labels": labels},
        MODEL_PATH,
    )
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Model saved: {MODEL_PATH}")
    print(f"Test accuracy: {metrics['test_accuracy']:.2%}")
    print(f"Training rows: {len(X_train)} | Testing rows: {len(X_test)}")


if __name__ == "__main__":
    train()
