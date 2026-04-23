# RealApex Platform - Product Requirements Document

## Original Problem Statement
Build a production-ready, multi-tenant Agentic AI workflow for the RealApex platform. Core app is AgentApex - a mobile-first PWA for real estate agents with property management, lead tracking, followup management, and AI-powered WhatsApp sales assistant.

## Architecture
- **Backend**: FastAPI (Python) | **Frontend**: React (CRA) - Mobile-first PWA
- **Database**: MongoDB | **Storage**: Emergent Object Storage
- **APIs**: Meta WhatsApp Cloud API, Google Places Autocomplete
- **WhatsApp AI**: Gemini 2.5 Flash-Lite (primary) + GPT-4o-mini (fallback)
- **CRM**: Rule-based intent scoring (Cold/Warm/Hot) + Gemini only for Warm/Hot
- **Theme**: Navy blue (#1a365d) with shield logo branding

---

## Completed Features

### Phase 14 - Accounting & Money Tracking (2026-04-22)
- **Payment Receive Module** (`payment_receive.py`): Record customer payments (Cash/UPI/NEFT/Cheque/DD) against Project→Property→EMI/Booking/Advance. NOT online processing — record only.
- **Payment Transfer Module** (`payment_out.py`): Record outgoing payments to Agent/Vendor/Staff/Land Owner from selected bank account. Balance check before transfer.
- **Agent Commission Ledger**: Add commission per deal (manually decided amount), track earned/paid/balance per agent, project-wise breakdown, partial payouts.
- **Cheque Management**: Create cheque records on receive, track pending/cleared/bounced status, auto-update account balances on clear/bounce.
- **Account Ledger**: Per-account transaction history with IN/OUT/balance and pending cheques.
- **Daily Report**: All accounts summary — per-account balance, day credits/debits, uncleared cheques, total available.

### Phase 13 - Facing Directions + Quick Replies + Sales Rules (2026-04-20)
- **Facing Direction Handler**: Detects east/west/north/south facing queries → project-wise counts. Plot numbers only when specifically asked.
- **Quick Reply Buttons**: Context-aware WhatsApp interactive buttons after every response (Site Visit, Call Me, Layout / budget ranges / property types)
- **Never "Sorry No Data"**: System prompt enforces — always share available data + offer call/visit for unknowns
- **Sensitive Questions**: Legal/financial/hypothetical → "Our sales expert will explain over call. Shall I arrange?"
- **Files**: `sales_engine.py` (facing handler + quick replies + prompt), `whatsapp_webhook.py` (button sending)

### Phase 12 - Realistic Conversation Enhancements (2026-04-19)
- **Telugu Auto-Detection**: Detects 100+ Telugu words + Telugu script → replies in Telugu-English mix
- **Customer Name Memory**: Extracts name from "my name is" / "na peru" patterns, persists in context, used in every reply
- **Time-Aware Greetings**: IST-based "Good morning"/"Good evening" for first messages
- **Typing Delay**: 1.5s delay between split messages to simulate real typing
- **Message Splitting**: Long responses split at natural breakpoints into 2-3 short WhatsApp messages
- **Price Negotiation Handling**: Detects "rate thaggisthara" / "discount" → checks DB for EMI/offers → guides to site visit
- **Urgency Messaging**: Real scarcity from DB (available count, recently sold) injected into LLM context
- **Auto Project Recommendation**: Budget + location + type combined search for best matches
- **Files**: `conversation_enhancer.py` (new), `sales_engine.py` (enhanced), `whatsapp_webhook.py` (split + delay), `meta_whatsapp_client.py` (typing indicator)

### Phase 11 - Strict Multi-Tenant WABA Data Isolation (2026-04-19)
- **Removed ALL cross-tenant fallbacks**: No more "data-rich tenant" search that leaked other tenant data
- **Strict `identify_tenant`**: Only WABA mapping + existing conversation lookup, no guessing
- **Safe error response**: Unknown WABA → generic safe message, no data exposed, no lead/conversation created
- **Security logging**: `security_logs` collection tracks all failed tenant identification attempts
- **Security API**: `GET /api/whatsapp/security/logs` — admin-only audit trail
- **Verified**: Unknown WABA (99999...) → security log created, zero data leaked, no conversation created
- **Files**: `whatsapp_webhook.py` (strict identify_tenant), `sales_engine.py` (removed cross-tenant fallbacks)

### Phase 10 - WhatsApp CRM Dashboard UI (2026-04-19)
- **Admin Dashboard**: `/whatsapp-crm` — All leads with metrics, filters, search, actions
- **Agent Dashboard**: Non-admin users see only assigned leads
- **Lead Cards**: Name, Phone, Type, Budget, Purpose, Timeline, Score badge, First message, Next action
- **Action Buttons**: Call, WhatsApp, Followed Up, Schedule Visit, Status change, Assign Agent
- **Metrics Row**: New Leads, Hot Leads, Warm, Calls Needed
- **Backend APIs**: PUT `/crm/leads/{id}`, POST `/crm/leads/{id}/followed-up`, POST `/crm/leads/{id}/schedule-visit`, GET `/crm/agents`
- **Files**: `WhatsAppCRM.js` (new), `whatsapp_webhook.py` (management endpoints)

### Phase 9 - WhatsApp CRM Lead System (2026-04-19)
- **Instant Lead Creation**: Every first WhatsApp message creates CRM lead with phone, message, source, score
- **Rule-based Intent Scoring** (zero AI cost): Cold/Warm/Hot based on keyword matching
- **Structured CRM Extraction**: Name, property type, location, budget, purpose, timeline — all rule-based
- **Property Categories**: Plot, Flat, Apartment, Villa, Farm Land, Commercial, House, Agricultural Land, Venture Unit
- **Hot Lead Alerts**: Instant admin notification for high-intent leads
- **CRM Dashboard**: `/crm/dashboard` — new leads, warm/hot counts, calls needed, site visits
- **CRM Leads API**: `/crm/leads?score=hot` — filterable lead list
- **30-day Auto Archive**: `/crm/archive-stale` — cleans old conversations, keeps CRM data
- **Daily Metrics Tracking**: `crm_daily_metrics` collection tracks all conversion events
- **Cost optimization**: Cold leads get NO Gemini cost, only Warm/Hot trigger AI

### Phase 8 - Auto Follow-up Feature (2026-04-19)
- Background scheduler (every 30 min), free-form messages within 24h window
- Gemini-powered personalized follow-ups, one per lead per 24h
- API: `/followup/run`, `/followup/pending`, `/followup/history`, `/followup/send-one`

### Phase 7 - Dual-LLM + Memory + Project Search (2026-04-19)
- Gemini 2.5 Flash-Lite primary + GPT-4o-mini fallback
- Full long-term conversation memory (last 5 messages to LLM, old summarized)
- Smart project name search (fuzzy/partial/token matching)
- Plot availability table with status icons
- Links use realapex.in (not emergent)
- Smart tenant identification + auto WABA mapping
- Stale conversation reset after lead capture

### Phases 1-6 (Earlier)
- Core PWA, Property CRUD, Lead Pipeline, Followup System
- WhatsApp Webhook, Meta API, Template Integration
- Sales Engine, Dashboard Redesign, PWA fixes

---

## Key API Endpoints
- `GET /api/whatsapp/crm/dashboard` — CRM metrics (auth required)
- `GET /api/whatsapp/crm/leads?score=hot` — CRM leads (auth required)
- `POST /api/whatsapp/crm/archive-stale?days=30` — Archive old conversations
- `POST /api/whatsapp/followup/run?dry_run=true` — Auto follow-up batch
- `GET /api/whatsapp/followup/pending` — Preview pending follow-ups
- `GET /api/whatsapp/tenant-mapping` — View/configure tenant mapping
- `POST /api/whatsapp/webhook` — Meta event receiver
- `GET /api/whatsapp/webhook-health` — Health check with LLM stats

## WhatsApp Configuration
- WABA: `25977390118562175` (Eloniot Software Solutions)
- Phone: `+91 63093 56590` (ID: `963130426884425`)
