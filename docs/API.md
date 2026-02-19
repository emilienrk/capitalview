# CapitalView API

**Version**: 0.1.0

Personal wealth management and investment tracking API.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.capitalview.emilien.roukine.com`

---

## Authentication

All endpoints (except `/auth/register`, `/auth/login`, `/health`, and `/`) require a JWT Bearer token in the `Authorization` header.

Tokens are stored **in memory only** (never `localStorage`). A `refresh_token` is set as a **HttpOnly, Secure, SameSite=Lax** cookie scoped to `/auth`.

### Master Key Transport

Most data endpoints also require the **Master Key** for encryption/decryption. Two transport modes are supported:

| Mode | Header / Cookie | Use case |
|------|----------------|----------|
| **Cookie** (default) | `master_key` HttpOnly cookie | Web frontend (set automatically on login) |
| **Header** | `X-Master-Key: <base64_key>` | Automation (n8n, Postman, scripts) |

The cookie takes priority if both are present.

#### 🔒 Security: Opt-In Master Key in Response

**By default**, the `master_key` is **NOT returned** in the JSON response body for security reasons:
- Prevents accidental logging in server logs
- Reduces exposure in proxies/CDN
- Follows principle of least exposure

**For automation tools only**, you can request the master_key in the response by adding:
```
X-Return-Master-Key: true
```

This header must be explicitly set on `/auth/login` or `/auth/register` requests.

**Example (n8n / curl)**:
```bash
# 1. Login WITH opt-in header to capture the master_key
curl -X POST https://api.capitalview.example.com/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Return-Master-Key: true" \
  -d '{"email": "john@example.com", "password": "SecurePassword123!"}'

# Response:
# {
#   "access_token": "eyJ...",
#   "token_type": "bearer",
#   "expires_in": 900,
#   "master_key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
# }

# 2. Use both on subsequent requests
curl -X GET https://api.capitalview.example.com/bank/accounts \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Master-Key: $MASTER_KEY"
```

⚠️ **Warning**: `X-Return-Master-Key: true` is designed for **server-side automation** (n8n, scripts, Postman). Do not use it in the **web frontend** (Vue.js) — the browser should rely on the HttpOnly cookie instead, which is protected against XSS.

### Registration

`POST /auth/register` — Create a new user.

**Rate limit**: 10/hour

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
  "expires_in": 900,
  "master_key": null
}
```

**Note**: `master_key` is `null` by default. To receive it (automation only), add header `X-Return-Master-Key: true`.

_Also sets `refresh_token` and `master_key` HttpOnly cookies._

---

### Login

`POST /auth/login` — Authenticate and receive tokens.

**Rate limit**: 5/minute

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
  "expires_in": 900,
  "master_key": null
}
```

_Also sets `refresh_token` and `master_key` HttpOnly cookies._

**Note**: `master_key` is `null` by default. To receive it (automation only), add header `X-Return-Master-Key: true`.

---

### Refresh Token

`POST /auth/refresh` — Get a new access token using the refresh cookie. Rotates the refresh token.

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

All bank endpoints require authentication **and** the Master Key.

### List Accounts

`GET /bank/accounts` — Get all bank accounts with total balance.

**Response (200 OK)**: `BankSummaryResponse`

```json
{
  "total_balance": 1500.50,
  "accounts": [
    {
      "id": "a1b2c3d4-...",
      "name": "Checking Account",
      "institution_name": "BNP Paribas",
      "balance": 1500.50,
      "account_type": "CHECKING",
      "identifier": null,
      "created_at": "2026-01-01T10:00:00Z",
      "updated_at": "2026-02-05T14:00:00Z"
    }
  ]
}
```

### Create Account

`POST /bank/accounts` — Create a new bank account.

> **Note**: Regulated account types (`LIVRET_A`, `LIVRET_DEVE`, `LEP`, `LDD`, `PEL`, `CEL`) are limited to one per user.

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

**`BankAccountType` values**: `CHECKING`, `SAVINGS`, `LIVRET_A`, `LIVRET_DEVE`, `LEP`, `LDD`, `PEL`, `CEL`

**Response (201 Created)**: `BankAccountResponse`

```json
{
  "id": "a1b2c3d4-...",
  "name": "Savings Account",
  "institution_name": "Revolut",
  "balance": 500.00,
  "account_type": "SAVINGS",
  "identifier": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

### Get Account

`GET /bank/accounts/{account_id}` — Get a specific bank account.

| Param        | Type     | Description          |
| ------------ | -------- | -------------------- |
| `account_id` | `string` | UUID of the account  |

**Response (200 OK)**: `BankAccountResponse`

### Update Account

`PUT /bank/accounts/{account_id}` — Update a bank account (all fields optional).

**Request Body**:

```json
{
  "name": "Updated Name",
  "institution_name": "New Bank",
  "identifier": null,
  "balance": 1000.00
}
```

| Field              | Type             | Required |
| ------------------ | ---------------- | -------- |
| `name`             | `string \| null` | No       |
| `institution_name` | `string \| null` | No       |
| `identifier`       | `string \| null` | No       |
| `balance`          | `number \| null` | No       |

**Response (200 OK)**: `BankAccountResponse`

### Delete Account

`DELETE /bank/accounts/{account_id}` — Delete a bank account.

**Response**: `204 No Content`

---

## Cashflows

All cashflow endpoints require authentication **and** the Master Key.

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

| Field              | Type        | Required | Values                                         |
| ------------------ | ----------- | -------- | ---------------------------------------------- |
| `name`             | `string`    | Yes      | —                                              |
| `flow_type`        | `FlowType`  | Yes      | `INFLOW`, `OUTFLOW`                            |
| `category`         | `string`    | Yes      | —                                              |
| `amount`           | `number`    | Yes      | Decimal                                        |
| `frequency`        | `Frequency` | Yes      | `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `transaction_date` | `string`    | Yes      | `YYYY-MM-DD`                                   |

**Response (201 Created)**: `CashflowResponse`

### List Cashflows

`GET /cashflow` — Get all cashflows for the current user.

**Response (200 OK)**: `CashflowResponse[]`

```json
[
  {
    "id": "f1e2d3c4-...",
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

`GET /cashflow/{cashflow_id}` — Get a specific cashflow.

| Param         | Type     | Description          |
| ------------- | -------- | -------------------- |
| `cashflow_id` | `string` | UUID of the cashflow |

**Response (200 OK)**: `CashflowResponse`

### Update Cashflow

`PUT /cashflow/{cashflow_id}` — Update a cashflow (all fields optional).

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

`DELETE /cashflow/{cashflow_id}` — Delete a cashflow.

**Response**: `204 No Content`

### Balance Overview

`GET /cashflow/me/balance` — Get global inflows/outflows balance.

**Response (200 OK)**: `CashflowBalanceResponse`

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
        "category": "Revenus",
        "total_amount": 3500.00,
        "monthly_total": 3500.00,
        "count": 1,
        "items": []
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

### Inflows Summary

`GET /cashflow/me/inflows` — Get inflows grouped by category.

**Response (200 OK)**: `CashflowSummaryResponse`

```json
{
  "flow_type": "INFLOW",
  "total_amount": 3500.00,
  "monthly_total": 3500.00,
  "categories": [
    {
      "category": "Revenus",
      "total_amount": 3500.00,
      "monthly_total": 3500.00,
      "count": 1,
      "items": []
    }
  ]
}
```

### Outflows Summary

`GET /cashflow/me/outflows` — Get outflows grouped by category.

**Response (200 OK)**: `CashflowSummaryResponse`

---

## Stocks

All stock endpoints require authentication **and** the Master Key (except market search/info which only require authentication).

### List Stock Accounts

`GET /stocks/accounts` — List all stock accounts.

**Response (200 OK)**: `StockAccountBasicResponse[]`

```json
[
  {
    "id": "b2c3d4e5-...",
    "name": "PEA Boursorama",
    "account_type": "PEA",
    "institution_name": "Boursorama",
    "identifier": null,
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-10T12:00:00Z"
  }
]
```

### Create Stock Account

`POST /stocks/accounts` — Create a new stock account.

> **Note**: `PEA` and `PEA_PME` account types are limited to one per user.

**Request Body**:

```json
{
  "name": "PEA Boursorama",
  "account_type": "PEA",
  "institution_name": "Boursorama",
  "identifier": null
}
```

| Field              | Type               | Required | Default |
| ------------------ | ------------------ | -------- | ------- |
| `name`             | `string`           | Yes      | —       |
| `account_type`     | `StockAccountType` | Yes      | —       |
| `institution_name` | `string \| null`   | No       | `null`  |
| `identifier`       | `string \| null`   | No       | `null`  |

**`StockAccountType` values**: `PEA`, `CTO`, `PEA_PME`

**Response (201 Created)**: `StockAccountBasicResponse`

### Get Account with Positions

`GET /stocks/accounts/{account_id}` — Get detailed account info including aggregated positions.

| Param        | Type     | Description          |
| ------------ | -------- | -------------------- |
| `account_id` | `string` | UUID of the account  |

**Response (200 OK)**: `AccountSummaryResponse`

```json
{
  "account_id": "b2c3d4e5-...",
  "account_name": "PEA Boursorama",
  "account_type": "PEA",
  "total_invested": 5000.00,
  "total_fees": 25.00,
  "current_value": 5500.00,
  "profit_loss": 500.00,
  "profit_loss_percentage": 10.00,
  "positions": [
    {
      "symbol": "CW8.PA",
      "name": "Amundi MSCI World",
      "isin": "FR0013247244",
      "exchange": "EPA",
      "total_amount": 10.0,
      "average_buy_price": 500.00,
      "total_invested": 5000.00,
      "total_fees": 25.00,
      "fees_percentage": 0.50,
      "current_price": 550.00,
      "current_value": 5500.00,
      "profit_loss": 500.00,
      "profit_loss_percentage": 10.00
    }
  ]
}
```

### Update Stock Account

`PUT /stocks/accounts/{account_id}` — Update a stock account (all fields optional).

```json
{
  "name": "Updated Name",
  "institution_name": "New Bank",
  "identifier": null
}
```

| Field              | Type             | Required |
| ------------------ | ---------------- | -------- |
| `name`             | `string \| null` | No       |
| `institution_name` | `string \| null` | No       |
| `identifier`       | `string \| null` | No       |

**Response (200 OK)**: `StockAccountBasicResponse`

### Delete Stock Account

`DELETE /stocks/accounts/{account_id}` — Delete a stock account and all its transactions.

**Response**: `204 No Content`

### Create Stock Transaction

`POST /stocks/transactions` — Create a stock transaction.

**Request Body**:

```json
{
  "account_id": "b2c3d4e5-...",
  "symbol": "CW8",
  "isin": "FR0013247244",
  "name": "Amundi MSCI World",
  "exchange": "EPA",
  "type": "BUY",
  "amount": 2.0,
  "price_per_unit": 500.00,
  "fees": 5.00,
  "executed_at": "2026-01-15T10:30:00Z",
  "notes": "Monthly DCA"
}
```

| Field            | Type                   | Required | Description                            |
| ---------------- | ---------------------- | -------- | -------------------------------------- |
| `account_id`     | `string`               | ✅       | UUID of the stock account              |
| `symbol`         | `string`               | ✅       | Stock symbol (e.g., "AAPL", "CW8")    |
| `isin`           | `string \| null`       | ❌       | ISIN code (e.g., "FR0013247244")      |
| `name`           | `string \| null`       | ❌       | Asset name (e.g., "Amundi MSCI World") |
| `exchange`       | `string \| null`       | ❌       | Exchange code (e.g., "EPA")            |
| `type`           | `StockTransactionType` | ✅       | `BUY`, `SELL`, `DEPOSIT`, `DIVIDEND`   |
| `amount`         | `number`               | ✅       | Quantity of shares (> 0)               |
| `price_per_unit` | `number`               | ✅       | Price per share (≥ 0)                  |
| `fees`           | `number`               | ❌       | Transaction fees (default: 0, ≥ 0)    |
| `executed_at`    | `string`               | ✅       | ISO 8601 datetime                      |
| `notes`          | `string \| null`       | ❌       | Optional notes                         |

**Response (201 Created)**: `TransactionResponse`

### List Stock Transactions

`GET /stocks/transactions` — List all stock transactions for the current user, sorted by `executed_at` descending.

**Response (200 OK)**: `TransactionResponse[]`

### Get Stock Transaction

`GET /stocks/transactions/{transaction_id}` — Get a specific transaction with computed fields.

| Param            | Type     | Description              |
| ---------------- | -------- | ------------------------ |
| `transaction_id` | `string` | UUID of the transaction  |

**Response (200 OK)**: `TransactionResponse`

```json
{
  "id": "c3d4e5f6-...",
  "name": "Amundi MSCI World",
  "symbol": "CW8",
  "isin": "FR0013247244",
  "exchange": "EPA",
  "type": "BUY",
  "amount": 2.0,
  "price_per_unit": 500.00,
  "fees": 5.00,
  "executed_at": "2026-01-15T10:30:00Z",
  "total_cost": 1005.00,
  "fees_percentage": 0.50,
  "current_price": 550.00,
  "current_value": 1100.00,
  "profit_loss": 95.00,
  "profit_loss_percentage": 9.45
}
```

### List Transactions by Account

`GET /stocks/transactions/account/{account_id}` — Get all transactions for a specific account.

**Response (200 OK)**: `TransactionResponse[]`

### Update Stock Transaction

`PUT /stocks/transactions/{transaction_id}` — Update a stock transaction (all fields optional).

```json
{
  "symbol": "CW8",
  "isin": "FR0013247244",
  "name": "Amundi MSCI World",
  "exchange": "EPA",
  "type": "BUY",
  "amount": 3.0,
  "price_per_unit": 510.00,
  "fees": 5.00,
  "executed_at": "2026-01-20T10:00:00Z",
  "notes": "Correction"
}
```

**Response (200 OK)**: `TransactionResponse`

### Delete Stock Transaction

`DELETE /stocks/transactions/{transaction_id}` — Delete a stock transaction.

**Response**: `204 No Content`

### Bulk Import Stock Transactions

`POST /stocks/transactions/bulk` — Bulk import multiple stock transactions for a single account.

**Request Body**:

```json
{
  "account_id": "b2c3d4e5-...",
  "transactions": [
    {
      "symbol": "CW8",
      "isin": "FR0013247244",
      "name": "Amundi MSCI World",
      "exchange": "EPA",
      "type": "BUY",
      "amount": 2.0,
      "price_per_unit": 500.00,
      "fees": 5.00,
      "executed_at": "2026-01-15T10:30:00Z",
      "notes": "Monthly DCA"
    }
  ]
}
```

| Field          | Type                           | Required | Description                      |
| -------------- | ------------------------------ | -------- | -------------------------------- |
| `account_id`   | `string`                       | ✅       | UUID of the stock account        |
| `transactions` | `StockTransactionBulkCreate[]` | ✅       | Array of transactions to import  |

Each transaction in the array follows the same schema as `StockTransactionCreate` **without** `account_id`.

**Response (201 Created)**: `StockBulkImportResponse`

```json
{
  "imported_count": 1,
  "transactions": [
    {
      "id": "c3d4e5f6-...",
      "account_id": "b2c3d4e5-...",
      "symbol": "CW8",
      "isin": "FR0013247244",
      "name": "Amundi MSCI World",
      "exchange": "EPA",
      "type": "BUY",
      "amount": 2.0,
      "price_per_unit": 500.00,
      "fees": 5.00,
      "executed_at": "2026-01-15T10:30:00Z",
      "notes": null
    }
  ]
}
```

### Search Assets

`GET /stocks/market/search?q={query}` — Search for stocks, ETFs by symbol or name. Only requires authentication (no Master Key).

**Query Parameters**:
- `q` (required): Search query (symbol or name)

**Response (200 OK)**: `AssetSearchResult[]`

```json
[
  {
    "symbol": "AAPL",
    "isin": null,
    "name": "Apple Inc.",
    "exchange": "NASDAQ",
    "type": "EQUITY",
    "currency": "USD"
  },
  {
    "symbol": "CW8.PA",
    "isin": "FR0013247244",
    "name": "Amundi MSCI World",
    "exchange": "PAR",
    "type": "ETF",
    "currency": "EUR"
  }
]
```

### Get Assets Info

`POST /stocks/market/info` — Get current price and info for multiple assets. Only requires authentication (no Master Key).

**Request Body**:

```json
["AAPL", "CW8.PA", "MSFT"]
```

**Response (200 OK)**: `AssetInfoResponse[]`

```json
[
  {
    "symbol": "AAPL",
    "isin": null,
    "name": "Apple Inc.",
    "price": 185.50,
    "currency": "USD",
    "exchange": "NASDAQ",
    "type": null,
    "change_percent": 1.25
  }
]
```

---

## Crypto

All crypto endpoints require authentication **and** the Master Key (except market search/info which only require authentication).

### List Crypto Accounts

`GET /crypto/accounts` — List all crypto accounts/wallets.

**Response (200 OK)**: `CryptoAccountBasicResponse[]`

```json
[
  {
    "id": "d4e5f6a7-...",
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

| Field            | Type             | Required | Default |
| ---------------- | ---------------- | -------- | ------- |
| `name`           | `string`         | Yes      | —       |
| `platform`       | `string \| null` | No       | `null`  |
| `public_address` | `string \| null` | No       | `null`  |

**Response (201 Created)**: `CryptoAccountBasicResponse`

### Get Account with Positions

`GET /crypto/accounts/{account_id}` — Get detailed crypto account with aggregated positions.

| Param        | Type     | Description          |
| ------------ | -------- | -------------------- |
| `account_id` | `string` | UUID of the account  |

**Response (200 OK)**: `AccountSummaryResponse`

### Update Crypto Account

`PUT /crypto/accounts/{account_id}` — Update a crypto account (all fields optional).

```json
{
  "name": "Updated Wallet",
  "platform": "Trezor",
  "public_address": "0x..."
}
```

| Field            | Type             | Required |
| ---------------- | ---------------- | -------- |
| `name`           | `string \| null` | No       |
| `platform`       | `string \| null` | No       |
| `public_address` | `string \| null` | No       |

**Response (200 OK)**: `CryptoAccountBasicResponse`

### Delete Crypto Account

`DELETE /crypto/accounts/{account_id}` — Delete a crypto account and all its transactions.

**Response**: `204 No Content`

### Create Crypto Transaction

`POST /crypto/transactions` — Create a crypto transaction.

**Request Body**:

```json
{
  "account_id": "d4e5f6a7-...",
  "symbol": "BTC",
  "name": "Bitcoin",
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

| Field            | Type                    | Required | Description                           |
| ---------------- | ----------------------- | -------- | ------------------------------------- |
| `account_id`     | `string`                | ✅       | UUID of the crypto account            |
| `symbol`         | `string`                | ✅       | Crypto symbol (e.g., "BTC", "ETH")   |
| `name`           | `string \| null`        | ❌       | Asset name (e.g., "Bitcoin")          |
| `type`           | `CryptoTransactionType` | ✅       | `BUY`, `SELL`, `SWAP`, `STAKING`     |
| `amount`         | `number`                | ✅       | Quantity (> 0)                        |
| `price_per_unit` | `number`                | ✅       | Price per unit (≥ 0)                  |
| `fees`           | `number`                | ❌       | Transaction fees (default: 0, ≥ 0)   |
| `fees_symbol`    | `string \| null`        | ❌       | Currency of fees (e.g., "EUR", "BTC") |
| `executed_at`    | `string`                | ✅       | ISO 8601 datetime                     |
| `tx_hash`        | `string \| null`        | ❌       | Blockchain transaction hash           |
| `notes`          | `string \| null`        | ❌       | Optional notes                        |

**Response (201 Created)**: `CryptoTransactionBasicResponse`

```json
{
  "id": "e5f6a7b8-...",
  "account_id": "d4e5f6a7-...",
  "symbol": "BTC",
  "type": "BUY",
  "amount": 0.5,
  "price_per_unit": 45000.00,
  "fees": 25.00,
  "fees_symbol": "EUR",
  "executed_at": "2026-01-15T10:30:00Z",
  "tx_hash": "0x123...",
  "notes": "First buy"
}
```

### List Crypto Transactions

`GET /crypto/transactions` — List all crypto transactions for the current user, sorted by `executed_at` descending.

**Response (200 OK)**: `TransactionResponse[]`

### Get Crypto Transaction

`GET /crypto/transactions/{transaction_id}` — Get a specific crypto transaction with computed fields.

| Param            | Type     | Description              |
| ---------------- | -------- | ------------------------ |
| `transaction_id` | `string` | UUID of the transaction  |

**Response (200 OK)**: `TransactionResponse`

### List Transactions by Account

`GET /crypto/transactions/account/{account_id}` — Get all transactions for a specific crypto account.

**Response (200 OK)**: `TransactionResponse[]`

### Update Crypto Transaction

`PUT /crypto/transactions/{transaction_id}` — Update a crypto transaction (all fields optional).

```json
{
  "symbol": "BTC",
  "name": "Bitcoin",
  "type": "BUY",
  "amount": 1.0,
  "price_per_unit": 46000.00,
  "fees": 30.00,
  "fees_symbol": "EUR",
  "executed_at": "2026-01-20T10:00:00Z",
  "tx_hash": null,
  "notes": null
}
```

**Response (200 OK)**: `CryptoTransactionBasicResponse`

### Delete Crypto Transaction

`DELETE /crypto/transactions/{transaction_id}` — Delete a crypto transaction.

**Response**: `204 No Content`

### Bulk Import Crypto Transactions

`POST /crypto/transactions/bulk` — Bulk import multiple crypto transactions for a single account.

**Request Body**:

```json
{
  "account_id": "d4e5f6a7-...",
  "transactions": [
    {
      "symbol": "BTC",
      "type": "BUY",
      "amount": 0.5,
      "price_per_unit": 45000.00,
      "fees": 25.00,
      "fees_symbol": "EUR",
      "executed_at": "2026-01-15T10:30:00Z",
      "tx_hash": "0x123...",
      "notes": "First buy"
    }
  ]
}
```

| Field          | Type                            | Required | Description                       |
| -------------- | ------------------------------- | -------- | --------------------------------- |
| `account_id`   | `string`                        | ✅       | UUID of the crypto account        |
| `transactions` | `CryptoTransactionBulkCreate[]` | ✅       | Array of transactions to import   |

Each transaction in the array follows the same schema as `CryptoTransactionCreate` **without** `account_id`.

**Response (201 Created)**: `CryptoBulkImportResponse`

```json
{
  "imported_count": 1,
  "transactions": [
    {
      "id": "e5f6a7b8-...",
      "account_id": "d4e5f6a7-...",
      "symbol": "BTC",
      "type": "BUY",
      "amount": 0.5,
      "price_per_unit": 45000.00,
      "fees": 25.00,
      "fees_symbol": "EUR",
      "executed_at": "2026-01-15T10:30:00Z",
      "tx_hash": "0x123...",
      "notes": "First buy"
    }
  ]
}
```

### Search Crypto Assets

`GET /crypto/market/search?q={query}` — Search for cryptocurrencies by symbol or name. Only requires authentication (no Master Key).

**Query Parameters**:
- `q` (required): Search query (symbol or name)

**Response (200 OK)**: `AssetSearchResult[]`

```json
[
  {
    "symbol": "BTC",
    "isin": null,
    "name": "Bitcoin",
    "exchange": null,
    "type": "CRYPTO",
    "currency": "USD"
  },
  {
    "symbol": "ETH",
    "isin": null,
    "name": "Ethereum",
    "exchange": null,
    "type": "CRYPTO",
    "currency": "USD"
  }
]
```

### Get Crypto Assets Info

`POST /crypto/market/info` — Get current price and info for multiple cryptocurrencies. Only requires authentication (no Master Key).

**Request Body**:

```json
["BTC", "ETH", "SOL"]
```

**Response (200 OK)**: `AssetInfoResponse[]`

```json
[
  {
    "symbol": "BTC",
    "isin": null,
    "name": "Bitcoin",
    "price": 50245.32,
    "currency": "USD",
    "exchange": null,
    "type": null,
    "change_percent": -2.15
  }
]
```

---

## Dashboard

Requires authentication **and** the Master Key.

### Get Portfolio

`GET /dashboard/portfolio` — Get complete portfolio overview aggregating all stock and crypto accounts.

**Response (200 OK)**: `PortfolioResponse`

```json
{
  "total_invested": 15000.00,
  "total_fees": 125.00,
  "current_value": 17500.00,
  "profit_loss": 2500.00,
  "profit_loss_percentage": 16.67,
  "accounts": [
    {
      "account_id": "b2c3d4e5-...",
      "account_name": "PEA Boursorama",
      "account_type": "PEA",
      "total_invested": 10000.00,
      "total_fees": 50.00,
      "current_value": 11500.00,
      "profit_loss": 1500.00,
      "profit_loss_percentage": 15.00,
      "positions": [
        {
          "symbol": "CW8.PA",
          "name": "Amundi MSCI World",
          "isin": "FR0013247244",
          "exchange": "EPA",
          "total_amount": 20.0,
          "average_buy_price": 500.00,
          "total_invested": 10000.00,
          "total_fees": 50.00,
          "fees_percentage": 0.50,
          "current_price": 575.00,
          "current_value": 11500.00,
          "profit_loss": 1500.00,
          "profit_loss_percentage": 15.00
        }
      ]
    },
    {
      "account_id": "d4e5f6a7-...",
      "account_name": "Main Wallet",
      "account_type": "CRYPTO",
      "total_invested": 5000.00,
      "total_fees": 75.00,
      "current_value": 6000.00,
      "profit_loss": 1000.00,
      "profit_loss_percentage": 20.00,
      "positions": []
    }
  ]
}
```

---

## Notes

All note endpoints require authentication **and** the Master Key (notes are encrypted).

### List Notes

`GET /notes` — Get all notes for the authenticated user.

**Response (200 OK)**: `NoteResponse[]`

```json
[
  {
    "id": "a7b8c9d0-...",
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

| Field         | Type             | Required | Default |
| ------------- | ---------------- | -------- | ------- |
| `name`        | `string`         | Yes      | —       |
| `description` | `string \| null` | No       | `null`  |

**Response (201 Created)**: `NoteResponse`

### Get Note

`GET /notes/{note_id}` — Get a specific note.

| Param     | Type     | Description      |
| --------- | -------- | ---------------- |
| `note_id` | `string` | UUID of the note |

**Response (200 OK)**: `NoteResponse`

### Update Note

`PUT /notes/{note_id}` — Update a note (all fields optional).

```json
{
  "name": "Updated Strategy",
  "description": "Updated description"
}
```

**Response (200 OK)**: `NoteResponse`

### Delete Note

`DELETE /notes/{note_id}` — Delete a note.

**Response**: `204 No Content`

---

## Settings

Requires authentication **and** the Master Key.

### Get Settings

`GET /settings` — Get current user settings.

**Response (200 OK)**: `UserSettingsResponse`

```json
{
  "objectives": null,
  "theme": "system",
  "flat_tax_rate": 0.30,
  "tax_pea_rate": 0.172,
  "yield_expectation": 0.05,
  "inflation_rate": 0.02,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### Update Settings

`PUT /settings` — Update current user settings (all fields optional).

**Request Body**:

```json
{
  "objectives": "Reach 100k by 2027",
  "theme": "dark",
  "flat_tax_rate": 0.30,
  "tax_pea_rate": 0.172,
  "yield_expectation": 0.07,
  "inflation_rate": 0.02
}
```

| Field               | Type             | Required | Constraints | Default  |
| ------------------- | ---------------- | -------- | ----------- | -------- |
| `objectives`        | `string \| null` | No       | —           | `null`   |
| `theme`             | `string \| null` | No       | —           | `system` |
| `flat_tax_rate`     | `number \| null` | No       | 0–1         | `0.30`   |
| `tax_pea_rate`      | `number \| null` | No       | 0–1         | `0.172`  |
| `yield_expectation` | `number \| null` | No       | 0–1         | `0.05`   |
| `inflation_rate`    | `number \| null` | No       | 0–1         | `0.02`   |

**Response (200 OK)**: `UserSettingsResponse`

---

## Health

### Root

`GET /` — Simple status check.

**Response (200 OK)**:

```json
{
  "status": "ok",
  "app": "CapitalView API"
}
```

### API Health

`GET /health` — Health check for container monitoring.

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

---

## Shared Response Models

### `TransactionResponse`

Used by both stock and crypto transaction endpoints. Includes computed fields.

| Field                    | Type             | Description                           |
| ------------------------ | ---------------- | ------------------------------------- |
| `id`                     | `string`         | UUID                                  |
| `name`                   | `string \| null` | Asset name                            |
| `symbol`                 | `string \| null` | Asset symbol                          |
| `isin`                   | `string \| null` | ISIN code (stocks only)               |
| `exchange`               | `string \| null` | Exchange code                          |
| `type`                   | `string`         | Transaction type                       |
| `amount`                 | `number`         | Quantity                               |
| `price_per_unit`         | `number`         | Price per unit at time of transaction  |
| `fees`                   | `number`         | Fees                                   |
| `executed_at`            | `string`         | ISO 8601 datetime                      |
| `total_cost`             | `number`         | `amount × price_per_unit + fees`       |
| `fees_percentage`        | `number`         | `fees / total_cost × 100`             |
| `current_price`          | `number \| null` | Live price (if available)              |
| `current_value`          | `number \| null` | `amount × current_price`              |
| `profit_loss`            | `number \| null` | `current_value - total_cost`           |
| `profit_loss_percentage` | `number \| null` | P&L as percentage                      |

### `PositionResponse`

Aggregated position for a single asset within an account.

| Field                    | Type             | Description                           |
| ------------------------ | ---------------- | ------------------------------------- |
| `symbol`                 | `string`         | Asset symbol                          |
| `name`                   | `string \| null` | Asset name                            |
| `isin`                   | `string \| null` | ISIN code                             |
| `exchange`               | `string \| null` | Exchange code                          |
| `total_amount`           | `number`         | Total quantity held                    |
| `average_buy_price`      | `number`         | Weighted average buy price             |
| `total_invested`         | `number`         | Total cost basis                       |
| `total_fees`             | `number`         | Total fees paid                        |
| `fees_percentage`        | `number`         | Fees as percentage of invested         |
| `current_price`          | `number \| null` | Live price (if available)              |
| `current_value`          | `number \| null` | `total_amount × current_price`        |
| `profit_loss`            | `number \| null` | `current_value - total_invested`       |
| `profit_loss_percentage` | `number \| null` | P&L as percentage                      |

### `AccountSummaryResponse`

Summary of an account with aggregated positions.

| Field                    | Type                 | Description                    |
| ------------------------ | -------------------- | ------------------------------ |
| `account_id`             | `string`             | UUID                           |
| `account_name`           | `string`             | Account name                   |
| `account_type`           | `string`             | Account type                   |
| `total_invested`         | `number`             | Total invested across positions |
| `total_fees`             | `number`             | Total fees across positions    |
| `current_value`          | `number \| null`     | Sum of position current values |
| `profit_loss`            | `number \| null`     | Total P&L                      |
| `profit_loss_percentage` | `number \| null`     | P&L percentage                 |
| `positions`              | `PositionResponse[]` | List of aggregated positions   |

### `AssetSearchResult`

| Field      | Type             | Description         |
| ---------- | ---------------- | ------------------- |
| `symbol`   | `string`         | Asset symbol        |
| `isin`     | `string \| null` | ISIN code           |
| `name`     | `string \| null` | Asset name          |
| `exchange` | `string \| null` | Exchange code       |
| `type`     | `string \| null` | Asset type          |
| `currency` | `string \| null` | Trading currency    |

### `AssetInfoResponse`

| Field            | Type             | Description              |
| ---------------- | ---------------- | ------------------------ |
| `symbol`         | `string`         | Asset symbol             |
| `isin`           | `string \| null` | ISIN code                |
| `name`           | `string \| null` | Asset name               |
| `price`          | `number \| null` | Current price            |
| `currency`       | `string \| null` | Currency                 |
| `exchange`       | `string \| null` | Exchange code            |
| `type`           | `string \| null` | Asset type               |
| `change_percent` | `number \| null` | 24h / daily change (%)   |
