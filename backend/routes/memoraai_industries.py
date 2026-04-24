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
        "services": ["Plot Sales", "Flat Booking", "Site Visits", "Layout Tours", "EMI Calculator", "Resale Properties"],
        "benefits": ["Remembers customer budget & location", "Auto follow-up after site visit", "Detects hot leads instantly", "Sends new property updates", "Books site visits via WhatsApp", "Tracks repeat enquiries", "EMI calculation on chat", "Shares brochures & layouts instantly"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, 2 weeks back I asked about Shadnagar plots."},
            {"from": "bot", "text": "Welcome back Praveen garu! You were looking for 200 sq yd East-facing plots under Rs.25 lakh in Shadnagar. 2 new gated venture options came today near Bangalore Highway."},
            {"from": "customer", "text": "What are the prices?"},
            {"from": "bot", "text": "Option 1: Sri Sai Nagar - 200 sq yd at Rs.22 lakh (EMI available)\nOption 2: Green Valley Phase 2 - 220 sq yd at Rs.24.5 lakh (DTCP approved)\n\nBoth are East-facing as you preferred. Shall I send brochures?"},
            {"from": "customer", "text": "Send brochures. Also need site visit Sunday."},
            {"from": "bot", "text": "Sharing brochures now. Site visit booked for Sunday 11 AM. Our executive Ramesh will pick you up from Shadnagar bus stand. I'll send his contact and Google Maps location tomorrow morning."},
            {"from": "customer", "text": "Can my wife also come?"},
            {"from": "bot", "text": "Of course sir! I've noted 2 visitors. We'll arrange comfortable transport. Also, since you mentioned EMI interest last time - both projects offer 12-month EMI with just Rs.2 lakh booking amount. Anything else you'd like to know?"},
            {"from": "customer", "text": "That's great. See you Sunday."},
            {"from": "bot", "text": "See you Sunday at 11 AM, Praveen garu! I'll send a reminder Saturday evening. Have a good day!"}
        ],
        "business_name": "RealApex Properties", "seo_title": "WhatsApp Automation for Real Estate", "seo_desc": "AI-powered WhatsApp assistant for real estate. Remembers leads, automates follow-ups, books site visits."
    },
    {
        "slug": "hospital", "title": "Hospitals / Clinics", "icon": "stethoscope",
        "hero_title": "Smart Patient Engagement on WhatsApp.",
        "hero_sub": "MemoraAI remembers patient history, manages appointments, sends reminders, and handles queries 24/7.",
        "services": ["Doctor Appointments", "Lab Reports", "Prescription Refill", "Health Checkup", "Vaccination", "Emergency Info"],
        "benefits": ["Remembers patient visit history", "Auto appointment reminders", "Doctor availability updates", "Lab report delivery via WhatsApp", "Follow-up after treatment", "Multi-language support", "Medicine refill reminders", "Insurance query handling"],
        "demo_chat": [
            {"from": "customer", "text": "Last time I asked for skin doctor timings."},
            {"from": "bot", "text": "Welcome back Priya Mam! You consulted Dr. Kavitha (Dermatology) on March 15th for acne treatment. She prescribed a 3-month course. How are you feeling now?"},
            {"from": "customer", "text": "Better but still some issues. Need another appointment."},
            {"from": "bot", "text": "Glad to hear improvement! Dr. Kavitha is available:\n- Tomorrow 11 AM - 12 PM\n- Thursday 3 PM - 5 PM\n- Saturday 10 AM - 1 PM\n\nWhich slot works for you?"},
            {"from": "customer", "text": "Tomorrow 11 AM."},
            {"from": "bot", "text": "Appointment confirmed with Dr. Kavitha, Tomorrow 11 AM. Consultation fee: Rs.500.\n\nPlease bring:\n- Previous prescription\n- Any new photos of affected area\n\nI'll send reminder 1 hour before. Need cab booking to hospital?"},
            {"from": "customer", "text": "No cab needed. But can I get my blood test report?"},
            {"from": "bot", "text": "Your last blood test (CBC + Thyroid) from March 15th - all values were normal. I'm sharing the PDF report now. Dr. Kavitha can review updated values tomorrow if you'd like a fresh test before consultation."},
            {"from": "customer", "text": "Yes, book blood test too."},
            {"from": "bot", "text": "Done! Blood test (CBC + Thyroid + Vitamin D) booked for Tomorrow 10:30 AM - 30 mins before your consultation so Dr. Kavitha gets results same day. Fasting required from 8 PM tonight. Total: Rs.1,200 (test) + Rs.500 (consultation). See you tomorrow!"}
        ],
        "business_name": "SunCare Hospital", "seo_title": "WhatsApp Automation for Hospitals", "seo_desc": "AI WhatsApp assistant for clinics and hospitals. Patient engagement, appointments, and follow-ups."
    },
    {
        "slug": "astrology", "title": "Astrology / Numerology", "icon": "star",
        "hero_title": "Your Clients Trust You. Now Serve Them Smarter.",
        "hero_sub": "MemoraAI remembers birth charts, previous consultations, and planetary transits to give personalized responses.",
        "services": ["Horoscope Reading", "Marriage Matching", "Career Prediction", "Pooja Services", "Gemstone Advice", "Kundli Analysis"],
        "benefits": ["Remembers birth details & charts", "Tracks consultation history", "Sends transit updates", "Books consultation slots", "Handles multiple clients", "Telugu & Hindi support", "Auto Panchang updates", "Festival pooja reminders"],
        "demo_chat": [
            {"from": "customer", "text": "I spoke last month about marriage issue."},
            {"from": "bot", "text": "Welcome back Kavya garu! You consulted on March 8th regarding marriage delay. Your birth star is Rohini, Vrishabha Rasi. Guru transit changed recently - this is actually favorable for marriage proposals now."},
            {"from": "customer", "text": "Really? What should I do now?"},
            {"from": "bot", "text": "Great news! Jupiter is now in 7th house transit which is very auspicious for marriage. I recommend:\n\n1. Perform Vivaha Pooja this month\n2. Start looking at proposals after April 15th\n3. Best matching stars: Mrigashira, Ardra, Punarvasu\n\nWould you like consultation slot to discuss in detail?"},
            {"from": "customer", "text": "Yes, evening slot please."},
            {"from": "bot", "text": "Booked! Today 5 PM with Pandit Raghunath ji. Fee: Rs.500.\n\nPayment: UPI to astro@paytm or Google Pay to 9876543210.\n\nPlease share payment screenshot after paying."},
            {"from": "customer", "text": "Can you also check career path? I'm planning job change."},
            {"from": "bot", "text": "Absolutely! Your 10th house lord Saturn is strong in transit. Job change looks positive between May-July. I'll add career discussion to today's consultation. Pandit ji will cover both marriage and career. Also, based on your Kundli, wearing Blue Sapphire (Neelam) on middle finger could boost career. We can discuss gemstone recommendation today too."},
            {"from": "customer", "text": "Perfect. See you at 5."},
            {"from": "bot", "text": "See you at 5 PM, Kavya garu! Sending consultation room link. Bring any horoscope documents if you have. Namaskaram!"}
        ],
        "business_name": "Sri Lakshmi Astrology", "seo_title": "WhatsApp Automation for Astrologers", "seo_desc": "AI WhatsApp assistant for astrology businesses. Remembers charts, books consultations."
    },
    {
        "slug": "salon", "title": "Salons / Beauty Parlours", "icon": "scissors",
        "hero_title": "Book More Appointments. Automatically.",
        "hero_sub": "MemoraAI remembers client preferences, past services, and sends smart offers to bring them back.",
        "services": ["Haircut & Styling", "Hair Treatment", "Facials", "Bridal Makeup", "Skin Care", "Mehendi", "Nail Art"],
        "benefits": ["Remembers client preferences", "Auto booking & reminders", "Sends seasonal offers", "Tracks regular customers", "Bridal package management", "Staff scheduling", "Product recommendations", "Loyalty rewards tracking"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, I want to book hair smoothening again."},
            {"from": "bot", "text": "Welcome back Priya! Last time you did L'Oreal Pro Keratin smoothening on March 5th with stylist Anjali. Same treatment? We have 20% off this month for repeat customers!"},
            {"from": "customer", "text": "Great! Same treatment. Book for Saturday."},
            {"from": "bot", "text": "Checking Anjali's Saturday slots...\n\nAvailable: 10 AM, 2 PM, 4 PM\n\nSmoothing takes ~2.5 hours. Which slot works?"},
            {"from": "customer", "text": "2 PM."},
            {"from": "bot", "text": "Booked! Saturday 2 PM with Anjali.\nL'Oreal Pro Keratin Smoothening\nOriginal: Rs.4,000 | Your price: Rs.3,200 (20% repeat discount)\n\nTips: Don't wash hair on Saturday morning. Come with dry hair for best results. Need parking info?"},
            {"from": "customer", "text": "Also want facial. What do you recommend for oily skin?"},
            {"from": "bot", "text": "Based on your skin type (oily, noted from last visit), I recommend:\n\n1. O3+ Whitening Facial - Rs.1,500 (45 mins)\n2. VLCC Anti-Tan + De-pigmentation - Rs.1,200 (40 mins)\n3. Gold Facial - Rs.2,000 (60 mins) - our bestseller!\n\nShall I add facial after smoothening? Total time would be ~4 hours."},
            {"from": "customer", "text": "Add the Gold Facial."},
            {"from": "bot", "text": "Done! Saturday 2 PM - Smoothening + Gold Facial with Anjali.\nTotal: Rs.3,200 + Rs.2,000 = Rs.5,200\nEstimated time: 2 PM - 6 PM\n\nYou've earned 520 loyalty points! (Total balance: 1,840 points = Rs.184 redeemable). See you Saturday, Priya!"}
        ],
        "business_name": "Glow Beauty Studio", "seo_title": "WhatsApp Automation for Salons", "seo_desc": "AI WhatsApp for beauty salons. Smart bookings, preferences memory, and offers."
    },
    {
        "slug": "gym", "title": "Gyms / Yoga Studios", "icon": "dumbbell",
        "hero_title": "Keep Members Engaged. Reduce Drop-offs.",
        "hero_sub": "MemoraAI tracks attendance, sends motivation, handles renewals, and manages class bookings.",
        "services": ["Gym Membership", "Yoga Classes", "Personal Training", "Diet Plans", "Zumba", "CrossFit"],
        "benefits": ["Tracks member attendance", "Renewal reminders", "Class booking management", "Diet plan delivery", "Motivation messages", "New batch announcements", "Progress tracking", "Referral rewards"],
        "demo_chat": [
            {"from": "customer", "text": "When does morning yoga batch start?"},
            {"from": "bot", "text": "Hi Ramesh! Morning Yoga batches:\n- 6 AM Hatha Yoga (Mon/Wed/Fri) with Guru Priya\n- 7 AM Power Yoga (Tue/Thu/Sat) with Trainer Anil\n\nYour membership expires in 5 days. Early bird renewal: Rs.500 off!"},
            {"from": "customer", "text": "Renew it. And what about my weight tracking?"},
            {"from": "bot", "text": "Renewed! Valid till Dec 2026. Pay Rs.2,500 via UPI: fitlife@paytm.\n\nYour progress (last 3 months):\n- Weight: 82 kg -> 76 kg (-6 kg!)\n- BMI: 28.1 -> 26.0\n- Attendance: 85% (excellent!)\n\nYou're doing amazing, Ramesh!"},
            {"from": "customer", "text": "Thanks! Can I book personal training session?"},
            {"from": "bot", "text": "Of course! Personal Training with Trainer Anil:\n- 1 session: Rs.500\n- 8 sessions (monthly): Rs.3,200\n- 16 sessions (monthly): Rs.5,500\n\nAnil specializes in weight training and HIIT - perfect for your fat loss goal. Want to try a free demo session first?"}
        ],
        "business_name": "FitLife Studio", "seo_title": "WhatsApp Automation for Gyms", "seo_desc": "AI WhatsApp for fitness studios. Member engagement, renewals, class bookings."
    },
    {
        "slug": "car-rental", "title": "Car Rentals / Travels", "icon": "car",
        "hero_title": "Convert Every Travel Inquiry Into a Booking.",
        "hero_sub": "MemoraAI remembers trip preferences, handles quotes, and manages bookings automatically.",
        "services": ["Outstation Trips", "Airport Transfer", "Wedding Cars", "Corporate Rentals", "Self-Drive", "Tour Packages"],
        "benefits": ["Remembers travel preferences", "Instant quote generation", "Booking confirmations", "Driver details sharing", "Trip reminders", "Feedback collection", "Route suggestions", "Pricing memory"],
        "demo_chat": [
            {"from": "customer", "text": "I need a car for Tirupati trip again."},
            {"from": "bot", "text": "Welcome back sir! Last time you booked Innova Crysta for Tirupati (3 days, July 2025). Same vehicle?\n\nYou preferred non-AC to Tirumala temple. Driver Raju was rated 5 stars by you. Shall I check his availability?"},
            {"from": "customer", "text": "Yes same Raju. Next Friday to Sunday."},
            {"from": "bot", "text": "Raju is available! Innova Crysta for Friday-Sunday.\nRate: Rs.8,500 for 3 days (same as last time, loyal customer rate).\nIncludes: Fuel, tolls, driver bata, parking.\n\nPickup: Your home address (Gachibowli)?\nTime: 5 AM Friday as usual?"},
            {"from": "customer", "text": "Yes same. But we are 7 people this time."},
            {"from": "bot", "text": "Innova seats 7 comfortably with luggage. Perfect fit!\n\nBooking confirmed:\nFriday 5 AM - Sunday 8 PM\nDriver: Raju (9876543210)\nVehicle: Innova Crysta (AP 09 XX 1234)\nTotal: Rs.8,500\n\nAdvance: Rs.2,000 via UPI to royal@paytm. Balance on return. I'll send Raju's live location on Friday morning!"}
        ],
        "business_name": "Royal Travels", "seo_title": "WhatsApp Automation for Car Rentals", "seo_desc": "AI WhatsApp for travel agencies. Booking management, quotes, driver coordination."
    },
    {
        "slug": "function-hall", "title": "Function Halls / Events", "icon": "party-popper",
        "hero_title": "Fill Every Date on Your Calendar.",
        "hero_sub": "MemoraAI handles venue inquiries, checks availability, shares packages, and books events.",
        "services": ["Marriage Halls", "Birthday Venues", "Corporate Events", "Engagement", "Reception", "Anniversary"],
        "benefits": ["Real-time availability check", "Package sharing with photos", "Booking confirmations", "Payment tracking", "Event reminders", "Post-event feedback", "Catering coordination", "Decoration options"],
        "demo_chat": [
            {"from": "customer", "text": "Is your hall available for marriage in December?"},
            {"from": "bot", "text": "Hi! Let me check December availability for marriage...\n\nAvailable dates:\n- Dec 7th (Saturday)\n- Dec 14th (Saturday)\n- Dec 21st (Saturday)\n- Dec 28th (Saturday)\n\nAll are auspicious muhurtham dates! Guest count expected?"},
            {"from": "customer", "text": "14th December. Around 500 guests."},
            {"from": "bot", "text": "Dec 14th is available! For 500 guests, I recommend our Premium Marriage Package:\n\nIncludes:\n- AC Banquet Hall (5000 sq ft)\n- Veg/Non-veg catering setup area\n- Bridal room + Groom room\n- 200 car parking\n- Generator backup\n- DJ + Sound system\n- Stage decoration (basic)\n\nPackage: Rs.2,50,000\nAdvance: Rs.50,000 to block date\n\nShall I send venue photos and detailed brochure?"},
            {"from": "customer", "text": "Send photos. Also what about decoration?"},
            {"from": "bot", "text": "Sharing 15 photos of recent marriage events at our venue.\n\nDecoration packages:\n1. Basic Flower: Rs.30,000\n2. Premium Flower + LED: Rs.60,000\n3. Royal Theme (custom): Rs.1,00,000+\n4. Bring your own decorator: Free\n\nMost popular is Premium (Rs.60,000). Would you like to visit the venue this weekend to see in person?"},
            {"from": "customer", "text": "We'll visit Saturday."},
            {"from": "bot", "text": "Visit scheduled for Saturday! Our event coordinator Lakshmi will show you the venue. Time: 11 AM?\n\nShe'll prepare:\n- Hall setup demo\n- Sample decoration photos\n- Catering taste test (optional)\n- Full quotation\n\nShall I block Dec 14th tentatively for 48 hours while you decide? No charges for blocking."}
        ],
        "business_name": "Sri Sai Convention", "seo_title": "WhatsApp Automation for Function Halls", "seo_desc": "AI WhatsApp for event venues. Availability, packages, bookings automated."
    },
    {
        "slug": "restaurant", "title": "Restaurants / Cafes", "icon": "utensils",
        "hero_title": "Serve Orders Before They Even Walk In.",
        "hero_sub": "MemoraAI remembers favorite dishes, handles reservations, and sends personalized offers.",
        "services": ["Online Orders", "Table Reservation", "Catering", "Party Orders", "Gift Vouchers", "Loyalty Program"],
        "benefits": ["Remembers favorite orders", "Table reservations", "Menu sharing", "Special day offers", "Feedback collection", "Loyalty rewards", "Dietary preference memory", "Festival special menus"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, usual order please."},
            {"from": "bot", "text": "Welcome back Vikram! Your usual: 2x Chicken Biryani + 1 Gulab Jamun + 1 Butter Naan. Delivery to HSR Layout home address?\n\nToday's special: Mutton Biryani at Rs.299 (usually Rs.399). Want to try?"},
            {"from": "customer", "text": "Add one mutton biryani too. Same address."},
            {"from": "bot", "text": "Order updated!\n- 2x Chicken Biryani: Rs.500\n- 1x Mutton Biryani: Rs.299 (special)\n- 1x Gulab Jamun: Rs.80\n- 1x Butter Naan: Rs.60\n- Delivery: Free (loyal customer!)\n\nTotal: Rs.939\nReady in: 35-40 mins\n\nPayment: Cash/UPI on delivery. Confirm?"},
            {"from": "customer", "text": "Confirmed. UPI payment."},
            {"from": "bot", "text": "Order #1247 confirmed! Preparing now.\n\nDelivery partner will be assigned in 10 mins. I'll share live tracking.\n\nAlso Vikram, it's your 20th order with us! You've earned a FREE dessert on your next order. Thank you for being a loyal customer!"}
        ],
        "business_name": "Spice Garden", "seo_title": "WhatsApp Automation for Restaurants", "seo_desc": "AI WhatsApp for restaurants. Order memory, reservations, and customer engagement."
    },
    {
        "slug": "education", "title": "Education Institutes", "icon": "graduation-cap",
        "hero_title": "Convert Inquiries Into Admissions.",
        "hero_sub": "MemoraAI handles course inquiries, sends schedules, manages demo classes, and tracks student interest.",
        "services": ["Entrance Coaching", "School Tuitions", "Spoken English", "Competitive Exams", "Skill Development", "Demo Classes"],
        "benefits": ["Course inquiry management", "Demo class booking", "Fee details sharing", "Batch scheduling", "Result announcements", "Parent communication", "Attendance tracking", "Progress reports"],
        "demo_chat": [
            {"from": "customer", "text": "My son needs IIT coaching. What batches available?"},
            {"from": "bot", "text": "Welcome! We have IIT Foundation batches for 2026:\n\n1. Weekday Evening: 6-8 PM (Mon-Fri)\n2. Weekend Intensive: 10 AM-1 PM (Sat-Sun)\n3. Online Live: 7-9 PM (flexible)\n\nYour son is in 10th class, right? (from your March inquiry about EAMCET)"},
            {"from": "customer", "text": "Yes 10th class. Weekend batch fee?"},
            {"from": "bot", "text": "Weekend IIT Foundation (2 year program):\n- Fee: Rs.45,000/year\n- Includes: Study material, mock tests, doubt sessions\n- Faculty: IIT Kharagpur & Bombay alumni\n- Batch size: Max 30 students\n- Results: 23 IIT selections last year!\n\nEarly bird discount: Rs.5,000 off if you join by April 30th.\nFree demo class this Saturday 10 AM. Register?"},
            {"from": "customer", "text": "Register for demo. Also, does he need to give entrance test?"},
            {"from": "bot", "text": "Demo registered for Saturday 10 AM! Topics: Physics - Motion basics.\n\nYes, there's a scholarship-cum-entrance test:\n- Date: Every Sunday 10 AM\n- Subjects: Math + Science (10th level)\n- Duration: 2 hours\n- Scholarships: Up to 50% fee waiver based on score!\n\nShall I book the entrance test too? Many students attend demo first, then take test next week."}
        ],
        "business_name": "Apex Academy", "seo_title": "WhatsApp Automation for Education", "seo_desc": "AI WhatsApp for coaching centers. Inquiry management, admissions, and engagement."
    },
    {
        "slug": "lawyer", "title": "Lawyers / Consultants", "icon": "scale",
        "hero_title": "Professional Client Communication. Automated.",
        "hero_sub": "MemoraAI manages case inquiries, scheduling, and document sharing securely.",
        "services": ["Case Consultation", "Document Filing", "Court Date Tracking", "Legal Advisory", "Property Verification", "Contract Review"],
        "benefits": ["Case inquiry management", "Appointment scheduling", "Document sharing", "Hearing date reminders", "Fee collection tracking", "Client confidentiality", "Case status updates", "Multi-advocate coordination"],
        "demo_chat": [
            {"from": "customer", "text": "Any update on my property case?"},
            {"from": "bot", "text": "Hello Mr. Reddy! Your property dispute case (Ref: PR-2024-156):\n- Status: Evidence hearing stage\n- Next hearing: Dec 15th, 10:30 AM\n- Court: City Civil Court, Room 12\n- Advocate: Mr. Sharma\n\nLast hearing on Nov 20th: Opponent's witness was cross-examined. Case proceeding favorably."},
            {"from": "customer", "text": "Good. I have new property documents to submit."},
            {"from": "bot", "text": "Please share the documents via WhatsApp. I'll forward to Advocate Sharma immediately.\n\nAccepted formats: PDF, photos of original documents.\n\nImportant: If these are original sale deeds, please keep physical copies safe. We need certified copies for court submission by Dec 10th (5 days before hearing)."},
            {"from": "customer", "text": "How much is pending fee?"},
            {"from": "bot", "text": "Fee summary for case PR-2024-156:\n- Total agreed: Rs.75,000\n- Paid: Rs.50,000 (2 installments)\n- Pending: Rs.25,000\n- Due: Before Dec 15th hearing\n\nPayment: UPI to sharma.legal@paytm or bank transfer (details shared earlier). Shall I resend bank details?"}
        ],
        "business_name": "Sharma Legal Associates", "seo_title": "WhatsApp Automation for Lawyers", "seo_desc": "AI WhatsApp for legal firms. Case tracking, appointments, client communication."
    },
    {
        "slug": "finance", "title": "Finance / Loans", "icon": "banknote",
        "hero_title": "Close More Loan Applications. Faster.",
        "hero_sub": "MemoraAI qualifies leads, collects documents, and tracks application status automatically.",
        "services": ["Home Loans", "Personal Loans", "Business Loans", "Insurance", "Mutual Funds", "Credit Cards"],
        "benefits": ["Loan eligibility check", "Document collection", "Application tracking", "EMI calculator", "Approval notifications", "Cross-sell opportunities", "KYC reminders", "Rate comparisons"],
        "demo_chat": [
            {"from": "customer", "text": "What's my home loan status?"},
            {"from": "bot", "text": "Hi Suresh! Home Loan update (HL-2024-789):\n- Amount: Rs.35 lakh\n- Bank: SBI\n- Status: Documents verified, Processing\n- Expected approval: This Friday\n- Interest rate: 8.5% PA\n\nAll documents look good. No action needed from your side right now."},
            {"from": "customer", "text": "Any pre-approved offers?"},
            {"from": "bot", "text": "Yes! Based on your credit score (785 - Excellent) and salary:\n\n1. Personal Loan: Rs.5 lakh at 10.5% PA (EMI: Rs.10,750/month for 5 years)\n2. Credit Card: SBI Simply SAVE (Rs.3 lakh limit, no annual fee first year)\n3. Car Loan: Up to Rs.8 lakh at 8.9% PA\n\nWant to proceed with any? All instant approval with existing KYC."}
        ],
        "business_name": "QuickFin Services", "seo_title": "WhatsApp Automation for Finance", "seo_desc": "AI WhatsApp for loan agents. Lead qualification, document collection, status tracking."
    },
    {
        "slug": "ecommerce", "title": "Ecommerce Sellers", "icon": "shopping-cart",
        "hero_title": "Turn WhatsApp Into Your Storefront.",
        "hero_sub": "MemoraAI handles product queries, order tracking, returns, and re-engagement campaigns.",
        "services": ["Product Catalog", "Order Tracking", "Returns", "COD Collection", "Restock Alerts", "Abandoned Cart Recovery"],
        "benefits": ["Product catalog sharing", "Order tracking", "Return/exchange handling", "Restock notifications", "Abandoned cart recovery", "Review collection", "Size recommendations", "Cross-sell suggestions"],
        "demo_chat": [
            {"from": "customer", "text": "Where is my order?"},
            {"from": "bot", "text": "Hi Meera! Order #ORD-4521 status:\n- Item: Blue Embroidered Kurta Set (XL)\n- Shipped: Yesterday via Delhivery\n- Tracking: DL789456123\n- Current: Reached Hyderabad hub\n- Expected delivery: Tomorrow by 6 PM\n\nShall I send live tracking link?"},
            {"from": "customer", "text": "Yes. Also can I exchange for Large size?"},
            {"from": "bot", "text": "Tracking link sent!\n\nFor size exchange: Absolutely! Based on your measurements from last order, Large might be better for this design (it runs slightly large).\n\nAfter delivery:\n1. Reply EXCHANGE\n2. We arrange free pickup in 24 hours\n3. Large size reserved for you\n4. Delivered within 3 days\n\nNo extra charges. Want me to set a reminder after delivery?"}
        ],
        "business_name": "TrendyWear Store", "seo_title": "WhatsApp Automation for Ecommerce", "seo_desc": "AI WhatsApp for online sellers. Order tracking, catalog, customer retention."
    },
    {
        "slug": "retail", "title": "Local Retail Stores", "icon": "store",
        "hero_title": "Bring Customers Back. Again and Again.",
        "hero_sub": "MemoraAI remembers purchase history, sends offers, and manages loyalty programs.",
        "services": ["Product Orders", "Delivery Service", "Loyalty Program", "New Arrivals", "Festival Offers", "Bulk Orders"],
        "benefits": ["Purchase history memory", "Festival offers", "New arrival alerts", "Loyalty tracking", "Bill sharing", "Feedback", "Reorder reminders", "Referral rewards"],
        "demo_chat": [
            {"from": "customer", "text": "Do you have the same rice brand I bought last month?"},
            {"from": "bot", "text": "Hi Lakshmi garu! You bought Sona Masoori (India Gate) 25kg on March 2nd for Rs.1,250. Yes, it's in stock!\n\nWe also have:\n- Organic Sona Masoori: Rs.1,450/25kg (new!)\n- Basmati (your husband's preference): Rs.1,100/5kg\n\nShall I keep one aside for pickup?"},
            {"from": "customer", "text": "Keep regular one. Also need cooking oil."},
            {"from": "bot", "text": "Reserved! Your regular oil is Fortune Sunflower (5L) - Rs.680.\n\nI also noticed you usually buy:\n- Toor Dal: Rs.165/kg (running low? last bought March 2)\n- Sugar: Rs.48/kg\n- Tea: Red Label Rs.320/500g\n\nWant me to add these? Your loyalty points: 1,840 = Rs.184 discount available!"}
        ],
        "business_name": "Krishna General Store", "seo_title": "WhatsApp Automation for Retail", "seo_desc": "AI WhatsApp for local stores. Customer memory, offers, loyalty management."
    },
    {
        "slug": "construction", "title": "Construction / Interiors", "icon": "hard-hat",
        "hero_title": "Manage Projects. Delight Clients.",
        "hero_sub": "MemoraAI shares progress updates, handles material queries, and manages client communication.",
        "services": ["Project Updates", "Material Quotes", "Site Visits", "Interior Design", "Renovation", "Maintenance"],
        "benefits": ["Progress updates", "Material quotations", "Site visit scheduling", "Payment tracking", "Design sharing", "Warranty reminders", "Vendor coordination", "Timeline management"],
        "demo_chat": [
            {"from": "customer", "text": "What's the progress on my house construction?"},
            {"from": "bot", "text": "Hello Mr. Rao! Villa project (Plot 45, Jubilee Hills) update:\n\n- Foundation: 100% complete\n- Ground floor walls: 80%\n- First floor slab: Scheduled next week\n- Budget used: Rs.18.5L of Rs.45L (41%)\n- Timeline: On track (6 months remaining)\n\nSharing 8 latest site photos from yesterday's inspection."},
            {"from": "customer", "text": "Good. When is next payment due?"},
            {"from": "bot", "text": "Payment Schedule:\n\n- Milestone 1 (Foundation): Rs.10L - PAID\n- Milestone 2 (Slab): Rs.8.5L - PAID\n- Milestone 3 (Walls): Rs.5L - Due Dec 20th\n- Milestone 4 (Finishing): Rs.10L - Due Feb\n- Milestone 5 (Handover): Rs.11.5L - Due April\n\nNext: Rs.5L by Dec 20th. UPI/Bank transfer to buildright@sbi. Need invoice?"}
        ],
        "business_name": "BuildRight Constructions", "seo_title": "WhatsApp Automation for Construction", "seo_desc": "AI WhatsApp for construction firms. Project updates, client communication, tracking."
    },
    {
        "slug": "agriculture", "title": "Agriculture / Seeds / Farms", "icon": "sprout",
        "hero_title": "Smart Farming Starts with Smart Communication.",
        "hero_sub": "MemoraAI helps dealers connect with farmers, share crop advice, and manage orders.",
        "services": ["Crop Advisory", "Seed Supply", "Fertilizer Orders", "Soil Testing", "Pesticide Spray", "Farm Equipment"],
        "benefits": ["Crop-wise suggestions", "Seasonal alerts", "Order management", "Soil test reminders", "Weather recommendations", "Dealer network", "Price updates", "Subsidy information"],
        "demo_chat": [
            {"from": "customer", "text": "Need pesticide for cotton crop worm attack."},
            {"from": "bot", "text": "Hello Raju garu! For cotton bollworm (based on your 5-acre field in Nalgonda):\n\nRecommended:\n1. Coragen 20SC - Rs.850/100ml (most effective)\n2. Ampligo 150ZC - Rs.720/100ml (budget option)\n3. Emamectin Benzoate - Rs.350/100g (preventive)\n\nFor 5 acres, you need 3 bottles of Coragen. Available at Nalgonda branch."},
            {"from": "customer", "text": "Reserve Coragen. Also need fertilizer advice."},
            {"from": "bot", "text": "Coragen reserved! 3 bottles at Nalgonda. Total: Rs.2,550.\n\nFertilizer for cotton at current stage (90 days):\n- DAP: 50 kg/acre = 250 kg total\n- Potash: 25 kg/acre = 125 kg\n- Micro-nutrients: Boron spray\n\nWe have combo pack: DAP + Potash at Rs.12,500 for 5 acres (10% discount). Government subsidy of Rs.1,200 applicable. Shall I prepare the combo?"}
        ],
        "business_name": "GreenField Agri Solutions", "seo_title": "WhatsApp Automation for Agriculture", "seo_desc": "AI WhatsApp for agri dealers. Crop advisory, orders, farmer engagement."
    },
    {
        "slug": "software", "title": "Software / Agencies", "icon": "code",
        "hero_title": "Close Deals Faster. Support Smarter.",
        "hero_sub": "MemoraAI manages client inquiries, project updates, and support tickets via WhatsApp.",
        "services": ["Web Development", "Mobile Apps", "Digital Marketing", "SEO Services", "UI/UX Design", "Cloud Hosting"],
        "benefits": ["Project inquiry management", "Quote generation", "Milestone updates", "Support tickets", "Invoice sharing", "Feedback", "Portfolio sharing", "Tech consultation"],
        "demo_chat": [
            {"from": "customer", "text": "I asked about mobile app development last week."},
            {"from": "bot", "text": "Welcome back Amit! You inquired about React Native e-commerce app on March 15th.\n\nI prepared a detailed quote:\n- MVP (8 weeks): Rs.3.5L\n  Includes: Product catalog, Cart, Payments, Admin panel\n- Full version (12 weeks): Rs.6L\n  Adds: Wishlist, Reviews, Push notifications, Analytics\n\nShall we discuss requirements in detail?"},
            {"from": "customer", "text": "MVP sounds good. Can we do a call tomorrow?"},
            {"from": "bot", "text": "Booking call with our CTO Rajesh tomorrow.\n\nAvailable slots:\n- 11 AM - 12 PM\n- 3 PM - 4 PM\n- 5 PM - 6 PM\n\nWhich works? Meanwhile, sharing our portfolio with 5 similar e-commerce apps we built. Also sending a requirements checklist - please fill what you can before the call!"}
        ],
        "business_name": "TechCraft Solutions", "seo_title": "WhatsApp Automation for Software Agencies", "seo_desc": "AI WhatsApp for tech companies. Client management, quotes, project updates."
    },
    {
        "slug": "luxury-boutique", "title": "Luxury Boutiques / Tailoring", "icon": "scissors",
        "hero_title": "Every Measurement, Every Preference — Remembered.",
        "hero_sub": "MemoraAI remembers client measurements, favourite fabrics, and past orders so repeat sales feel personal.",
        "services": ["Custom Tailoring", "Bridal Lehenga", "Designer Saree", "Measurement Visit", "Alterations", "Fabric Selection"],
        "benefits": ["Measurement history", "Bridal consultation bookings", "Fabric catalog sharing", "Fitting reminders", "VIP customer tagging", "Event-date based suggestions", "Photo order confirmation", "Delivery schedule tracking"],
        "demo_chat": [
            {"from": "customer", "text": "I need a saree blouse stitched for my cousin's wedding on 25th."},
            {"from": "bot", "text": "Welcome back Meena garu! I have your measurements from your last Diwali order (March 2025). Same measurements or fresh ones? Also — would you like the same sweetheart neckline design or something different for the wedding?"},
            {"from": "customer", "text": "Same size, but princess cut this time. Need it by 22nd."},
            {"from": "bot", "text": "Perfect. Princess cut blouse, stitching by 22nd ✓\n\nFabric: Will you bring the saree, or choose from our matching fabric catalog?\n\nTailoring charge: Rs.1,200 (regular) / Rs.1,800 (express)\nExpress fits your 22nd deadline. Advance Rs.500 holds your slot."},
            {"from": "customer", "text": "Express. I'll drop the saree today evening."},
            {"from": "bot", "text": "Booked! Express stitching - Rs.1,800. Slot confirmed for Raheem master (your regular tailor).\n\nPlease bring: saree + blouse piece + any reference pic for princess cut you like.\n\nI'll send a fitting reminder on 20th so we can do a trial before final delivery on 22nd. See you this evening!"}
        ],
        "business_name": "Silk Trail Boutique", "seo_title": "WhatsApp Automation for Boutiques", "seo_desc": "AI WhatsApp for designer boutiques. Measurements memory, bridal bookings, fitting reminders."
    },
    {
        "slug": "subscription-service", "title": "Subscription Services (Milk / Water / Gym)", "icon": "repeat",
        "hero_title": "Never Chase Renewals Again.",
        "hero_sub": "MemoraAI handles daily/monthly subscriptions — milk, water, gym — with auto-reminders, holiday pauses, and renewal collection.",
        "services": ["Monthly Milk", "Water Can Delivery", "Gym Membership", "Yoga Membership", "Trial Week Pass", "Pause & Resume"],
        "benefits": ["Automated renewal reminders", "Holiday pause handling", "Daily delivery attendance", "Auto UPI collection link", "Trial-to-paid conversion", "Bulk delivery routing", "Invoice & receipt sharing", "Referral rewards"],
        "demo_chat": [
            {"from": "customer", "text": "Please pause milk from 20th to 27th — going out of town."},
            {"from": "bot", "text": "Sure sir! Pausing 1L Full Cream Milk delivery (your current plan) from 20th Nov to 27th Nov. That's 8 days.\n\nYour plan will auto-resume on 28th Nov morning. Adjustment of Rs.480 will be credited to your next bill. Anything else?"},
            {"from": "customer", "text": "Also when is my membership renewal?"},
            {"from": "bot", "text": "Your monthly milk subscription ends on 30th Nov (6 days left). Current plan: 1L daily x Rs.60 = Rs.1,800/month.\n\nOffers:\n1. Renew monthly — Rs.1,800\n2. Quarterly — Rs.5,000 (save Rs.400)\n3. Half-yearly — Rs.9,500 (save Rs.1,300)\n\nWhich one? I can send a UPI link right away."},
            {"from": "customer", "text": "Quarterly."},
            {"from": "bot", "text": "Quarterly renewal confirmed — Rs.5,000. Sharing UPI link now. Once paid, your subscription is active till 28th Feb with the 8-day holiday pause already factored in. Thanks for choosing us again!"}
        ],
        "business_name": "FreshDaily Dairy", "seo_title": "WhatsApp Automation for Subscription Businesses", "seo_desc": "AI WhatsApp for milk, water and gym subscriptions. Auto reminders, pauses, and renewals."
    },
    {
        "slug": "auto-dealer", "title": "Automobile Dealers / Showrooms", "icon": "car",
        "hero_title": "From Enquiry to Delivery — On WhatsApp.",
        "hero_sub": "MemoraAI handles test drive bookings, finance quotes, service reminders, and exchange valuations for new and used vehicle showrooms.",
        "services": ["New Car Enquiry", "Test Drive Booking", "Vehicle Servicing", "Insurance Renewal", "EMI / Finance", "Exchange Valuation", "Accessories"],
        "benefits": ["Model-wise enquiry memory", "Instant on-road price", "Test drive slot booking", "Service schedule reminders", "Insurance expiry alerts", "Exchange car valuation", "Accessories upsell", "Delivery day coordination"],
        "demo_chat": [
            {"from": "customer", "text": "Hi, I enquired about Creta last month."},
            {"from": "bot", "text": "Welcome back Sir! You checked Creta SX Turbo AT in Atlas White last month — on-road Rs.20.1L. Good news: festive offer now gives Rs.45,000 discount + free accessories kit worth Rs.28,000.\n\nAlso, based on your feedback about boot space, you might like the Alcazar 6-seater. Shall I share comparison?"},
            {"from": "customer", "text": "Yes compare. Also I want test drive this Saturday."},
            {"from": "bot", "text": "Sharing Creta vs Alcazar PDF now.\n\nSaturday test drive slots:\n- 10 AM — Creta SX Turbo AT\n- 11:30 AM — Alcazar Signature\n- 4 PM — Both back-to-back (recommended)\n\n4 PM also gets you 15% more fuel for the drive route. Which one?"},
            {"from": "customer", "text": "4 PM both. And check exchange value for my old Verna."},
            {"from": "bot", "text": "4 PM Saturday booked — both cars.\n\nFor 2019 Verna SX MT (as per your previous RC photo) — auction estimate Rs.6.2L–6.8L. Final quote requires physical inspection which we'll do Saturday itself. Bring: RC, insurance, both keys, service book.\n\nSee you 4 PM — driver Kiran will pick you up from Ameerpet metro if needed."}
        ],
        "business_name": "Prime Motors", "seo_title": "WhatsApp Automation for Car Showrooms", "seo_desc": "AI WhatsApp for automobile dealers. Test drives, finance, servicing, exchanges automated."
    },
]


@router.get("/public")
async def list_industries_public(request: Request):
    """Public endpoint - list all active industries"""
    db = get_db(request)

    # Always reseed to get latest expanded data
    count = await db.memoraai_industries.count_documents({})
    if count < 19:
        await db.memoraai_industries.delete_many({})
        for i, ind in enumerate(SEED_INDUSTRIES):
            doc = {"id": str(uuid.uuid4()), **ind, "is_active": True, "is_system": True, "sort_order": i, "created_at": datetime.now(timezone.utc).isoformat()}
            await db.memoraai_industries.insert_one(doc)

    industries = await db.memoraai_industries.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(50)
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
        "id": str(uuid.uuid4()), **{k: v for k, v in body.items() if k != "id"},
        "is_active": True, "sort_order": body.get("sort_order", 99),
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
    updated = await db.memoraai_industries.find_one({"id": industry_id}, {"_id": 0})
    return {"message": "Industry updated", "industry": updated}


@router.delete("/{industry_id}")
async def delete_industry(industry_id: str, request: Request):
    """Admin: Delete industry"""
    user = await get_current_user(request)
    db = get_db(request)
    result = await db.memoraai_industries.delete_one({"id": industry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"message": "Industry deleted"}
