from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200

def test_login_valid():
    response = client.post("/api/auth/token", data={
        "username": "admin",
        "password": "Password123!"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password():
    response = client.post("/api/auth/token", data={
        "username": "admin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_login_missing_username():
    response = client.post("/api/auth/token", data={
        "username": "",
        "password": "Password123!"
    })
    assert response.status_code in [401, 422]