# Project Context: CapitalView

## Overview

CapitalView is a personal wealth management and investment tracking application.
**Goal:** Track cash flows, monitor investment evolution (Crypto, Stock, Real Estate), document strategies, and visualize global wealth.

**Security:** All sensitive data must be encrypted (client and/or server side).
**Language:** All user-facing text must be in **French**. Code variables and comments in English.

## Tech Stack & Architecture

### Frontend (`/frontend`)
- **Framework:** Vue 3 (Composition API + `<script setup lang="ts">`)
- **Language:** TypeScript
- **State Management:** Pinia (Store naming: `useUserStore`)
- **Routing:** Vue Router 4
- **Styling:** Tailwind CSS v4 (Strict Semantic Design System)
- **Build Tool:** Vite

### Backend (`/backend`)
- **Framework:** FastAPI (Python)
- **ORM:** SQLModel (Combines Pydantic & SQLAlchemy)
- **API:** RESTful JSON API
- **Database:** PostgreSQL
- **Migrations:** Alembic

## Key Domains (from API)
- **Bank:** Bank accounts management
- **Cashflow:** Income & expenses tracking
- **Stocks:** Stock accounts & transactions
- **Crypto:** Crypto wallets & transactions
- **Notes:** Personal notes & strategies
- **Users:** Portfolio overview

## Conventions

### General
- **User Interface:** **FRENCH** (Français) for all visible text.
- **Code:** English for variables, functions, classes, and comments.
- **Documentation:** Refer to `docs/` for detailed information if unsure.

### Frontend (Vue.js / TypeScript)
- **Component Style:** Composition API with `<script setup lang="ts">`.
- **Naming:**
  - Components/Pages: **PascalCase** (e.g., `InvestmentCard.vue`, `Dashboard.vue`).
  - Composables: `useName` (e.g., `useInvestments.ts`).
- **Typing:** Strict typing for all props, emits, and variables.
- **Logic:** Prioritize Vue composables for reusable logic.

### Backend (Python / FastAPI)
- **Style:** Follow **PEP 8**. Use Python **Type Hints**.
- **Structure:**
  - Routes structured by domain.
  - Business logic in `services/`.
  - Models and validation using **SQLModel**.

### Database
- **Naming:**
  - Tables: **snake_case** plural (e.g., `investments`).
  - Columns: **snake_case** (e.g., `created_at`).
- **Schema:** Mandatory columns: `id`, `created_at`, `updated_at`.

### Styling & Design System (CRITICAL)

**Strictly follow the semantic design system defined in `tailwind.config.js`.**
**DO NOT use arbitrary colors** (e.g., `bg-blue-500`, `text-red-600`) or hardcode hex values.

- **Primary Brand:** `bg-primary`, `text-primary`, `bg-primary-light`, `text-primary-content`
- **Secondary:** `bg-secondary`, `bg-secondary-light`
- **Feedback:**
  - `bg-info` / `text-info`
  - `bg-success` / `text-success`
  - `bg-warning` / `text-warning`
  - `bg-danger` / `text-danger`
- **Backgrounds:**
  - Page: `bg-background`
  - Subtle: `bg-background-subtle`
- **Surfaces:**
  - Base: `bg-surface`
  - Border: `border-surface-border`
- **Typography:**
  - Headings: `text-text-main`
  - Body: `text-text-body`
  - Muted: `text-text-muted`
- **Shape/UI:**
  - `rounded-primary`, `rounded-secondary`, `rounded-card`, `rounded-button`, `rounded-input`.

#### Dark Mode
- **Strategy:** Class-based (`.dark`).
- **Rule:** **ALWAYS** provide semantic dark variants.
  - Background: `dark:bg-background-dark`
  - Surface: `dark:bg-surface-dark`
  - Text: `dark:text-text-dark-main`, `dark:text-text-dark-muted`
  - Border: `dark:border-surface-dark-border`

## Common Commands

### Docker
- Migrations: `docker compose exec backend alembic upgrade head`
