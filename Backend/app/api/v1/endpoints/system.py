from fastapi import APIRouter

from ....config import get_settings

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": get_settings().app_name}
