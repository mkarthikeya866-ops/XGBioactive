from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Compound


STARTER_COMPOUNDS = [
    {
        "name": "Curcumin",
        "slug": "curcumin",
        "category": "Polyphenol",
        "source": "Curcuma longa",
        "summary": "A bright yellow polyphenol studied for antioxidant activity.",
        "description": "Curcumin is the principal curcuminoid found in turmeric and is commonly researched for antioxidant and inflammatory pathway activity.",
        "molecular_formula": "C21H20O6",
        "molecular_weight": 368.38,
    },
    {
        "name": "Quercetin",
        "slug": "quercetin",
        "category": "Flavonoid",
        "source": "Many fruits and vegetables",
        "summary": "A dietary flavonoid with broad antioxidant research interest.",
        "description": "Quercetin is a flavonol found in onions, apples, and other plants, with research spanning oxidative stress and cellular signaling.",
        "molecular_formula": "C15H10O7",
        "molecular_weight": 302.24,
    },
    {
        "name": "Resveratrol",
        "slug": "resveratrol",
        "category": "Stilbenoid",
        "source": "Grapes and Japanese knotweed",
        "summary": "A plant stilbenoid investigated for cellular longevity pathways.",
        "description": "Resveratrol is a naturally occurring stilbenoid produced by several plants and studied in metabolic and cellular stress models.",
        "molecular_formula": "C14H12O3",
        "molecular_weight": 228.24,
    },
]


def seed_database(db: Session) -> None:
    if db.scalar(select(Compound.id).limit(1)) is not None:
        return
    db.add_all(Compound(**compound) for compound in STARTER_COMPOUNDS)
    db.commit()
