"""MemoraAI Industries API - Dynamic industry pages management"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/industries", tags=["memoraai-industries"])

def get_db(request: Request):
    return request.app.state.db

SEED_INDUSTRIES = [
    {
        "slug": "real-estate", "title": "Real Estate", "icon": "building",
        "hero_title": "Never Lose a Property Lead Again.",
        "hero_sub": "MemoraAI remembers every customer's budget, location preference, and follow-up history. Auto-sends plot updates and books site visits.",
        "benefits": ["Remembers customer budget & location", "Auto follow-up after site visit", "Detects hot leads instantly", "Sends new property updates", "Books site visits via WhatsApp", "Tracks repeat enquiries"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, 2 weeks back I asked about Shadnagar plots."},
            {"from": "bot", "text": "Welcome back Praveen garu! You were looking for 200 sq yd under 25 lakh. 2 new gated venture options came today. Would you like brochure or site visit?"},
            {"from": "customer", "text": "Need site visit Sunday."},
            {"from": "bot", "text": "Done sir. I'll reserve 11 AM slot for you. Our team will share location link tomorrow."}
        ],
        "business_name": "RealApex Properties", "seo_title": "WhatsApp Automation for Real Estate", "seo_desc": "AI-powered WhatsApp assistant for real estate businesses. Remembers leads, automates follow-ups, books site visits."
    },
    {
        "slug": "hospital", "title": "Hospitals / Clinics", "icon": "stethoscope",
        "hero_title": "Smart Patient Engagement on WhatsApp.",
        "hero_sub": "MemoraAI remembers patient history, manages appointments, sends reminders, and handles queries 24/7.",
        "benefits": ["Remembers patient visit history", "Auto appointment reminders", "Doctor availability updates", "Lab report delivery", "Follow-up after treatment", "Multi-language support"],
        "demo_chat": [
            {"from": "customer", "text": "Last time I asked for skin doctor timings."},
            {"from": "bot", "text": "Welcome back Mam! Dr. Priya is available tomorrow 11 AM. Would you like to book appointment?"},
            {"from": "customer", "text": "Yes please book it."},
            {"from": "bot", "text": "Done! Appointment confirmed with Dr. Priya, Tomorrow 11 AM. Please carry previous prescription. We'll send reminder 1 hour before."}
        ],
        "business_name": "SunCare Hospital", "seo_title": "WhatsApp Automation for Hospitals", "seo_desc": "AI WhatsApp assistant for clinics and hospitals. Patient engagement, appointments, and follow-ups."
    },
    {
        "slug": "astrology", "title": "Astrology / Numerology", "icon": "star",
        "hero_title": "Your Clients Trust You. Now Serve Them Smarter.",
        "hero_sub": "MemoraAI remembers birth charts, previous consultations, and planetary transits to give personalized responses.",
        "benefits": ["Remembers birth details & charts", "Tracks consultation history", "Sends transit updates", "Books consultation slots", "Handles multiple clients", "Telugu & Hindi support"],
        "demo_chat": [
            {"from": "customer", "text": "I spoke last month about marriage issue."},
            {"from": "bot", "text": "Welcome back Kavya garu! You asked regarding marriage delay. Guru transit changed recently - this is actually favorable now. Would you like consultation slot today?"},
            {"from": "customer", "text": "Yes, evening slot please."},
            {"from": "bot", "text": "Booked! 5 PM today with Pandit ji. Fee: Rs.500. UPI: astro@upi. Please share payment screenshot."}
        ],
        "business_name": "Sri Lakshmi Astrology", "seo_title": "WhatsApp Automation for Astrologers", "seo_desc": "AI WhatsApp assistant for astrology businesses. Remembers client charts, books consultations."
    },
    {
        "slug": "salon", "title": "Salons / Beauty Parlours", "icon": "scissors",
        "hero_title": "Book More Appointments. Automatically.",
        "hero_sub": "MemoraAI remembers client preferences, past services, and sends smart offers to bring them back.",
        "benefits": ["Remembers client hair/skin preferences", "Auto booking & reminders", "Sends seasonal offers", "Tracks regular customers", "Bridal package management", "Staff scheduling"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, I want to book hair smoothening again."},
            {"from": "bot", "text": "Welcome back Priya! Last time you did L'Oreal smoothening in March. Same treatment? We have 20% off this month on repeat customers!"},
            {"from": "customer", "text": "Great! Book for Saturday."},
            {"from": "bot", "text": "Booked! Saturday 2 PM with Anjali. L'Oreal Smoothening - Rs.3,200 (after 20% off). See you!"}
        ],
        "business_name": "Glow Beauty Studio", "seo_title": "WhatsApp Automation for Salons", "seo_desc": "AI WhatsApp assistant for beauty salons. Smart bookings, client memory, and offers."
    },
    {
        "slug": "gym", "title": "Gyms / Yoga Studios", "icon": "dumbbell",
        "hero_title": "Keep Members Engaged. Reduce Drop-offs.",
        "hero_sub": "MemoraAI tracks attendance, sends motivation, handles renewals, and manages class bookings.",
        "benefits": ["Tracks member attendance", "Renewal reminders", "Class booking management", "Diet plan delivery", "Motivation messages", "New batch announcements"],
        "demo_chat": [
            {"from": "customer", "text": "When does morning yoga batch start?"},
            {"from": "bot", "text": "Hi Ramesh! Morning Yoga batch: 6 AM - 7 AM daily. Your membership expires in 5 days. Shall I renew? Early bird discount: Rs.500 off!"},
            {"from": "customer", "text": "Renew it."},
            {"from": "bot", "text": "Renewed! Valid till Dec 2026. Pay Rs.2,500 via UPI: gym@upi. See you at 6 AM tomorrow!"}
        ],
        "business_name": "FitLife Studio", "seo_title": "WhatsApp Automation for Gyms", "seo_desc": "AI WhatsApp for fitness studios. Member engagement, renewals, class bookings."
    },
    {
        "slug": "car-rental", "title": "Car Rentals / Travels", "icon": "car",
        "hero_title": "Convert Every Travel Inquiry Into a Booking.",
        "hero_sub": "MemoraAI remembers trip preferences, handles quotes, and manages bookings automatically.",
        "benefits": ["Remembers travel preferences", "Instant quote generation", "Booking confirmations", "Driver details sharing", "Trip reminders", "Feedback collection"],
        "demo_chat": [
            {"from": "customer", "text": "I need a car for Tirupati trip again."},
            {"from": "bot", "text": "Welcome back sir! Last time you booked Innova for Tirupati (3 days). Same vehicle? Dates please."},
            {"from": "customer", "text": "Next weekend, Friday to Sunday."},
            {"from": "bot", "text": "Innova available! Rs.8,500 for 3 days (same rate as last time). Driver: Raju. Shall I confirm?"}
        ],
        "business_name": "Royal Travels", "seo_title": "WhatsApp Automation for Car Rentals", "seo_desc": "AI WhatsApp for travel agencies. Booking management, quotes, driver coordination."
    },
    {
        "slug": "function-hall", "title": "Function Halls / Events", "icon": "party-popper",
        "hero_title": "Fill Every Date on Your Calendar.",
        "hero_sub": "MemoraAI handles venue inquiries, checks availability, shares packages, and books events.",
        "benefits": ["Real-time availability check", "Package sharing with photos", "Booking confirmations", "Payment tracking", "Event reminders", "Post-event feedback"],
        "demo_chat": [
            {"from": "customer", "text": "Is your hall available for marriage in December?"},
            {"from": "bot", "text": "Hi! December dates: 7th, 14th, 21st are available. Our marriage package starts at Rs.1.5 lakh (500 guests). Would you like to visit the venue?"},
            {"from": "customer", "text": "14th December. Send package details."},
            {"from": "bot", "text": "Sharing our Premium Marriage Package brochure. Includes: AC hall, catering setup, decoration, parking, DJ. Rs.2.5 lakh for 500 guests. Shall I block 14th Dec?"}
        ],
        "business_name": "Sri Sai Convention", "seo_title": "WhatsApp Automation for Function Halls", "seo_desc": "AI WhatsApp for event venues. Availability, packages, bookings automated."
    },
    {
        "slug": "restaurant", "title": "Restaurants / Cafes", "icon": "utensils",
        "hero_title": "Serve Orders Before They Even Walk In.",
        "hero_sub": "MemoraAI remembers favorite dishes, handles reservations, and sends personalized offers.",
        "benefits": ["Remembers favorite orders", "Table reservations", "Menu sharing", "Special day offers", "Feedback collection", "Loyalty rewards"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, usual order please."},
            {"from": "bot", "text": "Welcome back Vikram! Your usual: 2x Chicken Biryani + 1 Gulab Jamun. Delivery to HSR Layout? Ready in 30 mins."},
            {"from": "customer", "text": "Yes, same address."},
            {"from": "bot", "text": "Order confirmed! Total: Rs.680. Delivery in 30-35 mins. Payment: Cash/UPI on delivery."}
        ],
        "business_name": "Spice Garden", "seo_title": "WhatsApp Automation for Restaurants", "seo_desc": "AI WhatsApp for restaurants. Order memory, reservations, and customer engagement."
    },
    {
        "slug": "education", "title": "Education Institutes", "icon": "graduation-cap",
        "hero_title": "Convert Inquiries Into Admissions.",
        "hero_sub": "MemoraAI handles course inquiries, sends schedules, manages demo classes, and tracks student interest.",
        "benefits": ["Course inquiry management", "Demo class booking", "Fee details sharing", "Batch scheduling", "Result announcements", "Parent communication"],
        "demo_chat": [
            {"from": "customer", "text": "My son needs IIT coaching. What batches available?"},
            {"from": "bot", "text": "Welcome! We have 2 IIT Foundation batches: Weekday (6-8 PM) and Weekend (10 AM-1 PM). Your son is in 10th class, right? (from previous inquiry)"},
            {"from": "customer", "text": "Yes, weekend batch."},
            {"from": "bot", "text": "Weekend IIT Foundation batch starts June 1st. Fee: Rs.45,000/year. Free demo class this Saturday 10 AM. Shall I register?"}
        ],
        "business_name": "Apex Academy", "seo_title": "WhatsApp Automation for Education", "seo_desc": "AI WhatsApp for coaching centers. Inquiry management, admissions, and student engagement."
    },
    {
        "slug": "lawyer", "title": "Lawyers / Consultants", "icon": "scale",
        "hero_title": "Professional Client Communication. Automated.",
        "hero_sub": "MemoraAI manages case inquiries, appointment scheduling, and document sharing securely.",
        "benefits": ["Case inquiry management", "Appointment scheduling", "Document sharing", "Hearing date reminders", "Fee collection tracking", "Client confidentiality"],
        "demo_chat": [
            {"from": "customer", "text": "Any update on my property case?"},
            {"from": "bot", "text": "Hello Mr. Reddy. Your property dispute case (Ref: PR-2024-156) - next hearing is Dec 15th at City Civil Court. Advocate Sharma will represent. Any documents to share?"},
            {"from": "customer", "text": "I'll send the new papers tomorrow."},
            {"from": "bot", "text": "Noted. Please share via WhatsApp or email. I'll forward to Advocate Sharma immediately. Reminder set for Dec 14th hearing prep."}
        ],
        "business_name": "Sharma Legal Associates", "seo_title": "WhatsApp Automation for Lawyers", "seo_desc": "AI WhatsApp for legal firms. Case tracking, appointments, and client communication."
    },
    {
        "slug": "finance", "title": "Finance / Loans", "icon": "banknote",
        "hero_title": "Close More Loan Applications. Faster.",
        "hero_sub": "MemoraAI qualifies leads, collects documents, and tracks application status automatically.",
        "benefits": ["Loan eligibility check", "Document collection", "Application tracking", "EMI calculator", "Approval notifications", "Cross-sell opportunities"],
        "demo_chat": [
            {"from": "customer", "text": "What's my home loan status?"},
            {"from": "bot", "text": "Hi Suresh! Your Home Loan (HL-2024-789) for Rs.35 lakh: Documents verified. Bank processing - expected approval by Friday. Shall I check pre-approved offers on personal loan too?"},
            {"from": "customer", "text": "Yes check."},
            {"from": "bot", "text": "Great news! You're pre-approved for Rs.5 lakh personal loan at 10.5% PA. EMI: Rs.10,750/month. Want to proceed?"}
        ],
        "business_name": "QuickFin Services", "seo_title": "WhatsApp Automation for Finance", "seo_desc": "AI WhatsApp for loan agents. Lead qualification, document collection, status tracking."
    },
    {
        "slug": "ecommerce", "title": "Ecommerce Sellers", "icon": "shopping-cart",
        "hero_title": "Turn WhatsApp Into Your Storefront.",
        "hero_sub": "MemoraAI handles product queries, order tracking, returns, and re-engagement campaigns.",
        "benefits": ["Product catalog sharing", "Order tracking", "Return/exchange handling", "Restock notifications", "Abandoned cart recovery", "Review collection"],
        "demo_chat": [
            {"from": "customer", "text": "Where is my order?"},
            {"from": "bot", "text": "Hi Meera! Your order #ORD-4521 (Blue Kurta Set - XL) shipped yesterday. Tracking: DL789456. Expected delivery: Tomorrow by 6 PM. Need anything else?"},
            {"from": "customer", "text": "Can I exchange size?"},
            {"from": "bot", "text": "Sure! You can exchange within 7 days of delivery. Just reply EXCHANGE after receiving. We'll arrange free pickup. What size do you need instead?"}
        ],
        "business_name": "TrendyWear Store", "seo_title": "WhatsApp Automation for Ecommerce", "seo_desc": "AI WhatsApp for online sellers. Order tracking, catalog, and customer retention."
    },
    {
        "slug": "retail", "title": "Local Retail Stores", "icon": "store",
        "hero_title": "Bring Customers Back. Again and Again.",
        "hero_sub": "MemoraAI remembers purchase history, sends offers, and manages loyalty programs.",
        "benefits": ["Purchase history memory", "Festival/seasonal offers", "New arrival alerts", "Loyalty point tracking", "Bill sharing", "Feedback collection"],
        "demo_chat": [
            {"from": "customer", "text": "Do you have the same rice brand I bought last month?"},
            {"from": "bot", "text": "Hi Lakshmi garu! You bought Sona Masoori 25kg (Rs.1,250) last month. Yes, it's in stock! We also have a new organic variety. Shall I keep one aside?"},
            {"from": "customer", "text": "Keep the regular one."},
            {"from": "bot", "text": "Done! Reserved for you. Pick up anytime today. Total: Rs.1,250. You have 120 loyalty points - redeem for Rs.60 off?"}
        ],
        "business_name": "Krishna General Store", "seo_title": "WhatsApp Automation for Retail", "seo_desc": "AI WhatsApp for local stores. Customer memory, offers, and loyalty management."
    },
    {
        "slug": "construction", "title": "Construction / Interiors", "icon": "hard-hat",
        "hero_title": "Manage Projects. Delight Clients.",
        "hero_sub": "MemoraAI shares progress updates, handles material queries, and manages client communication.",
        "benefits": ["Project progress updates", "Material quotations", "Site visit scheduling", "Payment milestone tracking", "Design sharing", "Warranty reminders"],
        "demo_chat": [
            {"from": "customer", "text": "What's the progress on my house construction?"},
            {"from": "bot", "text": "Hello Mr. Rao! Your villa project (Plot 45, Jubilee Hills): Foundation work 100% complete. First floor slab scheduled next week. Budget utilization: Rs.18.5L of Rs.45L. Want progress photos?"},
            {"from": "customer", "text": "Send photos."},
            {"from": "bot", "text": "Sharing 6 latest site photos from yesterday's inspection. Everything on track! Next milestone payment of Rs.5L due by Dec 20th."}
        ],
        "business_name": "BuildRight Constructions", "seo_title": "WhatsApp Automation for Construction", "seo_desc": "AI WhatsApp for construction firms. Project updates, client communication, and milestone tracking."
    },
    {
        "slug": "agriculture", "title": "Agriculture / Seeds / Farms", "icon": "sprout",
        "hero_title": "Smart Farming Starts with Smart Communication.",
        "hero_sub": "MemoraAI helps dealers connect with farmers, share crop advice, and manage orders.",
        "benefits": ["Crop-wise product suggestions", "Seasonal advisory alerts", "Order management", "Soil test reminders", "Weather-based recommendations", "Dealer network management"],
        "demo_chat": [
            {"from": "customer", "text": "Need pesticide for cotton crop worm attack."},
            {"from": "bot", "text": "Hello Raju garu! For cotton bollworm, we recommend Coragen (Rs.850/100ml) or Ampligo (Rs.720/100ml). Based on your 5-acre field, you'll need 3 bottles. Available at our Nalgonda store. Shall I reserve?"},
            {"from": "customer", "text": "Reserve Coragen."},
            {"from": "bot", "text": "Reserved! 3 bottles Coragen at Nalgonda branch. Total: Rs.2,550. Collect anytime. Spray tip: Mix 0.3ml per liter, spray early morning. Need spraying service too?"}
        ],
        "business_name": "GreenField Agri Solutions", "seo_title": "WhatsApp Automation for Agriculture", "seo_desc": "AI WhatsApp for agri dealers. Crop advisory, order management, and farmer engagement."
    },
    {
        "slug": "software", "title": "Software / Agencies", "icon": "code",
        "hero_title": "Close Deals Faster. Support Smarter.",
        "hero_sub": "MemoraAI manages client inquiries, project updates, and support tickets via WhatsApp.",
        "benefits": ["Project inquiry management", "Quote generation", "Milestone updates", "Support ticket handling", "Invoice sharing", "Client feedback"],
        "demo_chat": [
            {"from": "customer", "text": "I asked about mobile app development last week."},
            {"from": "bot", "text": "Welcome back Amit! You inquired about React Native e-commerce app. I prepared a detailed quote: Rs.3.5L for MVP (8 weeks). Includes: Product catalog, Cart, Payments, Admin panel. Want to discuss?"},
            {"from": "customer", "text": "Can we do a call tomorrow?"},
            {"from": "bot", "text": "Sure! Booking call with our CTO tomorrow 3 PM. I'll send Google Meet link. Meanwhile, here's our portfolio with similar apps we built."}
        ],
        "business_name": "TechCraft Solutions", "seo_title": "WhatsApp Automation for Software Agencies", "seo_desc": "AI WhatsApp for tech companies. Client management, quotes, project updates."
    },
]


@router.get("/public")
async def list_industries_public(request: Request):
    """Public endpoint - list all active industries"""
    db = get_db(request)
    industries = await db.memoraai_industries.find(
        {"is_active": True}, {"_id": 0}
    ).sort("sort_order", 1).to_list(50)

    if not industries:
        # Seed default industries
        for i, ind in enumerate(SEED_INDUSTRIES):
            doc = {
                "id": str(uuid.uuid4()),
                **ind,
                "is_active": True,
                "sort_order": i,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.memoraai_industries.insert_one(doc)
        industries = await db.memoraai_industries.find(
            {"is_active": True}, {"_id": 0}
        ).sort("sort_order", 1).to_list(50)

    return {"industries": industries, "count": len(industries)}


@router.get("/public/{slug}")
async def get_industry_public(slug: str, request: Request):
    """Public endpoint - get single industry by slug"""
    db = get_db(request)
    industry = await db.memoraai_industries.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not industry:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"industry": industry}


@router.post("")
async def create_industry(request: Request):
    """Admin: Create new industry"""
    user = await get_current_user(request)
    db = get_db(request)
    body = await request.json()

    doc = {
        "id": str(uuid.uuid4()),
        "slug": body.get("slug", ""),
        "title": body.get("title", ""),
        "icon": body.get("icon", "building"),
        "hero_title": body.get("hero_title", ""),
        "hero_sub": body.get("hero_sub", ""),
        "benefits": body.get("benefits", []),
        "demo_chat": body.get("demo_chat", []),
        "business_name": body.get("business_name", ""),
        "seo_title": body.get("seo_title", ""),
        "seo_desc": body.get("seo_desc", ""),
        "is_active": True,
        "sort_order": body.get("sort_order", 99),
        "created_by": user.get("user_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_industries.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Industry created", "industry": doc}


@router.put("/{industry_id}")
async def update_industry(industry_id: str, request: Request):
    """Admin: Update industry"""
    user = await get_current_user(request)
    db = get_db(request)
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "created_at"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_industries.update_one({"id": industry_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"message": "Industry updated"}


@router.delete("/{industry_id}")
async def delete_industry(industry_id: str, request: Request):
    """Admin: Delete industry"""
    user = await get_current_user(request)
    db = get_db(request)
    result = await db.memoraai_industries.delete_one({"id": industry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"message": "Industry deleted"}
