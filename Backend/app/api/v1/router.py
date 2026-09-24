from fastapi import APIRouter

from .endpoints import compounds, predict, system

router = APIRouter()
router.include_router(system.router)
router.include_router(compounds.router)
router.include_router(predict.router)
