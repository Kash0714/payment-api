# LeadMax Payment API

A RESTful payment system built with **Node.js + Express** demonstrating clean API design, JWT authentication, business logic, and data validation.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Auth | JWT (jsonwebtoken) |
| Passwords | bcryptjs |
| Validation | express-validator |
| IDs | UUID v4 |
| Storage | In-memory (Map/Set) |

---

## Project Structure

```
payment-api/
├── server.js                  # Entry point
├── src/
│   ├── app.js                 # Express app + routing
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── authController.js
│   │   ├── bankController.js
│   │   └── paymentController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication guard
│   │   └── validate.js        # express-validator error handler
│   ├── models/
│   │   └── store.js           # In-memory data store
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bankRoutes.js
│   │   └── paymentRoutes.js
│   └── utils/
│       ├── jwt.js             # Token helpers
│       └── response.js        # Consistent response helpers
└── tests/
    └── test.js                # Integration test suite (50 tests)
```

---

## Quick Start

```bash
npm install
node server.js         # Start server on port 3000
node tests/test.js     # Run full test suite
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

All protected routes require: `Authorization: Bearer <accessToken>`

---

### 1. User APIs

#### 1.1 Create User
```
POST /users
```
Body:
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "phone": "+1234567890"   // optional
}
```
Response `201`:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "userId": "uuid",
    "name": "Alice",
    "email": "alice@example.com",
    "phone": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 1.2 Update User
```
PUT /users/:userId        🔒 Protected
```
Body (all optional):
```json
{ "name": "New Name", "phone": "+9876543210", "password": "newpass" }
```
> Users can only update their own profile.

#### 1.3 Delete User
```
DELETE /users/:userId     🔒 Protected
```
> Soft-deletes the user. Users can only delete their own account.

#### 1.4 Get User Profile
```
GET /users/:userId        🔒 Protected
```

#### 1.5 Get Users List
```
GET /users?page=1&limit=10   🔒 Protected
```

---

### 2. Auth APIs

#### 2.1 Login
```
POST /auth/login
```
Body:
```json
{ "email": "alice@example.com", "password": "secret123" }
```
Response `200`:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "accessTokenExpiresIn": "5m",
    "refreshTokenExpiresIn": "1d"
  }
}
```

#### 2.2 Refresh Token
```
POST /auth/refresh-token
```
Body:
```json
{ "refreshToken": "eyJ..." }
```
Returns a new `accessToken`.

#### Logout
```
POST /auth/logout         🔒 Protected
```
Body:
```json
{ "refreshToken": "eyJ..." }
```
Invalidates the refresh token server-side.

---

### 3. Bank Account APIs

> Base path: `/users/:userId/bank-accounts`

#### 3.1 Add Bank Account
```
POST /users/:userId/bank-accounts     🔒 Protected
```
Body:
```json
{
  "accountNumber": "ACC-001",
  "bankName": "Chase",
  "accountHolderName": "Alice",
  "currency": "USD"   // default USD
}
```
> Maximum **3 bank accounts** per user.

#### 3.2 Get Bank Accounts List
```
GET /users/:userId/bank-accounts      🔒 Protected
```

#### 3.3 Delete Bank Account
```
DELETE /users/:userId/bank-accounts/:accountId    🔒 Protected
```

#### 3.4 Top-up Balance
```
POST /users/:userId/bank-accounts/:accountId/topup    🔒 Protected
```
Body:
```json
{ "amount": 500.00 }
```

---

### 4. Payment APIs

#### 4.1 Do Payment
```
POST /payments    🔒 Protected
```
Body:
```json
{
  "senderAccountId": "uuid",
  "receiverAccountId": "uuid",
  "amount": 100.00,
  "description": "Rent payment"
}
```

**Success flow:**
1. Validates sender owns the account
2. Checks sufficient balance
3. Checks currency match between accounts
4. Deducts from sender, credits to receiver
5. Records transaction as `SUCCESS`

**Failure conditions → transaction recorded as `FAILED`:**
- Insufficient balance
- Sender/receiver account not found
- Same account transfer
- Currency mismatch
- Not owner of sender account

Response:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "transactionId": "uuid",
      "senderAccountId": "uuid",
      "receiverAccountId": "uuid",
      "amount": 100,
      "currency": "USD",
      "status": "SUCCESS",
      "senderBalanceAfter": 900,
      "receiverBalanceAfter": 300,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4.2 Get Transactions by User
```
GET /payments/user/:userId?page=1&limit=10&status=SUCCESS    🔒 Protected
```
Returns all transactions where user is sender OR receiver. Filter by `status=SUCCESS` or `status=FAILED`.

---

## Token Details

| Token | Expiry | Usage |
|---|---|---|
| Access Token | 5 minutes | `Authorization: Bearer <token>` on every protected request |
| Refresh Token | 1 day | `POST /auth/refresh-token` to get new access token |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [ ... ]   // validation errors only
}
```

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / business rule violation |
| 401 | Unauthorized (missing/expired/invalid token) |
| 403 | Forbidden (acting on someone else's resource) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate account) |
| 422 | Validation failed |
| 500 | Internal server error |

---

## Test Suite

`node tests/test.js` — 50 integration tests covering all endpoints, edge cases, auth guards, and payment business logic.
