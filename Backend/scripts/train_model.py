"""Train the XGBioactive COX-2 classifier and generate evaluation plots."""

from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

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
    roc_curve,
    precision_recall_curve,
)

from sklearn.model_selection import StratifiedGroupKFold
from xgboost import XGBClassifier


# =========================
# PATHS
# =========================

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = ROOT / "data" / "CHEMBL230_Preprocessed_Data.csv"

MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "xgb_cox2.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

RESULTS_DIR = ROOT / "results"


# =========================
# FEATURES
# =========================

FEATURES = [
    "molecular_weight",
    "rotatable_bonds",
    "h_bond_acceptors",
    "h_bond_donors",
    "tpsa",
    "logp",
]


# =========================
# DESCRIPTOR CALCULATION
# =========================

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


# =========================
# PLOT 1
# ROC-AUC CURVE
# =========================

def plot_roc_curve(y_true, probabilities):

    fpr, tpr, _ = roc_curve(y_true, probabilities)
    auc = roc_auc_score(y_true, probabilities)

    plt.figure(figsize=(7, 6))

    plt.plot(
        fpr,
        tpr,
        linewidth=2,
        label=f"XGBoost (AUC = {auc:.3f})"
    )

    plt.plot(
        [0, 1],
        [0, 1],
        linestyle="--",
        linewidth=1
    )

    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")

    plt.title("ROC-AUC Curve")

    plt.legend()

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "roc_auc_curve.png",
        dpi=300
    )

    plt.close()


# =========================
# PLOT 2
# PRECISION-RECALL CURVE
# =========================

def plot_precision_recall_curve(y_true, probabilities):

    precision, recall, _ = precision_recall_curve(
        y_true,
        probabilities
    )

    ap = average_precision_score(
        y_true,
        probabilities
    )

    plt.figure(figsize=(7, 6))

    plt.plot(
        recall,
        precision,
        linewidth=2,
        label=f"Average Precision = {ap:.3f}"
    )

    plt.xlabel("Recall")
    plt.ylabel("Precision")

    plt.title("Precision-Recall Curve")

    plt.legend()

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "precision_recall_curve.png",
        dpi=300
    )

    plt.close()


# =========================
# PLOT 3
# CONFUSION MATRIX HEATMAP
# =========================

def plot_confusion_matrix(y_true, predictions):

    cm = confusion_matrix(
        y_true,
        predictions
    )

    plt.figure(figsize=(7, 6))

    plt.imshow(cm)

    plt.title("Confusion Matrix")

    plt.xlabel("Predicted")

    plt.ylabel("Actual")

    plt.xticks(
        [0, 1],
        ["Active", "Inactive"]
    )

    plt.yticks(
        [0, 1],
        ["Active", "Inactive"]
    )

    for i in range(cm.shape[0]):

        for j in range(cm.shape[1]):

            plt.text(
                j,
                i,
                cm[i, j],
                ha="center",
                va="center"
            )

    plt.colorbar()

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "confusion_matrix_heatmap.png",
        dpi=300
    )

    plt.close()


# =========================
# PLOT 4
# FEATURE IMPORTANCE
# =========================

def plot_feature_importance(model):

    importance = model.feature_importances_

    order = np.argsort(importance)

    plt.figure(figsize=(8, 6))

    plt.barh(
        np.array(FEATURES)[order],
        importance[order]
    )

    plt.xlabel("Importance")

    plt.ylabel("Molecular Descriptor")

    plt.title("XGBoost Feature Importance")

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "feature_importance.png",
        dpi=300
    )

    plt.close()


# =========================
# PLOT 5
# CLASS DISTRIBUTION
# =========================

def plot_class_distribution(df):

    counts = (
        df["bioactivity_class"]
        .value_counts()
        .reindex(["active", "inactive"])
    )

    plt.figure(figsize=(7, 5))

    plt.bar(
        counts.index,
        counts.values
    )

    plt.xlabel("Bioactivity Class")

    plt.ylabel("Number of Molecules")

    plt.title("Bioactivity Class Distribution")

    for i, value in enumerate(counts.values):

        plt.text(
            i,
            value,
            str(value),
            ha="center",
            va="bottom"
        )

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "class_distribution.png",
        dpi=300
    )

    plt.close()


# =========================
# MAIN TRAINING
# =========================

def main():

    print("\nLoading dataset...")

    df = pd.read_csv(DATA_PATH)

    required = {
        "molecule_chembl_id",
        "smiles",
        "bioactivity_class"
    }

    missing = required - set(df.columns)

    if missing:

        raise ValueError(
            f"Missing columns: {sorted(missing)}"
        )

    df = df.dropna(
        subset=[
            "smiles",
            "bioactivity_class"
        ]
    ).copy()

    df = df[
        df["bioactivity_class"].isin(
            ["active", "inactive"]
        )
    ]

    print(f"Dataset rows: {len(df)}")

    print("\nCalculating molecular descriptors...")

    X = np.asarray(
        [
            descriptors(s)
            for s in df["smiles"]
        ],
        dtype=float
    )

    y = (
        df["bioactivity_class"]
        .map(
            {
                "active": 0,
                "inactive": 1
            }
        )
        .to_numpy()
    )

    groups = df[
        "molecule_chembl_id"
    ].to_numpy()


    # =========================
    # TRAIN / TEST SPLIT
    # =========================

    splitter = StratifiedGroupKFold(
        n_splits=5,
        shuffle=True,
        random_state=42
    )

    train_idx, test_idx = next(
        splitter.split(
            X,
            y,
            groups
        )
    )


    # =========================
    # XGBOOST
    # =========================

    scale_pos_weight = float(
        (y[train_idx] == 0).sum()
        /
        (y[train_idx] == 1).sum()
    )

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


    print("\nTraining XGBoost model...")

    model.fit(
        X[train_idx],
        y[train_idx]
    )


    # =========================
    # PREDICTIONS
    # =========================

    predictions = model.predict(
        X[test_idx]
    )

    probabilities = model.predict_proba(
        X[test_idx]
    )[:, 1]


    # =========================
    # METRICS
    # =========================

    metrics = {

        "accuracy": float(
            accuracy_score(
                y[test_idx],
                predictions
            )
        ),

        "precision_active": float(
            precision_score(
                y[test_idx],
                predictions,
                pos_label=0
            )
        ),

        "recall_active": float(
            recall_score(
                y[test_idx],
                predictions,
                pos_label=0
            )
        ),

        "f1_active": float(
            f1_score(
                y[test_idx],
                predictions,
                pos_label=0
            )
        ),

        "precision_inactive": float(
            precision_score(
                y[test_idx],
                predictions
            )
        ),

        "recall_inactive": float(
            recall_score(
                y[test_idx],
                predictions
            )
        ),

        "f1_inactive": float(
            f1_score(
                y[test_idx],
                predictions
            )
        ),

        "roc_auc": float(
            roc_auc_score(
                y[test_idx],
                probabilities
            )
        ),

        "average_precision": float(
            average_precision_score(
                y[test_idx],
                probabilities
            )
        ),

        "confusion_matrix": (
            confusion_matrix(
                y[test_idx],
                predictions
            ).tolist()
        ),
    }


    # =========================
    # CREATE RESULT FOLDER
    # =========================

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )


    # =========================
    # SAVE MODEL
    # =========================

    joblib.dump(
        model,
        MODEL_PATH
    )


    # =========================
    # GENERATE GRAPHS
    # =========================

    print("\nGenerating evaluation graphs...")

    plot_roc_curve(
        y[test_idx],
        probabilities
    )

    plot_precision_recall_curve(
        y[test_idx],
        probabilities
    )

    plot_confusion_matrix(
        y[test_idx],
        predictions
    )

    plot_feature_importance(
        model
    )

    plot_class_distribution(
        df
    )


    # =========================
    # SAVE METADATA
    # =========================

    METADATA_PATH.write_text(

        json.dumps(

            {
                "dataset": DATA_PATH.name,

                "rows": int(len(df)),

                "unique_molecules": int(
                    df[
                        "molecule_chembl_id"
                    ].nunique()
                ),

                "class_counts": {
                    k: int(v)
                    for k, v in
                    df[
                        "bioactivity_class"
                    ]
                    .value_counts()
                    .items()
                },

                "feature_names": FEATURES,

                "target_mapping": {
                    "active": 0,
                    "inactive": 1
                },

                "split":
                    "StratifiedGroupKFold first fold, "
                    "grouped by molecule_chembl_id",

                "random_state": 42,

                "model_parameters":
                    model.get_params(),

                "metrics": metrics,

                "plots": [
                    "roc_auc_curve.png",
                    "precision_recall_curve.png",
                    "confusion_matrix_heatmap.png",
                    "feature_importance.png",
                    "class_distribution.png"
                ]
            },

            indent=2,

            default=str
        )
    )


    # =========================
    # PRINT RESULTS
    # =========================

    print("\n====================================")
    print("MODEL TRAINING COMPLETE")
    print("====================================")

    print(
        f"\nModel saved to:\n{MODEL_PATH}"
    )

    print(
        f"\nGraphs saved to:\n{RESULTS_DIR}"
    )

    print("\nEvaluation Metrics:")

    print(
        json.dumps(
            metrics,
            indent=2
        )
    )

    print("\nGenerated files:")

    for file in RESULTS_DIR.iterdir():

        print(
            f"  - {file.name}"
        )


if __name__ == "__main__":
    main()