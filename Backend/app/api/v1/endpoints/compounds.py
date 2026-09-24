from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ....database import get_db
from ....models import Compound
from ....schemas import CategoryCount, CompoundCreate, CompoundRead, CompoundUpdate

router = APIRouter(prefix="/api/v1", tags=["catalog"])


@router.get("/categories", response_model=list[CategoryCount])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryCount]:
    rows = db.execute(
        select(Compound.category, func.count(Compound.id).label("count"))
        .group_by(Compound.category)
        .order_by(Compound.category)
    ).all()
    return [CategoryCount(category=category, count=count) for category, count in rows]


@router.get("/compounds", response_model=list[CompoundRead])
def list_compounds(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    category: str | None = Query(default=None, max_length=80),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Compound]:
    query = select(Compound).order_by(Compound.name).offset(skip).limit(limit)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Compound.name.ilike(term), Compound.summary.ilike(term), Compound.source.ilike(term)))
    if category:
        query = query.where(Compound.category.ilike(category))
    return list(db.scalars(query).all())


@router.get("/compounds/{compound_id}", response_model=CompoundRead)
def get_compound(compound_id: int, db: Session = Depends(get_db)) -> Compound:
    compound = db.get(Compound, compound_id)
    if compound is None:
        raise HTTPException(status_code=404, detail="Compound not found")
    return compound


@router.post("/compounds", response_model=CompoundRead, status_code=status.HTTP_201_CREATED)
def create_compound(payload: CompoundCreate, db: Session = Depends(get_db)) -> Compound:
    compound = Compound(**payload.model_dump(mode="json"))
    db.add(compound)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A compound with this slug already exists") from None
    db.refresh(compound)
    return compound


@router.patch("/compounds/{compound_id}", response_model=CompoundRead)
def update_compound(compound_id: int, payload: CompoundUpdate, db: Session = Depends(get_db)) -> Compound:
    compound = db.get(Compound, compound_id)
    if compound is None:
        raise HTTPException(status_code=404, detail="Compound not found")
    for field, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(compound, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A compound with this slug already exists") from None
    db.refresh(compound)
    return compound


@router.delete("/compounds/{compound_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_compound(compound_id: int, db: Session = Depends(get_db)) -> None:
    compound = db.get(Compound, compound_id)
    if compound is None:
        raise HTTPException(status_code=404, detail="Compound not found")
    db.delete(compound)
    db.commit()
