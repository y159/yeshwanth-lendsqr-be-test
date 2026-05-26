# Demo Credit Wallet Service

> A mobile lending wallet API built for Lendsqr's backend engineering assessment. Enables borrowers to receive loans and make repayments through a secure wallet system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [ER Diagram](#er-diagram)
- [Database Design](#database-design)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Deployment](#deployment)

---

## Overview

Demo Credit is an MVP wallet service that allows users to:

- Create an account (with Karma blacklist check via Lendsqr Adjutor API)
- Fund their wallet
- Transfer funds to another user's wallet
- Withdraw funds from their wallet

Users flagged on the **Lendsqr Adjutor Karma blacklist** are blocked at onboarding — they can never be registered.

---

## Tech Stack

| Technology | Version | Reason |
|---|---|---|
| Node.js | LTS (v20+) | Stable, async-friendly runtime |
| TypeScript | ^6.0 | Type safety and better DX |
| Express.js | ^5.0 | Lightweight, battle-tested HTTP framework |
| KnexJS | ^3.0 | SQL query builder with migration support |
| MySQL2 | ^3.0 | Required database driver |
| bcrypt | ^6.0 | Secure password hashing |
| jsonwebtoken | ^9.0 | Faux token-based authentication |
| Zod | ^4.0 | Runtime schema validation |
| Jest + Supertest | ^30.0 | Unit and integration testing |
| Helmet + CORS | Latest | Security middleware |

---

## Architecture & Design Decisions

### 1. Layered Architecture
The project follows a **Controller → Service → Repository** pattern:
- **Controllers** handle HTTP request/response logic only
- **Services** contain business logic (blacklist check, balance validation)
- **Database** queries are handled directly via Knex for simplicity at MVP scale

### 2. Faux Token Authentication
As specified, a JWT-based faux auth system is used — no refresh tokens or full session management. A token is issued on registration and must be sent as a `Bearer` token on protected routes.

### 3. Karma Blacklist — Fail-Open Strategy
If the Adjutor API is unreachable or returns an unexpected error, the system **fails open** (allows onboarding). This prevents a third-party outage from blocking all registrations. A 404 from Adjutor means the user is clean.

### 4. Transaction Scoping
All wallet mutations (fund, transfer, withdraw) are wrapped in **Knex database transactions**. This ensures atomicity — if any step fails, the entire operation is rolled back, preventing partial state (e.g. debiting sender without crediting receiver).

### 5. UUID Primary Keys
All tables use `UUID` as primary keys instead of auto-increment integers to avoid predictable IDs being exposed in the API.

### 6. Dual Blacklist Check
On registration, both the user's **email** and **BVN** are checked against the Karma blacklist, providing a stronger compliance check.

---

## ER Diagram

```
┌─────────────────────────────┐
│           USERS             │
├─────────────────────────────┤
│ id          UUID  (PK)      │
│ first_name  VARCHAR         │
│ last_name   VARCHAR         │
│ email       VARCHAR (UNIQUE)│
│ phone       VARCHAR (UNIQUE)│
│ bvn         VARCHAR (UNIQUE)│
│ password    VARCHAR         │
│ created_at  TIMESTAMP       │
│ updated_at  TIMESTAMP       │
└──────────────┬──────────────┘
               │ 1
               │
               │ has one
               │
               ▼ 1
┌─────────────────────────────┐
│          WALLETS            │
├─────────────────────────────┤
│ id          UUID  (PK)      │
│ user_id     UUID  (FK)  ───►│ users.id
│ balance     DECIMAL(15,2)   │
│ currency    VARCHAR         │
│ created_at  TIMESTAMP       │
│ updated_at  TIMESTAMP       │
└──────────────┬──────────────┘
               │ 1
               │
               │ has many
               │
               ▼ N
┌─────────────────────────────┐
│        TRANSACTIONS         │
├─────────────────────────────┤
│ id                UUID (PK) │
│ wallet_id         UUID (FK) │◄── wallets.id
│ type              ENUM      │    (FUND|TRANSFER|WITHDRAW)
│ amount            DECIMAL   │
│ status            ENUM      │    (SUCCESS|FAILED|PENDING)
│ reference         VARCHAR   │
│ sender_wallet_id  UUID(nullable)
│ receiver_wallet_id UUID(nullable)
│ created_at        TIMESTAMP │
│ updated_at        TIMESTAMP │
└─────────────────────────────┘
```

### Relationships
- **User → Wallet**: One-to-One (each user has exactly one wallet)
- **Wallet → Transactions**: One-to-Many (a wallet can have many transactions)
- `sender_wallet_id` and `receiver_wallet_id` on transactions are nullable FKs used to trace transfer direction

---

## Database Design

### `users`
Stores account credentials and identity information. BVN and email are both unique and checked against the Karma blacklist at registration.

### `wallets`
Each user has one wallet. Balance is stored as `DECIMAL(15,2)` to avoid floating-point precision issues with financial data.

### `transactions`
Immutable ledger of all wallet events. Every fund, transfer, and withdrawal creates a transaction record. Transfers store both `sender_wallet_id` and `receiver_wallet_id` for full traceability.

---

## API Documentation

### Base URL
```
https://yeshwanth-lendsqr-be-test.<platform-domain>/api/v1
```

### Authentication
All wallet endpoints require a `Bearer` token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

### Auth Endpoints

#### Register User
```
POST /api/v1/auth/register
```
**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "bvn": "12345678901",
  "password": "password123"
}
```
**Responses:**
| Status | Description |
|--------|-------------|
| 201 | User registered successfully, returns token + walletId |
| 400 | Missing required fields |
| 403 | User is blacklisted (Karma check failed) |
| 409 | Email already exists |
| 500 | Internal server error |

**Success Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid",
    "walletId": "uuid",
    "token": "jwt_token"
  }
}
```

---

### Wallet Endpoints

#### Get Wallet Balance
```
GET /api/v1/wallet/balance
```
**Success Response:**
```json
{
  "success": true,
  "message": "Wallet balance fetched successfully",
  "data": {
    "walletId": "uuid",
    "balance": 5000.00,
    "currency": "NGN"
  }
}
```

---

#### Fund Wallet
```
POST /api/v1/wallet/fund
```
**Request Body:**
```json
{
  "amount": 5000
}
```
**Responses:**
| Status | Description |
|--------|-------------|
| 200 | Wallet funded successfully |
| 400 | Invalid or missing amount |
| 401 | Unauthorized |
| 404 | Wallet not found |

---

#### Transfer Funds
```
POST /api/v1/wallet/transfer
```
**Request Body:**
```json
{
  "receiver_email": "jane@example.com",
  "amount": 2000
}
```
**Responses:**
| Status | Description |
|--------|-------------|
| 200 | Transfer successful |
| 400 | Missing fields / self-transfer / insufficient balance |
| 401 | Unauthorized |
| 404 | Receiver not found |

---

#### Withdraw Funds
```
POST /api/v1/wallet/withdraw
```
**Request Body:**
```json
{
  "amount": 1000
}
```
**Responses:**
| Status | Description |
|--------|-------------|
| 200 | Withdrawal successful |
| 400 | Invalid amount / insufficient balance |
| 401 | Unauthorized |
| 404 | Wallet not found |

---

#### Get Transactions
```
GET /api/v1/wallet/transactions
```
**Success Response:**
```json
{
  "success": true,
  "message": "Transactions fetched successfully",
  "data": [
    {
      "id": "uuid",
      "wallet_id": "uuid",
      "type": "FUND",
      "amount": 5000.00,
      "status": "SUCCESS",
      "reference": "uuid",
      "created_at": "2026-05-25T00:00:00.000Z"
    }
  ]
}
```

---

## Project Structure

```
yeshwanth-lendsqr-be-test/
├── src/
│   ├── config/
│   │   └── database.ts          # Knex DB connection instance
│   ├── controllers/
│   │   ├── auth.controller.ts   # Registration logic
│   │   └── wallet.controller.ts # Fund, transfer, withdraw, balance
│   ├── middlewares/
│   │   └── auth.middleware.ts   # JWT verification
│   ├── routes/
│   │   ├── auth.routes.ts       # POST /auth/register
│   │   └── wallet.routes.ts     # Wallet CRUD routes
│   ├── services/
│   │   └── karma.service.ts     # Adjutor blacklist check
│   ├── database/
│   │   └── migrations/          # Knex migration files
│   ├── tests/
│   │   ├── app.test.ts          # Health check test
│   │   ├── auth.test.ts         # Auth endpoint tests
│   │   ├── wallet.test.ts       # Wallet endpoint tests
│   │   └── karma.test.ts        # Karma service tests
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
├── knexfile.ts                  # Knex environment config
├── jest.config.js               # Jest configuration
├── tsconfig.json                # TypeScript config
├── .env.example                 # Environment variable template
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js v20+ (LTS)
- MySQL 8+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yeshwanthyellanki/yeshwanth-lendsqr-be-test.git
cd yeshwanth-lendsqr-be-test

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DB credentials and API keys
```

### Environment Variables

```env
PORT=5050
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lendsqr_wallet

JWT_SECRET=your_jwt_secret

ADJUTOR_API_KEY=your_adjutor_api_key
ADJUTOR_BASE_URL=https://adjutor.lendsqr.com/v2
```

### Database Setup

```bash
# Create the database in MySQL
mysql -u root -p -e "CREATE DATABASE lendsqr_wallet;"

# Run migrations
npx knex migrate:latest --knexfile knexfile.ts
```

### Run the Server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## Running Tests

```bash
npm test
```

**Test Coverage:**
- ✅ 28 tests across 4 test suites
- Auth: register (success, missing fields, blacklisted by email, blacklisted by BVN, duplicate email)
- Wallet: fund, transfer, withdraw, balance, transactions (positive + negative scenarios)
- Karma Service: blacklisted, clean user, missing API key, null response, network error

---

## Deployment

The API is deployed at:
```
https://yeshwanth-lendsqr-be-test.<platform-domain>
```

### Health Check
```
GET /
```
```json
{
  "success": true,
  "message": "Lendsqr wallet service API is running"
}
```

---

## Author

**Yeshwanth Yellanki**
README'