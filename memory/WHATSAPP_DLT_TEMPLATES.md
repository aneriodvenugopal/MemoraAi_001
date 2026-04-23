# WhatsApp Business Message Templates for DLT Approval
**Brand/Header:** ELNIOT  
**Company:** ELNIOT SOFTWARE / RealApex  
**Last Updated:** 2026-02-02

---

## Category: TRANSACTIONAL (High Priority)

### 1. WHATSAPP_OTP
**Purpose:** One-time password for user authentication
```
Your OTP for RealApex login is {#otp#}. This code is valid for 10 minutes. Do not share this code with anyone. - ELNIOT SOFTWARE
```

---

### 2. WHATSAPP_BOOKING_CONFIRMED
**Purpose:** Property booking confirmation notification
```
Congratulations! Your property booking is confirmed.

Booking ID: {#booking_id#}
Property: {#property_name#}
Amount Paid: Rs.{#amount#}

Thank you for choosing RealApex. - ELNIOT SOFTWARE
```

---

### 3. WHATSAPP_PAYMENT_RECEIVED
**Purpose:** Payment receipt acknowledgment
```
Dear Customer, we have received your payment successfully.

Amount: Rs.{#amount#}
Transaction ID: {#txn_id#}

Thank you for your payment. - ELNIOT SOFTWARE
```

---

### 4. WHATSAPP_PAYMENT_REMINDER
**Purpose:** Upcoming payment due reminder
```
Dear Customer, this is a reminder for your upcoming payment.

Amount Due: Rs.{#amount#}
Due Date: {#due_date#}

Please pay on time to avoid late charges. Login at https://realapex.in - ELNIOT SOFTWARE
```

---

### 5. WHATSAPP_PAYMENT_OVERDUE
**Purpose:** Overdue payment alert notification
```
Dear Customer, your payment is overdue.

Overdue Amount: Rs.{#amount#}
Days Overdue: {#days#}

Please pay immediately to avoid penalties. Contact us for assistance. - ELNIOT SOFTWARE
```

---

### 6. WHATSAPP_EMI_REMINDER
**Purpose:** Monthly EMI payment reminder
```
Dear Customer, your monthly EMI payment is due.

EMI Amount: Rs.{#amount#}
Due Date: {#due_date#}

Please ensure timely payment. Login at https://realapex.in - ELNIOT SOFTWARE
```

---

### 7. WHATSAPP_TOKEN_RECEIVED
**Purpose:** Token payment confirmation for property booking
```
Dear Customer, your token payment has been received successfully.

Token Amount: Rs.{#amount#}
Property: {#property_name#}

Your booking is now being processed. Thank you. - ELNIOT SOFTWARE
```

---

## Category: SERVICE IMPLICIT

### 8. WHATSAPP_SITE_VISIT_SCHEDULED
**Purpose:** Site visit appointment confirmation
```
Dear Customer, your site visit has been scheduled.

Date: {#visit_date#}
Time: {#visit_time#}
Location: {#location#}

Our executive will assist you at the site. - ELNIOT SOFTWARE
```

---

### 9. WHATSAPP_SITE_VISIT_REMINDER
**Purpose:** Site visit reminder one day before
```
Dear Customer, reminder for your scheduled site visit tomorrow.

Date: {#visit_date#}
Time: {#visit_time#}

Please reach the location on time. Contact us if you need to reschedule. - ELNIOT SOFTWARE
```

---

### 10. WHATSAPP_LEAD_WELCOME
**Purpose:** Welcome message for new property enquiry
```
Dear Customer, thank you for your interest in our properties.

Our team will contact you shortly to understand your requirements. For immediate assistance, please call our helpline.

- ELNIOT SOFTWARE
```

---

### 11. WHATSAPP_DOCUMENT_REQUEST
**Purpose:** Request customer to upload required documents
```
Dear Customer, please upload your documents for booking verification.

Document Required: {#doc_type#}
Upload Deadline: {#deadline#}

Login to https://realapex.in to upload. - ELNIOT SOFTWARE
```

---

### 12. WHATSAPP_DOCUMENT_READY
**Purpose:** Notify customer that document is ready for download
```
Dear Customer, your property document is ready for download.

Document Type: {#doc_type#}

Please login to https://realapex.in to access your document. - ELNIOT SOFTWARE
```

---

### 13. WHATSAPP_STAFF_LEAD_ASSIGNED
**Purpose:** Notify staff about new lead assignment
```
New lead has been assigned to you.

Lead Name: {#lead_name#}
Contact: {#phone#}

Please follow up today. Login to RealApex CRM for details. - ELNIOT SOFTWARE
```

---

### 14. WHATSAPP_STAFF_FOLLOWUP_REMINDER
**Purpose:** Remind staff about pending follow-up
```
Reminder: You have a follow-up due today.

Lead Name: {#lead_name#}

Please complete the follow-up and update the status in CRM. - ELNIOT SOFTWARE
```

---

## Category: PROMOTIONAL

### 15. WHATSAPP_PROJECT_LAUNCH
**Purpose:** New project announcement to customers
```
Introducing our new project!

Project: {#project_name#}
Location: {#location#}
Starting Price: Rs.{#price#}

Limited plots available. Enquire now at https://realapex.in - ELNIOT SOFTWARE
```

---

### 16. WHATSAPP_SPECIAL_OFFER
**Purpose:** Special discount offer notification
```
Special offer for you!

Discount: {#discount#} percent off
Valid Till: {#valid_date#}

Book now to avail this limited time offer. Visit https://realapex.in - ELNIOT SOFTWARE
```

---

## Key Changes Made for DLT Approval:

1. **Single Variable Per Line** - No consecutive variables like `{#var#} {#var#} {#var#}`
2. **Clear Purpose** - Each template has explicit business purpose
3. **Static Text Balance** - More static text around variables for context
4. **No Emojis** - Removed emojis as some DLT operators reject them
5. **Brand Signature** - Consistent "ELNIOT SOFTWARE" at end
6. **Clear Formatting** - Line breaks for readability
7. **Indian Format** - Using "Rs." instead of "₹" symbol for compatibility

---

## Submission Notes:

- Submit under **Header/Brand:** ELNIOT
- **Entity Type:** Company
- **Template Type:** As mentioned per category
- For variables, use descriptive names like `{#amount#}`, `{#date#}` instead of generic `{#var#}`
- If provider requires generic `{#var#}`, replace accordingly
