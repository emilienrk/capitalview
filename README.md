# CapitalView

> Personal wealth management and investment tracking application

## Overview

CapitalView allows users to:
- 📊 Track cash flows (income and expenses)
- 💰 Monitor investment accounts (Stocks, Crypto, PEA, CTO)
- 📝 Document investment strategies and notes
- 📈 Visualize portfolio performance and distribution
- 🏦 Manage multiple bank accounts

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLModel
- **Database**: PostgreSQL
- **Migrations**: Alembic
- **API**: RESTful JSON

### Frontend
- **Framework**: Vue.js 3 (Composition API)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: TypeScript

### Infrastructure
- **Containerization**: Docker + Docker Compose

## Project Structure

```
capitalView/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models/              # Database models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   └── schemas/             # Pydantic schemas
├── frontend/                # Vue.js (WIP)
├── docs/API.md              # Full API documentation
└── docker-compose.yaml
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for frontend development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd capitalView
   ```

2. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker**
   ```bash
   docker compose up -d
   ```

### Database Setup

**Run migrations**:
```bash
cd backend
uv run alembic upgrade head
```

### Development

#### Backend

**Local development** (without Docker):
```bash
cd backend
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
uv run uvicorn main:app --reload
```

**Create migration**:
```bash
uv run alembic revision --autogenerate -m "Description"
uv run alembic upgrade head
```

### Frontend *(WIP)*

```bash
cd frontend
npm install
npm run dev
```

## API Documentation

Complete API documentation is available at:
- **Interactive docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **Markdown**: [docs/API.md](docs/API.md)

### Main Endpoints

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| **Bank** | `/api/bank/*` | Bank accounts management |
| **Cashflow** | `/api/cashflow/*` | Income & expenses tracking |
| **Stocks** | `/api/stocks/*` | Stock accounts & transactions |
| **Crypto** | `/api/crypto/*` | Crypto wallets & transactions |
| **Notes** | `/api/notes/*` | Personal notes & strategies |
| **Users** | `/api/users/*` | Portfolio overview |


### 📋 Roadmap

- Real estate tracking
- Performance metrics & benchmarking
- Budget management
- Tax optimization insights
- Mobile application


## Author

Emilien - Personal Finance Tracker