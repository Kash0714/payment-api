# LeadMax Payment API

A professional RESTful payment system built with **Node.js + Express**. This API demonstrates secure JWT authentication, robust business logic, and comprehensive data validation.

## 🚀 Key Features
- **JWT Authentication**: Secure access using Access and Refresh tokens.
- **User Management**: Full CRUD operations for user profiles.
- **Bank Integration**: Manage multiple bank accounts per user.
- **Transaction System**: Secure peer-to-peer payments with balance validation.
- **Validation**: Strict request validation using `express-validator`.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Security**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Validation**: `express-validator`
- **Unique IDs**: UUID v4

## 📦 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=3000
ACCESS_SECRET=your_access_token_secret
REFRESH_SECRET=your_refresh_token_secret
```

### 3. Run the Server
```bash
npm start
```
The API will be available at `http://localhost:3000/api/v1`.

### 4. Run Tests
```bash
npm test
```

## 📖 API Documentation
Detailed API reference can be found in the code or tested using the included test suite. All protected routes require a `Bearer` token in the `Authorization` header.

---
Built with ❤️ for secure payments.
