from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Compound(Base):
    __tablename__ = "compounds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    source: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    molecular_formula: Mapped[str | None] = mapped_column(String(80), nullable=True)
    molecular_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    chembl_id: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)
    smiles: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ActivityMeasurement(Base):
    __tablename__ = "activity_measurements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    compound_id: Mapped[int] = mapped_column(ForeignKey("compounds.id"), index=True)
    standard_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    standard_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    standard_units: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source: Mapped[str] = mapped_column(String(80), default="CHEMBL230_RAW_DATA")


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    smiles: Mapped[str] = mapped_column(Text)

    prediction: Mapped[str] = mapped_column(String(30))

    confidence: Mapped[float] = mapped_column(Float)

    molecular_weight: Mapped[float] = mapped_column(Float)
    rotatable_bonds: Mapped[int] = mapped_column()
    h_bond_acceptors: Mapped[int] = mapped_column()
    h_bond_donors: Mapped[int] = mapped_column()
    tpsa: Mapped[float] = mapped_column(Float)
    logp: Mapped[float] = mapped_column(Float)

    model: Mapped[str] = mapped_column(String(80), default="XGBoost")
    target: Mapped[str] = mapped_column(String(80), default="COX-2")

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )