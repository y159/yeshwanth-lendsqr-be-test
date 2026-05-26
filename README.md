# Demo Credit Wallet Service

A production-ready MVP wallet service built with Node.js, Express, TypeScript, Knex, and MySQL.

This project was developed as part of the Lendsqr Backend Engineering assessment.

## Live Deployment

Production API:

```text
https://yeshwanth-lendsqr-be-test-production.up.railway.app
```

GitHub Repository:

```text
https://github.com/y159/yeshwanth-lendsqr-be-test
```

---

# Features

The wallet service supports:

- User registration
- JWT-based authentication
- Wallet creation on signup
- Wallet funding
- Wallet withdrawal
- Wallet-to-wallet transfer
- Transaction history
- Karma blacklist validation using Lendsqr Adjutor API
- MySQL database persistence
- Railway production deployment
- Unit testing with Jest and Supertest

---

# Tech Stack

## Backend

- Node.js
- Express.js
- TypeScript

## Database

- MySQL
- Knex.js Query Builder

## Authentication

- JSON Web Tokens (JWT)
- bcrypt password hashing

## Testing

- Jest
- Supertest

## Deployment

- Railway

---

# Architecture

The application follows a modular backend structure:

```text
Controller → Service → Database/Knex
```

## Folder Structure

```text
src/
├── config/
│   ├── database.ts
│   └── knexfile.ts
├── controllers/
├── database/
│   └── migrations/
├── middlewares/
├── repositories/
├── routes/
├── services/
├── tests/
├── utils/
├── app.ts
└── server.ts
```

---

# Database Design

## Users Table

Stores user account information.

| Column | Type |
|---|---|
| id | UUID |
| first_name | String |
| last_name | String |
| email | String |
| phone | String |
| bvn | String |
| password | String |
| created_at | Timestamp |

## Wallets Table

Stores wallet balances for users.

| Column | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| balance | Decimal |
| currency | String |
| created_at | Timestamp |

## Transactions Table

Stores funding, transfers, and withdrawals.

| Column | Type |
|---|---|
| id | UUID |
| wallet_id | UUID |
| type | String |
| amount | Decimal |
| reference | String |
| description | String |
| created_at | Timestamp |

---

# API Endpoints

## Health Check

### GET /

Response:

```json
{
  "success": true,
  "message": "Lendsqr wallet service API is running"
}
```

---

## Register User

### POST /api/v1/auth/register

Request:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@test.com",
  "phone": "08012345678",
  "bvn": "12345678901",
  "password": "Password123"
}
```

Response:

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

## Fund Wallet

### POST /api/v1/wallet/fund

Headers:

```text
Authorization: Bearer <token>
```

Request:

```json
{
  "amount": 5000
}
```

---

## Get Wallet Balance

### GET /api/v1/wallet/balance

Headers:

```text
Authorization: Bearer <token>
```

---

## Transfer Funds

### POST /api/v1/wallet/transfer

Headers:

```text
Authorization: Bearer <token>
```

Request:

```json
{
  "receiver_email": "receiver@test.com",
  "amount": 1000
}
```

---

## Withdraw Funds

### POST /api/v1/wallet/withdraw

Headers:

```text
Authorization: Bearer <token>
```

Request:

```json
{
  "amount": 500
}
```

---

## Transaction History

### GET /api/v1/wallet/transactions

Headers:

```text
Authorization: Bearer <token>
```

---

# Environment Variables

Create a `.env` file in the project root.

```env
PORT=5050

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lendsqr_wallet

JWT_SECRET=your_jwt_secret

ADJUTOR_API_KEY=your_adjutor_api_key
ADJUTOR_BASE_URL=https://adjutor.lendsqr.com/v2
```

---

# Local Development Setup

## 1. Clone Repository

```bash
git clone https://github.com/y159/yeshwanth-lendsqr-be-test.git
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Create Database

```bash
mysql -u root -p
```

Inside MySQL:

```sql
CREATE DATABASE lendsqr_wallet;
```

## 4. Run Migrations

```bash
npm run migrate
```

## 5. Start Development Server

```bash
npm run dev
```

Server runs on:

```text
http://localhost:5050
```

---

# Production Deployment

The application is deployed on Railway with:

- Railway Web Service
- Railway MySQL Database
- Automatic GitHub Deployments
- Production Environment Variables

Deployment URL:

```text
https://yeshwanth-lendsqr-be-test-production.up.railway.app
```

---

# Running Tests

Run tests using:

```bash
npm test
```

Current tests include:

- Health check API test using Jest and Supertest

Additional endpoint test cases can be added for:

- Authentication
- Wallet funding
- Transfers
- Withdrawals
- Karma blacklist validation

---

# Security Considerations

The application includes:

- Password hashing using bcrypt
- JWT token authentication
- Protected wallet routes
- Database transaction handling
- Input validation
- Blacklist verification using Adjutor API

---

# Sample CURL Commands

## Register User

```bash
curl -X POST http://localhost:5050/api/v1/auth/register \
-H "Content-Type: application/json" \
-d '{
  "first_name":"Demo",
  "last_name":"User",
  "email":"demo@test.com",
  "phone":"9999999999",
  "bvn":"12345678901",
  "password":"Password123"
}'
```

## Fund Wallet

```bash
curl -X POST http://localhost:5050/api/v1/wallet/fund \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN" \
-d '{"amount":5000}'
```

## Get Balance

```bash
curl http://localhost:5050/api/v1/wallet/balance \
-H "Authorization: Bearer YOUR_TOKEN"
```

---

# Design Decisions

## Why Knex?

Knex provides:

- SQL flexibility
- Migration support
- Lightweight query building
- Better control over raw SQL queries

## Why JWT?

JWT provides:

- Stateless authentication
- Simplicity for MVP authentication
- Easy API protection

## Why Railway?

Railway provides:

- Fast deployment workflow
- Managed MySQL database
- Automatic redeployments
- Simple environment variable management

---

# Future Improvements

Potential enhancements include:

- Full authentication system
- Refresh token implementation
- Email verification
- Swagger/OpenAPI documentation
- Docker containerization
- CI/CD pipelines
- Redis caching
- Rate limiting
- Advanced transaction auditing
- Pagination for transactions

---

# Author

Yeshwanth Yellanki

LinkedIn:

```text
https://linkedin.com/in/yesh284
```

GitHub:

```text
https://github.com/y159
```

