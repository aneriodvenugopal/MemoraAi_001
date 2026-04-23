# MemoraAI - Product Requirements Document

## Original Problem Statement
Fork the existing RealApex SaaS (WhatsApp Automation SaaS for Real Estate) from GitHub repo `https://github.com/aneriodvenugopal/RETOERP_Enterprice` (branch: `realapex_latest_110426_1506`) and create a completely new independent project called **MemoraAI - Multi-Category WhatsApp Business Automation SaaS with AI Memory**.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React (CRA with Craco) on port 3000
- **Database**: MongoDB (`memoraai` database)
- **Storage**: Emergent Object Storage
- **AI/LLM**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WhatsApp Cloud API (WABA integration)
- **Auth**: OTP-based (primary) + Password login (secondary)

## What's Been Implemented (Phase 0 - Fork Complete, 2026-04-23)

### Fork Setup
- Cloned entire RealApex SaaS codebase from GitHub
- Set up as independent project with fresh MongoDB database (`memoraai`)
- All backend dependencies installed (176 packages)
- All frontend dependencies installed
- Backend API running and healthy
- Frontend compiling and serving
- Database seeded with: roles, currencies, categories, default tenant, test users
- Password auth configured for all test users
- Login bug fixed (phone vs email key mismatch in Login.js)

### Inherited Features (from RealApex SaaS)
- Multi-tenant architecture with tenant isolation
- Full real estate property management (CRUD, layouts, projects)
- Lead pipeline & CRM
- WhatsApp Agentic AI Workflow (webhook, sales engine, auto follow-up)
- Dual-LLM support (Gemini primary + GPT-4o-mini fallback)
- Customer portal with OTP login
- Commission management & analytics
- Accounting (payment receive/transfer, cheque management)
- SMS/Email notifications
- PWA support
- Stripe payments integration
- Multi-role access control (Super Admin, Tenant Admin, Staff, Customer)
- 100+ API routes, 60+ models, 40+ services

## User Personas
1. **Platform Admin** - MemoraAI super admin managing all tenants
2. **Business Owner** - Tenant admin (Real Estate, Astrology, Doctor, etc.)
3. **Staff/Agent** - Business staff handling leads and customers
4. **End Customer** - Customers interacting via WhatsApp

## Core Requirements (Future Phases)

### P0 - Critical (Next Phase)
1. Multi-category SaaS conversion (Real Estate, Astrology, Doctor/Clinic, Function Hall, Pesticides/Fertilizer, Beauty Salon, Coaching Centers)
2. Category-wise services selection with AI suggestions
3. Dynamic category switching in admin panel
4. Rebrand UI from RealApex to MemoraAI

### P1 - High Priority
5. Advanced Business Memory AI (RAG-based long-term memory)
6. Hot Sales Mode with manual entry override
7. Abrupt Sales Discussion Detection & auto reminders
8. Self-service WABA setup (client can update token, phone, business details)

### P2 - Medium Priority
9. AI auto-generated WhatsApp templates per category
10. Category-specific dashboard widgets
11. Hybrid B2B2C mode for Pesticides/Fertilizer category

## Category-wise Pre-defined Services
- **Astrology**: Horoscope Reading, Marriage Matching, Career Prediction, Pooja Services, Gemstone Recommendation, Kundli Analysis
- **Doctor/Clinic**: General Consultation, Dental Checkup, Skin Treatment, Eye Checkup, Vaccination, Lab Tests
- **Function Hall**: Marriage Booking, Engagement Ceremony, Birthday Party, Corporate Event, Reception, Anniversary
- **Pesticides/Fertilizer**: Crop Protection, Fertilizer Supply, Seed Supply, Soil Testing, Weed Control, Pesticide Spraying
- **Beauty Salon**: Haircut, Hair Treatment, Facial, Bridal Makeup, Skin Treatment, Mehendi
- **Coaching Centers**: (to be defined)
- **Real Estate**: (existing - Projects, Properties, Plots, Layouts)

## Tech Stack
- Python 3.11, FastAPI, Motor (async MongoDB)
- React 19, TailwindCSS, Radix UI, Recharts
- MongoDB (local)
- Emergent LLM Key for AI services

## Next Tasks
1. Rebrand frontend and backend from RealApex to MemoraAI
2. Implement multi-category tenant model
3. Build category-wise services CRUD
4. Update WhatsApp AI to be category-aware
