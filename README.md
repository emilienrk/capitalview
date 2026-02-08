# CapitalView

> 🔒 **Secure, Private & Encrypted** Personal Wealth Management.

**URL**: [https://capitalview.emilien.roukine.com](https://capitalview.emilien.roukine.com)

## Overview

CapitalView is a privacy-first wealth management application designed to track your entire financial life without compromising your data security.

**Key Features:**
- 📊 **Cashflow Tracking**: Monitor income and expenses with detailed categorization.
- 💰 **Investment Portfolio**: Track Stocks (PEA, CTO) and Crypto accounts with real-time performance.
- 🏦 **Multi-Banking**: Manage multiple bank accounts and balances.
- 📝 **Encrypted Notes**: Document your investment strategies securely.
- 📈 **Analytics**: Visualize your global net worth and asset distribution.

---

## 🔐 Security & Encryption (Zero-Knowledge)

CapitalView is built on a **Zero-Knowledge Architecture**. The server stores your data, but **cannot read it**.

### How it works:

1.  **Master Key Derivation (Client-Side Logic)**:
    - Your password never leaves the authentication phase in plain text for data access.
    - A **Master Key** is derived from your password and a unique salt using **Argon2id**.
    - This key is **never stored** persistently in the database. It exists only in your active session (secure HTTP-only cookie).

2.  **AES-256-GCM Encryption**:
    - All sensitive data (account names, balances, transaction details, notes) is encrypted using **AES-256-GCM**.
    - This ensures **Confidentiality** (no one can read it) and **Integrity** (no one can tamper with it).

3.  **Blind Indexing**:
    - To allow searching without decrypting (e.g., finding all transactions for an account), we use **Blind Indexes** derived via **HMAC-SHA256**.
    - This allows strict database relationships and lookups while keeping the actual Foreign Keys encrypted/hidden.

4.  **UUIDs**:
    - All entities use **UUIDs** (v7/v4) instead of sequential integers to prevent enumeration attacks.

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Security**: PyNaCl (Argon2), Cryptography (AES-GCM, HKDF)
- **Database**: PostgreSQL
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **Migrations**: Alembic

### Frontend
- **Framework**: Vue.js 3 (Composition API, Script Setup)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Pinia
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Caddy (Production) / Nginx (Container)

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- `sops` and `age` (for secret decryption)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd capitalview
    ```

2.  **Decrypt Environment Variables**
    This project uses `sops` encrypted secrets. You must have the correct `age` key.
    
    ```bash
    sops -d .env.enc > .env
    ```
    *Ensure your `SOPS_AGE_KEY_FILE` environment variable is set or the key is in the default location.*

3.  **Start the Application**
    ```bash
    docker compose up -d --build
    ```

4.  **Run Database Migrations**
    *This creates the database tables with the secure schema.*
    ```bash
    docker compose exec backend alembic upgrade head
    ```

5.  **Access the App**
    - Frontend: http://localhost:5173 (or mapped port)
    - Backend API Docs: http://localhost:8000/docs

---

## Development

### Backend (Local)

If you prefer running without Docker:

```bash
cd backend
# Install dependencies (using uv is recommended)
uv venv
source .venv/bin/activate
uv pip install -e .

# Run Server
uv run uvicorn main:app --reload
```

### Frontend (Local)

```bash
cd frontend
npm install
npm run dev
```

---

## API Documentation

The API follows RESTful principles and is fully typed.

- **Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Detailed Specification**: [docs/API.md](docs/API.md)

### Main Domains

| Domain | Description | Security |
|--------|-------------|----------|
| **Auth** | User registration, login, token management | JWT + Secure Cookies |
| **Bank** | Bank accounts | AES Encrypted |
| **Stocks** | PEA/CTO accounts and transactions | AES Encrypted |
| **Crypto** | Wallets and transactions | AES Encrypted |
| **Cashflow** | Income/Expenses | AES Encrypted |
| **Notes** | Private notes | AES Encrypted |

---

## Author

**Emilien** — *Personal Finance Tracker*