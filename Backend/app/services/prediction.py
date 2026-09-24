from pathlib import Path
from functools import lru_cache

import joblib
from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, Lipinski

MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "xgb_cox2.joblib"

DESCRIPTOR_NAMES = [
    "molecular_weight",
    "rotatable_bonds",
    "h_bond_acceptors",
    "h_bond_donors",
    "tpsa",
    "logp",
]


@lru_cache(maxsize=1)
def get_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Trained model not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def calculate_descriptors(smiles: str) -> tuple[Chem.Mol, dict[str, float]]:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError("Invalid SMILES string.")

    values = {
        "molecular_weight": float(Descriptors.MolWt(mol)),
        "rotatable_bonds": int(Lipinski.NumRotatableBonds(mol)),
        "h_bond_acceptors": int(Lipinski.NumHAcceptors(mol)),
        "h_bond_donors": int(Lipinski.NumHDonors(mol)),
        "tpsa": float(Descriptors.TPSA(mol)),
        "logp": float(Crippen.MolLogP(mol)),
    }
    return mol, values


def predict(smiles: str) -> tuple[str, float, dict[str, float]]:
    _, descriptors = calculate_descriptors(smiles)
    features = [[descriptors[name] for name in DESCRIPTOR_NAMES]]
    model = get_model()

    predicted_class = int(model.predict(features)[0])
    probabilities = model.predict_proba(features)[0]

    # Training mapping: active=0, inactive=1.
    activity = "active" if predicted_class == 0 else "inactive"
    confidence = float(probabilities[predicted_class])

    return activity, confidence, descriptors
