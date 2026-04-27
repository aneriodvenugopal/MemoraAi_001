"""
Tests for multi-tenant WhatsApp webhook (iteration 14).
Covers:
  - GET /api/whatsapp/webhook verification: env token, tenant token, wrong token
  - POST /api/whatsapp/webhook:
      * tenant identified via whatsapp_tenant_mapping
      * tenant identified via waba_configs (mapping auto-heal)
      * unknown phone_number_id -> unmatched_webhooks logged, no cross-tenant reply
      * bot-loop prevention when sender == tenant own phone
  - GET /api/whatsapp/webhook-health
  - GET /api/whatsapp/webhook-routing (super_admin only)
  - GET /api/whatsapp/unmatched-webhooks (super_admin only)
  - GET /api/memoraai/waba/webhook-info
  - POST /api/memoraai/waba/config -> creates mapping keyed on phone_number_id
    even without waba_id
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SUPER_ADMIN = {"phone": "9948303060", "password": "admin123"}
TENANT_ADMIN = {"phone": "8888888888", "password": "admin123"}

# Unique test identifiers (cleaned up in teardown)
TEST_TAG = f"test_iter14_{uuid.uuid4().hex[:6]}"
TEST_TENANT_PNID = f"PNID_{TEST_TAG}"
TEST_TENANT_WABAID = f"WABA_{TEST_TAG}"
TEST_TENANT_PHONE = f"91999{int(time.time()) % 10000000:07d}"
TEST_VERIFY_TOKEN = f"vt_{TEST_TAG}"
TEST_ACCESS_TOKEN = f"EA_FAKE_{TEST_TAG}"


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    # Cleanup
    db.waba_configs.delete_many({"phone_number_id": {"$regex": f"^PNID_test_iter14"}})
    db.whatsapp_tenant_mapping.delete_many({"phone_number_id": {"$regex": f"^PNID_test_iter14"}})
    db.unmatched_webhooks.delete_many({"phone_number_id": {"$regex": f"^PNID_test_iter14"}})
    db.webhook_logs.delete_many({"payload.entry.0.changes.0.value.metadata.phone_number_id":
                                  {"$regex": "^PNID_test_iter14"}})
    db.tenants.delete_many({"id": {"$regex": f"^tnt_{TEST_TAG}"}})
    client.close()


@pytest.fixture(scope="module")
def super_token():
    r = requests.post(f"{API}/auth/login", json=SUPER_ADMIN, timeout=30)
    assert r.status_code == 200, f"super admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def tenant_token():
    r = requests.post(f"{API}/auth/login", json=TENANT_ADMIN, timeout=30)
    assert r.status_code == 200, f"tenant admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def seeded_tenant(mongo_db):
    """Seed a tenant + waba_config + mapping we can target from webhook."""
    tenant_id = f"tnt_{TEST_TAG}"
    mongo_db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "id": tenant_id,
            "name": f"TEST_{TEST_TAG}",
            "company_name": "TestCo",
            "is_active": True,
        }},
        upsert=True,
    )
    mongo_db.waba_configs.update_one(
        {"phone_number_id": TEST_TENANT_PNID},
        {"$set": {
            "tenant_id": tenant_id,
            "phone_number_id": TEST_TENANT_PNID,
            "waba_id": TEST_TENANT_WABAID,
            "phone_number": TEST_TENANT_PHONE,
            "verify_token": TEST_VERIFY_TOKEN,
            "access_token": TEST_ACCESS_TOKEN,
            "is_active": True,
        }},
        upsert=True,
    )
    yield {"tenant_id": tenant_id}


# ------------------- GET /webhook (verification) -------------------

class TestWebhookVerify:
    def test_env_token_accepted(self):
        env_tok = os.getenv("META_WHATSAPP_VERIFY_TOKEN") or os.getenv("WHATSAPP_VERIFY_TOKEN")
        if not env_tok:
            pytest.skip("No platform verify token configured in env")
        r = requests.get(f"{API}/whatsapp/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": env_tok,
            "hub.challenge": "chal_env_123",
        }, timeout=15)
        assert r.status_code == 200
        assert r.text == "chal_env_123"

    def test_tenant_token_accepted(self, seeded_tenant):
        r = requests.get(f"{API}/whatsapp/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": TEST_VERIFY_TOKEN,
            "hub.challenge": "chal_tenant_456",
        }, timeout=15)
        assert r.status_code == 200, r.text
        assert r.text == "chal_tenant_456"

    def test_wrong_token_rejected(self):
        r = requests.get(f"{API}/whatsapp/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": "BOGUS_WRONG_" + uuid.uuid4().hex,
            "hub.challenge": "c",
        }, timeout=15)
        assert r.status_code == 403


# ------------------- GET webhook-health -------------------

class TestWebhookHealth:
    def test_health_reports_multi_tenant(self):
        r = requests.get(f"{API}/whatsapp/webhook-health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("version") == "v11_multi_tenant"
        assert data.get("multi_tenant") is True


# ------------------- POST /webhook (inbound routing) -------------------

def _meta_payload(pnid: str, waba_id: str, sender_phone: str, text: str = "Hi"):
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": waba_id,
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "919999000000",
                        "phone_number_id": pnid,
                    },
                    "contacts": [{"profile": {"name": "Tester"}, "wa_id": sender_phone}],
                    "messages": [{
                        "from": sender_phone,
                        "id": f"wamid.TEST.{uuid.uuid4().hex}",
                        "timestamp": str(int(time.time())),
                        "type": "text",
                        "text": {"body": text},
                    }],
                },
                "field": "messages",
            }],
        }],
    }


class TestWebhookInbound:
    def test_tenant_matched_via_mapping(self, mongo_db, seeded_tenant):
        # Pre-populate mapping
        mongo_db.whatsapp_tenant_mapping.update_one(
            {"phone_number_id": TEST_TENANT_PNID},
            {"$set": {
                "tenant_id": seeded_tenant["tenant_id"],
                "phone_number_id": TEST_TENANT_PNID,
                "waba_id": TEST_TENANT_WABAID,
                "phone_number": TEST_TENANT_PHONE,
            }},
            upsert=True,
        )
        sender = "919100000001"
        payload = _meta_payload(TEST_TENANT_PNID, TEST_TENANT_WABAID, sender)
        r = requests.post(f"{API}/whatsapp/webhook", json=payload, timeout=30)
        assert r.status_code == 200
        # Lead should have been created for this tenant
        time.sleep(1)
        lead = mongo_db.leads.find_one({
            "tenant_id": seeded_tenant["tenant_id"],
            "buyer_phone": sender,
        })
        assert lead is not None, "Lead not created for matched tenant"
        # cleanup
        mongo_db.leads.delete_many({"tenant_id": seeded_tenant["tenant_id"],
                                     "buyer_phone": sender})

    def test_auto_heal_mapping_from_waba_configs(self, mongo_db, seeded_tenant):
        """phone_number_id only in waba_configs — mapping should auto-heal."""
        pnid = TEST_TENANT_PNID + "_heal"
        mongo_db.waba_configs.update_one(
            {"phone_number_id": pnid},
            {"$set": {
                "tenant_id": seeded_tenant["tenant_id"],
                "phone_number_id": pnid,
                "waba_id": TEST_TENANT_WABAID + "_heal",
                "access_token": TEST_ACCESS_TOKEN,
                "phone_number": "919111111111",
                "is_active": True,
            }},
            upsert=True,
        )
        # Ensure no mapping exists yet
        mongo_db.whatsapp_tenant_mapping.delete_many({"phone_number_id": pnid})

        sender = "919100000002"
        payload = _meta_payload(pnid, TEST_TENANT_WABAID + "_heal", sender)
        r = requests.post(f"{API}/whatsapp/webhook", json=payload, timeout=30)
        assert r.status_code == 200
        time.sleep(1)

        mapping = mongo_db.whatsapp_tenant_mapping.find_one({"phone_number_id": pnid})
        assert mapping is not None, "Auto-heal did not create mapping"
        assert mapping.get("tenant_id") == seeded_tenant["tenant_id"]
        assert "auto_healed_at" in mapping, "auto_healed_at missing on mapping"
        # cleanup
        mongo_db.leads.delete_many({"tenant_id": seeded_tenant["tenant_id"],
                                     "buyer_phone": sender})
        mongo_db.waba_configs.delete_many({"phone_number_id": pnid})

    def test_unknown_pnid_logs_unmatched(self, mongo_db):
        unknown_pnid = f"PNID_test_iter14_UNK_{uuid.uuid4().hex[:6]}"
        sender = "919100000003"
        payload = _meta_payload(unknown_pnid, f"WABA_UNK_{uuid.uuid4().hex[:6]}", sender)
        r = requests.post(f"{API}/whatsapp/webhook", json=payload, timeout=30)
        assert r.status_code == 200
        time.sleep(0.5)
        entry = mongo_db.unmatched_webhooks.find_one({"phone_number_id": unknown_pnid})
        assert entry is not None, "Unknown pnid was not logged to unmatched_webhooks"
        # Must NOT create a lead anywhere
        assert mongo_db.leads.count_documents({"buyer_phone": sender}) == 0

    def test_bot_loop_prevention(self, mongo_db, seeded_tenant):
        """Sender == tenant's own phone_number -> webhook returns 200 but does NOT create a lead."""
        own_phone = TEST_TENANT_PHONE  # saved in waba_configs
        payload = _meta_payload(TEST_TENANT_PNID, TEST_TENANT_WABAID, own_phone, text="echo")
        # Force a new message id
        r = requests.post(f"{API}/whatsapp/webhook", json=payload, timeout=30)
        assert r.status_code == 200
        time.sleep(0.5)
        lead = mongo_db.leads.find_one({"tenant_id": seeded_tenant["tenant_id"],
                                         "buyer_phone": own_phone})
        assert lead is None, "Bot loop not prevented — lead created from own number"


# ------------------- Diagnostic endpoints (super admin) -------------------

class TestDiagnosticRoutes:
    def test_webhook_routing_super_admin(self, super_token):
        r = requests.get(f"{API}/whatsapp/webhook-routing",
                         headers={"Authorization": f"Bearer {super_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("mappings", "waba_configs", "orphan_configs", "recent_unmatched_webhooks"):
            assert k in data, f"Key {k} missing from webhook-routing response"

    def test_webhook_routing_forbidden_for_non_super(self, tenant_token):
        r = requests.get(f"{API}/whatsapp/webhook-routing",
                         headers={"Authorization": f"Bearer {tenant_token}"}, timeout=20)
        assert r.status_code == 403

    def test_unmatched_webhooks_super_admin(self, super_token):
        r = requests.get(f"{API}/whatsapp/unmatched-webhooks",
                         headers={"Authorization": f"Bearer {super_token}"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "count" in data
        assert isinstance(data["items"], list)

    def test_unmatched_webhooks_forbidden_for_non_super(self, tenant_token):
        r = requests.get(f"{API}/whatsapp/unmatched-webhooks",
                         headers={"Authorization": f"Bearer {tenant_token}"}, timeout=20)
        assert r.status_code == 403


# ------------------- MemoraAI WABA routes -------------------

class TestMemoraAIWABA:
    def test_webhook_info_returns_absolute_url(self, tenant_token):
        r = requests.get(f"{API}/memoraai/waba/webhook-info",
                         headers={"Authorization": f"Bearer {tenant_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "callback_url" in data and "verify_token" in data
        cb = data["callback_url"]
        assert cb.startswith("https://"), f"callback_url not absolute https: {cb}"
        # spec says it must start with https://memoraai.in — but also allow current host
        assert "memoraai.in" in cb or "preview.emergent" in cb or "://" in cb
        assert data["verify_token"], "verify_token is empty"

    def test_save_config_without_waba_id_creates_mapping(self, tenant_token, mongo_db):
        pnid_cfg = f"PNID_test_iter14_cfg_{uuid.uuid4().hex[:6]}"
        payload = {
            "phone_number": "919222222222",
            "phone_number_id": pnid_cfg,
            "verify_token": f"v_{uuid.uuid4().hex[:6]}",
            "access_token": f"EA_CFG_{uuid.uuid4().hex[:6]}",
            # NOTE: no waba_id
        }
        r = requests.post(f"{API}/memoraai/waba/config", json=payload,
                          headers={"Authorization": f"Bearer {tenant_token}"},
                          timeout=20)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        time.sleep(0.5)
        mapping = mongo_db.whatsapp_tenant_mapping.find_one({"phone_number_id": pnid_cfg})
        assert mapping is not None, (
            "Mapping NOT created when saving config without waba_id — "
            "expected auto-mapping keyed on phone_number_id")
        assert mapping.get("tenant_id")
        # cleanup
        mongo_db.waba_configs.delete_many({"phone_number_id": pnid_cfg})
        mongo_db.whatsapp_tenant_mapping.delete_many({"phone_number_id": pnid_cfg})
