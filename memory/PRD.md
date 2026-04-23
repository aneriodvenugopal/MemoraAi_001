# MemoraAI - Product Requirements Document

## Original Problem Statement
Fork the existing RealApex SaaS (WhatsApp Automation SaaS for Real Estate) from GitHub and create MemoraAI - Multi-Category WhatsApp Business Automation SaaS with AI Memory. Convert into multi-tenant, multi-category SaaS supporting Real Estate, Astrology, Doctor/Clinic, Function Hall, Pesticides/Fertilizer, Beauty Salon, and Coaching Centers.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React (CRA with Craco) on port 3000
- **Database**: MongoDB (`memoraai` database)
- **AI/LLM**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WhatsApp Cloud API (WABA integration)
- **Auth**: OTP-based (primary) + Password login (secondary)

## What's Been Implemented

### Phase 0 - Fork Complete (2026-04-23)
- Cloned entire RealApex SaaS codebase from GitHub
- Fresh MongoDB database (`memoraai`), all seed data populated
- Backend running with 100+ routes, 60+ models
- Frontend compiled with all components

### Phase 1 - MemoraAI Core Features (2026-04-23)
**Backend (All APIs tested - 21/21 PASS):**
- `models/memoraai.py` - Business categories, services, WABA config, hot sales, sales alerts
- `routes/memoraai_categories.py` - Category selection + AI service auto-populate + Services CRUD
- `routes/memoraai_sales.py` - Hot Sales Mode + Abrupt Sales Detection alerts
- `routes/memoraai_waba.py` - Self-service WABA setup + template generation
- `routes/memoraai_memory.py` - Business Memory AI (RAG-based customer context)
- `services/memory_ai_service.py` - Long-term memory storage + customer context building + abrupt sales detection

**Frontend (All 4 pages tested - PASS):**
- `CategorySetup.js` - Select business categories, auto-setup services, manage services (add/edit/delete/toggle)
- `HotSalesMode.js` - Hot sales entries, AI-detected alerts, stats dashboard
- `WABASetup.js` - Self-service WABA config, credential management, template generation
- `Dashboard.js` - Updated with MemoraAI section (Category Setup, Hot Sales, WhatsApp Setup, WhatsApp CRM)

## Supported Business Categories (7)
1. **Real Estate** - Property sales, rentals, management (6 services)
2. **Astrology** - Horoscope, Marriage Matching, Career Prediction, Pooja, Gemstones, Kundli (6 services)
3. **Doctor/Clinic** - Consultation, Dental, Skin, Eye, Vaccination, Lab Tests (6 services)
4. **Function Hall/Banquet** - Marriage, Engagement, Birthday, Corporate, Reception, Anniversary (6 services)
5. **Pesticides/Fertilizer** - Crop Protection, Fertilizer, Seeds, Soil Testing, Weed Control, Spraying (6 services)
6. **Beauty Salon** - Haircut, Hair Treatment, Facial, Bridal Makeup, Skin Treatment, Mehendi (6 services)
7. **Coaching Centers** - Entrance Exams, Spoken English, Competitive Exams, Tuitions, Skills, Demo Class (6 services)

## Key API Endpoints (MemoraAI)
- `GET /api/memoraai/categories/available` - List all 7 categories
- `POST /api/memoraai/categories/select` - Select category + auto-populate services
- `GET /api/memoraai/services` - List services (filterable by category)
- `POST/PUT/DELETE /api/memoraai/services` - Full CRUD
- `POST /api/memoraai/sales/hot` - Create hot sale entry
- `GET /api/memoraai/sales/alerts` - AI-detected sales alerts
- `POST /api/memoraai/waba/config` - Self-service WABA setup
- `POST /api/memoraai/waba/generate-templates` - Auto-generate WhatsApp templates
- `GET /api/memoraai/memory/customer/{phone}` - Customer memory recall

## Inherited Features (from RealApex SaaS)
- Multi-tenant architecture with data isolation
- Full property management (CRUD, layouts, projects)
- Lead pipeline & CRM
- WhatsApp Agentic AI (webhook, sales engine, auto follow-up)
- Dual-LLM support (Gemini primary + GPT-4o-mini fallback)
- Customer portal, Commission management, Accounting
- SMS/Email notifications, PWA support, Stripe payments

## Prioritized Backlog
### P0 - Next Phase
1. Rebrand frontend UI from RealApex to MemoraAI (logo, colors, text)
2. Make WhatsApp AI category-aware (use selected services in AI responses)
3. Connect Memory AI to WhatsApp webhook (auto-store + auto-detect sales)

### P1 - High Priority
4. Category-specific dashboard widgets (e.g., appointments for Doctor, bookings for Function Hall)
5. Enhanced RAG-based memory with vector search
6. Hybrid B2B2C mode for Pesticides/Fertilizer

### P2 - Medium Priority
7. Category-specific reports & analytics
8. Multi-language WhatsApp templates per category
9. AI-powered service recommendations during chat
