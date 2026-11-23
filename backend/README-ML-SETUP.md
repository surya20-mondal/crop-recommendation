# KrishiChoice ML backend setup

This folder adds a real, trainable Gaussian Naive Bayes classifier to the existing React project.

## 1. Copy the files

Copy `backend/` and `requirements.txt` into the root of your existing
`crop-recommendation` folder. Do not delete `src/`, `public/`, or your CSV.

Expected structure:

```text
crop-recommendation/
  backend/
    __init__.py
    app.py
    train_model.py
  public/
    Crop_recommendation.csv
  src/
  requirements.txt
  package.json
```

## 2. Create a Python environment (Windows PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, run this once in that terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 3. Train and evaluate the model

Run from the project root:

```powershell
python -m backend.train_model
```

The script uses an 80/20 stratified train/test split and a fixed random
seed. It saves the fitted model and evaluation metrics under `backend/`.
Record the accuracy printed by the script; do not invent or assume a score.

## 4. Start the API

```powershell
python -m backend.app
```

The API runs at `http://127.0.0.1:5000`.

Check:
- `http://127.0.0.1:5000/api/health`
- `http://127.0.0.1:5000/api/metrics`

The React app is not connected to this API yet. The next integration step is
to replace its current local similarity-ranking call with a POST request to
`/api/predict`.

## Important academic note

Gaussian Naive Bayes is the implemented ML algorithm. The model is trained
on the dataset labels and evaluated on held-out test data. The returned
probabilities are model class probabilities, not guaranteed real-world
probabilities that a crop will succeed. The dataset is a teaching dataset;
recommendations should be validated with local agricultural expertise before
real farming decisions.
