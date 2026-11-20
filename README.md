# Baqaya – Web-Based Food Surplus Marketplace

**Baqaya** connects local bakeries, restaurants, cafés, and grocery shops with nearby customers to rescue daily surplus food at discounted prices—reducing food waste while offering affordable meals.

- **Initial Market Focus**: Sulaymaniyah, Kurdistan Region of Iraq
- **Currency**: Whole-number Iraqi Dinar (**IQD**) formatted with thousand separators (e.g., `4,000 IQD`)
- **Fulfillment Model**: In-person pickup at the shop's street address, paid **in cash at the shop** (no delivery, no online payments)

> **Note**: All pre-seeded shops and accounts in the demo dataset represent **fictional demonstration data** for local testing only and do not represent real commercial partnerships.

---

## Architecture & Technology Stack

- **Frontend** (`frontend/`): React 18, TypeScript, Vite, Tailwind CSS v4, React Router v7, Axios, Lucide Icons
- **Backend** (`backend/`): Go 1.27, Gin, GORM, MySQL driver (`go-sql-driver/mysql`), bcrypt password hashing, HS256 JWT auth, IP rate limiting
- **Database** (`database/schema.sql`): MySQL / MariaDB (`InnoDB`, `utf8mb4_unicode_ci`) with foreign keys, role-scoped username uniqueness, row-level locking (`FOR UPDATE`) on reservations/cancellations, and automatic expiry synchronization in `Asia/Baghdad` (`+03:00`)

### Project Structure

```text
Baqaya-Web/
├── .env.example                 # Root environment template
├── README.md                    # Setup, architecture & verification guide
├── database/
│   └── schema.sql               # MySQL/MariaDB relational schema
├── docs/
│   └── API.md                   # Complete REST API reference
├── backend/
│   ├── .env.example             # Backend environment template
│   ├── cmd/server/main.go       # Server entrypoint & startup lifecycle
│   └── internal/
│       ├── config/              # Env config, CORS, timezone (+03:00), DSN
│       ├── database/            # GORM MySQL connect, AutoMigrate, demo seeder
│       ├── dto/                 # Request/response contracts
│       ├── handler/             # Gin HTTP handlers & image upload handler
│       ├── middleware/          # JWT auth, RBAC role guards, CORS, rate limit
│       ├── models/              # User, Shop, Offer, Reservation models
│       ├── repository/          # Locking queries & atomic expiry transitions
│       ├── router/              # REST route registration & /uploads static serving
│       ├── service/             # Business logic, concurrency-safe transactions, tests
│       └── util/                # Bcrypt, JWT, spec-compliant validators
└── frontend/
    ├── public/images/           # Baqaya logo & custom food/category SVGs
    └── src/
        ├── components/          # Offer cards, badges, live countdown, dialogs, nav
        ├── context/             # AuthContext & ToastContext
        ├── hooks/               # 1-second countdown hook (useCountdown)
        ├── layouts/             # PublicLayout & ShopLayout
        ├── pages/               # Landing, Auth, Customer Marketplace, Shop Dashboard
        ├── services/            # Axios client & domain API modules
        ├── types/               # TypeScript models & DTOs
        └── utils/               # IQD formatting & pickup schedule helpers
```

---

## Prerequisites

1. **Go** 1.22+ (developed with Go 1.27)
2. **Node.js** 18+ and **npm** (developed with Node v22.14.0)
3. **MySQL 8.0+** or **MariaDB 10.4+** (e.g., standalone MySQL or XAMPP MariaDB running on port `3306`)

---

## Setup & Running Locally

### 1. Database Setup

Start your MySQL/MariaDB server and load the schema (or simply create the empty `baqaya` database—GORM `AutoMigrate` and `SeedDemoData` also initialize tables automatically on backend startup):

```sql
CREATE DATABASE IF NOT EXISTS baqaya
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Or import the SQL schema directly:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p < database/schema.sql
```

### 2. Backend Configuration & Launch

Copy `backend/.env.example` to `backend/.env` and adjust credentials if needed:

```env
APP_ENV=development
SERVER_PORT=8080
TZ=Asia/Baghdad
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=baqaya

JWT_SECRET=replace-with-a-long-random-secret-key
JWT_EXPIRY_HOURS=24
SEED_DEMO_DATA=true
UPLOAD_DIR=uploads
```

Run the Go backend API:

```bash
cd backend
go run ./cmd/server
```

The API listens on `http://localhost:8080` and seeds fictional demo data on an empty database when `SEED_DEMO_DATA=true`.

### 3. Frontend Installation & Launch

```bash
cd frontend
npm install
npm run dev
```

*(On Windows PowerShell if script execution policy blocks `npm`, run `npm.cmd install` and `npm.cmd run dev`.)*

The Vite dev server runs on `http://localhost:5173` and proxies `/api/*` and `/uploads/*` requests directly to `http://localhost:8080`.

To build the production frontend bundle:

```bash
cd frontend
npm run build
```

---

## Fictional Demo Accounts (Pre-Seeded)

All seeded demo accounts use password **`pass123`** and represent fictional Sulaymaniyah demo users/businesses:

| Role | Username | Password | Display / Business Name |
| :--- | :--- | :--- | :--- |
| Customer | `customer1` | `pass123` | Sara Ahmed |
| Customer | `customer2` | `pass123` | Ali Hassan |
| Shop Owner | `bakery1` | `pass123` | City Star Bakery |
| Shop Owner | `cafe1` | `pass123` | Mawlawi Cafe |
| Shop Owner | `restaurant1` | `pass123` | Sardar Restaurant |

To reset the database back to the clean seeded demo state:

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE reservations;
TRUNCATE TABLE offers;
TRUNCATE TABLE shops;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```
Then restart the Go backend with `SEED_DEMO_DATA=true`.

---

## Automated Tests

The backend includes integration and concurrency tests (`backend/internal/service/service_test.go`) running against an isolated `baqaya_test` MySQL schema (uses `DB_*` or `TEST_DB_*` env vars, defaulting to `127.0.0.1:3306`, user `root`, empty password):

```bash
cd backend
go test -v ./...
```

Test coverage includes:
- Password hashing (`bcrypt`), input validation, and role-scoped username uniqueness
- Offer creation price/quantity/pickup-window validation and permanent deactivation
- Transaction-safe reservations, backend price calculation, exact-stock `Sold Out` transition, cancellation stock restoration, and `Deactivated` non-recovery on cancellation
- Concurrent reservation race-condition stress test (12 concurrent goroutines on 5 units verifying zero overselling)
- Automatic pickup deadline expiry transitions (`Expired`)
- End-to-end HTTP RBAC (`401`/`403`) and cross-customer / cross-shop ownership isolation

