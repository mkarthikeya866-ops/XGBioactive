from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ....database import get_db
from ....models import PredictionHistory
from ....schemas_prediction import (
    MolecularDescriptors,
    PredictionHistoryRead,
    PredictionRequest,
    PredictionResponse,
)
from ....services.prediction import predict


router = APIRouter(prefix="/api/v1", tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict_bioactivity(
    payload: PredictionRequest,
    db: Session = Depends(get_db),
) -> PredictionResponse:
    smiles = payload.smiles.strip()

    try:
        activity, confidence, descriptors = predict(smiles)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Prediction model is not available.",
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Prediction failed.",
        ) from exc

    history = PredictionHistory(
        smiles=smiles,
        prediction=activity,
        confidence=confidence,
        molecular_weight=descriptors["molecular_weight"],
        rotatable_bonds=descriptors["rotatable_bonds"],
        h_bond_acceptors=descriptors["h_bond_acceptors"],
        h_bond_donors=descriptors["h_bond_donors"],
        tpsa=descriptors["tpsa"],
        logp=descriptors["logp"],
        model="XGBoost",
        target="COX-2",
    )

    db.add(history)
    db.commit()

    return PredictionResponse(
        smiles=smiles,
        prediction=activity,
        confidence=confidence,
        descriptors=MolecularDescriptors(**descriptors),
    )


@router.get(
    "/predictions",
    response_model=list[PredictionHistoryRead],
)
def get_prediction_history(
    db: Session = Depends(get_db),
):
    statement = (
        select(PredictionHistory)
        .order_by(PredictionHistory.created_at.desc())
    )

    return db.scalars(statement).all()