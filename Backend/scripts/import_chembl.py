import argparse
import csv
import re
from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal, ensure_schema
from app.models import ActivityMeasurement, Compound


def slug_for(chembl_id: str) -> str:
    return chembl_id.lower()


def parse_float(value: str) -> float | None:
    try:
        return float(value) if value.strip() else None
    except ValueError:
        return None


def import_csv(path: Path) -> tuple[int, int, int]:
    ensure_schema()
    compounds_created = 0
    activities_created = 0
    invalid_rows = 0
    with SessionLocal() as db, path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            chembl_id = row["Molecule ChEMBL ID"].strip()
            if not re.fullmatch(r"CHEMBL\d+", chembl_id):
                invalid_rows += 1
                continue

            compound = db.scalar(select(Compound).where(Compound.chembl_id == chembl_id))
            smiles = row.get("Smiles", "").strip() or None
            if compound is None:
                compound = Compound(
                    name=chembl_id,
                    slug=slug_for(chembl_id),
                    category="ChEMBL bioactivity",
                    source="ChEMBL",
                    summary=f"Bioactivity record for {chembl_id}.",
                    description="Imported from the ChEMBL raw activity dataset.",
                    chembl_id=chembl_id,
                    smiles=smiles,
                )
                db.add(compound)
                db.flush()
                compounds_created += 1
            elif smiles and not compound.smiles:
                compound.smiles = smiles

            standard_type = row.get("Standard Type", "").strip() or None
            standard_value = parse_float(row.get("Standard Value", ""))
            standard_units = row.get("Standard Units", "").strip() or None
            duplicate = db.scalar(
                select(ActivityMeasurement.id).where(
                    ActivityMeasurement.compound_id == compound.id,
                    ActivityMeasurement.standard_type == standard_type,
                    ActivityMeasurement.standard_value == standard_value,
                    ActivityMeasurement.standard_units == standard_units,
                )
            )
            if duplicate is None:
                db.add(ActivityMeasurement(
                    compound_id=compound.id,
                    standard_type=standard_type,
                    standard_value=standard_value,
                    standard_units=standard_units,
                ))
                activities_created += 1
        db.commit()
    return compounds_created, activities_created, invalid_rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import ChEMBL activity CSV data.")
    parser.add_argument("csv_path", type=Path)
    args = parser.parse_args()
    result = import_csv(args.csv_path)
    print(f"Imported compounds={result[0]} activities={result[1]} invalid_rows={result[2]}")