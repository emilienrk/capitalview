# CapitalView API

**Version**: 0.1.0

Personal wealth management and investment tracking API.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.capitalview.emilien.roukine.com`

---

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require authentication via JWT Bearer token.

### Registration
`POST /auth/register` - Create a new user.

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created)**:
```json
{
  "message": "User registered successfully"
}
```

---

### Login
`POST /auth/login` - Authenticate and receive tokens.

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```
*Note: Also sets a `refresh_token` as a HttpOnly cookie.*

---

### Refresh Token
`POST /auth/refresh` - Get a new access token using the refresh cookie.

**Response (200 OK)**:
```json
{
  "access_token": "new_access_token_here...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### Logout
`POST /auth/logout` - Revoke all tokens and clear session.

**Response (200 OK)**:
```json
{
  "message": "Logged out successfully. 1 token(s) revoked."
}
```

---

### Get Current User
`GET /auth/me` - Get information about the authenticated user.

**Response (200 OK)**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "is_active": true,
  "last_login": "2026-02-01T10:30:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Bank Accounts

### List Accounts
`GET /bank/accounts` - Get all bank accounts with total balance.

**Response (200 OK)**:
```json
{
  "total_balance": 1500.50,
  "accounts": [
    {
      "id": 1,
      "name": "Checking Account",
      "bank_name": "BNP Paribas",
      "balance": 1500.50,
      "account_type": "CHECKING",
      "updated_at": "2026-02-05T14:00:00Z"
    }
  ]
}
```

---

### Create Account
`POST /bank/accounts` - Create a new bank account.

**Request Body**:
```json
{
  "name": "Savings Account",
  "account_type": "SAVINGS",
  "bank_name": "Revolut",
  "balance": 500.00
}
```

---

## Cashflows

### Balance Overview
`GET /cashflow/me/balance` - Get global inflows/outflows balance.

**Response (200 OK)**:
```json
{
  "total_inflows": 3500.00,
  "monthly_inflows": 3500.00,
  "total_outflows": 2000.00,
  "monthly_outflows": 2000.00,
  "net_balance": 1500.00,
  "monthly_balance": 1500.00,
  "savings_rate": 42.86,
  "inflows": {
    "flow_type": "INFLOW",
    "total_amount": 3500.00,
    "monthly_total": 3500.00,
    "categories": [
      {
        "category": "Salary",
        "total_amount": 3500.00,
        "monthly_total": 3500.00,
        "count": 1,
        "items": [
          {
            "id": 1,
            "name": "Job Salary",
            "flow_type": "INFLOW",
            "category": "Salary",
            "amount": 3500.00,
            "frequency": "MONTHLY",
            "transaction_date": "2026-02-01",
            "monthly_amount": 3500.00
          }
        ]
      }
    ]
  },
  "outflows": {
    "flow_type": "OUTFLOW",
    "total_amount": 2000.00,
    "monthly_total": 2000.00,
    "categories": []
  }
}
```

---

## Stocks

### List Stock Accounts
`GET /stocks/accounts` - List all stock accounts.

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "PEA Boursorama",
    "account_type": "PEA",
    "bank_name": "Boursorama",
    "created_at": "2026-01-10T12:00:00Z"
  }
]
```

---

### Get Account with Positions
`GET /stocks/accounts/{id}` - Get detailed account info including positions.

**Response (200 OK)**:
```json
{
  "account_id": 1,
  "account_name": "PEA Boursorama",
  "account_type": "PEA",
  "total_invested": 1000.00,
  "total_fees": 5.00,
  "current_value": 1200.00,
  "profit_loss": 200.00,
  "profit_loss_percentage": 20.00,
  "positions": [
    {
      "ticker": "CW8",
      "name": "Amundi MSCI World",
      "total_amount": 2.0,
      "average_buy_price": 500.00,
      "total_invested": 1000.00,
      "total_fees": 5.00,
      "fees_percentage": 0.5,
      "current_price": 600.00,
      "current_value": 1200.00,
      "profit_loss": 200.00,
      "profit_loss_percentage": 20.00
    }
  ]
}
```

---

## Crypto

### Create Crypto Transaction
`POST /crypto/transactions`

**Request Body**:
```json
{
  "account_id": 1,
  "ticker": "BTC",
  "type": "BUY",
  "amount": 0.5,
  "price_per_unit": 45000.00,
  "fees": 25.00,
  "fees_ticker": "EUR",
  "executed_at": "2026-01-15T10:30:00Z"
}
```

**Response (201 Created)**:
```json
{
  "id": 1,
  "account_id": 1,
  "ticker": "BTC",
  "type": "BUY",
  "amount": 0.5,
  "price_per_unit": 45000.00,
  "fees": 25.00,
  "fees_ticker": "EUR",
  "executed_at": "2026-01-15T10:30:00Z"
}
```

---

## Dashboard

### Global Portfolio
`GET /dashboard/portfolio` - Aggregate all stock and crypto accounts.

**Response (200 OK)**:
```json
{
  "total_invested": 15000.00,
  "total_fees": 120.50,
  "current_value": 18500.00,
  "profit_loss": 3500.00,
  "profit_loss_percentage": 23.33,
  "accounts": [
    {
      "account_id": 1,
      "account_name": "Main PEA",
      "account_type": "PEA",
      "total_invested": 10000.00,
      "total_fees": 50.00,
      "current_value": 12000.00,
      "profit_loss": 2000.00,
      "profit_loss_percentage": 20.00,
      "positions": [
        {
          "ticker": "CW8",
          "name": "Amundi MSCI World",
          "total_amount": 2.0,
          "average_buy_price": 500.00,
          "total_invested": 1000.00,
          "total_fees": 5.00,
          "fees_percentage": 0.5,
          "current_price": 600.00,
          "current_value": 1200.00,
          "profit_loss": 200.00,
          "profit_loss_percentage": 20.00
        }
      ]
    }
  ]
}
```

---

## Notes

### List Notes
`GET /notes`

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "DCA Strategy",
    "description": "Buy CW8 every month on the 5th."
  }
]
```

---

## Health

### API Health
`GET /health`

**Response (200 OK)**:
```json
{
  "status": "ok",
  "app": "CapitalView API",
  "version": "0.1.0"
}
```