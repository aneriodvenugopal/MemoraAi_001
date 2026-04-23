# RETOERP Complete API Documentation

## 🎯 Overview

Total APIs: **67 Endpoints**
Base URL: `https://retoerp.com/api`

---

## 📦 1. Payment Schemes Management (9 APIs)

### Create Payment Scheme
**POST** `/api/schemes`
```json
{
  "tenant_id": "string",
  "project_id": "string (optional)",
  "scheme_name": "12 Months Standard",
  "scheme_type": "12_months",
  "duration_months": 12,
  "fields": [
    {
      "field_name": "Booking Amount",
      "field_value": 100000,
      "due_month": 0,
      "is_percentage": false,
      "description": "Initial booking"
    }
  ]
}
```

### List Payment Schemes
**GET** `/api/schemes?tenant_id={id}&project_id={id}&scheme_type=12_months&is_finalized=false`

### Get Single Scheme
**GET** `/api/schemes/{scheme_id}`

### Update Scheme
**PUT** `/api/schemes/{scheme_id}`

### Delete Scheme
**DELETE** `/api/schemes/{scheme_id}`

### Finalize Scheme (Lock)
**POST** `/api/schemes/{scheme_id}/finalize`

### Get System Templates
**GET** `/api/schemes/templates/system`

### Clone Scheme
**POST** `/api/schemes/{scheme_id}/clone`

---

## 💳 2. Customer Payments (8 APIs)

### Create Razorpay Order
**POST** `/api/razorpay/create-order`
```json
{
  "tenant_id": "string",
  "booking_ids": ["booking1", "booking2"],
  "customer_id": "string",
  "amount": 100000,
  "currency": "INR"
}
```
**Response:**
```json
{
  "order_id": "order_xyz",
  "amount": 100000,
  "currency": "INR",
  "key_id": "rzp_test_...",
  "payment_id": "payment_abc"
}
```

### Verify Razorpay Payment
**POST** `/api/razorpay/verify`
```json
{
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_xyz",
  "razorpay_signature": "signature_xyz"
}
```

### Manual Payment Entry
**POST** `/api/manual`
```json
{
  "tenant_id": "string",
  "booking_ids": ["booking1"],
  "customer_id": "string",
  "amount": 50000,
  "currency_id": "INR",
  "payment_method": "manual",
  "payment_mode": "neft",
  "reference_number": "UTR123456",
  "allocation": {
    "booking1": 50000
  }
}
```

### Clear Cheque Payment
**POST** `/api/cheque/{payment_id}/clear`

### List Payments
**GET** `/api/payments?tenant_id={id}&customer_id={id}&status=completed`

### Get Payment Details
**GET** `/api/payments/{payment_id}`

### Get Customer Payment History
**GET** `/api/customer/{customer_id}/payments`

---

## 👥 3. Staff Hierarchy Management (8 APIs)

### Create Staff Hierarchy
**POST** `/api/staff-hierarchy`
```json
{
  "tenant_id": "string",
  "staff_id": "string",
  "staff_name": "John Doe",
  "staff_phone": "1234567890",
  "role_id": "role_id",
  "role_name": "Senior Agent",
  "parent_staff_id": "manager_id (optional)",
  "direct_commission_percentage": 1.5,
  "gap_commission_percentage": 0.5,
  "project_commissions": {
    "project1": {"direct": 2.0, "gap": 0.7}
  },
  "category_commissions": {
    "category1": {"direct": 2.5, "gap": 0.8}
  }
}
```

### List Staff Hierarchy
**GET** `/api/staff-hierarchy?tenant_id={id}&parent_staff_id={id}`

### Get Staff Details
**GET** `/api/staff-hierarchy/{staff_id}?tenant_id={id}`

### Update Staff Hierarchy
**PUT** `/api/staff-hierarchy/{staff_id}?tenant_id={id}`

### Delete Staff Hierarchy
**DELETE** `/api/staff-hierarchy/{staff_id}?tenant_id={id}`

### Get Staff Tree (Recursive)
**GET** `/api/staff-hierarchy/{staff_id}/tree?tenant_id={id}`

### Get Staff Upline
**GET** `/api/staff-hierarchy/{staff_id}/upline?tenant_id={id}`

---

## 💰 4. Commission Management (11 APIs)

### List Commission Earnings
**GET** `/api/commissions/earnings?tenant_id={id}&staff_id={id}&status=pending`

### Get Commission Details
**GET** `/api/commissions/earnings/{earning_id}`

### Approve/Reject Commission
**POST** `/api/commissions/earnings/{earning_id}/approve`
```json
{
  "commission_earning_id": "earning_id",
  "action": "approve",
  "notes": "Approved for payout"
}
```
**Actions:** `approve`, `reject`, `hold`

### Get Staff Commission Summary
**GET** `/api/commissions/staff/{staff_id}/summary?from_date=2025-01-01&to_date=2025-01-31`

### Create Commission Payout
**POST** `/api/commissions/payouts`
```json
{
  "tenant_id": "string",
  "staff_id": "string",
  "commission_earning_ids": ["earning1", "earning2"],
  "payment_mode": "bank_transfer",
  "payment_reference": "TXN123456",
  "company_account_id": "account1",
  "processed_by": "admin_id"
}
```

### List Commission Payouts
**GET** `/api/commissions/payouts?tenant_id={id}&staff_id={id}`

### Get Payout Details
**GET** `/api/commissions/payouts/{payout_id}`

### Trigger Manual Commission Calculation
**POST** `/api/commissions/trigger-calculation/{payment_id}`

---

## 🏢 5. Property Categories (13 APIs)

### Get Master Categories
**GET** `/api/categories/master`

### Get Master Subcategories
**GET** `/api/categories/master/{category_id}/subcategories`

### Get All Categories with Subcategories
**GET** `/api/categories/master/all-with-subcategories`

### Create Tenant Category
**POST** `/api/categories/tenant`

### List Tenant Categories
**GET** `/api/categories/tenant?tenant_id={id}`

### Get Tenant Category
**GET** `/api/categories/tenant/{category_id}`

### Update Tenant Category
**PUT** `/api/categories/tenant/{category_id}`

### Delete Tenant Category
**DELETE** `/api/categories/tenant/{category_id}`

### Create Tenant Subcategory
**POST** `/api/categories/tenant/{category_id}/subcategories`

### List Tenant Subcategories
**GET** `/api/categories/tenant/{category_id}/subcategories`

### Update Tenant Subcategory
**PUT** `/api/categories/tenant/subcategories/{subcategory_id}`

### Delete Tenant Subcategory
**DELETE** `/api/categories/tenant/subcategories/{subcategory_id}`

---

## 💱 6. Currency Management (8 APIs)

### Get All Currencies
**GET** `/api/currencies?is_active=true`

### Get Currency by ID
**GET** `/api/currencies/{currency_id}`

### Get Currency by Code
**GET** `/api/currencies/code/{currency_code}`

### Create Currency
**POST** `/api/currencies`
```json
{
  "code": "AUD",
  "name": "Australian Dollar",
  "symbol": "A$",
  "exchange_rate_to_inr": 55.0
}
```

### Update Currency
**PUT** `/api/currencies/{currency_id}`

### Update Exchange Rate
**PUT** `/api/currencies/code/{currency_code}/rate?exchange_rate_to_inr=85.0`

### Convert Currency
**POST** `/api/currencies/convert?amount=1000&from_currency=USD&to_currency=INR`

### Get All Exchange Rates
**GET** `/api/currencies/rates/all?base_currency=INR`

---

## 📊 7. Usage Tracking & Limits (10 APIs)

### Get Tenant Usage
**GET** `/api/usage/tenant/{tenant_id}`

**Response:**
```json
{
  "tenant_id": "tenant1",
  "package": "Professional",
  "usage": {
    "projects": {
      "used": 8,
      "limit": 10,
      "remaining": 2,
      "percentage": 80.0
    },
    "sms": {
      "used": 1500,
      "limit": 2000,
      "remaining": 500,
      "percentage": 75.0
    }
  }
}
```

### Check Resource Limit
**GET** `/api/usage/check/{tenant_id}/{resource_type}`

**resource_type:** `projects`, `users`, `properties`, `sms`, `email`, `whatsapp`

### Increment Usage
**POST** `/api/usage/increment/{tenant_id}/{resource_type}?amount=1`

### Decrement Usage
**POST** `/api/usage/decrement/{tenant_id}/{resource_type}?amount=1`

### Sync Actual Usage
**POST** `/api/usage/sync/{tenant_id}`

### Reset Monthly Usage
**POST** `/api/usage/reset-monthly/{tenant_id}` (Admin only)

### Get Usage Alerts
**GET** `/api/usage/alerts/{tenant_id}?is_resolved=false`

### Resolve Usage Alert
**POST** `/api/usage/alerts/{alert_id}/resolve`

### Get Usage History
**GET** `/api/usage/history/{tenant_id}?months=6`

### Get Usage Dashboard
**GET** `/api/usage/dashboard/{tenant_id}`

---

## 🔒 Authentication

All APIs require authentication token in header:
```
Authorization: Bearer <token>
```

---

## 📝 Common Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "detail": "Detailed error message"
}
```

---

## 🔄 Commission Auto-Calculation Flow

```
1. Payment Completed (Razorpay/Manual)
   ↓
2. Background Task Triggered
   ↓
3. Get Booking Details → Get Staff Hierarchy
   ↓
4. Calculate Direct Commission (Sales Staff)
   - Check project-specific rate
   - Check category-specific rate
   - Calculate TDS (5%)
   ↓
5. Calculate Gap Commissions (Upline Managers)
   - For each manager in hierarchy_path
   - Check their gap commission %
   - Check project/category overrides
   - Calculate TDS (5%)
   ↓
6. Create CommissionEarning Records (Status: Pending)
   ↓
7. Send Alert if 80% usage reached
```

---

## 📊 Usage Limit Enforcement Flow

```
1. Tenant Tries to Create Resource (Project/User/Property)
   ↓
2. Check Current Usage vs Limit
   ↓
3. IF under limit:
   - Allow creation
   - Increment usage counter
   - If 80% reached → Create warning alert
   ↓
4. IF limit reached:
   - Return 403 Error
   - Message: "Limit reached. Please upgrade plan."
```

---

## 🎯 Integration Examples

### Frontend Razorpay Integration:

```javascript
// 1. Create Order
const response = await fetch('/api/razorpay/create-order', {
  method: 'POST',
  body: JSON.stringify({
    tenant_id: "tenant1",
    booking_ids: ["booking1"],
    customer_id: "customer1",
    amount: 100000,
    currency: "INR"
  })
});

const { order_id, key_id, amount } = await response.json();

// 2. Open Razorpay Checkout
const options = {
  key: key_id,
  amount: amount * 100, // Paise
  currency: "INR",
  order_id: order_id,
  handler: async function(response) {
    // 3. Verify Payment
    await fetch('/api/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

### Usage Limit Check Before Creating Resource:

```javascript
// Before creating project
const checkResponse = await fetch('/api/usage/check/tenant1/projects');
const { allowed, message } = await checkResponse.json();

if (!allowed) {
  alert(message); // "Limit reached: 10/10 projects used"
  return;
}

// Create project
const createResponse = await fetch('/api/projects', { method: 'POST', ... });

// Increment usage
await fetch('/api/usage/increment/tenant1/projects', { method: 'POST' });
```

---

## 📞 Support

For API support, contact: dev@retoerp.com
