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
- **Styling**: Tailwind CSS v4
- **Design System**: Custom semantic theme (configured in `tailwind.config.js`)
- **Build Tool**: Vite
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLModel
- **API**: RESTful JSON API

### Database
- **DBMS**: PostgreSQL
- **Migrations**: Alembic

---

## Folder Structure

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
    ├── tailwind.config.js
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

## Code Conventions

### General
- **User Interface**: **FRENCH** (Français) for all visible text.
- **Language**: English (variables, functions, classes, comments).
- **Documentation**: Refer to `docs/` if you have questions about the project structure or API.

### Frontend (Vue.js / TypeScript)
- Use **Composition API** with `<script setup lang="ts">`.
- **Naming**:
  - Components: **PascalCase** (`InvestmentCard.vue`)
  - Pages: **PascalCase** (`Dashboard.vue`)
  - Composables: `useName` (`useInvestments.ts`)
- **Typing**: Strictly type all props, emits, and variables.
- **State**: Prefix Pinia stores with `use` (`useUserStore`).

### Backend (Python / FastAPI)
- Follow **PEP 8**.
- Use Python **Type Hints**.
- Structure routes by domain.
- Business logic should be in `services/`.
- Use **SQLModel** for models and validation.

### Database
- Tables: **snake_case** plural (`investments`).
- Columns: **snake_case** (`created_at`).
- Mandatory columns: `id`, `created_at`, `updated_at`.

---

## Styling & Design System

This project uses a **strict semantic design system** based on Tailwind CSS v4.
**DO NOT use arbitrary colors** (e.g., `bg-blue-500`, `text-red-600`).

**ALWAYS use the semantic classes defined in `tailwind.config.js`:**

- **Primary Brand**: `bg-primary`, `text-primary`, `bg-primary-light`, `text-primary-content`
- **Secondary**: `bg-secondary`, `bg-secondary-light`
- **Feedback**:
  - Info: `bg-info`, `text-info`
  - Success: `bg-success`, `text-success`
  - Warning: `bg-warning`, `text-warning`
  - Danger: `bg-danger`, `text-danger`
- **Backgrounds**:
  - Page: `bg-background`
  - Subtle/Alt: `bg-background-subtle`
- **Surfaces (Cards/Modals)**:
  - Base: `bg-surface`
  - Border: `border-surface-border`
- **Typography**:
  - Headings: `text-text-main`
  - Body: `text-text-body`
  - Muted/Labels: `text-text-muted`
- **UI Elements (Rounding)**:
  - Base: `rounded-primary`
  - Subtle: `rounded-secondary`
  - Cards: `rounded-card shadow-card`
  - Buttons: `rounded-button`
  - Inputs: `rounded-input border-surface-border focus:ring-primary`

### Dark Mode
- **Strategy**: Class-based (`selector` strategy with `.dark` class on html/body).
- **Conventions**:
  - **ALWAYS** provide a dark variant for backgrounds, surfaces, and text.
  - **Use Semantic Classes**:
    - Background: `dark:bg-background-dark` (not `dark:bg-slate-900`)
    - Surface: `dark:bg-surface-dark`
    - Text: `dark:text-text-dark-main`, `dark:text-text-dark-muted`
    - Borders: `dark:border-surface-dark-border`
  - **Do not** invert primary/brand colors usually, but ensure contrast remains accessible.

---

## AI Agent Rules

1. **Always use TypeScript** for the frontend.
2. **Strictly type** all functions and variables.
3. **Never store** sensitive data in plain text.
4. **Prioritize** Vue composables for reusable logic.
5. **Keep it simple**: Favor simple, maintainable code over complex abstractions.
6. **STRICT STYLING**: Always refer to `frontend/tailwind.config.js` for colors and spacing. **Never hardcode hex values or standard Tailwind colors** if a semantic alternative exists.
7. **Comment** complex logic in English.