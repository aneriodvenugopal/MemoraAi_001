# MemoraAI - Product Requirements Document

## Overview
Multi-Category WhatsApp Business Automation SaaS with AI Memory. Yellow-themed, WhatsApp-first design.

## Architecture
- **Backend**: FastAPI (Python) port 8001 | **Frontend**: React (CRA) port 3000
- **Database**: MongoDB (`memoraai`) | **AI**: Emergent LLM Key (Gemini + GPT-4o-mini)
- **WhatsApp**: Meta WABA Cloud API | Number: 916309356590 (Eloniot Software Solutions)
- **Auth**: OTP + Password

## Implemented Features (Phases 0-5)

### Phase 0-4 (Previous)
- Fork, multi-category (7 categories, 42 services), category-aware AI, memory, hot sales, WABA, analytics, appointments, template workflow

### Phase 5: Visual Redesign (2026-04-23)
- **Yellow/amber theme**: Glassmorphism CSS vars updated from cyan/teal to amber/yellow
- **New landing page**: Hero ("Turn WhatsApp Into Your Smartest Sales Agent"), Supported Industries (7 categories), Features (6 cards), How It Works (3 steps), Related Business Pages, CTA, Footer
- **WhatsApp CTAs**: Every page has "Connect with WhatsApp" button opening wa.me with category-specific pre-filled messages
- **Industry cards**: WhatsApp + Quick Enquiry buttons per category
- **Floating WhatsApp**: Persistent green button bottom-right
- **MemoraAI logo**: Updated to amber/yellow neural network SVG
- **Login/Dashboard**: Amber gradients, yellow backgrounds
- **Real estate content removed**: Landing page is industry-agnostic WhatsApp automation focused

## WhatsApp Pre-filled Messages
- Hero: "Hi, I want to try MemoraAI for my business."
- Real Estate: "Hi, I am interested in Real Estate services."
- Astrology: "Hi, I am interested in Astrology consultation services."
- Doctor: "Hi, I want to book a Doctor consultation."
- Function Hall: "Hi, I want to book a Function Hall for an event."
- Pesticides: "Hi, I need Pesticides and Fertilizer for my crops."
- Beauty Salon: "Hi, I want to book a Beauty Salon appointment."
- Coaching: "Hi, I am interested in Coaching classes."

## Backlog
### P1
1. WhatsApp-initiated booking (customer books via chat)
2. Appointment reminder auto-send
3. Payment integration per appointment
### P2
4. Hybrid B2B2C for Pesticides
5. Staff schedule management
6. Multi-language templates
