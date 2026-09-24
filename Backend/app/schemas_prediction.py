from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    smiles: str = Field(min_length=2, max_length=10000)


class MolecularDescriptors(BaseModel):
    molecular_weight: float
    rotatable_bonds: int
    h_bond_acceptors: int
    h_bond_donors: int
    tpsa: float
    logp: float


class PredictionResponse(BaseModel):
    smiles: str
    prediction: str
    confidence: float
    descriptors: MolecularDescriptors
    model: str = "XGBoost"
    target: str = "COX-2"


class PredictionHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    smiles: str
    prediction: str
    confidence: float
    molecular_weight: float
    rotatable_bonds: int
    h_bond_acceptors: int
    h_bond_donors: int
    tpsa: float
    logp: float
    model: str
    target: str
    created_at: datetime