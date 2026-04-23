# ExlainERP - SMS DLT Templates for Approval
# Format: {#var#} for dynamic variables
# Category: Transactional (T) / Promotional (P) / Service Implicit (SI) / Service Explicit (SE)

================================================================================
## 1. AUTHENTICATION & OTP TEMPLATES (Transactional)
================================================================================

### Template 1.1: Login OTP
Category: Transactional
Template Name: LOGIN_OTP
---
{#var#} is your OTP for ExlainERP login. Valid for {#var#} minutes. Do not share this OTP with anyone.
---
Variables: OTP (6 digits), Validity Minutes

### Template 1.2: Registration OTP
Category: Transactional
Template Name: REGISTRATION_OTP
---
{#var#} is your OTP to register on ExlainERP. Valid for {#var#} minutes. Do not share with anyone.
---
Variables: OTP, Validity Minutes

### Template 1.3: Password Reset OTP
Category: Transactional
Template Name: PASSWORD_RESET_OTP
---
{#var#} is your OTP to reset your ExlainERP password. Valid for {#var#} minutes. If you did not request this, please ignore.
---
Variables: OTP, Validity Minutes

### Template 1.4: Phone Verification OTP
Category: Transactional
Template Name: PHONE_VERIFY_OTP
---
{#var#} is your OTP to verify your phone number on ExlainERP. Valid for {#var#} minutes.
---
Variables: OTP, Validity Minutes


================================================================================
## 2. LEAD MANAGEMENT TEMPLATES (Service Implicit)
================================================================================

### Template 2.1: New Lead Welcome
Category: Service Implicit
Template Name: LEAD_WELCOME
---
Dear {#var#}, Thank you for your interest in {#var#}. Our team will contact you shortly. For queries call {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Contact Number, Company Name

### Template 2.2: Lead Follow-up Reminder
Category: Service Implicit
Template Name: LEAD_FOLLOWUP
---
Dear {#var#}, This is a reminder about your enquiry for {#var#}. Would you like to schedule a site visit? Reply YES or call {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Contact Number, Company Name

### Template 2.3: Lead Assignment Notification (Internal)
Category: Transactional
Template Name: LEAD_ASSIGNED
---
New lead assigned: {#var#} ({#var#}) interested in {#var#}. Please follow up within 24 hours. - ExlainERP
---
Variables: Customer Name, Phone, Project Name

### Template 2.4: Lead Status Update
Category: Service Implicit
Template Name: LEAD_STATUS_UPDATE
---
Dear {#var#}, Your property enquiry status has been updated to {#var#}. For more details, contact {#var#}. - {#var#}
---
Variables: Customer Name, Status, Contact Number, Company Name


================================================================================
## 3. SITE VISIT TEMPLATES (Service Implicit)
================================================================================

### Template 3.1: Site Visit Scheduled
Category: Service Implicit
Template Name: SITE_VISIT_SCHEDULED
---
Dear {#var#}, Your site visit for {#var#} is scheduled on {#var#} at {#var#}. Location: {#var#}. Contact: {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Date, Time, Address, Contact Number, Company Name

### Template 3.2: Site Visit Reminder (1 Day Before)
Category: Service Implicit
Template Name: SITE_VISIT_REMINDER_1DAY
---
Reminder: Dear {#var#}, Your site visit for {#var#} is tomorrow ({#var#}) at {#var#}. See you there! Contact: {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Date, Time, Contact Number, Company Name

### Template 3.3: Site Visit Reminder (2 Hours Before)
Category: Service Implicit
Template Name: SITE_VISIT_REMINDER_2HR
---
Dear {#var#}, Your site visit for {#var#} is in 2 hours at {#var#}. Our executive {#var#} will meet you. Call {#var#} for directions. - {#var#}
---
Variables: Customer Name, Project Name, Time, Executive Name, Contact Number, Company Name

### Template 3.4: Site Visit Completed - Thank You
Category: Service Implicit
Template Name: SITE_VISIT_THANKYOU
---
Dear {#var#}, Thank you for visiting {#var#}. We hope you liked the property. For booking or queries, call {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Contact Number, Company Name

### Template 3.5: Site Visit Rescheduled
Category: Service Implicit
Template Name: SITE_VISIT_RESCHEDULED
---
Dear {#var#}, Your site visit for {#var#} has been rescheduled to {#var#} at {#var#}. Contact {#var#} for any changes. - {#var#}
---
Variables: Customer Name, Project Name, New Date, New Time, Contact Number, Company Name

### Template 3.6: Site Visit Cancelled
Category: Service Implicit
Template Name: SITE_VISIT_CANCELLED
---
Dear {#var#}, Your site visit for {#var#} on {#var#} has been cancelled. To reschedule, please call {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Date, Contact Number, Company Name


================================================================================
## 4. BOOKING & SALES TEMPLATES (Transactional)
================================================================================

### Template 4.1: Booking Confirmed
Category: Transactional
Template Name: BOOKING_CONFIRMED
---
Congratulations {#var#}! Your booking for {#var#} in {#var#} is confirmed. Booking ID: {#var#}. Amount: Rs.{#var#}. - {#var#}
---
Variables: Customer Name, Property Number, Project Name, Booking ID, Amount, Company Name

### Template 4.2: Booking Token Received
Category: Transactional
Template Name: BOOKING_TOKEN_RECEIVED
---
Dear {#var#}, We have received your booking token of Rs.{#var#} for {#var#}. Booking ID: {#var#}. Thank you! - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Booking ID, Company Name

### Template 4.3: Booking Agreement Ready
Category: Transactional
Template Name: BOOKING_AGREEMENT_READY
---
Dear {#var#}, Your booking agreement for {#var#} is ready. Please visit our office with required documents. Contact: {#var#}. - {#var#}
---
Variables: Customer Name, Property/Project, Contact Number, Company Name

### Template 4.4: Booking Cancelled
Category: Transactional
Template Name: BOOKING_CANCELLED
---
Dear {#var#}, Your booking for {#var#} (ID: {#var#}) has been cancelled as per your request. Refund will be processed in {#var#} days. - {#var#}
---
Variables: Customer Name, Property/Project, Booking ID, Refund Days, Company Name


================================================================================
## 5. PAYMENT TEMPLATES (Transactional)
================================================================================

### Template 5.1: Payment Received
Category: Transactional
Template Name: PAYMENT_RECEIVED
---
Dear {#var#}, Payment of Rs.{#var#} received for {#var#}. Transaction ID: {#var#}. Balance: Rs.{#var#}. Thank you! - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Transaction ID, Balance Amount, Company Name

### Template 5.2: Payment Due Reminder
Category: Transactional
Template Name: PAYMENT_DUE_REMINDER
---
Dear {#var#}, Payment of Rs.{#var#} for {#var#} is due on {#var#}. Please pay to avoid late fees. Pay online: {#var#}. - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Due Date, Payment Link, Company Name

### Template 5.3: Payment Overdue Alert
Category: Transactional
Template Name: PAYMENT_OVERDUE
---
Dear {#var#}, Your payment of Rs.{#var#} for {#var#} is overdue by {#var#} days. Late fee: Rs.{#var#}. Pay now: {#var#}. - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Days Overdue, Late Fee, Payment Link, Company Name

### Template 5.4: EMI Payment Reminder
Category: Transactional
Template Name: EMI_REMINDER
---
Dear {#var#}, EMI #{#var#} of Rs.{#var#} for {#var#} is due on {#var#}. Pay online to avoid late charges. - {#var#}
---
Variables: Customer Name, EMI Number, Amount, Property/Project, Due Date, Company Name

### Template 5.5: EMI Payment Received
Category: Transactional
Template Name: EMI_RECEIVED
---
Dear {#var#}, EMI #{#var#} of Rs.{#var#} received for {#var#}. Next EMI: Rs.{#var#} due on {#var#}. Thank you! - {#var#}
---
Variables: Customer Name, EMI Number, Amount, Property/Project, Next EMI Amount, Next Due Date, Company Name

### Template 5.6: Payment Failed
Category: Transactional
Template Name: PAYMENT_FAILED
---
Dear {#var#}, Your payment of Rs.{#var#} for {#var#} has failed. Please retry or use alternate payment method. Contact: {#var#}. - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Contact Number, Company Name

### Template 5.7: Payment Receipt
Category: Transactional
Template Name: PAYMENT_RECEIPT
---
Dear {#var#}, Receipt #{#var#} generated for Rs.{#var#} paid on {#var#}. Download: {#var#}. - {#var#}
---
Variables: Customer Name, Receipt Number, Amount, Date, Download Link, Company Name

### Template 5.8: Stripe Payment Link
Category: Transactional
Template Name: PAYMENT_LINK
---
Dear {#var#}, Pay Rs.{#var#} for {#var#} securely online: {#var#}. Link valid for 24 hours. - {#var#}
---
Variables: Customer Name, Amount, Property/Project, Payment Link, Company Name


================================================================================
## 6. DOCUMENT TEMPLATES (Transactional)
================================================================================

### Template 6.1: Document Upload Request
Category: Transactional
Template Name: DOCUMENT_REQUEST
---
Dear {#var#}, Please upload {#var#} for your booking {#var#}. Upload at: {#var#}. Deadline: {#var#}. - {#var#}
---
Variables: Customer Name, Document Name, Booking ID, Upload Link, Deadline Date, Company Name

### Template 6.2: Document Received
Category: Transactional
Template Name: DOCUMENT_RECEIVED
---
Dear {#var#}, Your {#var#} for booking {#var#} has been received and is under verification. - {#var#}
---
Variables: Customer Name, Document Name, Booking ID, Company Name

### Template 6.3: Document Verified
Category: Transactional
Template Name: DOCUMENT_VERIFIED
---
Dear {#var#}, Your {#var#} for booking {#var#} has been verified successfully. - {#var#}
---
Variables: Customer Name, Document Name, Booking ID, Company Name

### Template 6.4: Document Rejected
Category: Transactional
Template Name: DOCUMENT_REJECTED
---
Dear {#var#}, Your {#var#} for booking {#var#} was rejected. Reason: {#var#}. Please re-upload. - {#var#}
---
Variables: Customer Name, Document Name, Booking ID, Rejection Reason, Company Name


================================================================================
## 7. REFERRAL TEMPLATES (Service Explicit)
================================================================================

### Template 7.1: Referral Code Shared
Category: Service Explicit
Template Name: REFERRAL_SHARED
---
{#var#} has referred you to {#var#}. Use referral code {#var#} to get special benefits. Visit: {#var#}. - {#var#}
---
Variables: Referrer Name, Project Name, Referral Code, Website Link, Company Name

### Template 7.2: Referral Bonus Earned
Category: Transactional
Template Name: REFERRAL_BONUS
---
Congratulations {#var#}! You earned Rs.{#var#} referral bonus for {#var#}'s successful booking. Total earnings: Rs.{#var#}. - {#var#}
---
Variables: Referrer Name, Bonus Amount, Referred Person Name, Total Earnings, Company Name

### Template 7.3: Referral Registration
Category: Service Explicit
Template Name: REFERRAL_REGISTERED
---
Dear {#var#}, Thank you for registering via {#var#}'s referral. Explore our projects: {#var#}. - {#var#}
---
Variables: Customer Name, Referrer Name, Website Link, Company Name


================================================================================
## 8. COMPLAINT TEMPLATES (Transactional)
================================================================================

### Template 8.1: Complaint Registered
Category: Transactional
Template Name: COMPLAINT_REGISTERED
---
Dear {#var#}, Your complaint #{#var#} regarding {#var#} has been registered. We will resolve it within {#var#} hours. - {#var#}
---
Variables: Customer Name, Complaint ID, Issue Type, Resolution Hours, Company Name

### Template 8.2: Complaint In Progress
Category: Transactional
Template Name: COMPLAINT_PROGRESS
---
Dear {#var#}, Your complaint #{#var#} is being worked on. Current status: {#var#}. Expected resolution: {#var#}. - {#var#}
---
Variables: Customer Name, Complaint ID, Status, Expected Date, Company Name

### Template 8.3: Complaint Resolved
Category: Transactional
Template Name: COMPLAINT_RESOLVED
---
Dear {#var#}, Your complaint #{#var#} has been resolved. Resolution: {#var#}. For feedback, call {#var#}. - {#var#}
---
Variables: Customer Name, Complaint ID, Resolution Summary, Contact Number, Company Name


================================================================================
## 9. COMMISSION & STAFF TEMPLATES (Transactional)
================================================================================

### Template 9.1: Commission Earned
Category: Transactional
Template Name: COMMISSION_EARNED
---
Dear {#var#}, Commission of Rs.{#var#} earned for booking {#var#}. Total pending: Rs.{#var#}. Payout on {#var#}. - ExlainERP
---
Variables: Staff Name, Commission Amount, Booking ID, Total Pending, Payout Date

### Template 9.2: Commission Paid
Category: Transactional
Template Name: COMMISSION_PAID
---
Dear {#var#}, Commission of Rs.{#var#} has been credited to your account {#var#}. Transaction ID: {#var#}. - ExlainERP
---
Variables: Staff Name, Amount, Account Number (masked), Transaction ID

### Template 9.3: Staff Task Assigned
Category: Transactional
Template Name: TASK_ASSIGNED
---
{#var#}, New task assigned: {#var#}. Priority: {#var#}. Deadline: {#var#}. Login to ExlainERP for details.
---
Variables: Staff Name, Task Title, Priority, Deadline


================================================================================
## 10. PROJECT & PROPERTY TEMPLATES (Service Explicit)
================================================================================

### Template 10.1: New Project Launch
Category: Service Explicit
Template Name: PROJECT_LAUNCH
---
Dear {#var#}, Introducing {#var#} at {#var#}. Starting Rs.{#var#}. Limited units! Book now: {#var#}. - {#var#}
---
Variables: Customer Name, Project Name, Location, Starting Price, Website/Contact, Company Name

### Template 10.2: Price Update
Category: Service Explicit
Template Name: PRICE_UPDATE
---
Dear {#var#}, Prices for {#var#} have been revised. New price: Rs.{#var#}. Book before {#var#} to lock current rates. - {#var#}
---
Variables: Customer Name, Project Name, New Price, Deadline Date, Company Name

### Template 10.3: Property Available
Category: Service Explicit
Template Name: PROPERTY_AVAILABLE
---
Dear {#var#}, Good news! {#var#} in {#var#} is now available. Price: Rs.{#var#}. Interested? Call {#var#}. - {#var#}
---
Variables: Customer Name, Property Type/Number, Project Name, Price, Contact Number, Company Name


================================================================================
## 11. FESTIVAL & PROMOTIONAL TEMPLATES (Promotional)
================================================================================

### Template 11.1: Festival Greetings
Category: Promotional
Template Name: FESTIVAL_GREETINGS
---
Dear {#var#}, Wishing you a Happy {#var#}! Special offers on {#var#}. Visit us: {#var#}. - {#var#}
---
Variables: Customer Name, Festival Name, Project Name, Website/Office Address, Company Name

### Template 11.2: Special Offer
Category: Promotional
Template Name: SPECIAL_OFFER
---
Dear {#var#}, Exclusive offer for you! Get {#var#}% off on {#var#}. Valid till {#var#}. Call {#var#} to book. - {#var#}
---
Variables: Customer Name, Discount Percentage, Project Name, Validity Date, Contact Number, Company Name


================================================================================
## 12. GENERAL NOTIFICATION TEMPLATES (Service Implicit)
================================================================================

### Template 12.1: Account Created
Category: Transactional
Template Name: ACCOUNT_CREATED
---
Dear {#var#}, Your ExlainERP account has been created. Login: {#var#}. For support, call {#var#}. - {#var#}
---
Variables: Customer Name, Login Link, Support Number, Company Name

### Template 12.2: Profile Updated
Category: Transactional
Template Name: PROFILE_UPDATED
---
Dear {#var#}, Your profile has been updated successfully on ExlainERP. If not done by you, call {#var#} immediately. - {#var#}
---
Variables: Customer Name, Support Number, Company Name

### Template 12.3: General Reminder
Category: Service Implicit
Template Name: GENERAL_REMINDER
---
Dear {#var#}, Reminder: {#var#}. For assistance, contact {#var#}. - {#var#}
---
Variables: Customer Name, Reminder Message, Contact Number, Company Name


================================================================================
## SUMMARY - TOTAL TEMPLATES: 45
================================================================================

| Category          | Count | Template Names                                           |
|-------------------|-------|----------------------------------------------------------|
| Authentication    | 4     | LOGIN_OTP, REGISTRATION_OTP, PASSWORD_RESET_OTP, etc.    |
| Lead Management   | 4     | LEAD_WELCOME, LEAD_FOLLOWUP, LEAD_ASSIGNED, etc.         |
| Site Visit        | 6     | SITE_VISIT_SCHEDULED, REMINDER_1DAY, REMINDER_2HR, etc.  |
| Booking & Sales   | 4     | BOOKING_CONFIRMED, TOKEN_RECEIVED, AGREEMENT_READY, etc. |
| Payment           | 8     | PAYMENT_RECEIVED, DUE_REMINDER, OVERDUE, EMI_*, etc.     |
| Document          | 4     | DOCUMENT_REQUEST, RECEIVED, VERIFIED, REJECTED           |
| Referral          | 3     | REFERRAL_SHARED, BONUS, REGISTERED                       |
| Complaint         | 3     | COMPLAINT_REGISTERED, PROGRESS, RESOLVED                 |
| Commission/Staff  | 3     | COMMISSION_EARNED, PAID, TASK_ASSIGNED                   |
| Project/Property  | 3     | PROJECT_LAUNCH, PRICE_UPDATE, PROPERTY_AVAILABLE         |
| Festival/Promo    | 2     | FESTIVAL_GREETINGS, SPECIAL_OFFER                        |
| General           | 3     | ACCOUNT_CREATED, PROFILE_UPDATED, GENERAL_REMINDER       |
|-------------------|-------|----------------------------------------------------------|
| TOTAL             | 45    |                                                          |

================================================================================
## DLT REGISTRATION NOTES
================================================================================

1. **Header/Sender ID**: Use your registered 6-character sender ID (e.g., EXLERP, RLESTY)

2. **Template Categories**:
   - Transactional (T): OTP, Payment confirmations, Booking confirmations
   - Service Implicit (SI): Follow-ups, Reminders for existing customers
   - Service Explicit (SE): Marketing to opted-in customers
   - Promotional (P): Offers, Discounts (requires explicit consent)

3. **Variable Format**: Use {#var#} for all dynamic content

4. **Character Limit**: Keep templates under 160 characters when possible

5. **Consent**: Maintain opt-in/opt-out records for promotional messages

6. **DND Compliance**: Transactional messages can be sent to DND numbers, promotional cannot

================================================================================
