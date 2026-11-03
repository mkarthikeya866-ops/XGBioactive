"""
FastAPI Backend for Bioactive Molecule Predictor

Runs five trained models on one SMILES input:
XGBoost, Random Forest, Linear SVM, Naive Bayes, and RBF Network.

Features must match compare_models.py:
1. molecular_weight
2. rotatable_bonds
3. h_bond_acceptors
4. h_bond_donors
5. tpsa
6. logp

Active = Class 1
Inactive = Class 0
"""

import os
import csv
import numpy as np
import joblib
from rdkit.Chem import rdFingerprintGenerator
from xgboost import XGBClassifier

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from rdkit import Chem
from rdkit.Chem import rdMolDescriptors, Descriptors, Lipinski, Crippen
from rdkit import RDLogger

RDLogger.DisableLog("rdApp.*")


# ==================================================
# PATH CONFIGURATION
# ==================================================

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)

MODEL_ROOT = os.path.join(CURRENT_DIR, "models")
MODEL_DIR = os.path.join(MODEL_ROOT, "comparison")
if not os.path.isdir(MODEL_DIR):
    MODEL_DIR = MODEL_ROOT

FINAL_XGB_MODEL_PATH = os.path.join(
    CURRENT_DIR,
    "models",
    "xgb_cox2_model.json"
)
RESULTS_DIR = os.path.join(
    PROJECT_ROOT,
    "result"
)
METRICS_PATH = os.path.join(RESULTS_DIR, "model_metrics.csv")

FRONTEND_DIR = os.path.join(PROJECT_ROOT, "Frontend")
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")


# ==================================================
# MODEL CONFIGURATION
# ==================================================

MODEL_FILES = {
    "XGBoost": "xgboost.joblib",
    "Random Forest": "random_forest.joblib",
    "SVM": "lsvm.joblib",
    "Naive Bayes": "naive_bayes.joblib",
    "RBF": "rbfn.joblib",
}

BEST_MODEL_NAME = "XGBoost"

model_cache = {}


# ==================================================
# FASTAPI INITIALIZATION
# ==================================================

app = FastAPI(
    title="Bioactive Molecule Predictor",
    description=(
        "REST API predicting molecular bioactivity "
        "using five machine learning algorithms and RDKit."
    ),
    version="3.1.0"
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# REQUEST SCHEMA
# ==================================================

class PredictRequest(BaseModel):
    smiles: str


# ==================================================
# MODEL LOADER
# ==================================================

def get_model(model_name: str):

    if model_name not in MODEL_FILES:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Unsupported model.",
                "available_models": list(MODEL_FILES.keys())
            }
        )

    # Return cached model if already loaded
    if model_name in model_cache:
        return model_cache[model_name]

    filename = MODEL_FILES[model_name]

    filepath = os.path.join(
        MODEL_DIR,
        filename
    )

    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Model file not found: {filepath}"
        )

    try:

        loaded_model = joblib.load(filepath)

        model_cache[model_name] = loaded_model

        print(f"[OK] Loaded model: {model_name}")

        return loaded_model

    except Exception as e:

        raise RuntimeError(
            f"Could not load {model_name}: {str(e)}"
        )


# ==================================================
# SMILES TO MODEL FEATURES
# ==================================================

def smiles_to_features(smiles: str):

    mol = Chem.MolFromSmiles(smiles)

    if mol is None:
        return None

    features = [

        float(
            Descriptors.MolWt(mol)
        ),

        float(
            Lipinski.NumRotatableBonds(mol)
        ),

        float(
            Lipinski.NumHAcceptors(mol)
        ),

        float(
            Lipinski.NumHDonors(mol)
        ),

        float(
            Descriptors.TPSA(mol)
        ),

        float(
            Crippen.MolLogP(mol)
        )

    ]

    return np.array(
        features,
        dtype=float
    ).reshape(1, -1)


# ==================================================
# MOLECULAR DESCRIPTORS FOR FRONTEND
# ==================================================

def calculate_molecular_descriptors(mol):

    descriptors = {

        "HBA": int(
            Lipinski.NumHAcceptors(mol)
        ),

        "HBD": int(
            Lipinski.NumHDonors(mol)
        ),

        "TPSA": round(
            float(Descriptors.TPSA(mol)), 2
        ),

        "LogP": round(
            float(Crippen.MolLogP(mol)), 2
        ),

        "Molecular_Weight": round(
            float(Descriptors.MolWt(mol)), 2
        ),

        "Exact_Molecular_Weight": round(
            float(Descriptors.ExactMolWt(mol)), 4
        ),

        "Rotatable_Bonds": int(
            Lipinski.NumRotatableBonds(mol)
        ),

        "Aromatic_Rings": int(
            Lipinski.NumAromaticRings(mol)
        ),

        "Total_Rings": int(
            Lipinski.RingCount(mol)
        ),

        "Heavy_Atom_Count": int(
            Lipinski.HeavyAtomCount(mol)
        ),

        "Fraction_Csp3": round(
            float(rdMolDescriptors.CalcFractionCSP3(mol)), 3
        ),

        "Formal_Charge": int(
            Chem.GetFormalCharge(mol)
        ),

        "Atom_Count": int(
            mol.GetNumAtoms()
        ),

        "Bond_Count": int(
            mol.GetNumBonds()
        )

    }

    return descriptors


# ==================================================
# PREDICTION LABEL
# ==================================================

def get_prediction_label(class_id: int):

    if class_id == 1:
        return "Active"

    if class_id == 0:
        return "Inactive"

    return "Unknown"


# ==================================================
# MODEL CONFIDENCE
# ==================================================

def calculate_confidence(model, features, predicted_class):

    confidence = None
    confidence_type = "unavailable"

    # ----------------------------------------------
    # Probability-based confidence
    # ----------------------------------------------

    if hasattr(model, "predict_proba"):

        probabilities = model.predict_proba(
            features
        )[0]

        classes = list(
            model.classes_
        )

        class_index = classes.index(
            predicted_class
        )

        confidence = float(
            probabilities[class_index]
        )

        confidence_type = "probability"

    # ----------------------------------------------
    # Decision score-based estimate
    # ----------------------------------------------

    elif hasattr(model, "decision_function"):

        score = float(
            model.decision_function(features)[0]
        )

        score = float(
            np.clip(abs(score), 0, 50)
        )

        confidence = float(
            1.0 / (1.0 + np.exp(-score))
        )

        confidence_type = (
            "decision_score_based_estimate"
        )

    return confidence, confidence_type


# ==================================================
# ROOT ENDPOINT
# ==================================================

@app.get("/")
def root():

    return {

        "message": "Bioactive Molecule Predictor API",

        "default_model": BEST_MODEL_NAME,

        "available_models": list(
            MODEL_FILES.keys()
        ),

        "prediction_mode": "All five models",

        "docs": "/docs"

    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health():

    return {

        "status": "healthy",

        "default_model": BEST_MODEL_NAME,

        "available_models": list(
            MODEL_FILES.keys()
        ),

        "model_directory": MODEL_DIR,

        "model_directory_exists": os.path.exists(
            MODEL_DIR
        )

    }


# ==================================================
# AVAILABLE MODELS ENDPOINT
# ==================================================

@app.get("/models")
def get_available_models():

    model_status = {}

    for model_name, filename in MODEL_FILES.items():

        filepath = os.path.join(
            MODEL_DIR,
            filename
        )

        model_status[model_name] = {

            "filename": filename,

            "available": os.path.exists(
                filepath
            ),

            "highlighted": (
                model_name == BEST_MODEL_NAME
            )

        }

    return {

        "default_model": BEST_MODEL_NAME,

        "models": list(
            MODEL_FILES.keys()
        ),

        "model_status": model_status,

        "prediction_mode": "All five models"

    }


# ==================================================
# MODEL PERFORMANCE METRICS
# ==================================================

@app.get("/api/v1/model-metrics")
def get_model_metrics():

    if not os.path.isfile(METRICS_PATH):
        raise HTTPException(
            status_code=404,
            detail="Model evaluation metrics are not available yet. Run the comparison training script first."
        )

    display_names = {
        "XGBoost": "XGBoost",
        "Random Forest": "Random Forest",
        "LSVM": "Linear SVM",
        "RBFN": "RBF Network",
        "Naive Bayes": "Naive Bayes",
    }

    metric_fields = {
        "Accuracy": "accuracy",
        "Precision": "precision",
        "Recall": "recall",
        "F1 Score": "f1_score",
        "ROC-AUC": "roc_auc",
    }

    try:
        with open(METRICS_PATH, newline="", encoding="utf-8") as metrics_file:
            rows = list(csv.DictReader(metrics_file))

        models = [
            {
                "model": display_names.get(row["Model"], row["Model"]),
                "training_samples": int(row.get("Training Samples", 0)),
                "test_samples": int(row.get("Test Samples", 0)),
                **{
                    output_name: float(row[column_name])
                    for column_name, output_name in metric_fields.items()
                },
            }
            for row in rows
        ]
    except (OSError, KeyError, ValueError, TypeError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read model evaluation metrics: {error}"
        ) from error

    if not models:
        raise HTTPException(
            status_code=503,
            detail="The model evaluation metrics file contains no results."
        )

    return {
        "evaluation": (
            "Fixed molecule-grouped 80/20 holdout using six RDKit molecular descriptors."
        ),
        "training_samples": models[0]["training_samples"],
        "test_samples": models[0]["test_samples"],
        "models": models,
    }


# ==================================================
# PREDICTION ENDPOINT
# ALL FIVE MODELS
# ==================================================

@app.post("/predict")
@app.post("/api/v1/predict")
def predict(request: PredictRequest):

    if hasattr(request, "smiles"):
        clean_smiles = request.smiles.strip()
    else:
        clean_smiles = str(request.get("smiles", "")).strip()

    # ----------------------------------------------
    # Validate SMILES
    # ----------------------------------------------

    if not clean_smiles:

        raise HTTPException(
            status_code=422,
            detail="SMILES string cannot be empty."
        )

    mol = Chem.MolFromSmiles(
        clean_smiles
    )

    if mol is None:

        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid SMILES string '{clean_smiles}'. "
                "Chemistry parser could not resolve structure."
            )
        )

    try:
        molecular_descriptors = calculate_molecular_descriptors(mol)
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Descriptor calculation error: {str(err)}"
        )

    features = smiles_to_features(clean_smiles)

    if features is None:
        raise HTTPException(
            status_code=422,
            detail="Unable to generate molecular features."
        )

    missing_model_files = [
        filename
        for filename in MODEL_FILES.values()
        if not os.path.exists(os.path.join(MODEL_DIR, filename))
    ]

    if missing_model_files:
        return {
            "smiles": clean_smiles,
            "total_models": len(MODEL_FILES),
            "successful_models": 0,
            "default_model": BEST_MODEL_NAME,
            "predictions": [],
            "molecular_descriptors": molecular_descriptors,
            "message": (
                "Comparison models are not available in the project yet. "
                "Train or add the .joblib files to enable the five-model route."
            )
        }

    all_predictions = []

    for model_name in MODEL_FILES.keys():

        try:
            model = get_model(model_name)
            pred_int = int(model.predict(features)[0])
            pred_label = get_prediction_label(pred_int)
            confidence, confidence_type = calculate_confidence(
                model,
                features,
                pred_int
            )

            all_predictions.append({
                "model": model_name,
                "prediction": pred_label,
                "class_id": pred_int,
                "probability": round(confidence, 4) if confidence is not None else None,
                "confidence_type": confidence_type,
                "is_best_model": model_name == BEST_MODEL_NAME,
                "status": "success"
            })

        except Exception as err:
            all_predictions.append({
                "model": model_name,
                "prediction": None,
                "class_id": None,
                "probability": None,
                "confidence_type": "unavailable",
                "is_best_model": model_name == BEST_MODEL_NAME,
                "status": "error",
                "error": str(err)
            })

            print(f"[ERROR] Prediction failed for {model_name}: {str(err)}")

    successful_predictions = [
        result for result in all_predictions if result["status"] == "success"
    ]

    return {
        "smiles": clean_smiles,
        "total_models": len(MODEL_FILES),
        "successful_models": len(successful_predictions),
        "default_model": BEST_MODEL_NAME,
        "predictions": all_predictions,
        "molecular_descriptors": molecular_descriptors,
        "message": "Five-model comparison completed."
    }


# ==================================================
# MODEL DIAGNOSTIC IMAGE ENDPOINT
# ==================================================

@app.get("/model-image/{filename}")
def get_model_image(filename: str):

    allowed = [

        "roc_curve_comparison.png",

        "precision_recall_comparison.png",

        "accuracy_comparison.png",

        "precision_comparison.png",

        "recall_sensitivity_comparison.png",

        "specificity_comparison.png",

        "f1_score_comparison.png",

        "roc_auc_comparison.png",

        "mcc_comparison.png",

        "xgboost_confusion_matrix.png",

        "random_forest_confusion_matrix.png",

        "lsvm_confusion_matrix.png",

        "naive_bayes_confusion_matrix.png",

        "rbfn_confusion_matrix.png"

    ]

    if filename not in allowed:

        raise HTTPException(
            status_code=404,
            detail="Image not found."
        )

    filepath = os.path.join(
        RESULTS_DIR,
        filename
    )

    if not os.path.exists(filepath):

        raise HTTPException(
            status_code=404,
            detail=f"{filename} not generated yet."
        )

    return FileResponse(
        filepath,
        media_type="image/png"
    )


# ==================================================
# FRONTEND MOUNT
# ==================================================# ==================================================
# FINAL XGBOOST MODEL
# ==================================================

final_xgb_model = None


def load_final_xgb_model():

    global final_xgb_model

    if final_xgb_model is None:

        final_xgb_model = XGBClassifier()

        final_xgb_model.load_model(FINAL_XGB_MODEL_PATH)

    return final_xgb_model


# ==================================================
# SMILES TO MORGAN FINGERPRINT
# ==================================================

def smiles_to_morgan_fingerprint(smiles):

    molecule = Chem.MolFromSmiles(smiles)

    if molecule is None:
        raise ValueError("Invalid SMILES representation.")

    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=2,
        fpSize=2048
    )

    fingerprint = generator.GetFingerprint(molecule)

    fingerprint_array = np.zeros(
        (2048,),
        dtype=np.int8
    )

    Chem.DataStructs.ConvertToNumpyArray(
        fingerprint,
        fingerprint_array
    )

    return fingerprint_array.reshape(1, -1)


# ==================================================
# FINAL XGBOOST PREDICTION API
# ==================================================

@app.post("/predict-xgb")
@app.post("/api/v1/predict-xgb")
def predict_final_xgb(request: PredictRequest):

    smiles = request.smiles.strip()

    if not smiles:
        raise HTTPException(
            status_code=422,
            detail="SMILES input is required."
        )

    try:

        fingerprint = smiles_to_morgan_fingerprint(smiles)
        molecule = Chem.MolFromSmiles(smiles)

        model = load_final_xgb_model()

        prediction = int(model.predict(fingerprint)[0])

        probabilities = model.predict_proba(fingerprint)[0]

        probability_active = float(probabilities[1])

        probability_inactive = float(probabilities[0])

        prediction_label = (
            "Active" if prediction == 1 else "Inactive"
        )

        return {
            "smiles": smiles,
            "model": "Final XGBoost - Morgan Fingerprint",
            "target": "COX-2",
            "prediction": prediction_label,
            "class_id": prediction,
            "molecular_descriptors": calculate_molecular_descriptors(molecule),
            "probability_active": round(
                probability_active, 4
            ),
            "probability_inactive": round(
                probability_inactive, 4
            ),
           "confidence": round(
                float(max(probabilities)), 4
),
            "fingerprint": {
                "type": "Morgan",
                "radius": 2,
                "bits": 2048
            }
        }

    except ValueError as error:

        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}"
        )