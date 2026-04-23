# MemoraAI - Product Requirements Document

## Original Problem Statement
Fork RealApex SaaS and create MemoraAI - Multi-Category WhatsApp Business Automation SaaS with AI Memory. Support 7 business categories with category-aware AI, memory system, hot sales detection.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 | **Frontend**: React (CRA) on port 3000
- **Database**: MongoDB (`memoraai`) | **AI/LLM**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WABA Cloud API | **Auth**: OTP + Password

## What's Been Implemented

### Phase 0 - Fork (2026-04-23)
- Cloned RealApex SaaS from GitHub, fresh DB, all seeds

### Phase 1 - Multi-Category Core (2026-04-23)
- 7 business categories with 42 pre-defined AI-suggested services
- Category Setup UI, Services CRUD (add/edit/delete/toggle)
- Hot Sales Mode + Abrupt Sales Detection alerts
- Self-service WABA Setup + AI template generation
- Business Memory AI (RAG-based customer context)

### Phase 2 - Rebranding + AI Integration (2026-04-23)
- **Full UI Rebranding**: RealApex -> MemoraAI across all pages
  - New MemoraAILogo component (purple/indigo neural network SVG)
  - Login, Dashboard, Navbar, Landing page, all marketing pages
  - AppHeader, AuthenticatedLayout, StickyNavbar updated
  - HTML title, manifest.json, meta tags updated
- **Memory AI -> WhatsApp Webhook**: Auto-stores customer memories from every WhatsApp conversation. Detects abrupt sales intent and creates alerts + notifications.
- **Category-Aware WhatsApp AI**: System prompt now dynamically loads tenant's business category, role, services list, and customer memory. AI responds as contextually appropriate assistant (e.g., "Astrology Consultation Assistant" vs "Medical Receptionist").

## Business Categories (7)
1. Real Estate | 2. Astrology | 3. Doctor/Clinic | 4. Function Hall
5. Pesticides/Fertilizer | 6. Beauty Salon | 7. Coaching Centers

## Key API Endpoints
- `/api/memoraai/categories/*` - Category management
- `/api/memoraai/services` - Services CRUD
- `/api/memoraai/sales/hot` - Hot Sales Mode
- `/api/memoraai/sales/alerts` - AI Sales Alerts
- `/api/memoraai/waba/*` - Self-service WABA
- `/api/memoraai/memory/*` - Business Memory AI
- `/api/whatsapp/simulate` - Category-aware WhatsApp test

## Prioritized Backlog
### P0
1. Category-specific dashboard widgets
2. Complete remaining minor RealApex text in backup/demo pages
### P1
3. Enhanced RAG with vector search
4. Hybrid B2B2C for Pesticides
5. Category-specific analytics
### P2
6. Multi-language templates per category
7. AI service recommendations during chat
