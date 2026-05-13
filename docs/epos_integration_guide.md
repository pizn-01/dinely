# Dinely ePOS Integration Guide

Welcome to the Dinely ePOS Integration API! This guide covers everything you need to seamlessly integrate your electronic Point of Sale (ePOS) system with Dinely's reservation and table management platform.

> **Note:** The ePOS Integration API and POS Autologin features are exclusively available on the **Professional Plan**.

---

## 1. Prerequisites

Before starting your integration, ensure you have:
1. **Professional Plan Active:** Your organization must be subscribed to the Professional plan.
2. **API Key:** Generate an API key from your Dinely Admin Dashboard under the **API Keys** tab.
3. **Autologin Secret:** Navigate to **Settings > POS Autologin Integration** to generate or retrieve your HMAC-SHA256 secret.

---

## 2. Authentication

All integration API requests must be authenticated using the `X-API-Key` header.

```http
GET /api/v1/integration/reservations
Host: api.dinely.com
X-API-Key: your_generated_api_key_here
```

If the key is missing or invalid, or if your organization is not on the Professional plan, the API will return a `401 Unauthorized` or `403 Forbidden` response.

---

## 3. Endpoints Reference

Base URL: `https://api.dinely.com/api/v1/integration`

### 3.1 Fetch Today's Reservations
Retrieve all reservations scheduled for the current date.

**Endpoint:** `GET /reservations`

**Query Parameters:**
- `date` (optional): `YYYY-MM-DD` (defaults to today)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "res_123",
      "reservation_date": "2026-06-01",
      "start_time": "19:00",
      "end_time": "20:30",
      "party_size": 4,
      "status": "pending",
      "guest": {
        "first_name": "John",
        "last_name": "Doe"
      },
      "table": {
        "name": "Table 4"
      }
    }
  ]
}
```

### 3.2 Create Walk-In Reservation
Quickly create a new reservation from the POS for walk-in guests.

**Endpoint:** `POST /reservations`

**Payload:**
```json
{
  "tableId": "uuid-of-table",
  "partySize": 2,
  "guestFirstName": "Walk-in"
}
```

### 3.3 Update Reservation Status
Keep Dinely in sync with the POS (e.g., when guests are seated or finish their meal).

**Endpoint:** `PATCH /reservations/:id/status`

**Payload:**
```json
{
  "status": "seated" // "confirmed", "seated", "completed", "cancelled", "no_show"
}
```

### 3.4 Push Sale Total
Send the final bill amount back to Dinely for analytics.

**Endpoint:** `PATCH /reservations/:id/total`

**Payload:**
```json
{
  "totalAmount": 145.50
}
```

### 3.5 Check Table Availability
Check if a specific configuration is available.

**Endpoint:** `GET /availability/tables`

**Query Parameters:** `date`, `time`, `partySize`

---

## 4. POS Autologin Setup (HMAC-Signed)

To allow staff to jump from the ePOS screen directly into the Dinely staff dashboard without typing passwords, use the HMAC-signed autologin URL.

**Base URL:** `https://your-restaurant.dinely.com/autologin`

### Required Parameters
1. `slug`: Your restaurant's unique URL slug.
2. `email`: The email address of the staff member to log in.
3. `hash`: An HMAC-SHA256 signature to verify the request.

### Generating the Hash
Create an HMAC-SHA256 hash using your **Integration Secret** (from the Settings tab).
The message to sign must be exactly the staff member's email address.

**Node.js Example:**
```javascript
const crypto = require('crypto');

const secret = 'your_integration_secret';
const email = 'staff@restaurant.com';
const slug = 'my-restaurant';

const hash = crypto
  .createHmac('sha256', secret)
  .update(email)
  .digest('hex');

const autologinUrl = `https://your-restaurant.dinely.com/autologin?slug=${slug}&email=${encodeURIComponent(email)}&hash=${hash}`;
```

When a user clicks this link, Dinely verifies the hash. If valid, the staff member is immediately authenticated and redirected to the Staff Dashboard.

---

## 5. Webhooks (Coming Soon)
Real-time push events for reservation updates directly to your ePOS are currently under development.

---

## 6. Error Handling

- **400 Bad Request:** Missing or invalid parameters.
- **401 Unauthorized:** Invalid or missing `X-API-Key`.
- **403 Forbidden:** The organization is not on the Professional plan.
- **404 Not Found:** Resource (e.g., reservation) does not exist.
- **429 Too Many Requests:** You have exceeded the API rate limit (Standard is 100 requests / minute).

---

If you need technical assistance during your integration, please reach out to Dinely Priority Support via your admin dashboard.
