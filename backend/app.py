from pathlib import Path
import json
import math

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "crop_model.joblib"
METRICS_PATH = BASE_DIR / "model_metrics.json"

app = Flask(__name__)
CORS(app)

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
_bundle = None


def get_bundle():
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(
                "Trained model not found. Run "
                "'python -m backend.train_model' from the project root."
            )
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


@app.get("/api/health")
def health():
    try:
        get_bundle()
        return jsonify({"status": "ok", "algorithm": "Gaussian Naive Bayes"})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 503


@app.get("/api/metrics")
def metrics():
    if not METRICS_PATH.exists():
        return jsonify({"error": "Metrics not found. Train the model first."}), 503
    return jsonify(json.loads(METRICS_PATH.read_text(encoding="utf-8")))


@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    missing = [key for key in FEATURES if key not in payload]
    if missing:
        return jsonify({"error": "Missing input fields: " + ", ".join(missing)}), 400

    try:
        values = {key: float(payload[key]) for key in FEATURES}
    except (TypeError, ValueError):
        return jsonify({"error": "All seven inputs must be numeric."}), 400

    if not all(math.isfinite(value) for value in values.values()):
        return jsonify({"error": "Input values must be finite numbers."}), 400

    try:
        bundle = get_bundle()
        sample = pd.DataFrame([values], columns=FEATURES)
        model = bundle["model"]
        probabilities = model.predict_proba(sample)[0]
        classes = model.named_steps["classifier"].classes_

        ranked = sorted(
            [
                {"crop": str(crop), "probability": round(float(prob), 6)}
                for crop, prob in zip(classes, probabilities)
            ],
            key=lambda item: item["probability"],
            reverse=True,
        )
        return jsonify({
            "algorithm": "Gaussian Naive Bayes",
            "prediction": ranked[0]["crop"],
            "top_crops": ranked[:5],
        })
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Prediction failed. Check the server logs."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
