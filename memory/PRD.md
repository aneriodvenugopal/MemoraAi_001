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

### Feb 26 — Multi-Format Indexing + Category-Aware RAG
- **Multi-format ingestion** (`services/file_ingestion.py`): downloads `memoraai_content` URLs and converts to text/native upload:
    - **PDF** → uploaded NATIVELY to Gemini File Search (server-side parsing, full fidelity).
    - **DOCX / XLSX / CSV / TXT / HTML / MD / JSON / XML** → text extraction via `python-docx` / `openpyxl` / stdlib.
    - **Images** (PNG/JPG/WEBP/GIF/BMP) → OCR via Gemini Vision (`gemini-2.5-flash`, temp=0).
    - **Audio/Video** → skipped (P2 backlog: needs Whisper).
- **Rich custom_metadata** on every doc — `tenant_id`, `business_category`, `business_name`, `content_type` (project|property|brochure|website_page|document|faq|image), `source` (projects|properties|memoraai_content|website), `project_id`, `project_type`, `rera`, `tags`, `category_slug`, `url`. Used by Gemini at retrieval time and by the LLM router for context-aware prioritization.
- **Category-aware system prompt** in `llm_router.py` — `_CATEGORY_RETRIEVAL_HINTS` dict for real_estate / astrology / hospitals / clinics / luxury_boutique / education / saloon / spa / restaurant / law / ca / software / ecommerce. Injected when File Search is active. Plus a `[CONTEXT-AWARE RETRIEVAL]` block telling the model to prefer chunks whose `business_category` and `project_id` match the active tenant/lead.
- **Project context resolver** (`intelligent_engine._resolve_project_context`) — uses `lead.captured_fields.project_id` first; falls back to scanning the last 6 turns + current message for any project name match. Result is passed to `llm_router.generate(project_id=…, project_type=…)`.
- **Backend `/rag/status`** now returns full breakdown:  
  `{enabled, store_name, last_synced_at, doc_count, business_category, breakdown:{total, by_source, by_category, by_content_type, by_project}}` via new `gemini_file_search.store_breakdown()`.
- **UI** — Gemini Managed RAG card shows three breakdown groups (By Source, By Business Category, By Content Type) as colored chips, plus tenant category footer + **Re-index All** button.
- **Bug fixed**: `routes/projects.py` PUT handler called `deserialize_doc()` on response — incompatible with Pydantic Project model's string datetime fields → 500 → BackgroundTasks never fired. Removed the call. Confirmed `RAG autosync OK` logs after both create and update.
- **Backend regression**: `/app/backend/tests/test_rag_autosync_breakdown.py` — 13/13 pass after fix.


### Feb 26 — RERA & Price Retrieval Fix (Auto-Sync to Gemini RAG)
- Fixed cases where AI replied "I don't have the information" for RERA / project / plot questions even when data existed in DB.
- New `services/rag_autosync.py` with deterministic per-doc helpers (`sync_content`, `sync_project`, `sync_property`, `delete_doc`) — delete-then-upload for true upsert semantics.
- Hooked into CRUD endpoints via `BackgroundTasks` (zero added latency on the user-facing API):
    - `routes/memoraai_content.py` create/update/delete
    - `routes/projects.py` create/update/delete
    - `routes/properties.py` create/update/delete
- Extended `bulk_sync_tenant_knowledge` to also push `projects` and `properties` (project name, RERA, location, status, base price, plot/unit number, area, price, price/sqft, survey/registration numbers).
- Fixed `delete_doc` 400 FAILED_PRECONDITION by passing `config={"force": True}` to the Gemini SDK.
- Strengthened File Search instruction in `llm_router.py`: "Return numbers and codes EXACTLY as stored — copy character-for-character. NEVER fabricate. If not found, reply 'I'll check with the team and confirm shortly.'" Removed prior placeholder examples that the LLM was hallucinating as real data.
- New UI card on `/website-intelligence`: **Gemini Managed RAG · File Search** with Status / Store / Docs synced / Last sync + a one-click "Sync to Gemini" button (`POST /api/website-intel/rag/sync`, polls `/rag/status` until `last_synced_at` advances).
- Verified end-to-end via HTTP: created project with unique RERA → AI returned that exact RERA verbatim within ~12 seconds of the create call.

### Apr 26 — Logo, Webhook Card, Domain Verification
- Replaced text-based brand with `MemoraLogo` / `MemoraAILogo` PNG.
- Logo upload UI + endpoint at SaaS Admin → Platform Settings.
- Webhook Configuration card on `/waba-setup` showing absolute callback URL (https://memoraai.in/api/whatsapp/webhook) + verify token + copy buttons.
- Updated FB domain verification meta-tag.

### Feb 26 — Date Hallucination Fix (Strong Heartbeat × 2)
- Defeated Gemini's "June 11, 2024" date hallucination caused by training cutoff + File Search retrieval bias + chat-history contamination.
- New `_strong_heartbeat()` helper in `/app/backend/services/whatsapp_agentic/llm_router.py` emits an ALL-CAPS `[CRITICAL SYSTEM TIME OVERRIDE]` block with live IST date + time and absolute rules.
- Injected **TWICE** per request: (1) prepended at the very top of the system instruction (above the Expert Sales prefix), (2) prepended to the live user message inside `contents` (Gemini) / `messages` (OpenAI). Second injection overrides anything File Search retrieves or stale chat history echoes.
- Verified: "today's date" → `Tuesday, May 05, 2026`; "next Monday" → `May 12, 2026`; even with poisoned history claiming "June 11, 2024", model now answers `May 05, 2026`.

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
