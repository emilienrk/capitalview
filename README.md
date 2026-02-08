# CapitalView

> Personal wealth management and investment tracking application

**URL**: [https://capitalview.emilien.roukine.com](https://capitalview.emilien.roukine.com)

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
├── .env                    # Environment variables (Root)
├── backend/                # FastAPI backend
├── frontend/               # Vue.js 3 frontend
├── docs/                   # Detailed documentation
├── docker-compose.yaml     # Development environment
└── docker-compose.prod.yaml # Production environment
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
   cd capitalview
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example .env
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
# Using uv (recommended)
uv run alembic upgrade head
# Or standard pip
# alembic upgrade head
```

### Development

#### Backend

**Local development** (without Docker):
```bash
cd backend
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -e .
uv run uvicorn main:app --reload
```

**Create migration**:
```bash
uv run alembic revision --autogenerate -m "Description"
uv run alembic upgrade head
```

#### Frontend

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
| **Bank** | `/bank/*` | Bank accounts management |
| **Cashflow** | `/cashflow/*` | Income & expenses tracking |
| **Stocks** | `/stocks/*` | Stock accounts & transactions |
| **Crypto** | `/crypto/*` | Crypto wallets & transactions |
| **Notes** | `/notes/*` | Personal notes & strategies |
| **Users** | `/users/*` | Portfolio overview |


### 📋 Roadmap

- Real estate tracking
- Performance metrics & benchmarking
- Budget management
- Tax optimization insights
- Mobile application


## Author

Emilien - Personal Finance Tracker