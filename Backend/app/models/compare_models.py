from pathlib import Path
import warnings

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import GaussianNB
from xgboost import XGBClassifier
from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, Lipinski
from app.models.rbf_network import RBFNetworkClassifier


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = (
    ROOT.parent
    / "data"
    / "processed"
    / "CHEMBL230_Preprocessed_Data_V2 copy.csv"
)

MODEL_DIR = ROOT / "app" / "models" / "comparison"

RESULTS_DIR = ROOT / "result"
METRICS_PATH = RESULTS_DIR / "model_metrics.csv"


# ============================================================
# FEATURES
# ============================================================

FEATURES = [
    "molecular_weight",
    "rotatable_bonds",
    "h_bond_acceptors",
    "h_bond_donors",
    "tpsa",
    "logp",
]


# ============================================================
# TARGET COLUMN IDENTIFICATION
# ============================================================

def find_column(df, candidates, description):

    lookup = {
        str(column).strip().lower(): column
        for column in df.columns
    }

    for candidate in candidates:

        if candidate.lower() in lookup:
            return lookup[candidate.lower()]

    raise ValueError(
        f"Could not identify {description} column.\n"
        f"Expected one of: {candidates}\n"
        f"Available columns: {list(df.columns)}"
    )


# ============================================================
# TARGET NORMALIZATION
# ============================================================

def normalize_target(series):

    values = series.astype(str).str.strip().str.lower()

    mapping = {
        "inactive": 0,
        "in-active": 0,
        "in active": 0,
        "0": 0,
        "false": 0,

        "active": 1,
        "1": 1,
        "true": 1,
    }

    mapped = values.map(mapping)

    if mapped.isna().any():

        unknown = sorted(
            values[mapped.isna()].unique().tolist()
        )

        raise ValueError(
            f"Unknown target labels: {unknown}. "
            "Expected Active/Inactive or 1/0."
        )

    return mapped.astype(int)


# ============================================================
# GET MODEL SCORES
# ============================================================

def get_scores(model, X):

    if hasattr(model, "predict_proba"):

        return model.predict_proba(X)[:, 1]

    if hasattr(model, "decision_function"):

        decision = model.decision_function(X)

        return 1.0 / (
            1.0 + np.exp(
                -np.clip(decision, -30, 30)
            )
        )

    return model.predict(X).astype(float)


def calculate_features(smiles):

    molecule = Chem.MolFromSmiles(str(smiles))

    if molecule is None:
        return [np.nan] * len(FEATURES)

    return [
        float(Descriptors.MolWt(molecule)),
        float(Lipinski.NumRotatableBonds(molecule)),
        float(Lipinski.NumHAcceptors(molecule)),
        float(Lipinski.NumHDonors(molecule)),
        float(Descriptors.TPSA(molecule)),
        float(Crippen.MolLogP(molecule)),
    ]


# ============================================================
# MAIN TRAINING FUNCTION
# ============================================================

def main():

    warnings.filterwarnings("ignore", category=UserWarning)

    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATA_PATH.exists():

        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("=" * 60)
    print("COX-2 BIOACTIVITY MODEL COMPARISON")
    print("=" * 60)

    print(f"\nLoading dataset: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]

    # --------------------------------------------------------
    # --------------------------------------------------------
    # Identify target and SMILES columns
    # --------------------------------------------------------

    target_col = find_column(
        df,
        [
            "bioactivity_class",
            "activity_class",
            "activity",
            "class",
            "target",
            "label",
            "bioactivity",
        ],
        "target",
    )

    smiles_col = find_column(
        df,
        [
            "canonical_smiles",
            "canonical_smile",
            "smiles",
            "molecule_smiles",
        ],
        "SMILES",
    )

    print(f"Target column: {target_col}")
    print(f"SMILES column: {smiles_col}")

    # --------------------------------------------------------
    # Prepare data
    # --------------------------------------------------------

    data = df[[target_col, smiles_col]].copy()

    calculated_features = data[smiles_col].apply(calculate_features)
    feature_frame = pd.DataFrame(
        calculated_features.tolist(),
        columns=FEATURES,
        index=data.index,
    )
    data[FEATURES] = feature_frame

    data[target_col] = normalize_target(
        data[target_col]
    )

    data = data.dropna(
        subset=FEATURES + [target_col, smiles_col]
    )

    data[smiles_col] = data[smiles_col].astype(str)

    X = data[FEATURES].to_numpy(dtype=float)

    y = data[target_col].to_numpy(dtype=int)

    groups = data[smiles_col].to_numpy()

    if len(np.unique(y)) != 2:

        raise ValueError(
            f"Expected two classes, found {np.unique(y)}"
        )

    if len(data) < 10:

        raise ValueError(
            f"Too few usable rows: {len(data)}"
        )

    print(f"\nUsable rows: {len(data)}")

    print("\nClass distribution:")

    print(
        data[target_col]
        .value_counts()
        .rename(index={0: "Inactive", 1: "Active"})
    )

    # --------------------------------------------------------
    # Train-test split
    # --------------------------------------------------------

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_idx, test_idx = next(
        splitter.split(
            X,
            y,
            groups=groups
        )
    )

    X_train = X[train_idx]
    X_test = X[test_idx]

    y_train = y[train_idx]
    y_test = y[test_idx]

    print(f"\nTraining rows: {len(train_idx)}")
    print(f"Testing rows: {len(test_idx)}")

    # --------------------------------------------------------
    # Define five models
    # --------------------------------------------------------

    models = {

        "XGBoost": XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        ),

        "Random Forest": RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1,
        ),

        "LSVM": Pipeline([
            ("scaler", StandardScaler()),
            (
                "classifier",
                LinearSVC(
                    class_weight="balanced",
                    random_state=42,
                )
            ),
        ]),

        "RBFN": Pipeline([
            ("scaler", StandardScaler()),
            (
                "classifier",
                RBFNetworkClassifier(
                    n_centers=50,
                    random_state=42,
                )
            ),
        ]),

        "Naive Bayes": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", GaussianNB()),
        ]),
    }

    # --------------------------------------------------------
    # Train models and evaluate
    # --------------------------------------------------------

    rows = []

    roc_data = {}

    confusion_data = {}

    for name, model in models.items():

        print(f"\n{'-' * 50}")
        print(f"Training {name}...")
        print(f"{'-' * 50}")

        model.fit(
            X_train,
            y_train
        )

        predictions = model.predict(X_test)

        scores = get_scores(
            model,
            X_test
        )

        auc = roc_auc_score(
            y_test,
            scores
        )

        metrics = {

            "Model": name,

            "Accuracy": accuracy_score(
                y_test,
                predictions
            ),

            "Precision": precision_score(
                y_test,
                predictions,
                zero_division=0
            ),

            "Recall": recall_score(
                y_test,
                predictions,
                zero_division=0
            ),

            "F1 Score": f1_score(
                y_test,
                predictions,
                zero_division=0
            ),

            "ROC-AUC": auc,
            "Training Samples": len(train_idx),
            "Test Samples": len(test_idx),
        }

        rows.append(metrics)

        confusion_data[name] = confusion_matrix(
            y_test,
            predictions
        )

        fpr, tpr, _ = roc_curve(
            y_test,
            scores
        )

        roc_data[name] = (
            fpr,
            tpr,
            auc
        )

        # ----------------------------------------------------
        # Save model
        # ----------------------------------------------------

        filename = (
            name.lower()
            .replace(" ", "_")
            + ".joblib"
        )

        model_path = MODEL_DIR / filename

        joblib.dump(
            model,
            model_path
        )

        print(f"Saved: {model_path}")

        print(
            f"Accuracy: {metrics['Accuracy']:.4f}"
        )

        print(
            f"ROC-AUC: {metrics['ROC-AUC']:.4f}"
        )

    # --------------------------------------------------------
    # Save comparison metrics
    # --------------------------------------------------------

    metrics_df = pd.DataFrame(rows)

    metrics_df = metrics_df.sort_values(
        "ROC-AUC",
        ascending=False
    )

    metrics_df.to_csv(
        METRICS_PATH,
        index=False
    )

    # --------------------------------------------------------
    # ROC curve plot
    # --------------------------------------------------------

    plt.figure(figsize=(9, 7))

    for name, (fpr, tpr, auc) in roc_data.items():

        plt.plot(
            fpr,
            tpr,
            label=f"{name} (AUC={auc:.3f})"
        )

    plt.plot(
        [0, 1],
        [0, 1],
        "k--",
        label="Random baseline"
    )

    plt.xlabel("False Positive Rate")

    plt.ylabel("True Positive Rate")

    plt.title(
        "ROC Curve Comparison - COX-2 Bioactivity"
    )

    plt.legend(
        loc="lower right"
    )

    plt.tight_layout()

    roc_path = RESULTS_DIR / "roc_curve.png"

    plt.savefig(
        roc_path,
        dpi=300
    )

    plt.close()

    # --------------------------------------------------------
    # Confusion matrices
    # --------------------------------------------------------

    fig, axes = plt.subplots(
        1,
        len(confusion_data),
        figsize=(20, 4)
    )

    for axis, (name, matrix) in zip(
        axes,
        confusion_data.items()
    ):

        display = ConfusionMatrixDisplay(
            confusion_matrix=matrix,
            display_labels=[
                "Inactive",
                "Active"
            ],
        )

        display.plot(
            ax=axis,
            colorbar=False,
            values_format="d"
        )

        axis.set_title(name)

    fig.tight_layout()

    confusion_path = (
        RESULTS_DIR
        / "confusion_matrices.png"
    )

    fig.savefig(
        confusion_path,
        dpi=300
    )

    plt.close(fig)

    # --------------------------------------------------------
    # Final results
    # --------------------------------------------------------

    print("\n" + "=" * 60)

    print("MODEL COMPARISON RESULTS")

    print("=" * 60)

    print(
        metrics_df.to_string(
            index=False,
            float_format=lambda value: f"{value:.4f}"
        )
    )

    print("\nFiles generated:")

    print(f"Metrics: {METRICS_PATH}")

    print(f"ROC Curve: {roc_path}")

    print(f"Confusion Matrices: {confusion_path}")

    print(f"Models Folder: {MODEL_DIR}")

    print("\nFIVE MODEL COMPARISON COMPLETED")


# ============================================================
# SCRIPT ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()