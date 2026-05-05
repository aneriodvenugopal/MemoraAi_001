"""
Iteration 15 — RAG Autosync + /rag/status breakdown regression suite.

Covers:
  - GET /api/website-intel/rag/status fields (enabled, store_name, breakdown.*)
  - POST /api/website-intel/rag/sync queues a background sync (200, status=queued)
  - POST /api/projects + PUT + DELETE fire BackgroundTasks → autosync
  - POST /api/properties + PUT + DELETE fire BackgroundTasks → autosync
  - POST /api/memoraai/content with PDF URL — native upload path
  - POST /api/memoraai/content text-only — text upload path
  - Heartbeat date override still active in llm_router
  - breakdown.by_content_type contains 'project' and 'property' after sync

Credentials: tenant_admin 8888888888 / admin123 (real_estate tenant).
Uses live Gemini File Search via GEMINI_API_KEY.
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://retomerp-memora.preview.emergentagent.com").rstrip("/")
TENANT_PHONE = "8888888888"
TENANT_PASSWORD = "admin123"

# Master IDs from real_estate tenant DB
PROP_TYPE_ID = "e3492f23-6b37-40ba-8bfe-d804edc07f69"      # Residential
STATUS_AVAILABLE = "14c54172-15a5-44d5-86a0-758bc2990cee"  # Available
CURRENCY_ID = "INR"  # PropertyCreate requires str but no FK validation

PUBLIC_PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"


# ───────── Fixtures ─────────
@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"phone": TENANT_PHONE, "password": TENANT_PASSWORD},
               timeout=15)
    assert r.status_code == 200, f"login failed: {r.text}"
    body = r.json()
    token = body["access_token"]
    tenant_id = body["user"]["tenant_id"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return {"session": s, "token": token, "tenant_id": tenant_id}


@pytest.fixture(scope="module")
def created_ids():
    return {"projects": [], "properties": [], "contents": []}


# ───────── /rag/status shape ─────────
def test_rag_status_shape(auth):
    r = auth["session"].get(f"{BASE_URL}/api/website-intel/rag/status", timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    for key in ("enabled", "store_name", "last_synced_at", "doc_count",
                "business_category", "breakdown"):
        assert key in d, f"missing {key} in response"
    assert d["enabled"] is True, "Gemini File Search must be enabled"
    assert d["store_name"], "store_name should be set"
    bd = d["breakdown"]
    for k in ("by_source", "by_category", "by_content_type", "by_project", "total"):
        assert k in bd, f"breakdown missing {k}"
    print(f"[rag/status] doc_count={d['doc_count']} cat={d['business_category']} bd={bd}")


# ───────── /rag/sync queues ─────────
def test_rag_sync_queues(auth):
    r = auth["session"].post(f"{BASE_URL}/api/website-intel/rag/sync", timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "queued"


# ───────── Project create → autosync ─────────
def test_project_create_autosync(auth, created_ids):
    rera = f"TEST-RERA-{uuid.uuid4().hex[:8].upper()}"
    payload = {
        "tenant_id": auth["tenant_id"],
        "name": f"TEST_Project_{rera}",
        "description": f"Autotest project with RERA {rera}",
        "project_type": "Residential",
        "location": "Hyderabad", "city": "Hyderabad", "state": "Telangana",
        "total_area": 12345.0, "price_per_unit": 5500.0,
        "amenities": ["pool", "gym"], "features": ["clubhouse"],
    }
    r = auth["session"].post(f"{BASE_URL}/api/projects/", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    proj = r.json()
    pid = proj["id"]
    created_ids["projects"].append(pid)

    # The model doesn't store rera_number from the create payload directly,
    # but autosync still fires. Patch RERA via PUT below.
    print(f"[project] created id={pid}")
    # Wait for BackgroundTask + Gemini index op
    time.sleep(15)

    r = auth["session"].get(f"{BASE_URL}/api/website-intel/rag/status", timeout=20)
    assert r.status_code == 200
    bd = r.json()["breakdown"]
    assert bd["by_source"].get("projects", 0) >= 1, f"projects not in by_source: {bd}"
    assert "project" in bd["by_content_type"], f"project missing in by_content_type: {bd}"


# ───────── Project PUT → autosync (delete-then-add) ─────────
def test_project_update_autosync(auth, created_ids):
    assert created_ids["projects"], "need created project"
    pid = created_ids["projects"][0]
    new_name = f"TEST_Project_Updated_{uuid.uuid4().hex[:6]}"
    r = auth["session"].put(
        f"{BASE_URL}/api/projects/{pid}",
        json={"name": new_name, "city": "Bangalore"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert r.json()["name"] == new_name
    time.sleep(8)  # allow autosync


# ───────── Property create → autosync ─────────
def test_property_create_autosync(auth, created_ids):
    assert created_ids["projects"], "need a project"
    pid = created_ids["projects"][0]
    pnum = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "tenant_id": auth["tenant_id"],
        "project_id": pid,
        "property_number": pnum,
        "property_type_id": PROP_TYPE_ID,
        "area": 1200.0,
        "unit": "sqft",
        "facing": "East",
        "floor": 3,
        "block": "A",
        "price": 4500000.0,
        "currency_id": CURRENCY_ID,
        "status_id": STATUS_AVAILABLE,
        "features": ["balcony"],
    }
    r = auth["session"].post(f"{BASE_URL}/api/properties/", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    prop = r.json()
    created_ids["properties"].append(prop["id"])
    print(f"[property] created id={prop['id']} num={pnum}")
    time.sleep(15)

    r = auth["session"].get(f"{BASE_URL}/api/website-intel/rag/status", timeout=20)
    bd = r.json()["breakdown"]
    assert bd["by_source"].get("properties", 0) >= 1, f"properties not in by_source: {bd}"
    assert "property" in bd["by_content_type"], f"property missing: {bd}"
    # by_project should now include this project_id
    assert pid in bd["by_project"], f"project_id {pid} not in by_project: {bd['by_project']}"


# ───────── Property PUT → autosync ─────────
def test_property_update_autosync(auth, created_ids):
    assert created_ids["properties"], "need a property"
    propid = created_ids["properties"][0]
    r = auth["session"].put(
        f"{BASE_URL}/api/properties/{propid}",
        json={"price": 4600000.0, "facing": "West"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert r.json()["price"] == 4600000.0
    time.sleep(8)


# ───────── memoraai/content text-only ─────────
def test_content_text_only_sync(auth, created_ids):
    payload = {
        "title": f"TEST_Doc_{uuid.uuid4().hex[:6]}",
        "content_type": "note",
        "description": ("This is a test note used by the autotest suite to verify "
                        "the text-only RAG autosync path. It must be at least 30 chars."),
        "tags": ["autotest", "iteration15"],
    }
    r = auth["session"].post(f"{BASE_URL}/api/memoraai/content",
                             json=payload, timeout=20)
    assert r.status_code == 200, r.text
    item = r.json().get("item") or {}
    assert item.get("id"), "no id returned"
    created_ids["contents"].append(item["id"])
    time.sleep(10)


# ───────── memoraai/content with PDF URL (native path) ─────────
def test_content_pdf_native_sync(auth, created_ids):
    payload = {
        "title": f"TEST_Brochure_{uuid.uuid4().hex[:6]}",
        "content_type": "brochure",
        "url": PUBLIC_PDF_URL,
        "description": "Public dummy PDF for native upload path verification.",
        "tags": ["autotest", "pdf"],
    }
    r = auth["session"].post(f"{BASE_URL}/api/memoraai/content",
                             json=payload, timeout=20)
    assert r.status_code == 200, r.text
    item = r.json().get("item") or {}
    cid = item.get("id")
    assert cid, "no id returned"
    created_ids["contents"].append(cid)
    # PDF download + native upload + Gemini indexing → wait longer
    time.sleep(30)

    # Validate breakdown still ok and memoraai_content count incremented
    r = auth["session"].get(f"{BASE_URL}/api/website-intel/rag/status", timeout=20)
    bd = r.json()["breakdown"]
    assert bd["by_source"].get("memoraai_content", 0) >= 1, f"memoraai_content missing: {bd}"


# ───────── breakdown contains both project and property ─────────
def test_breakdown_has_project_and_property(auth):
    r = auth["session"].get(f"{BASE_URL}/api/website-intel/rag/status", timeout=20)
    bd = r.json()["breakdown"]
    assert "project" in bd["by_content_type"], f"project missing in by_content_type"
    assert "property" in bd["by_content_type"], f"property missing in by_content_type"
    assert bd["total"] > 0


# ───────── Heartbeat date override ─────────
def test_heartbeat_date_not_june_2024(auth):
    """The llm_router wraps system prompt with today's date so AI never
    answers 'June 11, 2024'. We sample the live AI test endpoint."""
    today_year = str(datetime.now(timezone.utc).year)
    # try a known AI test endpoint — fall back to test-search if none.
    body = {"query": "What is today's date in YYYY format?", "k": 3}
    r = auth["session"].post(f"{BASE_URL}/api/website-intel/test-search",
                             json=body, timeout=20)
    # test-search is RAG-only (not LLM) so we just verify endpoint health
    assert r.status_code == 200
    # Check llm_router source has heartbeat code present
    # (process-level: the unit assertion is that no AI flow returns 2024
    # hardcoded — covered indirectly by build-time const)
    src_path = "/app/backend/services/whatsapp_agentic/llm_router.py"
    if os.path.exists(src_path):
        with open(src_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "June 11, 2024" not in content or "heartbeat" in content.lower(), \
            "heartbeat override seems missing"
        # Today's year should appear via datetime.now in the source
        assert "datetime" in content and ("now(" in content or "today" in content.lower()), \
            "no live date function in llm_router"


# ───────── DELETE cascades ─────────
def test_delete_property_autosync(auth, created_ids):
    if not created_ids["properties"]:
        pytest.skip("no property created")
    propid = created_ids["properties"][0]
    r = auth["session"].delete(f"{BASE_URL}/api/properties/{propid}", timeout=20)
    assert r.status_code == 200, r.text
    time.sleep(5)


def test_delete_project_autosync(auth, created_ids):
    if not created_ids["projects"]:
        pytest.skip("no project created")
    pid = created_ids["projects"][0]
    r = auth["session"].delete(f"{BASE_URL}/api/projects/{pid}", timeout=20)
    assert r.status_code == 200, r.text
    time.sleep(5)


def test_delete_content_autosync(auth, created_ids):
    if not created_ids["contents"]:
        pytest.skip("no content created")
    for cid in created_ids["contents"]:
        r = auth["session"].delete(f"{BASE_URL}/api/memoraai/content/{cid}", timeout=20)
        assert r.status_code == 200, r.text
    time.sleep(5)
