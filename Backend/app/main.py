from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.router import router as api_router
from .config import get_settings
from .database import ensure_schema, get_db
from .seed import seed_database


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_schema()

    db = next(get_db())

    try:
        seed_database(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)