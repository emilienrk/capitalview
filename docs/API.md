# CapitalView API

**Version**: 0.1.0

Personal wealth management and investment tracking API.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.capitalview.emilien.roukine.com`

---

## Authentication

All endpoints (except `/auth/register`, `/auth/login`, and `/health`) require a JWT Bearer token in the `Authorization` header.

Tokens are stored **in memory only** (never `localStorage`). A `refresh_token` is set as a **HttpOnly, Secure, SameSite=Strict** cookie scoped to `/auth`.

### Registration

`POST /auth/register` — Create a new user.

**Request Body**:

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

| Field      | Type     | Constraints                                             |
| ---------- | -------- | ------------------------------------------------------- |
| `username` | `string` | 3–50 chars, `[a-zA-Z0-9_-]+`                           |
| `email`    | `string` | Valid email                                             |
| `password` | `string` | 8–100 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special |

**Response (201 Created)**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### Login

`POST /auth/login` — Authenticate and receive tokens.

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

_Also sets a `refresh_token` HttpOnly cookie (Secure, SameSite=Strict, path=/auth)._

---

### Refresh Token

`POST /auth/refresh` — Get a new access token using the refresh cookie.

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

`POST /auth/logout` — Revoke all tokens and clear session. Requires authentication.

**Response (200 OK)**:

```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

`GET /auth/me` — Get information about the authenticated user.

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

`GET /bank/accounts` — Get all bank accounts with total balance.

**Response (200 OK)**:

```json
{
  "total_balance": 1500.50,
  "accounts": [
    {
      "id": 1,
      "name": "Checking Account",
      "institution_name": "BNP Paribas",
      "balance": 1500.50,
      "account_type": "CHECKING",
      "created_at": "2026-01-01T10:00:00Z",
      "updated_at": "2026-02-05T14:00:00Z"
    }
  ]
}
```

### Create Account

`POST /bank/accounts` — Create a new bank account.

**Request Body**:

```json
{
  "name": "Savings Account",
  "account_type": "SAVINGS",
  "institution_name": "Revolut",
  "identifier": null,
  "balance": 500.00
}
```

| Field              | Type              | Required | Default |
| ------------------ | ----------------- | -------- | ------- |
| `name`             | `string`          | Yes      | —       |
| `account_type`     | `BankAccountType` | Yes      | —       |
| `institution_name` | `string \| null`  | No       | `null`  |
| `identifier`       | `string \| null`  | No       | `null`  |
| `balance`          | `number`          | No       | `0`     |

**Response (201 Created)**: `BankAccountResponse`

### Get Account

`GET /bank/accounts/{id}` — Get a specific bank account.

**Response (200 OK)**: `BankAccountResponse`

### Update Account

`PUT /bank/accounts/{id}` — Update a bank account (all fields optional).

**Request Body**:

```json
{
  "name": "Updated Name",
  "institution_name": "New Bank",
  "identifier": null,
  "balance": 1000.00
}
```

**Response (200 OK)**: `BankAccountResponse`

### Delete Account

`DELETE /bank/accounts/{id}` — Delete a bank account.

**Response**: `204 No Content`

---

## Cashflows

### Create Cashflow

`POST /cashflow` — Create a new cashflow entry.

**Request Body**:

```json
{
  "name": "Salary",
  "flow_type": "INFLOW",
  "category": "Revenus",
  "amount": 3500.00,
  "frequency": "MONTHLY",
  "transaction_date": "2026-02-01"
}
```

| Field              | Type        | Values                                         |
| ------------------ | ----------- | ---------------------------------------------- |
| `flow_type`        | `FlowType`  | `INFLOW`, `OUTFLOW`                            |
| `frequency`        | `Frequency` | `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `amount`           | `number`    | Decimal                                        |
| `transaction_date` | `string`    | `YYYY-MM-DD`                                   |

**Response (201 Created)**: `CashflowResponse`

### List Cashflows

`GET /cashflow` — Get all cashflows for the current user.

**Response (200 OK)**:

```json
[
  {
    "id": 1,
    "name": "Salary",
    "flow_type": "INFLOW",
    "category": "Revenus",
    "amount": 3500.00,
    "frequency": "MONTHLY",
    "transaction_date": "2026-02-01",
    "monthly_amount": 3500.00,
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-01T10:00:00Z"
  }
]
```

### Get Cashflow

`GET /cashflow/{id}` — Get a specific cashflow.

**Response (200 OK)**: `CashflowResponse`

### Update Cashflow

`PUT /cashflow/{id}` — Update a cashflow (all fields optional).

```json
{
  "name": "Updated",
  "flow_type": "OUTFLOW",
  "category": "New Category",
  "amount": 4000.00,
  "frequency": "MONTHLY",
  "transaction_date": "2026-03-01"
}
```

**Response (200 OK)**: `CashflowResponse`

### Delete Cashflow

`DELETE /cashflow/{id}` — Delete a cashflow.

**Response**: `204 No Content`

### Balance Overview

`GET /cashflow/me/balance` — Get global inflows/outflows balance.

**Response (200 OK)**: `CashflowBalanceResponse`

### Inflows Summary

`GET /cashflow/me/inflows` — Get inflows grouped by category.

**Response (200 OK)**: `CashflowSummaryResponse`

### Outflows Summary

`GET /cashflow/me/outflows` — Get outflows grouped by category.

**Response (200 OK)**: `CashflowSummaryResponse`

---

## Stocks

### List Stock Accounts

`GET /stocks/accounts` — List all stock accounts.

**Response (200 OK)**:

```json
[
  {
    "id": 1,
    "name": "PEA Boursorama",
    "account_type": "PEA",
    "institution_name": "Boursorama",
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-10T12:00:00Z"
  }
]
```

### Create Stock Account

`POST /stocks/accounts` — Create a new stock account.

**Request Body**:

```json
{
  "name": "PEA Boursorama",
  "account_type": "PEA",
  "institution_name": "Boursorama",
  "identifier": null
}
```

**Response (201 Created)**: `StockAccountBasicResponse`

### Get Account with Positions

`GET /stocks/accounts/{id}` — Get detailed account info including aggregated positions.

**Response (200 OK)**: `AccountSummaryResponse`

### Update Stock Account

`PUT /stocks/accounts/{id}` — Update a stock account (all fields optional).

```json
{
  "name": "Updated Name",
  "institution_name": "New Bank",
  "identifier": null
}
```

**Response (200 OK)**: `StockAccountBasicResponse`

### Delete Stock Account

`DELETE /stocks/accounts/{id}` — Delete a stock account and all its transactions.

**Response**: `204 No Content`

### Create Stock Transaction

`POST /stocks/transactions` — Create a stock transaction.

**Request Body**:

```json
{
  "account_id": 1,
  "symbol": "CW8",
  "exchange": "EPA",
  "type": "BUY",
  "amount": 2.0,
  "price_per_unit": 500.00,
  "fees": 5.00,
  "executed_at": "2026-01-15T10:30:00Z",
  "notes": "Monthly DCA"
}
```

**Response (201 Created)**: `StockTransactionBasicResponse`

### List Stock Transactions

`GET /stocks/transactions` — List all stock transactions for the current user.

**Response (200 OK)**: `TransactionResponse[]`

### Get Stock Transaction

`GET /stocks/transactions/{id}` — Get a specific transaction with computed fields.

**Response (200 OK)**: `TransactionResponse`

### List Transactions by Account

`GET /stocks/transactions/account/{id}` — Get all transactions for a specific account.

**Response (200 OK)**: `TransactionResponse[]`

### Update Stock Transaction

`PUT /stocks/transactions/{id}` — Update a stock transaction (all fields optional).

```json
{
  "symbol": "CW8",
  "exchange": "EPA",
  "type": "BUY",
  "amount": 3.0,
  "price_per_unit": 510.00,
  "fees": 5.00,
  "executed_at": "2026-01-20T10:00:00Z",
  "notes": "Correction"
}
```

**Response (200 OK)**: `StockTransactionBasicResponse`

### Delete Stock Transaction

`DELETE /stocks/transactions/{id}` — Delete a stock transaction.

**Response**: `204 No Content`

---

## Crypto

### List Crypto Accounts

`GET /crypto/accounts` — List all crypto accounts/wallets.

**Response (200 OK)**:

```json
[
  {
    "id": 1,
    "name": "Main Wallet",
    "platform": "Ledger",
    "public_address": null,
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-10T12:00:00Z"
  }
]
```

### Create Crypto Account

`POST /crypto/accounts` — Create a new crypto account.

**Request Body**:

```json
{
  "name": "Main Wallet",
  "platform": "Ledger",
  "public_address": null
}
```

**Response (201 Created)**: `CryptoAccountBasicResponse`

### Get Account with Positions

`GET /crypto/accounts/{id}` — Get detailed crypto account with aggregated positions.

**Response (200 OK)**: `AccountSummaryResponse` (same structure as stocks)

### Update Crypto Account

`PUT /crypto/accounts/{id}` — Update a crypto account (all fields optional).

```json
{
  "name": "Updated Wallet",
  "platform": "Trezor",
  "public_address": "0x..."
}
```

**Response (200 OK)**: `CryptoAccountBasicResponse`

### Delete Crypto Account

`DELETE /crypto/accounts/{id}` — Delete a crypto account and all its transactions.

**Response**: `204 No Content`

### Create Crypto Transaction

`POST /crypto/transactions` — Create a crypto transaction.

**Request Body**:

```json
{
  "account_id": 1,
  "symbol": "BTC",
  "type": "BUY",
  "amount": 0.5,
  "price_per_unit": 45000.00,
  "fees": 25.00,
  "fees_symbol": "EUR",
  "executed_at": "2026-01-15T10:30:00Z",
  "notes": "First buy",
  "tx_hash": "0x123..."
}
```

**Response (201 Created)**: `CryptoTransactionBasicResponse`

### List Crypto Transactions

`GET /crypto/transactions` — List all crypto transactions for the current user.

**Response (200 OK)**: `TransactionResponse[]`

### Get Crypto Transaction

`GET /crypto/transactions/{id}` — Get a specific crypto transaction with computed fields.

**Response (200 OK)**: `TransactionResponse`

### List Transactions by Account

`GET /crypto/transactions/account/{id}` — Get all transactions for a specific crypto account.

**Response (200 OK)**: `TransactionResponse[]`

### Update Crypto Transaction

`PUT /crypto/transactions/{id}` — Update a crypto transaction (all fields optional).

```json
{
  "symbol": "BTC",
  "type": "BUY",
  "amount": 1.0,
  "price_per_unit": 46000.00,
  "fees": 30.00,
  "fees_symbol": "EUR",
  "executed_at": "2026-01-20T10:00:00Z"
}
```

**Response (200 OK)**: `CryptoTransactionBasicResponse`

### Delete Crypto Transaction

`DELETE /crypto/transactions/{id}` — Delete a crypto transaction.

**Response**: `204 No Content`

---

## Notes

### List Notes

`GET /notes` — Get all notes for the authenticated user.

**Response (200 OK)**:

```json
[
  {
    "id": 1,
    "name": "DCA Strategy",
    "description": "Buy CW8 every month on the 5th.",
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-10T12:00:00Z"
  }
]
```

### Create Note

`POST /notes` — Create a new note.

**Request Body**:

```json
{
  "name": "DCA Strategy",
  "description": "Buy CW8 every month on the 5th."
}
```

**Response (201 Created)**: `NoteResponse`

### Get Note

`GET /notes/{id}` — Get a specific note.

**Response (200 OK)**: `NoteResponse`

### Update Note

`PUT /notes/{id}` — Update a note (all fields optional).

```json
{
  "name": "Updated Strategy",
  "description": "Updated description"
}
```

**Response (200 OK)**: `NoteResponse`

### Delete Note

`DELETE /notes/{id}` — Delete a note.

**Response**: `204 No Content`

---

## Health

### API Health

`GET /health` — Simple health check.

**Response (200 OK)**:

```json
{
  "status": "ok",
  "app": "CapitalView API",
  "version": "0.1.0"
}
```

### Database Health

`GET /health/db` — Check database connection.

**Response (200 OK)**:

```json
{
  "status": "ok",
  "database": "connected"
}
```