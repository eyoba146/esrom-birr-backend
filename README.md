# ESROM BirrBalance — Backend API

Backend REST API for the ESROM BirrBalance Management System. This system manages employee meal balances, cafeteria transactions, and financial reporting between a company and its partnered cafés.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** MySQL/supabase
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **QR Encryption:** AES (crypto)
- **File Uploads:** Multer
- **Reports:** ExcelJS, PDFKit, csv-stringify
- **Scheduler:** node-cron

## System Users

| Role            | Description                                   |
| --------------- | --------------------------------------------- |
| Employee        | Views balance, places orders, leaves comments |
| Waiter          | Scans QR codes and processes offline orders   |
| Café Manager    | Manages menus, images, and café statistics    |
| Company Manager | Manages employees, allocations, and reports   |

## Core Features

- JWT-based authentication with role guards
- Encrypted QR code generation per employee
- Online and offline (QR-assisted) ordering
- Monthly balance allocation and automatic expiry
- Real-time password verification for offline orders
- Audit logging for every system action
- Notifications for low balance and new allocations
- Monthly reports exported as XLSX, PDF, and CSV
- Menu management with image uploads
- Employee comments and feedback system

## Project Structure

```
src/
├── config/        → DB connection, env validation, constants
├── middleware/    → Auth, role guard, audit logger
├── routes/        → One file per portal
├── controllers/   → Request handlers
├── services/      → Business logic
├── jobs/          → Cron jobs (balance expiry, allocation)
├── validators/    → Input validation
└── utils/         → Helpers (encryption, response, order ID)
```

## Getting Started

### Prerequisites

- Node.js v18+
- MySQL
- Git

### Installation

```bash
git https://github.com/eyoba146/esrom-birr-backend.git
cd esrom-birr-backend
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Fill in your values in `.env` before running the server.

### Run in Development

```bash
npm run dev
```

### Run Migrations

```bash
npx prisma migrate dev
```

## Branching Strategy

| Branch              | Purpose                                 |
| ------------------- | --------------------------------------- |
| `main`              | Production-ready code only              |
| `dev`               | Integration branch — all PRs merge here |
| `feat/name/feature` | Individual feature branches             |

Never push directly to `main` or `dev`. Open a Pull Request.

## Team

- Eyob — Auth, QR flow, waiter portal, reports, employee portal, balance expiry
- Selam — Schema setup, café manager portal, company manager portal, notifications

## Status

In development.
