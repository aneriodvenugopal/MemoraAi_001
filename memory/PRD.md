# MemoraAI - Product Requirements Document

## Overview
Multi-Category WhatsApp Business Automation SaaS with AI Memory. Forked from RealApex SaaS.

## Architecture
- **Backend**: FastAPI (Python) port 8001 | **Frontend**: React (CRA) port 3000
- **Database**: MongoDB (`memoraai`) | **AI**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WABA Cloud API | **Auth**: OTP + Password

## Implemented Features (Phases 0-4, 2026-04-23)

### Phase 0: Fork
- Full codebase from RealApex SaaS, fresh DB, seeds

### Phase 1: Multi-Category Core
- 7 categories (Real Estate, Astrology, Doctor/Clinic, Function Hall, Pesticides, Beauty Salon, Coaching)
- 42 pre-defined services, Category Setup UI, Services CRUD
- Hot Sales Mode, Abrupt Sales Detection, WABA Self-Service, Business Memory AI

### Phase 2: Rebranding + AI Integration
- Full MemoraAI branding, Memory AI -> WhatsApp webhook
- Category-aware WhatsApp AI with dynamic prompts

### Phase 3: Dashboard Widgets + RAG + Cleanup
- Category-specific KPI widgets (7 category configs)
- Enhanced RAG memory (token-based semantic search, Jaccard similarity)
- Complete RealApex cleanup

### Phase 4: Analytics + Appointments + Templates
- **Analytics Dashboard**: KPIs (appointments, revenue, customers, retention), daily trend chart, popular services bar chart, service performance table, WhatsApp engagement metrics, period filters (today/week/month)
- **Appointment Management**: Full CRUD, today's summary, status workflow (scheduled -> completed/cancelled/no-show), service-linked booking with auto-price, multi-source (manual/WhatsApp/online/call), filter by status/date/service
- **Template Workflow**: Create/edit drafts, auto-generate 6 category-specific templates, submit to Meta, internal approve/reject flow, status pipeline (draft -> pending_review -> submitted -> approved/rejected)

## Key API Endpoints
- `/api/memoraai/appointments` - Appointment CRUD + status actions
- `/api/memoraai/analytics/overview` - Category analytics
- `/api/memoraai/analytics/services-breakdown` - Service performance
- `/api/memoraai/templates` - Template workflow CRUD
- `/api/memoraai/templates/auto-generate` - AI template generation
- `/api/memoraai/dashboard/category-stats` - Dashboard widgets
- `/api/memoraai/memory/search` - Semantic memory search
- `/api/memoraai/categories/*` | `/api/memoraai/services` | `/api/memoraai/sales/*` | `/api/memoraai/waba/*`

## Backlog
### P1
1. WhatsApp-initiated booking (customer books via chat)
2. Appointment reminder notifications (auto-send before appointments)
3. Payment collection integration per appointment
### P2
4. Hybrid B2B2C for Pesticides/Fertilizer
5. Multi-language templates per category
6. Staff schedule/availability management
