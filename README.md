# XGBioactive

A web application for predicting COX-2 molecular bioactivity from SMILES. The frontend displays a molecule structure, molecular descriptors, and an XGBoost prediction. A separate comparison endpoint runs five descriptor-based classifiers.

## Requirements

- Python 3.10 or later
- `pip`
- A modern web browser

## Setup

From the project root, create and activate a virtual environment, then install the backend dependencies:

```bash
cd /path/to/XGBioactiveNew
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r Backend/requirements.txt
```

On Windows, activate the environment with `.venv\Scripts\activate` instead.

## Run locally

Start the API in one terminal:

```bash
cd /path/to/XGBioactiveNew/Backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the static frontend in a second terminal:

```bash
cd /path/to/XGBioactiveNew/Frontend
python3 -m http.server 5501 --bind 127.0.0.1
```

Open <http://127.0.0.1:5501/>. Keep both terminals running while using the app. The frontend sends API requests to port `8000`.

Useful API pages:

- Health check: <http://127.0.0.1:8000/health>
- Interactive API documentation: <http://127.0.0.1:8000/docs>
- Model metrics: <http://127.0.0.1:8000/api/v1/model-metrics>

## Model evaluation

The trained models and evaluated metrics are included in the repository. To regenerate them, activate the virtual environment and run from the `Backend` directory:

```bash
cd /path/to/XGBioactiveNew/Backend
../.venv/bin/python -m app.models.compare_models
```

The evaluation script reads `data/processed/CHEMBL230_Preprocessed_Data_V2 copy.csv`, calculates six RDKit descriptors from the SMILES, and evaluates the five classifiers using a fixed molecule-grouped 80/20 holdout split. It writes the model files under `Backend/app/models/comparison/` and metrics under `Backend/result/model_metrics.csv`.

## Prediction API

Predict with the Morgan-fingerprint XGBoost model used by the main frontend:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/predict-xgb \
  -H 'Content-Type: application/json' \
  -d '{"smiles":"CC(=O)Oc1ccccc1C(=O)O"}'
```

Run the five descriptor-based classifiers:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/predict \
  -H 'Content-Type: application/json' \
  -d '{"smiles":"CC(=O)Oc1ccccc1C(=O)O"}'
```

Both endpoints accept a JSON object with a `smiles` string. Invalid SMILES return HTTP `422`.

## Project layout

```text
Backend/
  app/main.py                 FastAPI application and prediction endpoints
  app/models/                 Trained models and comparison training code
  result/                     Evaluation metrics and plots
Frontend/
  index.html                  Web application
  script.js                   Frontend behavior and API integration
  style.css                   Application styles
data/
  processed/                  Labeled dataset used for model comparison
  raw/                        Source dataset
notebooks/                    Analysis notebook and related artifacts
```
