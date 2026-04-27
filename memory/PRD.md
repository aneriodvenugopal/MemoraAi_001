# MemoraAI — Multi-Tenant WhatsApp Business SaaS (PRD)

## Vision
A multi-category WhatsApp Business automation platform with AI memory, where 100+ Indian SMBs onboard, save their own WABA credentials, and get an industry-specialized AI sales agent — branded under "Eloniot Software Solutions".

## Core Personas
- **SaaS super_admin** (e.g., 9948303060): platform owner, can impersonate tenants, manage industries, see analytics, edit platform settings.
- **tenant_admin** (e.g., 8888888888 / 9666706535): business owner; saves their own WABA credentials at `/waba-setup`; reads leads, contacts, conversations.
- **staff / customer**: scoped views.

## Architecture (multi-tenant primary path)
1. **Tenant onboarding**: SaaS Admin → Add Business wizard creates `tenants` + `users` (owner) + default templates.
2. **Self-service WABA**: tenant_admin opens `/waba-setup`, copies *Webhook Configuration card* (callback URL + verify token) into Meta Developer Console, then saves `phone_number`, `phone_number_id`, `waba_id`, `access_token`.
3. **Inbound routing** (`POST /api/whatsapp/webhook`):
   - Parses `entry[0].changes[0].value.metadata.phone_number_id`.
   - Resolves tenant via `whatsapp_tenant_mapping` → falls back to `waba_configs` (auto-heals mapping) → falls back to single-tenant conversation history (only if exactly one match).
   - Unknown pnid → logged to `unmatched_webhooks`, 200 returned, **no cross-tenant reply**.
4. **Outbound send**: `MetaWhatsAppClient._resolve_creds(tenant_id)` loads tenant's own access_token + phone_number_id from `waba_configs` (cached 30s), falling back to env only when no tenant_id is passed (super-admin / system tasks).
5. **Verify endpoint** (`GET /api/whatsapp/webhook`): accepts platform-wide token (env + platform_settings) AND any tenant's `waba_configs.verify_token` — so each onboarded business can use their own Meta app.

## Implemented (Apr 2026)
### Apr 26 — Logo, Webhook Card, Domain Verification
- Replaced text-based brand with `MemoraLogo` / `MemoraAILogo` PNG.
- Logo upload UI + endpoint at SaaS Admin → Platform Settings.
- Webhook Configuration card on `/waba-setup` showing absolute callback URL (https://memoraai.in/api/whatsapp/webhook) + verify token + copy buttons.
- Updated FB domain verification meta-tag.

### Apr 27 — Multi-Tenant WhatsApp Webhook Refactor
- `MetaWhatsAppClient` is now per-call tenant-aware: `_resolve_creds(tenant_id)` loads from `waba_configs` (with 30s LRU cache, invalidated on save).
- `identify_tenant()` now resolves via mapping → waba_configs (auto-heal) → strict single-tenant conversation match.
- Dynamic bot-loop prevention: scans all `waba_configs.phone_number` instead of hardcoded list.
- New `unmatched_webhooks` collection, super-admin-only `/api/whatsapp/unmatched-webhooks` and `/api/whatsapp/webhook-routing` diagnostics.
- New `webhook_logs` audit collection for every inbound payload.
- Multi-token GET verify (env + platform + tenant tokens).
- Backfill script `scripts/backfill_waba_mapping.py`.
- `save_waba_config` upserts mapping by `phone_number_id` (no longer requires `waba_id`); creates unique index.
- 14/14 pytest cases pass (`tests/test_whatsapp_multitenant_webhook.py`).

## Backlog (Roadmap)
### P0 (next)
- Payment gateway (PayU/Razorpay live keys present).
- "Test webhook delivery" button that sends a sample payload from Meta and shows live success on `/waba-setup`.

### P1
- Wire Leads & Contacts into AI RAG context (repeat-customer memory).
- Surface `/api/whatsapp/unmatched-webhooks` and `/api/whatsapp/webhook-routing` in SaaS Admin UI for ops.
- Move Mongo dedup from in-memory TTLCache to Mongo TTL index on `message_id` so horizontal scaling is safe.

### P2
- Broadcast Campaigns backend (bulk approved templates to segmented leads).
- Webhook proxy forwarder for preview environment (so preview can mirror production webhooks).
- Refactor `App.js` into sub-routers (marketing / SaaS admin / business tenant).

## Key Files
- `/app/backend/routes/whatsapp_webhook.py` — webhook GET/POST + diagnostics
- `/app/backend/services/whatsapp_agentic/meta_whatsapp_client.py` — outbound send with `_resolve_creds`
- `/app/backend/routes/memoraai_waba.py` — `/waba-setup` API, mapping upsert, webhook-info card
- `/app/backend/routes/memoraai_saas_admin.py` — platform settings, logo upload, onboarding
- `/app/backend/scripts/backfill_waba_mapping.py` — one-shot backfill
- `/app/backend/tests/test_whatsapp_multitenant_webhook.py` — regression suite (14 cases)
- `/app/frontend/src/pages/WABASetup.js` — `/waba-setup` page (with Webhook Configuration card)
- `/app/frontend/src/pages/SaaSAdminSettings.js` — Platform Settings (with Brand Logo upload)

## Operations Runbook
**A new client onboards (10-second test):**
1. Tenant logs in, opens `/waba-setup`.
2. Copies callback URL + verify token from the green "Webhook Configuration" card → pastes in Meta Developer Console → Verify and Save.
3. Pastes their `phone_number`, `phone_number_id`, `waba_id`, `access_token` and clicks Save.
4. From a personal phone, sends "Hi" to the tenant's WhatsApp number.
5. Within 1–3 seconds the AI replies. Verify in `/var/log/supervisor/backend.err.log` for `Tenant identified … (pnid=…)` and `📤 WhatsApp Send Response (src=tenant pnid=…) 200`.
6. If silent: hit `GET /api/whatsapp/unmatched-webhooks` (super-admin) — most likely the `phone_number_id` saved by the tenant doesn't match what Meta sent. Fix in `/waba-setup`.

## Test Credentials
See `/app/memory/test_credentials.md`.
