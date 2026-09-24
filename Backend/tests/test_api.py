from fastapi.testclient import TestClient

from app.main import app


def test_health_and_catalog_routes() -> None:
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/compounds").status_code == 200
        assert client.get("/api/v1/categories").status_code == 200
