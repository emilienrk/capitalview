# CapitalView API

**Version**: 0.1.0

Personal wealth management and investment tracking API

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: (see deployment)

## Overview

This API provides endpoints for managing:
- **Bank Accounts**: Standard checking/savings accounts
- **Cashflows**: Income and expenses tracking
- **Stock Accounts**: PEA, CTO, PEA-PME with transactions
- **Crypto Accounts**: Cryptocurrency portfolios with transactions
- **Notes**: User notes and strategies
- **Portfolio**: Global wealth aggregation and performance

## Data Formats

- **Dates**: ISO 8601 format (`YYYY-MM-DD`)
- **DateTimes**: ISO 8601 format with timezone (`YYYY-MM-DDTHH:MM:SSZ`)
- **Decimals**: Numbers with up to 18 decimal places for crypto amounts
- **Currency**: All monetary values in EUR

## Common Patterns

### Resource Relationships
- All resources belong to a `user_id`
- Transactions belong to an `account_id`
- Market prices are shared across all users

### CRUD Operations
- **POST** `/resource` - Create (returns 201)
- **GET** `/resource` - List all
- **GET** `/resource/{id}` - Get one
- **PUT** `/resource/{id}` - Update (partial)
- **DELETE** `/resource/{id}` - Delete (returns 204)

### Validation Errors
- **422**: Validation error with detailed field-level messages
- **404**: Resource not found
- **400**: Invalid enum values or business logic errors


## Bank Accounts

### GET `/api/bank/accounts`

**Get Bank Accounts**

Get all bank accounts with total balance.

**Responses**:
- `200`: Successful Response
  - Returns: `BankSummaryResponse`

### POST `/api/bank/accounts`

**Create Bank Account**

Create a new bank account.

**Request Body**:
- `user_id`: integer (required)
- `name`: string (required)
- `account_type`: BankAccountType enum (required) - values: `CHECKING`, `SAVINGS`, `LIVRET_A`, `LIVRET_DEVE`, `LEP`, `LDD`, `PEL`, `CEL`
- `bank_name`: string (optional)
- `encrypted_iban`: string (optional)
- `balance`: decimal (optional)

**Responses**:
- `201`: Successful Response
  - Returns: `BankAccountResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/bank/accounts/{account_id}`

**Delete Bank Account**

Delete a bank account.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/bank/accounts/{account_id}`

**Get Bank Account**

Get a specific bank account.

**Responses**:
- `200`: Successful Response
  - Returns: `BankAccountResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/bank/accounts/{account_id}`

**Update Bank Account**

Update a bank account.

**Request Body**:
- `name`: string (optional)
- `bank_name`: string (optional)
- `encrypted_iban`: string (optional)
- `balance`: decimal (optional)

**Responses**:
- `200`: Successful Response
  - Returns: `BankAccountResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/bank/user/{user_id}`

**Get User Banks**

Get all bank accounts for a specific user.

**Responses**:
- `200`: Successful Response
  - Returns: `BankSummaryResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Cashflows

### GET `/api/cashflow`

**Get All Cashflows**

Get all cashflow entries.

**Responses**:
- `200`: Successful Response

### POST `/api/cashflow`

**Create Cashflow**

Create a new cashflow entry.

**Request Body**:
- `user_id`: integer (required)
- `name`: string (required)
- `flow_type`: FlowType enum (required) - values: `INFLOW`, `OUTFLOW`
- `category`: string (required)
- `amount`: decimal (required)
- `frequency`: Frequency enum (required) - values: `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `transaction_date`: date (required) - format: `YYYY-MM-DD`

**Responses**:
- `201`: Successful Response
  - Returns: `CashflowResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/cashflow/user/{user_id}/balance`

**Get Balance**

Get complete cashflow balance for a user.

Returns:
    - Total inflows and outflows
    - Monthly equivalents
    - Net balance
    - Savings rate (% of income saved)
    - Breakdown by category

**Responses**:
- `200`: Successful Response
  - Returns: `CashflowBalanceResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/cashflow/user/{user_id}/inflows`

**Get Inflows**

Get all income/inflows for a user, grouped by category.

**Responses**:
- `200`: Successful Response
  - Returns: `CashflowSummaryResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/cashflow/user/{user_id}/outflows`

**Get Outflows**

Get all expenses/outflows for a user, grouped by category.

**Responses**:
- `200`: Successful Response
  - Returns: `CashflowSummaryResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/cashflow/{cashflow_id}`

**Delete Cashflow**

Delete a cashflow entry.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/cashflow/{cashflow_id}`

**Get Cashflow**

Get a specific cashflow entry.

**Responses**:
- `200`: Successful Response
  - Returns: `CashflowResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/cashflow/{cashflow_id}`

**Update Cashflow**

Update a cashflow entry.

**Request Body**:
- `name`: string (optional)
- `category`: string (optional)
- `amount`: decimal (optional)
- `frequency`: Frequency enum (optional) - values: `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `transaction_date`: date (optional) - format: `YYYY-MM-DD`

**Responses**:
- `200`: Successful Response
  - Returns: `CashflowResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Crypto

### GET `/api/crypto/accounts`

**List Crypto Accounts**

List all crypto accounts (basic info).

**Responses**:
- `200`: Successful Response

### POST `/api/crypto/accounts`

**Create Crypto Account**

Create a new crypto account/wallet.

**Request Body**:
- `user_id`: integer (required)
- `name`: string (required)
- `wallet_name`: string (optional)
- `public_address`: string (optional)

**Responses**:
- `201`: Successful Response
  - Returns: `CryptoAccountBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/crypto/accounts/user/{user_id}`

**Get User Crypto Accounts**

Get all crypto accounts for a user.

**Responses**:
- `200`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/crypto/accounts/{account_id}`

**Delete Crypto Account**

Delete a crypto account and all its transactions.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/crypto/accounts/{account_id}`

**Get Crypto Account**

Get a crypto account with positions and calculated values.

**Responses**:
- `200`: Successful Response
  - Returns: `AccountSummaryResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/crypto/accounts/{account_id}`

**Update Crypto Account**

Update a crypto account.

**Request Body**:
- `name`: string (optional)
- `wallet_name`: string (optional)
- `public_address`: string (optional)

**Responses**:
- `200`: Successful Response
  - Returns: `CryptoAccountBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/crypto/transactions`

**List Crypto Transactions**

List all crypto transactions (history).

**Responses**:
- `200`: Successful Response

### POST `/api/crypto/transactions`

**Create Crypto Transaction**

Create a new crypto transaction.

**Request Body**:
- `account_id`: integer (required)
- `ticker`: string (required) - e.g., `BTC`, `ETH`
- `type`: CryptoTransactionType enum (required) - values: `BUY`, `SELL`, `SWAP`, `STAKING`
- `amount`: decimal (required) - quantity of crypto
- `price_per_unit`: decimal (required) - price in EUR
- `fees`: decimal (optional, default: 0)
- `fees_ticker`: string (optional) - ticker of the fee currency (e.g., `BNB`)
- `executed_at`: datetime (required) - format: `YYYY-MM-DDTHH:MM:SSZ`

**Responses**:
- `201`: Successful Response
  - Returns: `CryptoTransactionBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/crypto/transactions/account/{account_id}`

**Get Account Transactions**

Get all transactions for a specific account.

**Responses**:
- `200`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/crypto/transactions/{transaction_id}`

**Delete Crypto Transaction**

Delete a crypto transaction.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/crypto/transactions/{transaction_id}`

**Get Crypto Transaction**

Get a specific crypto transaction.

**Responses**:
- `200`: Successful Response
  - Returns: `TransactionResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/crypto/transactions/{transaction_id}`

**Update Crypto Transaction**

Update a crypto transaction.

**Request Body**:
- `ticker`: string (optional)
- `type`: CryptoTransactionType enum (optional) - values: `BUY`, `SELL`, `SWAP`, `STAKING`
- `amount`: decimal (optional)
- `price_per_unit`: decimal (optional)
- `fees`: decimal (optional)
- `fees_ticker`: string (optional)
- `executed_at`: datetime (optional) - format: `YYYY-MM-DDTHH:MM:SSZ`

**Responses**:
- `200`: Successful Response
  - Returns: `CryptoTransactionBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Notes

### GET `/api/notes`

**Get All Notes**

Get all notes.

**Responses**:
- `200`: Successful Response

### POST `/api/notes`

**Create Note**

Create a new note.

**Request Body**:
- `user_id`: integer (required)
- `name`: string (required)
- `description`: string (optional)

**Responses**:
- `201`: Successful Response
  - Returns: `NoteResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/notes/user/{user_id}`

**Get User Notes**

Get all notes for a specific user.

**Responses**:
- `200`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/notes/{note_id}`

**Delete Note**

Delete a note.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/notes/{note_id}`

**Get Note**

Get a specific note.

**Responses**:
- `200`: Successful Response
  - Returns: `NoteResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/notes/{note_id}`

**Update Note**

Update a note.

**Request Body**:
- `name`: string (optional)
- `description`: string (optional)

**Responses**:
- `200`: Successful Response
  - Returns: `NoteResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Other

### GET `/`

**Root**

Health check endpoint.

**Responses**:
- `200`: Successful Response

### GET `/health/db`

**Health Db**

Check database connection.

**Responses**:
- `200`: Successful Response

## Stocks

### GET `/api/stocks/accounts`

**List Stock Accounts**

List all stock accounts (basic info).

**Responses**:
- `200`: Successful Response

### POST `/api/stocks/accounts`

**Create Stock Account**

Create a new stock account.

**Request Body**:
- `user_id`: integer (required)
- `name`: string (required)
- `account_type`: StockAccountType enum (required) - values: `PEA`, `CTO`, `PEA_PME`
- `bank_name`: string (optional)
- `encrypted_iban`: string (optional)

**Responses**:
- `201`: Successful Response
  - Returns: `StockAccountBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/stocks/accounts/user/{user_id}`

**Get User Stock Accounts**

Get all stock accounts for a user.

**Responses**:
- `200`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/stocks/accounts/{account_id}`

**Delete Stock Account**

Delete a stock account and all its transactions.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/stocks/accounts/{account_id}`

**Get Stock Account**

Get a stock account with positions and calculated values.

**Responses**:
- `200`: Successful Response
  - Returns: `AccountSummaryResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/stocks/accounts/{account_id}`

**Update Stock Account**

Update a stock account.

**Request Body**:
- `name`: string (optional)
- `bank_name`: string (optional)
- `encrypted_iban`: string (optional)

**Responses**:
- `200`: Successful Response
  - Returns: `StockAccountBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/stocks/transactions`

**List Stock Transactions**

List all stock transactions (history).

**Responses**:
- `200`: Successful Response

### POST `/api/stocks/transactions`

**Create Stock Transaction**

Create a new stock transaction.

**Request Body**:
- `account_id`: integer (required)
- `ticker`: string (required) - e.g., `AAPL`, `MSFT`
- `exchange`: string (optional) - e.g., `NASDAQ`, `NYSE`
- `type`: StockTransactionType enum (required) - values: `BUY`, `SELL`, `DEPOSIT`, `DIVIDEND`
- `amount`: decimal (required) - number of shares
- `price_per_unit`: decimal (required) - price per share in EUR
- `fees`: decimal (optional, default: 0)
- `executed_at`: datetime (required) - format: `YYYY-MM-DDTHH:MM:SSZ`

**Responses**:
- `201`: Successful Response
  - Returns: `StockTransactionBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/stocks/transactions/account/{account_id}`

**Get Account Transactions**

Get all transactions for a specific account.

**Responses**:
- `200`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### DELETE `/api/stocks/transactions/{transaction_id}`

**Delete Stock Transaction**

Delete a stock transaction.

**Responses**:
- `204`: Successful Response
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### GET `/api/stocks/transactions/{transaction_id}`

**Get Stock Transaction**

Get a specific stock transaction.

**Responses**:
- `200`: Successful Response
  - Returns: `TransactionResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

### PUT `/api/stocks/transactions/{transaction_id}`

**Update Stock Transaction**

Update a stock transaction.

**Request Body**:
- `ticker`: string (optional)
- `exchange`: string (optional)
- `type`: StockTransactionType enum (optional) - values: `BUY`, `SELL`, `DEPOSIT`, `DIVIDEND`
- `amount`: decimal (optional)
- `price_per_unit`: decimal (optional)
- `fees`: decimal (optional)
- `executed_at`: datetime (optional) - format: `YYYY-MM-DDTHH:MM:SSZ`

**Responses**:
- `200`: Successful Response
  - Returns: `StockTransactionBasicResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Users

### GET `/api/users/{user_id}/portfolio`

**Get User Portfolio**

Get complete portfolio for a user.

Aggregates all stock and crypto accounts with:
- Total invested amount
- Total fees
- Current value
- Profit/Loss
- Performance percentage

**Responses**:
- `200`: Successful Response
  - Returns: `PortfolioResponse`
- `422`: Validation Error
  - Returns: `HTTPValidationError`
  - Returns: `HTTPValidationError`

## Schemas Reference

Detailed schema definitions grouped by domain.

### Bank

#### `BankAccountCreate`

Create a bank account.

| Field | Type | Required |
|-------|------|----------|
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `account_type` | string | ✅ |
| `bank_name` | unknown | ❌ |
| `encrypted_iban` | unknown | ❌ |
| `balance` | unknown | ❌ |

#### `BankAccountResponse`

Bank account response.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `bank_name` | unknown | ❌ |
| `balance` | string | ✅ |
| `account_type` | string | ✅ |
| `updated_at` | string | ✅ |

#### `BankAccountUpdate`

Update a bank account.

| Field | Type | Required |
|-------|------|----------|
| `name` | unknown | ❌ |
| `bank_name` | unknown | ❌ |
| `encrypted_iban` | unknown | ❌ |
| `balance` | unknown | ❌ |

#### `BankSummaryResponse`

Summary of all bank accounts.

| Field | Type | Required |
|-------|------|----------|
| `total_balance` | string | ✅ |
| `accounts` | array | ✅ |

### Cashflow

#### `CashflowBalanceResponse`

Balance between inflows and outflows.

| Field | Type | Required |
|-------|------|----------|
| `total_inflows` | string | ✅ |
| `monthly_inflows` | string | ✅ |
| `total_outflows` | string | ✅ |
| `monthly_outflows` | string | ✅ |
| `net_balance` | string | ✅ |
| `monthly_balance` | string | ✅ |
| `savings_rate` | unknown | ❌ |
| `inflows` | unknown | ✅ |
| `outflows` | unknown | ✅ |

#### `CashflowCategoryResponse`

Cashflows grouped by category.

| Field | Type | Required |
|-------|------|----------|
| `category` | string | ✅ |
| `total_amount` | string | ✅ |
| `monthly_total` | string | ✅ |
| `count` | integer | ✅ |
| `items` | array | ✅ |

#### `CashflowCreate`

Create a cashflow.

| Field | Type | Required |
|-------|------|----------|
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `flow_type` | string | ✅ |
| `category` | string | ✅ |
| `amount` | unknown | ✅ |
| `frequency` | string | ✅ |
| `transaction_date` | string | ✅ |

#### `CashflowResponse`

Single cashflow response.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `flow_type` | string | ✅ |
| `category` | string | ✅ |
| `amount` | string | ✅ |
| `frequency` | string | ✅ |
| `transaction_date` | string | ✅ |
| `monthly_amount` | string | ✅ |

#### `CashflowSummaryResponse`

Summary of cashflows (inflows or outflows).

| Field | Type | Required |
|-------|------|----------|
| `flow_type` | string | ✅ |
| `total_amount` | string | ✅ |
| `monthly_total` | string | ✅ |
| `categories` | array | ✅ |

#### `CashflowUpdate`

Update a cashflow.

| Field | Type | Required |
|-------|------|----------|
| `name` | unknown | ❌ |
| `category` | unknown | ❌ |
| `amount` | unknown | ❌ |
| `frequency` | unknown | ❌ |
| `transaction_date` | unknown | ❌ |

### Stocks

#### `StockAccountBasicResponse`

Basic stock account response (without positions).

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `account_type` | string | ✅ |
| `bank_name` | unknown | ❌ |
| `created_at` | string | ✅ |

#### `StockAccountCreate`

Create a stock account.

| Field | Type | Required |
|-------|------|----------|
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `account_type` | string | ✅ |
| `bank_name` | unknown | ❌ |
| `encrypted_iban` | unknown | ❌ |

#### `StockAccountUpdate`

Update a stock account.

| Field | Type | Required |
|-------|------|----------|
| `name` | unknown | ❌ |
| `bank_name` | unknown | ❌ |
| `encrypted_iban` | unknown | ❌ |

#### `StockTransactionBasicResponse`

Basic stock transaction response.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `exchange` | unknown | ❌ |
| `type` | string | ✅ |
| `amount` | string | ✅ |
| `price_per_unit` | string | ✅ |
| `fees` | string | ✅ |
| `executed_at` | string | ✅ |

#### `StockTransactionCreate`

Create a stock transaction.

| Field | Type | Required |
|-------|------|----------|
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `exchange` | unknown | ❌ |
| `type` | string | ✅ |
| `amount` | unknown | ✅ |
| `price_per_unit` | unknown | ✅ |
| `fees` | unknown | ❌ |
| `executed_at` | string | ✅ |

#### `StockTransactionUpdate`

Update a stock transaction.

| Field | Type | Required |
|-------|------|----------|
| `ticker` | unknown | ❌ |
| `exchange` | unknown | ❌ |
| `type` | unknown | ❌ |
| `amount` | unknown | ❌ |
| `price_per_unit` | unknown | ❌ |
| `fees` | unknown | ❌ |
| `executed_at` | unknown | ❌ |

### Crypto

#### `CryptoAccountBasicResponse`

Basic crypto account response (without positions).

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `wallet_name` | unknown | ❌ |
| `public_address` | unknown | ❌ |
| `created_at` | string | ✅ |

#### `CryptoAccountCreate`

Create a crypto account.

| Field | Type | Required |
|-------|------|----------|
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `wallet_name` | unknown | ❌ |
| `public_address` | unknown | ❌ |

#### `CryptoAccountUpdate`

Update a crypto account.

| Field | Type | Required |
|-------|------|----------|
| `name` | unknown | ❌ |
| `wallet_name` | unknown | ❌ |
| `public_address` | unknown | ❌ |

#### `CryptoTransactionBasicResponse`

Basic crypto transaction response.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `type` | string | ✅ |
| `amount` | string | ✅ |
| `price_per_unit` | string | ✅ |
| `fees` | string | ✅ |
| `fees_ticker` | unknown | ❌ |
| `executed_at` | string | ✅ |

#### `CryptoTransactionCreate`

Create a crypto transaction.

| Field | Type | Required |
|-------|------|----------|
| `account_id` | integer | ✅ |
| `ticker` | string | ✅ |
| `type` | string | ✅ |
| `amount` | unknown | ✅ |
| `price_per_unit` | unknown | ✅ |
| `fees` | unknown | ❌ |
| `fees_ticker` | unknown | ❌ |
| `executed_at` | string | ✅ |

#### `CryptoTransactionUpdate`

Update a crypto transaction.

| Field | Type | Required |
|-------|------|----------|
| `ticker` | unknown | ❌ |
| `type` | unknown | ❌ |
| `amount` | unknown | ❌ |
| `price_per_unit` | unknown | ❌ |
| `fees` | unknown | ❌ |
| `fees_ticker` | unknown | ❌ |
| `executed_at` | unknown | ❌ |

### Notes

#### `NoteCreate`

Create a note.

| Field | Type | Required |
|-------|------|----------|
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `description` | unknown | ❌ |

#### `NoteResponse`

Note response.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `user_id` | integer | ✅ |
| `name` | string | ✅ |
| `description` | unknown | ❌ |

#### `NoteUpdate`

Update a note.

| Field | Type | Required |
|-------|------|----------|
| `name` | unknown | ❌ |
| `description` | unknown | ❌ |

### Portfolio & Summary

#### `AccountSummaryResponse`

Summary of an account with all positions.

| Field | Type | Required |
|-------|------|----------|
| `account_id` | integer | ✅ |
| `account_name` | string | ✅ |
| `account_type` | string | ✅ |
| `total_invested` | string | ✅ |
| `total_fees` | string | ✅ |
| `current_value` | unknown | ❌ |
| `profit_loss` | unknown | ❌ |
| `profit_loss_percentage` | unknown | ❌ |
| `positions` | array | ✅ |

#### `PortfolioResponse`

Global portfolio summary.

| Field | Type | Required |
|-------|------|----------|
| `total_invested` | string | ✅ |
| `total_fees` | string | ✅ |
| `current_value` | unknown | ❌ |
| `profit_loss` | unknown | ❌ |
| `profit_loss_percentage` | unknown | ❌ |
| `accounts` | array | ✅ |

#### `PositionResponse`

Aggregated position for a single asset.

| Field | Type | Required |
|-------|------|----------|
| `ticker` | string | ✅ |
| `name` | unknown | ❌ |
| `total_amount` | string | ✅ |
| `average_buy_price` | string | ✅ |
| `total_invested` | string | ✅ |
| `total_fees` | string | ✅ |
| `fees_percentage` | string | ✅ |
| `current_price` | unknown | ❌ |
| `current_value` | unknown | ❌ |
| `profit_loss` | unknown | ❌ |
| `profit_loss_percentage` | unknown | ❌ |

#### `TransactionResponse`

Base transaction response with calculated fields.

| Field | Type | Required |
|-------|------|----------|
| `id` | integer | ✅ |
| `ticker` | string | ✅ |
| `type` | string | ✅ |
| `amount` | string | ✅ |
| `price_per_unit` | string | ✅ |
| `fees` | string | ✅ |
| `executed_at` | string | ✅ |
| `total_cost` | string | ✅ |
| `fees_percentage` | string | ✅ |
| `current_price` | unknown | ❌ |
| `current_value` | unknown | ❌ |
| `profit_loss` | unknown | ❌ |
| `profit_loss_percentage` | unknown | ❌ |

### Validation

#### `HTTPValidationError`

| Field | Type | Required |
|-------|------|----------|
| `detail` | array | ❌ |

#### `ValidationError`

| Field | Type | Required |
|-------|------|----------|
| `loc` | array | ✅ |
| `msg` | string | ✅ |
| `type` | string | ✅ |
