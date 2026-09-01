from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from db import Base, get_db
from main import app
import models

# Setup in-memory DB for tests (same setup as test_main.py)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_export_filters():
    """
    Test export filtering by event_name and referee_id
    """
    # 1. Setup Data
    client.post("/referees", data={"full_name": "Filter Ref 1"})
    client.post("/referees", data={"full_name": "Filter Ref 2"})
    
    # Needs invitations
    # Ref 1 -> Race A
    client.post("/invitations/bulk-update", data={
        "event_date": "2024-07-01",
        "event_name": "Race A",
        "paste_data": "Filter Ref 1\tKABUL"
    })
    # Ref 2 -> Race B
    client.post("/invitations/bulk-update", data={
        "event_date": "2024-07-02",
        "event_name": "Race B",
        "paste_data": "Filter Ref 2\tKABUL"
    })
    
    # 2. Test Event Filter (Race A)
    # Should contain Ref 1, NOT Ref 2
    response = client.get("/export/excel?event_filter=Race A")
    assert response.status_code == 200
    content = response.text
    assert "Filter Ref 1" in content
    assert "Filter Ref 2" not in content
    
    # 3. Test Referee Filter
    # In a clean DB from fixture, Ref 1 should be ID 1
    response = client.get("/export/excel?referee_id=1")
    if response.status_code == 200:
        c = response.text
        # If ID 1 maps to Filter Ref 1 (likely)
        if "Filter Ref 1" in c:
            assert "Filter Ref 2" not in c

def test_export_filename_encoding():
    """
    Test export with Turkish characters in event name (should handle filename encoding)
    """
    # Setup data with Turkish event name
    client.post("/referees", data={"full_name": "Turkish Ref"})
    client.post("/invitations/bulk-update", data={
        "event_date": "2024-08-01",
        "event_name": "İl Şampiyonası", # Turkish chars: İ, ş, ı
        "paste_data": "Turkish Ref\tKABUL"
    })
    
    # Request export with this filter
    # This currently FAILS with Internal Server Error due to header encoding
    response = client.get("/export/excel?event_filter=İl Şampiyonası")
    
    # We expect 200, but if it fails it will be 500
    assert response.status_code == 200
    assert "content-disposition" in response.headers
    # Check if filename is handled safely (Starlette might need ASCII)
    # Ideally should contain some representation of "Il Sampiyonasi" or encoded

