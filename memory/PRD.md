# MemoraAI - Product Requirements Document

## Overview
Multi-Category WhatsApp Business Automation SaaS with AI Memory. Yellow-themed, mobile-first design.

## Architecture
- **Backend**: FastAPI (Python) port 8001 | **Frontend**: React (CRA) port 3000
- **Database**: MongoDB (`memoraai`) | **AI**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WABA Cloud API | Number: 916309356590

## Implemented Features (Phases 0-6)

### Phase 0-4 (Previous)
- Fork, multi-category (7 categories, 42 services), category-aware AI, memory, hot sales, WABA, analytics, appointments, template workflow

### Phase 5: Visual Redesign
- Yellow/amber theme, new landing page, WhatsApp CTAs, industry categories

### Phase 6: Mobile-First Owner Dashboard (2026-04-23)
Implemented reference design (Sri Sai Astrology style) with 5-tab mobile dashboard:
- **Dashboard Tab**: Greeting, 4 KPI cards (Today Chats, Pending Replies, New Bookings, Revenue) with trend arrows, AI Auto Reply Active card, 6 Quick Actions (Upload, Notification, Booking, Broadcast, Leads, Hot Sales), category-specific widgets
- **Chats Tab**: WhatsApp CRM leads list with avatars, last messages, unread badges, AI alerts banner
- **Bookings Tab**: Status summary (Upcoming/Confirmed/Completed/Cancelled), filter tabs, appointment cards with complete/no-show/cancel actions
- **Reports Tab**: KPIs, 7-day activity bar chart, Top Services progress bars, Customer Insights (unique/repeat/retention)
- **More Tab**: Profile card with category badge, 8 menu items (Business Info, WhatsApp Setup, Templates, Category Setup, Hot Sales, AI Memory, Staff, Settings), Logout
- **Bottom Navigation**: 5 tabs with active highlight, chat badge count
- Bypasses old desktop header for clean mobile experience

## Backlog
### P1
1. WhatsApp-initiated booking (customer books via chat)
2. Appointment reminder auto-send
3. Content Library management page
### P2
4. Hybrid B2B2C for Pesticides
5. Staff schedule management
