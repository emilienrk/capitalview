# AI Coding Agent Instructions

## Overview

Personal wealth management and investment tracking application allowing users to:
- Track cash flows (inflows/outflows).
- Monitor investment evolution (Crypto, Stock accounts, PEA, Real Estate, etc.).
- Document investment strategies and personal notes.
- Visualize global wealth distribution and performance.

**Security**: All sensitive data must be encrypted (client and/or server side).

---

## Tech Stack & Architecture

### Frontend
- **Framework**: Vue.js 3 (Composition API + `<script setup>`)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: TypeScript

### Backend
- **Framework**: Flask (Python)
- **ORM**: SQLAlchemy
- **API**: RESTful JSON API

### Database
- **DBMS**: PostgreSQL
- **Migrations**: Flask-Migrate (Alembic)

---

## Structure des dossiers

```
investment_sheet/
├── .github/
│   └── copilot-instructions.md
├── docker-compose.yaml
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── composables/
    │   ├── layouts/
    │   ├── pages/
    │   ├── router/
    │   ├── stores/
    │   ├── types/
    │   └── utils/
    ├── App.vue
    └── main.ts
```

---

## Conventions de code

### General
- **Language**: English (variables, functions, classes, comments).

### Frontend (Vue.js / TypeScript)
- Use **Composition API** with `<script setup lang="ts">`.
- **Naming**:
  - Components: **PascalCase** (`InvestmentCard.vue`)
  - Pages: **PascalCase** (`Dashboard.vue`)
  - Composables: `useName` (`useInvestments.ts`)
- **Typing**: Strictly type all props, emits, and variables.
- **State**: Prefix Pinia stores with `use` (`useUserStore`).

### Backend (Python / Flask)
- Follow **PEP 8**.
- Use Python **Type Hints**.
- Structure routes by domain.
- Business logic should be in `services/`.
- Use **Dataclasses** or **Pydantic** for validation.

### Database
- Tables: **snake_case** plural (`investments`).
- Columns: **snake_case** (`created_at`).
- Mandatory columns: `id`, `created_at`, `updated_at`.

---

## Security Guidelines

- **Encryption**: Sensitive data must be encrypted at rest (AES-256).
- **Authentication**: JWT with short expiration + Secure Refresh Tokens.
- **Protection**: Input sanitization, CSRF protection, Secure Headers.

---

## AI Agent Rules

1. **Always use TypeScript** for the frontend.
2. **Strictly type** all functions and variables.
3. **Never store** sensitive data in plain text.
4. **Prioritize** Vue composables for reusable logic.
5. **Keep it simple**: Favor simple, maintainable code over complex abstractions.
6. **Always use Tailwind CSS** for styling; do not write custom CSS unless necessary.
7. **Comment** complex logic in English.
