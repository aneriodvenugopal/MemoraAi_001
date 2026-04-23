# SMS and WhatsApp DLT Templates - Plain Text Format
================================================================
Last Updated: 2026-02-02
Brand/Header: ELNIOT
Company: ELNIOT SOFTWARE / RealApex
================================================================

=====================================
SECTION A: SMS TEMPLATES FOR DLT
=====================================

Note: Use {#variable#} format for dynamic content.
One variable per logical unit. Avoid multiple consecutive variables.

-------------------------------------
CATEGORY: TRANSACTIONAL (Priority)
-------------------------------------

TEMPLATE 1: OTP_LOGIN
Purpose: User authentication OTP
---------------------------------
Your OTP for RealApex login is {#otp#}. Valid for 10 minutes. Do not share this code with anyone. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 2: TOKEN_PAYMENT_RECEIVED  
Purpose: Token payment confirmation
---------------------------------
Dear Customer, your token payment of Rs.{#amount#} received successfully for property booking. Thank you for choosing RealApex. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 3: BOOKING_CONFIRMED
Purpose: Property booking confirmation
---------------------------------
Dear Customer, your property booking is confirmed. Booking ID: {#booking_id#}. Please login to RealApex portal for details. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 4: PAYMENT_RECEIVED
Purpose: General payment receipt
---------------------------------
Dear Customer, payment of Rs.{#amount#} received successfully. Transaction ID: {#txn_id#}. Thank you. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 5: PAYMENT_REMINDER
Purpose: Payment due reminder
---------------------------------
Dear Customer, your payment of Rs.{#amount#} is due on {#date#}. Please pay before due date to avoid late charges. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 6: PAYMENT_OVERDUE
Purpose: Overdue payment alert
---------------------------------
Dear Customer, your payment of Rs.{#amount#} is overdue. Please pay immediately to avoid penalties. Contact us for assistance. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 7: EMI_REMINDER
Purpose: Monthly EMI reminder
---------------------------------
Dear Customer, your EMI payment of Rs.{#amount#} is due on {#date#}. Please ensure timely payment. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 8: EMI_RECEIVED
Purpose: EMI payment confirmation
---------------------------------
Dear Customer, EMI payment of Rs.{#amount#} received successfully. Next EMI due on {#date#}. Thank you. ELNIOT SOFTWARE
---------------------------------


-------------------------------------
CATEGORY: SERVICE IMPLICIT
-------------------------------------

TEMPLATE 9: SITE_VISIT_SCHEDULED
Purpose: Site visit confirmation
---------------------------------
Dear Customer, your site visit is scheduled on {#date#} at {#time#}. Our executive will assist you at the location. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 10: SITE_VISIT_REMINDER
Purpose: Site visit reminder
---------------------------------
Dear Customer, reminder for your site visit tomorrow at {#time#}. Please reach the location on time. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 11: LEAD_WELCOME
Purpose: New enquiry welcome message
---------------------------------
Dear Customer, thank you for your interest in our properties. Our team will contact you shortly. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 12: DOCUMENT_REQUEST
Purpose: Request document upload
---------------------------------
Dear Customer, please upload your documents for booking verification. Login to RealApex portal to upload. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 13: DOCUMENT_READY
Purpose: Document download notification
---------------------------------
Dear Customer, your property document is ready for download. Login to RealApex portal to access. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 14: STAFF_LEAD_ASSIGNED
Purpose: Staff notification for new lead
---------------------------------
New lead assigned. Lead: {#name#}. Contact: {#phone#}. Please follow up today. RealApex CRM. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 15: STAFF_FOLLOWUP_REMINDER
Purpose: Staff follow-up reminder
---------------------------------
Reminder: Follow-up due today for {#name#}. Please complete and update status in CRM. ELNIOT SOFTWARE
---------------------------------


-------------------------------------
CATEGORY: PROMOTIONAL
-------------------------------------

TEMPLATE 16: PROJECT_LAUNCH
Purpose: New project announcement
---------------------------------
New project launched! {#project#} at {#location#}. Starting Rs.{#price#} onwards. Limited plots. Enquire now. ELNIOT SOFTWARE
---------------------------------


TEMPLATE 17: SPECIAL_OFFER
Purpose: Discount offer notification
---------------------------------
Special offer! Get {#discount#} percent off on selected properties. Valid till {#date#}. Book now. ELNIOT SOFTWARE
---------------------------------


=====================================
SECTION B: WHATSAPP BUSINESS TEMPLATES
=====================================

Note: WhatsApp templates support rich formatting.
Use line breaks for better readability.
Avoid emojis if operator rejects them.

-------------------------------------
CATEGORY: TRANSACTIONAL
-------------------------------------

WHATSAPP 1: WA_OTP
Purpose: Authentication OTP
---------------------------------
Your OTP for RealApex login is {#otp#}. 

This code is valid for 10 minutes. 
Do not share this code with anyone.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 2: WA_BOOKING_CONFIRMED
Purpose: Booking confirmation
---------------------------------
Congratulations! Your property booking is confirmed.

Booking ID: {#booking_id#}
Property: {#property#}
Amount Paid: Rs.{#amount#}

Thank you for choosing RealApex.
- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 3: WA_PAYMENT_RECEIVED
Purpose: Payment acknowledgment
---------------------------------
Dear Customer,

We have received your payment successfully.

Amount: Rs.{#amount#}
Transaction ID: {#txn_id#}

Thank you for your payment.
- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 4: WA_PAYMENT_REMINDER
Purpose: Payment due reminder
---------------------------------
Dear Customer,

This is a reminder for your upcoming payment.

Amount Due: Rs.{#amount#}
Due Date: {#date#}

Please pay on time to avoid late charges.
Login: https://realapex.in

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 5: WA_PAYMENT_OVERDUE
Purpose: Overdue payment alert
---------------------------------
Dear Customer,

Your payment is overdue.

Overdue Amount: Rs.{#amount#}
Days Overdue: {#days#}

Please pay immediately to avoid penalties.
Contact us for assistance.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 6: WA_EMI_REMINDER
Purpose: EMI due reminder
---------------------------------
Dear Customer,

Your monthly EMI payment is due.

EMI Amount: Rs.{#amount#}
Due Date: {#date#}

Please ensure timely payment.
Login: https://realapex.in

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 7: WA_TOKEN_RECEIVED
Purpose: Token payment confirmation
---------------------------------
Dear Customer,

Your token payment has been received successfully.

Token Amount: Rs.{#amount#}
Property: {#property#}

Your booking is now being processed.
Thank you.

- ELNIOT SOFTWARE
---------------------------------


-------------------------------------
CATEGORY: SERVICE IMPLICIT
-------------------------------------

WHATSAPP 8: WA_SITE_VISIT_SCHEDULED
Purpose: Site visit confirmation
---------------------------------
Dear Customer,

Your site visit has been scheduled.

Date: {#date#}
Time: {#time#}
Location: {#location#}

Our executive will assist you at the site.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 9: WA_SITE_VISIT_REMINDER
Purpose: Site visit day-before reminder
---------------------------------
Dear Customer,

Reminder for your scheduled site visit tomorrow.

Date: {#date#}
Time: {#time#}

Please reach the location on time.
Contact us if you need to reschedule.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 10: WA_LEAD_WELCOME
Purpose: New enquiry welcome
---------------------------------
Dear Customer,

Thank you for your interest in our properties.

Our team will contact you shortly to understand your requirements.

For immediate assistance, please call our helpline.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 11: WA_DOCUMENT_REQUEST
Purpose: Document upload request
---------------------------------
Dear Customer,

Please upload your documents for booking verification.

Document Required: {#document#}
Upload Deadline: {#deadline#}

Login to https://realapex.in to upload.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 12: WA_DOCUMENT_READY
Purpose: Document ready notification
---------------------------------
Dear Customer,

Your property document is ready for download.

Document Type: {#document#}

Please login to https://realapex.in to access your document.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 13: WA_STAFF_LEAD_ASSIGNED
Purpose: Staff lead notification
---------------------------------
New lead has been assigned to you.

Lead Name: {#name#}
Contact: {#phone#}

Please follow up today.
Login to RealApex CRM for details.

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 14: WA_STAFF_FOLLOWUP
Purpose: Staff follow-up reminder
---------------------------------
Reminder: You have a follow-up due today.

Lead Name: {#name#}

Please complete the follow-up and update status in CRM.

- ELNIOT SOFTWARE
---------------------------------


-------------------------------------
CATEGORY: PROMOTIONAL
-------------------------------------

WHATSAPP 15: WA_PROJECT_LAUNCH
Purpose: New project announcement
---------------------------------
Introducing our new project!

Project: {#project#}
Location: {#location#}
Starting Price: Rs.{#price#}

Limited plots available.
Enquire now: https://realapex.in

- ELNIOT SOFTWARE
---------------------------------


WHATSAPP 16: WA_SPECIAL_OFFER
Purpose: Special offer announcement
---------------------------------
Special offer for you!

Discount: {#discount#} percent off
Valid Till: {#date#}

Book now to avail this limited time offer.
Visit: https://realapex.in

- ELNIOT SOFTWARE
---------------------------------


=====================================
SECTION C: SAMPLE MESSAGES (FILLED)
=====================================

These are example messages with actual values for reference.

-------------------------------------
SMS SAMPLES
-------------------------------------

1. OTP Sample:
Your OTP for RealApex login is 847291. Valid for 10 minutes. Do not share this code with anyone. ELNIOT SOFTWARE

2. Token Payment Sample:
Dear Customer, your token payment of Rs.50000 received successfully for property booking. Thank you for choosing RealApex. ELNIOT SOFTWARE

3. Booking Confirmed Sample:
Dear Customer, your property booking is confirmed. Booking ID: BK2026020001. Please login to RealApex portal for details. ELNIOT SOFTWARE

4. Payment Reminder Sample:
Dear Customer, your payment of Rs.150000 is due on 15-Feb-2026. Please pay before due date to avoid late charges. ELNIOT SOFTWARE

5. EMI Reminder Sample:
Dear Customer, your EMI payment of Rs.25000 is due on 05-Feb-2026. Please ensure timely payment. ELNIOT SOFTWARE

6. Site Visit Sample:
Dear Customer, your site visit is scheduled on 10-Feb-2026 at 11:00 AM. Our executive will assist you at the location. ELNIOT SOFTWARE

7. Staff Lead Sample:
New lead assigned. Lead: Ramesh Kumar. Contact: 9876543210. Please follow up today. RealApex CRM. ELNIOT SOFTWARE


-------------------------------------
WHATSAPP SAMPLES
-------------------------------------

1. Booking Confirmation Sample:
---------------------------------
Congratulations! Your property booking is confirmed.

Booking ID: BK2026020001
Property: Plot 15 - Prakruthi Avenues
Amount Paid: Rs.100000

Thank you for choosing RealApex.
- ELNIOT SOFTWARE
---------------------------------


2. Payment Received Sample:
---------------------------------
Dear Customer,

We have received your payment successfully.

Amount: Rs.250000
Transaction ID: TXN20260201001

Thank you for your payment.
- ELNIOT SOFTWARE
---------------------------------


3. Site Visit Scheduled Sample:
---------------------------------
Dear Customer,

Your site visit has been scheduled.

Date: 10-Feb-2026
Time: 11:00 AM
Location: Prakruthi Avenues, Sattenapalli

Our executive will assist you at the site.

- ELNIOT SOFTWARE
---------------------------------


4. EMI Reminder Sample:
---------------------------------
Dear Customer,

Your monthly EMI payment is due.

EMI Amount: Rs.25000
Due Date: 05-Feb-2026

Please ensure timely payment.
Login: https://realapex.in

- ELNIOT SOFTWARE
---------------------------------


=====================================
SUBMISSION CHECKLIST
=====================================

Before submitting templates for DLT approval:

[ ] Header/Brand name registered: ELNIOT
[ ] Entity ID obtained from DLT portal
[ ] Template purpose clearly defined
[ ] No consecutive dynamic variables
[ ] Static text provides context around variables
[ ] Company name at end of message
[ ] Character limit within bounds (SMS: 160 chars per segment)
[ ] Tested template rendering with sample values

=====================================
REJECTION REASONS & FIXES
=====================================

Common Rejection: "Purpose of template is not clear"
Fix: Add explicit purpose in template description and ensure message clearly states its intent.

Common Rejection: "Variable tagging incorrect"
Fix: Use {#name#} format, not {name} or {{name}}.

Common Rejection: "Brand name mismatch"
Fix: Ensure ELNIOT is registered and matches exactly.

Common Rejection: "Template too generic"
Fix: Add specific business context (property, booking, payment) in static text.

=====================================
END OF DOCUMENT
=====================================
