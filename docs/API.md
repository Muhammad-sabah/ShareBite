# Baqaya Web API Documentation

Base URL (local development): `http://localhost:8080/api` (proxied at `/api` by Vite dev server).

All currency values (`original_price`, `discounted_price`, `unit_price`, `total_price`) are whole-number **IQD** integers. All server timestamps and pickup validations use `Asia/Baghdad` (`+03:00`).

---

## Authentication & Headers

Protected endpoints require a Bearer JWT token obtained from `/api/auth/login`, `/api/auth/register/customer`, or `/api/auth/register/shop-owner`:

```http
Authorization: Bearer <jwt_token>
```

Error responses use consistent JSON:

```json
{
  "error": "Human-readable error message",
  "field": "optional_field_name"
}
```

Common HTTP status codes:
- `200 OK` / `201 Created`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid token or wrong login credentials
- `403 Forbidden`: Role mismatch or attempting to access another user's/shop's resource
- `404 Not Found`: Entity not found
- `409 Conflict`: Business rule conflict (duplicate username, insufficient stock, expired offer, already cancelled/deactivated)
- `429 Too Many Requests`: Auth rate limit exceeded

---

## Health Check

### `GET /api/health`
Checks API availability and MySQL database connectivity.

Response (`200 OK`):
```json
{
  "status": "ok",
  "service": "baqaya-api",
  "db": "connected"
}
```

---

## Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register/customer`
Registers a new customer account (`role: "customer"`).

Request Body:
```json
{
  "full_name": "Sara Ali",
  "phone_number": "07701234567",
  "username": "sara_ali",
  "password": "password123"
}
```
Validation:
- `full_name`: Required, letters and spaces only.
- `phone_number`: Required, 10–15 digits (spaces, dashes, optional leading `+` stripped on validation).
- `username`: Required, unique within the `customer` role, no spaces.
- `password`: Minimum 6 characters (stored as a bcrypt hash).

Response (`201 Created`): Returns `{ "token": "...", "user": { ... } }`.

---

### `POST /api/auth/register/shop-owner`
Registers a new shop owner account (`role: "shop_owner"`) and creates their shop profile atomically.

Request Body:
```json
{
  "owner_name": "Rebwar Karim",
  "shop_name": "Zozik Bakery",
  "category": "Bakery",
  "contact_number": "07709998877",
  "address": "Bakrajo Street, Sulaymaniyah",
  "username": "zozik_bakery",
  "password": "password123"
}
```
Allowed `category` values: `Bakery`, `Restaurant`, `Café`, `Grocery`, `Other`.

Response (`201 Created`): Returns `{ "token": "...", "user": { ..., "shop": { ... } } }`.

---

### `POST /api/auth/login`
Authenticates either a `customer` or `shop_owner`. Usernames are scoped per role.

Request Body:
```json
{
  "role": "customer",
  "username": "customer1",
  "password": "pass123"
}
```
Response (`200 OK`):
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "role": "customer",
    "username": "customer1",
    "full_name": "Sara Ahmed",
    "phone_number": "07701234567"
  }
}
```

---

### `GET /api/auth/me`
*(Auth required)* Returns the authenticated user's profile (including `shop` for shop owners).

---

## Public / Marketplace Offers (`/api/offers`)

### `GET /api/offers`
Lists active offers whose `pickup_end_at` is in the future (auto-syncs expired offers before querying).

Query parameters (optional):
- `search`: Matches food name or shop name (case-insensitive)
- `category`: One of `Bakery`, `Restaurant`, `Café`, `Grocery`, `Other` (or `All`)
- `sort`: `soonest` (default, earliest `pickup_end_at`), `lowest_price`, `highest_discount`, `newest`

Response (`200 OK`):
```json
{
  "offers": [
    {
      "id": 1,
      "offer_code": "O0001",
      "shop_id": 1,
      "shop_name": "City Star Bakery",
      "shop_address": "Salim Street, Sulaymaniyah",
      "shop_category": "Bakery",
      "food_name": "Assorted Croissants Box",
      "description": "...",
      "category": "Bakery",
      "image_url": "/images/food/croissant.svg",
      "original_price": 8000,
      "discounted_price": 4000,
      "discount_percent": 50,
      "original_quantity": 6,
      "available_quantity": 6,
      "pickup_date": "2026-11-12",
      "pickup_start_time": "17:00",
      "pickup_end_time": "22:00",
      "pickup_end_at": "2026-11-12T22:00:00+03:00",
      "status": "Active",
      "created_at": "..."
    }
  ]
}
```

### `GET /api/offers/:id`
Returns full marketplace detail for an offer.

---

## Customer Endpoints (`/api/customer/*`)

*Requires `Authorization: Bearer <token>` with role `customer`.*

### `POST /api/customer/reservations`
Creates a reservation inside a MySQL transaction with `SELECT ... FOR UPDATE` row locking to prevent overselling. Unit price and total price are calculated exclusively on the server, and stock is deducted atomically (transitioning offer to `Sold Out` when `available_quantity == 0`).

Request Body:
```json
{
  "offer_id": 1,
  "quantity": 2
}
```
Response (`201 Created`):
```json
{
  "reservation": {
    "id": 2,
    "reservation_code": "R0002",
    "customer_id": 1,
    "offer_id": 1,
    "offer_code": "O0001",
    "food_name": "Assorted Croissants Box",
    "offer_image_url": "/images/food/croissant.svg",
    "category": "Bakery",
    "shop_id": 1,
    "shop_name": "City Star Bakery",
    "shop_address": "Salim Street, Sulaymaniyah",
    "quantity": 2,
    "unit_price": 4000,
    "total_price": 8000,
    "pickup_date": "2026-11-12",
    "pickup_start_time": "17:00",
    "pickup_end_time": "22:00",
    "pickup_end_at": "2026-11-12T22:00:00+03:00",
    "status": "Active",
    "created_at": "..."
  },
  "message": "Reservation confirmed! Pay in cash at pickup."
}
```

### `GET /api/customer/reservations`
Lists all reservations belonging exclusively to the authenticated customer (`Active` first, then historical).

### `GET /api/customer/reservations/:id`
Returns reservation detail if owned by the authenticated customer (`403` otherwise).

### `POST /api/customer/reservations/:id/cancel`
Cancels an `Active` reservation belonging to the customer before pickup end time inside a transaction:
1. Marks reservation `Cancelled`.
2. Restores reserved `quantity` to `offer.available_quantity`.
3. If the offer was `Sold Out` and still before `pickup_end_at`, transitions it back to `Active`. If the offer was `Deactivated`, it remains `Deactivated`.

---

## Shop Owner Endpoints (`/api/shop/*`)

*Requires `Authorization: Bearer <token>` with role `shop_owner`. All resources are scoped to the owner's shop.*

### `GET /api/shop/dashboard`
Returns shop profile summary and live counts (`active_offers_count`, `total_offers_count`, `active_reservations_count`, `total_reservations_count`).

### `PUT /api/shop/profile`
Updates the shop's contact details and description.

Request Body:
```json
{
  "contact_number": "07701112233",
  "address": "Salim Street, Sulaymaniyah",
  "description": "Fresh baked goods available daily."
}
```

### `POST /api/shop/offers`
Creates a new surplus food offer (`Active`). Validations:
- `original_price > 0`, `discounted_price > 0`, `discounted_price < original_price`
- `available_quantity > 0`
- Valid `pickup_date` (`YYYY-MM-DD`), `pickup_start_time` (`HH:MM`), `pickup_end_time` (`HH:MM`) in `Asia/Baghdad`
- `pickup_end_at > pickup_start_at` and `pickup_end_at > now`

### `GET /api/shop/offers`
Lists the shop owner's offers (optional query: `status=Active|Sold Out|Expired|Deactivated`).

### `GET /api/shop/offers/:id`
Returns details of an offer owned by the shop (`403` for other shops' offers).

### `POST /api/shop/offers/:id/deactivate`
Permanently deactivates an `Active` or `Sold Out` offer owned by the shop. Existing `Active` reservations remain valid until `pickup_end_at`.

### `GET /api/shop/reservations`
Lists customer reservations for the shop's offers (optional query: `status=Active|Cancelled|Expired`). Includes customer name and phone number for in-person pickup verification.

### `GET /api/shop/reservations/:id`
Returns single reservation details for an offer belonging to the shop (`403` otherwise).

### `POST /api/shop/uploads`
Accepts `multipart/form-data` with field `image` (`.jpg`, `.jpeg`, `.png`, `.webp`, max 5 MB), validates MIME magic bytes, and returns:
```json
{
  "image_url": "/uploads/offer_xxxxxxxxxxxx.jpg"
}
```

