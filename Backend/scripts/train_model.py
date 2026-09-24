"""Train the XGBioactive COX-2 classifier from the preprocessed dataset."""

from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, Lipinski
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "CHEMBL230_Preprocessed_Data.csv"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "xgb_cox2.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

FEATURES = [
    "molecular_weight",
    "rotatable_bonds",
    "h_bond_acceptors",
    "h_bond_donors",
    "tpsa",
    "logp",
]


def descriptors(smiles: str) -> list[float]:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    return [
        float(Descriptors.MolWt(mol)),
        float(Lipinski.NumRotatableBonds(mol)),
        float(Lipinski.NumHAcceptors(mol)),
        float(Lipinski.NumHDonors(mol)),
        float(Descriptors.TPSA(mol)),
        float(Crippen.MolLogP(mol)),
    ]


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    required = {"molecule_chembl_id", "smiles", "bioactivity_class"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")

    df = df.dropna(subset=["smiles", "bioactivity_class"]).copy()
    df = df[df["bioactivity_class"].isin(["active", "inactive"])]

    X = np.asarray([descriptors(s) for s in df["smiles"]], dtype=float)
    y = df["bioactivity_class"].map({"active": 0, "inactive": 1}).to_numpy()
    groups = df["molecule_chembl_id"].to_numpy()

    splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups))

    scale_pos_weight = float((y[train_idx] == 0).sum() / (y[train_idx] == 1).sum())
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="aucpr",
        n_jobs=4,
    )
    model.fit(X[train_idx], y[train_idx])

    pred = model.predict(X[test_idx])
    prob = model.predict_proba(X[test_idx])[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y[test_idx], pred)),
        "precision_active": float(precision_score(y[test_idx], pred, pos_label=0)),
        "recall_active": float(recall_score(y[test_idx], pred, pos_label=0)),
        "f1_active": float(f1_score(y[test_idx], pred, pos_label=0)),
        "precision_inactive": float(precision_score(y[test_idx], pred)),
        "recall_inactive": float(recall_score(y[test_idx], pred)),
        "f1_inactive": float(f1_score(y[test_idx], pred)),
        "roc_auc": float(roc_auc_score(y[test_idx], prob)),
        "average_precision": float(average_precision_score(y[test_idx], prob)),
        "confusion_matrix": confusion_matrix(y[test_idx], pred).tolist(),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps({
        "dataset": DATA_PATH.name,
        "rows": int(len(df)),
        "unique_molecules": int(df["molecule_chembl_id"].nunique()),
        "class_counts": {k: int(v) for k, v in df["bioactivity_class"].value_counts().items()},
        "feature_names": FEATURES,
        "target_mapping": {"active": 0, "inactive": 1},
        "split": "StratifiedGroupKFold first fold, grouped by molecule_chembl_id",
        "random_state": 42,
        "model_parameters": model.get_params(),
        "metrics": metrics,
    }, indent=2, default=str))

    print(f"Model saved to: {MODEL_PATH}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
