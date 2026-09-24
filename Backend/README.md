# XGBioactive Backend

FastAPI backend for the XGBioactive COX-2 bioactivity prediction application.

## Current prediction pipeline

`SMILES -> RDKit descriptors -> XGBoost -> Active/Inactive + confidence`

### Molecular descriptors

- Molecular Weight (`MolWt`)
- Rotatable Bonds (`NumRotatableBonds`)
- H-Bond Acceptors (`NumHAcceptors`)
- H-Bond Donors (`NumHDonors`)
- TPSA
- LogP (`MolLogP`)

### Dataset

`data/CHEMBL230_Preprocessed_Data.csv` is used as the model-training starting point. It contains 6,839 records and the supplied `bioactivity_class` labels.

### Target mapping

- `active` = 0
- `inactive` = 1

The supplied preprocessed dataset already contains these classes, so the API does not re-label raw activity values.

## API

### Health

`GET /health`

### Prediction

`POST /api/v1/predict`

Request:

```json
{
  "smiles": "CCOC(=O)c1ccccc1"
}
```

Response contains:

- `prediction`
- `confidence`
- six molecular descriptors
- `model`
- `target`

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run:

```bash
uvicorn app.main:app --reload
```

Swagger documentation:

`http://127.0.0.1:8000/docs`

## Retraining

The reproducible training script is:

```bash
python scripts/train_model.py
```

It uses `StratifiedGroupKFold` grouped by `molecule_chembl_id` to avoid placing records from the same molecule in both train and test sets.
