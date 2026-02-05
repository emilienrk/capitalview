# CapitalView API

**Version**: 0.1.0

Personal wealth management and investment tracking API

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: (see deployment)

## Overview

This API provides endpoints for managing:
- **Authentication**: User registration, login, logout, token refresh
- **Bank Accounts**: Standard checking/savings accounts
- **Cashflows**: Income and expenses tracking
- **Stock Accounts**: PEA, CTO, PEA-PME with transactions
- **Crypto Accounts**: Cryptocurrency portfolios with transactions
- **Notes**: User notes and strategies
- **Portfolio**: Global wealth aggregation and performance

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require authentication via JWT Bearer token.

### How it works

1. **Register** a new account via `POST /auth/register`
2. **Login** via `POST /auth/login` to receive an `access_token`
3. Include the token in the `Authorization` header: `Bearer <access_token>`
4. **Refresh** the token via `POST /auth/refresh` (uses HttpOnly cookie)
5. **Logout** via `POST /auth/logout` to revoke all tokens

### Token Details
- **Access Token**: Valid for 15 minutes, sent in response body
- **Refresh Token**: Valid for 30 days, stored as HttpOnly cookie (secure, not accessible via JavaScript)

## Data Formats

- **Dates**: ISO 8601 format (`YYYY-MM-DD`)
- **DateTimes**: ISO 8601 format with timezone (`YYYY-MM-DDTHH:MM:SSZ`)
- **Decimals**: Numbers with up to 18 decimal places for crypto amounts
- **Currency**: All monetary values in EUR

## Common Patterns

### Resource Relationships
- All resources belong to the authenticated user
- Transactions belong to an `account_id`
- Market prices are shared across all users

### CRUD Operations
- **POST** `/resource` - Create (returns 201)
- **GET** `/resource` - List all
  user's resources
- **GET** `/resource/{id}` - Get one
- **PUT** `/resource/{id}` - Update (partial)
- **DELETE** `/resource/{id}` - Delete (returns 204)

### Error Codes
- **401**: Unauthorized - Invalid or missing token
- **403**: Forbidden - Access to another user's resource
- **404**: Resource not found
- **422**: Validation error with detailed field-level messages
- **429**: Too Many Requests - Rate limit exceeded

### Rate Limiting
- **Register**: 10 requests per hour
- **Login**: 5 requests per minute
- **Refresh**: 10 requests per minute

---

## Authentication Routes

### POST `/auth/register`

**Register a new user**

No authentication required. Rate limited to 10 requests per hour.

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `username` | string | ✅ | 3-50 characters |
| `email` | string | ✅ | Valid email format |
| `password` | string | ✅ | 8-100 characters |

**Responses**:
- `201`: User registered successfully
  ```json
  { "message": "User registered successfully" }
  ```
- `400`: Email already registered / Username already taken
- `422`: Validation Error
- `429`: Rate limit exceeded

---

### POST `/auth/login`

**Login with email and password**

No authentication required. Rate limited to 5 requests per minute.

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Responses**:
- `200`: Successful login
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 900
  }
  ```
  *Also sets `refresh_token` as HttpOnly cookie*
- `401`: Incorrect email or password
- `422`: Validation Error
- `429`: Rate limit exceeded

---

### POST `/auth/refresh`

**Refresh access token**

Uses the `refresh_token` from HttpOnly cookie. Rate limited to 10 requests per minute.

**Request**: No body required (reads cookie automatically)

**Responses**:
- `200`: Token refreshed
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 900
  }
  ```
  *Also rotates the refresh_token cookie*
- `401`: Refresh token missing or invalid

---

### POST `/auth/logout`

**Logout current user**

🔒 Requires authentication

Revokes all refresh tokens and clears the cookie.

**Responses**:
- `200`: Logged out successfully
  ```json
  { "message": "Logged out successfully. 1 token(s) revoked." }
  ```
- `401`: Unauthorized

---

### GET `/auth/me`

**Get current user information**

🔒 Requires authentication

**Responses**:
- `200`: Current user info
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "is_active": true,
    "last_login": "2026-01-31T10:30:00Z",
    "created_at": "2026-01-01T00:00:00Z"
  }
  ```
- `401`: Unauthorized

---

## Bank Accounts

All bank routes require authentication (🔒).

### GET `/bank/accounts`

**Get all bank accounts**

🔒 Requires authentication

Returns all bank accounts for the current user with total balance.

**Responses**:
- `200`: Returns `BankSummaryResponse`
- `401`: Unauthorized

---

### POST `/bank/accounts`

**Create a bank account**

🔒 Requires authentication

**Request Body**:
```json
{
  "name": "Compte Courant",
  "account_type": "CHECKING",
  "bank_name": "BNP Paribas",
  "encrypted_iban": "FR7630001007941234567890185",
  "balance": 1500.50
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Account name |
| `account_type` | string | ✅ | `CHECKING`, `SAVINGS`, `LIVRET_A`, `LIVRET_DEVE`, `LEP`, `LDD`, `PEL`, `CEL` |
| `bank_name` | string | ❌ | Bank name |
| `encrypted_iban` | string | ❌ | IBAN (encrypted) |
| `balance` | decimal | ❌ | Default: 0 |

**Responses**:
- `201`: Returns `BankAccountResponse`
- `401`: Unauthorized
- `422`: Validation Error

---

### GET `/bank/accounts/{account_id}`

**Get a specific bank account**

🔒 Requires authentication

**Responses**:
- `200`: Returns `BankAccountResponse`
- `401`: Unauthorized
- `403`: Access denied (not your account)
- `404`: Account not found

---

### PUT `/bank/accounts/{account_id}`

**Update a bank account**

🔒 Requires authentication

**Request Body** (all fields optional):
```json
{
  "name": "New Name",
  "bank_name": "New Bank",
  "encrypted_iban": "FR76...",
  "balance": 2000.00
}
```

**Responses**:
- `200`: Returns `BankAccountResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found
- `422`: Validation Error

---

### DELETE `/bank/accounts/{account_id}`

**Delete a bank account**

🔒 Requires authentication

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

## Cashflows

All cashflow routes require authentication (🔒).

### GET `/cashflow`

**Get all cashflows**

🔒 Requires authentication

Returns all cashflow entries for the current user.

**Responses**:
- `200`: Returns array of `CashflowResponse`
- `401`: Unauthorized

---

### POST `/cashflow`

**Create a cashflow**

🔒 Requires authentication

**Request Body**:
```json
{
  "name": "Salaire",
  "flow_type": "INFLOW",
  "category": "Travail",
  "amount": 3500.00,
  "frequency": "MONTHLY",
  "transaction_date": "2026-01-01"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Description |
| `flow_type` | string | ✅ | `INFLOW` or `OUTFLOW` |
| `category` | string | ✅ | Custom category |
| `amount` | decimal | ✅ | Amount in EUR |
| `frequency` | string | ✅ | `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `transaction_date` | date | ✅ | Format: `YYYY-MM-DD` |

**Responses**:
- `201`: Returns `CashflowResponse`
- `401`: Unauthorized
- `422`: Validation Error

---

### GET `/cashflow/{cashflow_id}`

**Get a specific cashflow**

🔒 Requires authentication

**Responses**:
- `200`: Returns `CashflowResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Cashflow not found

---

### PUT `/cashflow/{cashflow_id}`

**Update a cashflow**

🔒 Requires authentication

**Request Body** (all fields optional):
```json
{
  "name": "Updated name",
  "category": "New category",
  "amount": 4000.00,
  "frequency": "MONTHLY",
  "transaction_date": "2026-02-01"
}
```

**Responses**:
- `200`: Returns `CashflowResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Cashflow not found

---

### DELETE `/cashflow/{cashflow_id}`

**Delete a cashflow**

🔒 Requires authentication

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Cashflow not found

---

### GET `/cashflow/me/inflows`

**Get my inflows**

🔒 Requires authentication

Returns all income/inflows for the current user, grouped by category.

**Responses**:
- `200`: Returns `CashflowSummaryResponse`
- `401`: Unauthorized

---

### GET `/cashflow/me/outflows`

**Get my outflows**

🔒 Requires authentication

Returns all expenses/outflows for the current user, grouped by category.

**Responses**:
- `200`: Returns `CashflowSummaryResponse`
- `401`: Unauthorized

---

### GET `/cashflow/me/balance`

**Get my cashflow balance**

🔒 Requires authentication

Returns complete cashflow balance for the current user.

**Response fields**:
- Total inflows and outflows
- Monthly equivalents
- Net balance
- Savings rate (% of income saved)
- Breakdown by category

**Responses**:
- `200`: Returns `CashflowBalanceResponse`
- `401`: Unauthorized

---

## Stock Accounts

All stock routes require authentication (🔒).

### GET `/stocks/accounts`

**List stock accounts**

🔒 Requires authentication

Returns all stock accounts for the current user (basic info).

**Responses**:
- `200`: Returns array of `StockAccountBasicResponse`
- `401`: Unauthorized

---

### POST `/stocks/accounts`

**Create a stock account**

🔒 Requires authentication

**Request Body**:
```json
{
  "name": "PEA Boursorama",
  "account_type": "PEA",
  "bank_name": "Boursorama",
  "encrypted_iban": "FR76..."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Account name |
| `account_type` | string | ✅ | `PEA`, `CTO`, `PEA_PME` |
| `bank_name` | string | ❌ | Bank/broker name |
| `encrypted_iban` | string | ❌ | IBAN (encrypted) |

**Responses**:
- `201`: Returns `StockAccountBasicResponse`
- `401`: Unauthorized
- `422`: Validation Error

---

### GET `/stocks/accounts/{account_id}`

**Get a stock account with positions**

🔒 Requires authentication

Returns detailed account info with all positions and calculated values.

**Responses**:
- `200`: Returns `AccountSummaryResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### PUT `/stocks/accounts/{account_id}`

**Update a stock account**

🔒 Requires authentication

**Request Body** (all fields optional):
```json
{
  "name": "New Name",
  "bank_name": "New Bank",
  "encrypted_iban": "FR76..."
}
```

**Responses**:
- `200`: Returns `StockAccountBasicResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### DELETE `/stocks/accounts/{account_id}`

**Delete a stock account**

🔒 Requires authentication

Deletes the account and all its transactions.

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### GET `/stocks/transactions`

**List stock transactions**

🔒 Requires authentication

Returns all transactions for the current user's accounts.

**Responses**:
- `200`: Returns array of `TransactionResponse`
- `401`: Unauthorized

---

### POST `/stocks/transactions`

**Create a stock transaction**

🔒 Requires authentication

**Request Body**:
```json
{
  "account_id": 1,
  "ticker": "AAPL",
  "exchange": "NASDAQ",
  "type": "BUY",
  "amount": 10,
  "price_per_unit": 150.50,
  "fees": 1.99,
  "executed_at": "2026-01-15T10:30:00Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `account_id` | integer | ✅ | Must be your account |
| `ticker` | string | ✅ | Stock symbol (e.g., `AAPL`) |
| `exchange` | string | ❌ | Exchange (e.g., `NASDAQ`) |
| `type` | string | ✅ | `BUY`, `SELL`, `DEPOSIT`, `DIVIDEND` |
| `amount` | decimal | ✅ | Number of shares |
| `price_per_unit` | decimal | ✅ | Price per share in EUR |
| `fees` | decimal | ❌ | Default: 0 |
| `executed_at` | datetime | ✅ | ISO 8601 format |

**Responses**:
- `201`: Returns `StockTransactionBasicResponse`
- `401`: Unauthorized
- `403`: Access denied (not your account)
- `404`: Account not found
- `422`: Validation Error

---

### GET `/stocks/transactions/{transaction_id}`

**Get a stock transaction**

🔒 Requires authentication

**Responses**:
- `200`: Returns `TransactionResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### PUT `/stocks/transactions/{transaction_id}`

**Update a stock transaction**

🔒 Requires authentication

**Responses**:
- `200`: Returns `StockTransactionBasicResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### DELETE `/stocks/transactions/{transaction_id}`

**Delete a stock transaction**

🔒 Requires authentication

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### GET `/stocks/transactions/account/{account_id}`

**Get transactions for an account**

🔒 Requires authentication

Returns all transactions for a specific account.

**Responses**:
- `200`: Returns array of `TransactionResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

## Crypto Accounts

All crypto routes require authentication (🔒).

### GET `/crypto/accounts`

**List crypto accounts**

🔒 Requires authentication

Returns all crypto accounts for the current user (basic info).

**Responses**:
- `200`: Returns array of `CryptoAccountBasicResponse`
- `401`: Unauthorized

---

### POST `/crypto/accounts`

**Create a crypto account**

🔒 Requires authentication

**Request Body**:
```json
{
  "name": "Ledger Nano",
  "wallet_name": "Cold Storage",
  "public_address": "bc1q..."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Account name |
| `wallet_name` | string | ❌ | Wallet name |
| `public_address` | string | ❌ | Public address |

**Responses**:
- `201`: Returns `CryptoAccountBasicResponse`
- `401`: Unauthorized
- `422`: Validation Error

---

### GET `/crypto/accounts/{account_id}`

**Get a crypto account with positions**

🔒 Requires authentication

Returns detailed account info with all positions and calculated values.

**Responses**:
- `200`: Returns `AccountSummaryResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### PUT `/crypto/accounts/{account_id}`

**Update a crypto account**

🔒 Requires authentication

**Responses**:
- `200`: Returns `CryptoAccountBasicResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### DELETE `/crypto/accounts/{account_id}`

**Delete a crypto account**

🔒 Requires authentication

Deletes the account and all its transactions.

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

### GET `/crypto/transactions`

**List crypto transactions**

🔒 Requires authentication

Returns all transactions for the current user's accounts.

**Responses**:
- `200`: Returns array of `TransactionResponse`
- `401`: Unauthorized

---

### POST `/crypto/transactions`

**Create a crypto transaction**

🔒 Requires authentication

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

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `account_id` | integer | ✅ | Must be your account |
| `ticker` | string | ✅ | Crypto symbol (e.g., `BTC`, `ETH`) |
| `type` | string | ✅ | `BUY`, `SELL`, `SWAP`, `STAKING` |
| `amount` | decimal | ✅ | Quantity of crypto |
| `price_per_unit` | decimal | ✅ | Price in EUR |
| `fees` | decimal | ❌ | Default: 0 |
| `fees_ticker` | string | ❌ | Fee currency (e.g., `BNB`) |
| `executed_at` | datetime | ✅ | ISO 8601 format |

**Responses**:
- `201`: Returns `CryptoTransactionBasicResponse`
- `401`: Unauthorized
- `403`: Access denied (not your account)
- `404`: Account not found
- `422`: Validation Error

---

### GET `/crypto/transactions/{transaction_id}`

**Get a crypto transaction**

🔒 Requires authentication

**Responses**:
- `200`: Returns `TransactionResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### PUT `/crypto/transactions/{transaction_id}`

**Update a crypto transaction**

🔒 Requires authentication

**Responses**:
- `200`: Returns `CryptoTransactionBasicResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### DELETE `/crypto/transactions/{transaction_id}`

**Delete a crypto transaction**

🔒 Requires authentication

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Transaction not found

---

### GET `/crypto/transactions/account/{account_id}`

**Get transactions for an account**

🔒 Requires authentication

Returns all transactions for a specific crypto account.

**Responses**:
- `200`: Returns array of `TransactionResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Account not found

---

## Notes

All notes routes require authentication (🔒).

### GET `/notes`

**Get all notes**

🔒 Requires authentication

Returns all notes for the current user.

**Responses**:
- `200`: Returns array of `NoteResponse`
- `401`: Unauthorized

---

### POST `/notes`

**Create a note**

🔒 Requires authentication

**Request Body**:
```json
{
  "name": "Investment Strategy",
  "description": "My long-term DCA strategy for ETFs..."
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `description` | string | ❌ |

**Responses**:
- `201`: Returns `NoteResponse`
- `401`: Unauthorized
- `422`: Validation Error

---

### GET `/notes/{note_id}`

**Get a specific note**

🔒 Requires authentication

**Responses**:
- `200`: Returns `NoteResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Note not found

---

### PUT `/notes/{note_id}`

**Update a note**

🔒 Requires authentication

**Request Body** (all fields optional):
```json
{
  "name": "Updated title",
  "description": "Updated content..."
}
```

**Responses**:
- `200`: Returns `NoteResponse`
- `401`: Unauthorized
- `403`: Access denied
- `404`: Note not found

---

### DELETE `/notes/{note_id}`

**Delete a note**

🔒 Requires authentication

**Responses**:
- `204`: Successfully deleted
- `401`: Unauthorized
- `403`: Access denied
- `404`: Note not found

---

## Dashboard

### GET `/dashboard/portfolio`

**Get my portfolio**

🔒 Requires authentication

Aggregates all stock and crypto accounts for the authenticated user.

**Response fields**:
- Total invested amount
- Total fees
- Current value (if market prices available)
- Profit/Loss
- Performance percentage
- List of all accounts with positions

**Responses**:
- `200`: Returns `PortfolioResponse`
- `401`: Unauthorized

---

## Health Check

### GET `/`

**Root endpoint**

No authentication required.

**Responses**:
- `200`: API is running
  ```json
  { "status": "ok", "app": "CapitalView API" }
  ```

---

### GET `/health/db`

**Database health check**

No authentication required.

**Responses**:
- `200`: Database connected
  ```json
  { "status": "ok", "database": "connected" }
  ```

---

## Schemas Reference

### Authentication

#### `RegisterRequest`
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `username` | string | ✅ | 3-50 chars |
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | 8-100 chars |

#### `LoginRequest`
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

#### `TokenResponse`
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT token |
| `token_type` | string | Always "bearer" |
| `expires_in` | integer | Seconds until expiration |

#### `UserResponse`
| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Username |
| `email` | string | Email address |
| `is_active` | boolean | Account status |
| `last_login` | datetime | Last login timestamp |
| `created_at` | datetime | Registration timestamp |

#### `MessageResponse`
| Field | Type |
|-------|------|
| `message` | string |

---

### Bank

#### `BankAccountCreate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `account_type` | string | ✅ |
| `bank_name` | string | ❌ |
| `encrypted_iban` | string | ❌ |
| `balance` | decimal | ❌ |

#### `BankAccountUpdate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `bank_name` | string | ❌ |
| `encrypted_iban` | string | ❌ |
| `balance` | decimal | ❌ |

#### `BankAccountResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `name` | string |
| `bank_name` | string |
| `balance` | decimal |
| `account_type` | string |
| `updated_at` | datetime |

#### `BankSummaryResponse`
| Field | Type |
|-------|------|
| `total_balance` | decimal |
| `accounts` | array[BankAccountResponse] |

---

### Cashflow

#### `CashflowCreate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `flow_type` | string | ✅ |
| `category` | string | ✅ |
| `amount` | decimal | ✅ |
| `frequency` | string | ✅ |
| `transaction_date` | date | ✅ |

#### `CashflowUpdate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `category` | string | ❌ |
| `amount` | decimal | ❌ |
| `frequency` | string | ❌ |
| `transaction_date` | date | ❌ |

#### `CashflowResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `name` | string |
| `flow_type` | string |
| `category` | string |
| `amount` | decimal |
| `frequency` | string |
| `transaction_date` | date |
| `monthly_amount` | decimal |

#### `CashflowSummaryResponse`
| Field | Type |
|-------|------|
| `flow_type` | string |
| `total_amount` | decimal |
| `monthly_total` | decimal |
| `categories` | array[CashflowCategoryResponse] |

#### `CashflowBalanceResponse`
| Field | Type |
|-------|------|
| `total_inflows` | decimal |
| `monthly_inflows` | decimal |
| `total_outflows` | decimal |
| `monthly_outflows` | decimal |
| `net_balance` | decimal |
| `monthly_balance` | decimal |
| `savings_rate` | decimal |
| `inflows` | CashflowSummaryResponse |
| `outflows` | CashflowSummaryResponse |

---

### Stocks

#### `StockAccountCreate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `account_type` | string | ✅ |
| `bank_name` | string | ❌ |
| `encrypted_iban` | string | ❌ |

#### `StockAccountUpdate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `bank_name` | string | ❌ |
| `encrypted_iban` | string | ❌ |

#### `StockAccountBasicResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `name` | string |
| `account_type` | string |
| `bank_name` | string |
| `created_at` | datetime |

#### `StockTransactionCreate`
| Field | Type | Required |
|-------|------|----------|
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `exchange` | string | ❌ |
| `type` | string | ✅ |
| `amount` | decimal | ✅ |
| `price_per_unit` | decimal | ✅ |
| `fees` | decimal | ❌ |
| `executed_at` | datetime | ✅ |

#### `StockTransactionBasicResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `account_id` | integer |
| `ticker` | string |
| `exchange` | string |
| `type` | string |
| `amount` | decimal |
| `price_per_unit` | decimal |
| `fees` | decimal |
| `executed_at` | datetime |

---

### Crypto

#### `CryptoAccountCreate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `wallet_name` | string | ❌ |
| `public_address` | string | ❌ |

#### `CryptoAccountUpdate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `wallet_name` | string | ❌ |
| `public_address` | string | ❌ |

#### `CryptoAccountBasicResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `name` | string |
| `wallet_name` | string |
| `public_address` | string |
| `created_at` | datetime |

#### `CryptoTransactionCreate`
| Field | Type | Required |
|-------|------|----------|
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `type` | string | ✅ |
| `amount` | decimal | ✅ |
| `price_per_unit` | decimal | ✅ |
| `fees` | decimal | ❌ |
| `fees_ticker` | string | ❌ |
| `executed_at` | datetime | ✅ |

#### `CryptoTransactionBasicResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `account_id` | integer |
| `ticker` | string |
| `type` | string |
| `amount` | decimal |
| `price_per_unit` | decimal |
| `fees` | decimal |
| `fees_ticker` | string |
| `executed_at` | datetime |

---

### Notes

#### `NoteCreate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `description` | string | ❌ |

#### `NoteUpdate`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `description` | string | ❌ |

#### `NoteResponse`
| Field | Type |
|-------|------|
| `id` | integer |
| `name` | string |
| `description` | string |

---

### Shared / Portfolio

#### `TransactionResponse`
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Transaction ID |
| `ticker` | string | Asset symbol |
| `type` | string | Transaction type |
| `amount` | decimal | Quantity |
| `price_per_unit` | decimal | Unit price |
| `fees` | decimal | Fees paid |
| `executed_at` | datetime | Execution time |
| `total_cost` | decimal | Calculated: amount × price + fees |
| `fees_percentage` | decimal | Calculated: fees / total × 100 |
| `current_price` | decimal | Current market price (if available) |
| `current_value` | decimal | Calculated: amount × current_price |
| `profit_loss` | decimal | Calculated: current_value - total_cost |
| `profit_loss_percentage` | decimal | Calculated: P/L % |

#### `PositionResponse`
| Field | Type | Description |
|-------|------|-------------|
| `ticker` | string | Asset symbol |
| `name` | string | Asset name |
| `total_amount` | decimal | Total quantity held |
| `average_buy_price` | decimal | Weighted average price |
| `total_invested` | decimal | Total investment |
| `total_fees` | decimal | Total fees paid |
| `fees_percentage` | decimal | Fees % of investment |
| `current_price` | decimal | Current market price |
| `current_value` | decimal | Current position value |
| `profit_loss` | decimal | Unrealized P/L |
| `profit_loss_percentage` | decimal | Unrealized P/L % |

#### `AccountSummaryResponse`
| Field | Type |
|-------|------|
| `account_id` | integer |
| `account_name` | string |
| `account_type` | string |
| `total_invested` | decimal |
| `total_fees` | decimal |
| `current_value` | decimal |
| `profit_loss` | decimal |
| `profit_loss_percentage` | decimal |
| `positions` | array[PositionResponse] |

#### `PortfolioResponse`
| Field | Type |
|-------|------|
| `total_invested` | decimal |
| `total_fees` | decimal |
| `current_value` | decimal |
| `profit_loss` | decimal |
| `profit_loss_percentage` | decimal |
| `accounts` | array[AccountSummaryResponse] |
