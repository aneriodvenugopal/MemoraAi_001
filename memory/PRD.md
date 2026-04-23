# MemoraAI - Product Requirements Document

## Original Problem Statement
Fork RealApex SaaS and create MemoraAI - Multi-Category WhatsApp Business Automation SaaS with AI Memory.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 | **Frontend**: React (CRA) on port 3000
- **Database**: MongoDB (`memoraai`) | **AI/LLM**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WABA Cloud API | **Auth**: OTP + Password

## Implemented Features

### Phase 0 - Fork (2026-04-23)
- Cloned RealApex SaaS from GitHub, fresh DB, all seeds

### Phase 1 - Multi-Category Core (2026-04-23)
- 7 business categories, 42 pre-defined services
- Category Setup UI, Services CRUD, Hot Sales Mode, Abrupt Sales Detection
- Self-service WABA Setup + AI template generation
- Business Memory AI

### Phase 2 - Rebranding + AI Integration (2026-04-23)
- Full MemoraAI branding (logo, colors, all pages)
- Memory AI -> WhatsApp webhook (auto-store + detect sales)
- Category-aware WhatsApp AI (dynamic prompt with services + memory)

### Phase 3 - Dashboard Widgets + RAG + Cleanup (2026-04-23)
- **Category-specific dashboard widgets**: Each category gets unique KPI cards
  - Astrology: Consultations Today, Pending Readings, Total Customers, Revenue
  - Doctor/Clinic: Appointments Today, Patient Queue, Lab Tests Pending, Consultations (Week)
  - Function Hall: Bookings This Month, Upcoming Events, New Enquiries, Revenue
  - Beauty Salon: Appointments Today, Walk-ins, Bridal Bookings, Revenue Today
  - Pesticides: Orders Today, Deliveries Pending, B2B Clients, Soil Tests Pending
  - Coaching: Classes Today, Active Students, Demo Requests, Attendance Rate
- **Enhanced RAG Memory Search**: Token-based keyword similarity (Jaccard-like scoring), semantic search API, RAG context builder that combines customer profile + relevant memories + cross-customer insights
- **Complete RealApex cleanup**: Zero remaining references in all visible pages

## Key API Endpoints
- `/api/memoraai/dashboard/category-stats` - Category-specific dashboard KPIs
- `/api/memoraai/memory/search` - Semantic memory search
- `/api/memoraai/memory/customer/{phone}/rag-context` - Enhanced RAG context
- `/api/memoraai/categories/*` - Category management
- `/api/memoraai/services` - Services CRUD
- `/api/memoraai/sales/*` - Hot Sales + Alerts
- `/api/memoraai/waba/*` - Self-service WABA

## Prioritized Backlog
### P1
1. Category-specific analytics & reports
2. Appointment/booking management per category
3. WhatsApp template approval workflow
### P2
4. Hybrid B2B2C for Pesticides/Fertilizer
5. Multi-language templates per category
6. Customer self-service booking via WhatsApp
