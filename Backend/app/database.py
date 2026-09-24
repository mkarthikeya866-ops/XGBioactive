from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    compound_columns = {column["name"] for column in inspector.get_columns("compounds")}
    with engine.begin() as connection:
        if "chembl_id" not in compound_columns:
            connection.execute(text("ALTER TABLE compounds ADD COLUMN chembl_id VARCHAR(30)"))
        if "smiles" not in compound_columns:
            connection.execute(text("ALTER TABLE compounds ADD COLUMN smiles TEXT"))
