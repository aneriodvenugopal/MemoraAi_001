"""
DLT Approved SMS Templates for RealApex
Provider: smslogin.co
Sender ID: ELNIOT
Updated: 2026-02-03
"""

# All approved DLT Template IDs and their content
# Format: {#var#} are placeholders for dynamic values

DLT_TEMPLATES = {
    # OTP Templates
    "otp_login": {
        "id": "1707176950077307427",
        "name": "OTP LOGIN",
        "template": "{#var#} is your OTP to login to RealApex. Valid for 10 minutes. Do not share with anyone. ELNIOT SOFTWARE",
        "variables": ["otp"],
        "type": "transactional"
    },
    "otp_payment": {
        "id": "1707176950667663013",
        "name": "OTP PAYMENT",
        "template": "{#var#} is your OTP to confirm payment of Rs.{#var#}. Valid for 10 minutes. Do not share. RealApex by ELONIOT SOFTWARE",
        "variables": ["otp", "amount"],
        "type": "transactional"
    },
    "otp_retorp": {
        "id": "1707176871449969835",
        "name": "OTP RETORP",
        "template": "{#var#} is your OTP for RETORP login. Valid for {#var#} minutes. Do not share this OTP with anyone.ELNIOT",
        "variables": ["otp", "validity_minutes"],
        "type": "transactional"
    },
    
    # Payment & Booking Templates
    "payment_received": {
        "id": "1707176950902819903",
        "name": "Payment Received",
        "template": "Dear {#var#}, we have received Rs.{#var#} for your property booking. Receipt No: {#var#}. Thank you. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "amount", "receipt_no"],
        "type": "transactional"
    },
    "token_received": {
        "id": "1707177002982385853",
        "name": "Token Received",
        "template": "Dear Customer, your token payment of Rs.{#var#} has been received successfully for property booking. Thank you for choosing RealApex. - ELONIOT SOFTWARE",
        "variables": ["amount"],
        "type": "transactional"
    },
    "payment_link": {
        "id": "1707176951197378953",
        "name": "Payment Link",
        "template": "Dear {#var#}, click to pay Rs.{#var#} for your property: {#var#}. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "amount", "payment_link"],
        "type": "transactional"
    },
    "booking_confirmed": {
        "id": "1707176951527059937",
        "name": "Booking Confirmed",
        "template": "Dear {#var#}, your property booking is confirmed. Booking ID: {#var#}. Total Amount: Rs.{#var#}. Congratulations! RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "booking_id", "total_amount"],
        "type": "transactional"
    },
    
    # EMI & Payment Reminder Templates
    "emi_due": {
        "id": "1707176951395600057",
        "name": "EMI Due",
        "template": "Dear {#var#}, your EMI of Rs.{#var#} is due on {#var#}. Installment {#var#}. Please pay on time. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "amount", "due_date", "installment_no"],
        "type": "transactional"
    },
    "emi_due_detailed": {
        "id": "1707177009801035692",
        "name": "EMI Due Detailed",
        "template": "Dear {#var#}, your Property EMI of Rs.{#var#} is due on {#var#}. Installment {#var#}. Please pay on time. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "amount", "due_date", "installment_no"],
        "type": "transactional"
    },
    "payment_reminder": {
        "id": "1707177009325781220",
        "name": "Payment Reminder",
        "template": "Dear Customer, your Property EMI payment of Rs.{#var#} is due on {#var#}. Please pay before due date to avoid late charges. Login to RealApex SAAS by - ELONIOT SOFTWARE",
        "variables": ["amount", "due_date"],
        "type": "transactional"
    },
    
    # Site Visit Templates
    "visit_confirmed": {
        "id": "1707176975185212081",
        "name": "Visit Confirmed",
        "template": "Dear {#var#}, your site visit is confirmed on {#var#} at {#var#}. Our representative will assist you. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "visit_date", "visit_time"],
        "type": "service"
    },
    "visit_reminder": {
        "id": "1707176975197155538",
        "name": "Visit Reminder",
        "template": "Dear {#var#}, reminder for your site visit tomorrow at {#var#}. We look forward to meeting you. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "visit_time"],
        "type": "service"
    },
    "visit_rescheduled": {
        "id": "1707176975538340908",
        "name": "Visit Rescheduled",
        "template": "Dear {#var#}, your site visit has been rescheduled to {#var#} at {#var#}. Thank you for understanding. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "new_date", "new_time"],
        "type": "service"
    },
    
    # Document & Agreement Templates
    "document_ready": {
        "id": "1707177002990158163",
        "name": "Document Ready",
        "template": "Dear Customer, your property document is ready for download. Please login to RealApex portal at https://realapex.in to access. - ELONIOT SOFTWARE",
        "variables": [],
        "type": "service"
    },
    "agreement_ready": {
        "id": "1707176957745145432",
        "name": "Agreement Ready",
        "template": "Dear {#var#}, your property sale agreement is ready. Please visit our office with required documents. RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name"],
        "type": "service"
    },
    "registration_done": {
        "id": "1707176957786037371",
        "name": "Registration Done",
        "template": "Dear {#var#}, property registration completed successfully. Registration No: {#var#}. Congratulations! RealApex by ELONIOT SOFTWARE",
        "variables": ["customer_name", "registration_no"],
        "type": "transactional"
    },
    
    # Lead & Staff Templates
    "welcome": {
        "id": "1707176977092580435",
        "name": "Welcome",
        "template": "Welcome {#var#}! You can now track your bookings and payments at RealApex portal. Thank you. ELONIOT SOFTWARE",
        "variables": ["customer_name"],
        "type": "service"
    },
    "new_lead_assigned": {
        "id": "1707177010976636389",
        "name": "New Lead Assigned",
        "template": "Hi {#var#}, new lead assigned:{#var#}. Please follow up today. RealApex by ELONIOT SOFTWARE",
        "variables": ["staff_name", "lead_name"],
        "type": "service"
    },
    "follow_up_reminder": {
        "id": "1707177011579530598",
        "name": "Follow-up",
        "template": "Hi {#var#}, This is a reminder to follow up on your Real Estate Project Lead - {#var#} registered in RealApex CRM. Action is due today. - RealApex Remind",
        "variables": ["staff_name", "lead_name"],
        "type": "service"
    }
}


def get_template(template_key: str) -> dict:
    """Get template by key"""
    return DLT_TEMPLATES.get(template_key, {})


def get_template_id(template_key: str) -> str:
    """Get DLT template ID by key"""
    template = DLT_TEMPLATES.get(template_key, {})
    return template.get("id", "")


def fill_template(template_key: str, variables: dict) -> str:
    """
    Fill template with variables
    Variables should be in order as defined in template
    
    Example:
        fill_template("payment_received", {
            "customer_name": "Raju",
            "amount": "50000",
            "receipt_no": "RCP123"
        })
    """
    template_data = DLT_TEMPLATES.get(template_key)
    if not template_data:
        return ""
    
    template = template_data["template"]
    var_names = template_data.get("variables", [])
    
    # Replace {#var#} placeholders in order with variable values
    result = template
    for var_name in var_names:
        if var_name in variables:
            result = result.replace("{#var#}", str(variables[var_name]), 1)
    
    return result


def get_all_template_ids() -> dict:
    """Get all template IDs as a mapping"""
    return {key: data["id"] for key, data in DLT_TEMPLATES.items()}


def get_templates_by_type(template_type: str) -> dict:
    """Get all templates of a specific type"""
    return {
        key: data for key, data in DLT_TEMPLATES.items() 
        if data.get("type") == template_type
    }


# Template key constants for easy reference
class SMSTemplateKey:
    # OTP
    OTP_LOGIN = "otp_login"
    OTP_PAYMENT = "otp_payment"
    OTP_RETORP = "otp_retorp"
    
    # Payment & Booking
    PAYMENT_RECEIVED = "payment_received"
    TOKEN_RECEIVED = "token_received"
    PAYMENT_LINK = "payment_link"
    BOOKING_CONFIRMED = "booking_confirmed"
    
    # EMI
    EMI_DUE = "emi_due"
    EMI_DUE_DETAILED = "emi_due_detailed"
    PAYMENT_REMINDER = "payment_reminder"
    
    # Site Visit
    VISIT_CONFIRMED = "visit_confirmed"
    VISIT_REMINDER = "visit_reminder"
    VISIT_RESCHEDULED = "visit_rescheduled"
    
    # Documents
    DOCUMENT_READY = "document_ready"
    AGREEMENT_READY = "agreement_ready"
    REGISTRATION_DONE = "registration_done"
    
    # Lead & Staff
    WELCOME = "welcome"
    NEW_LEAD_ASSIGNED = "new_lead_assigned"
    FOLLOW_UP_REMINDER = "follow_up_reminder"
