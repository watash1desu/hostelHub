# HostelHub

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

**HostelHub** is a comprehensive, multi-tenant hostel management platform focused on intelligent mess operations, menu optimization, and complaint resolution.

---
## What's new in this fork

This is a fork of [fo56/hostelHub](https://github.com/fo56/hostelHub), a team project. The menu optimizer (MILP), authentication and the dish approval workflow come from the original codebase. This fork refocuses the product on mess management and extends it:

- **Complaints replace maintenance issues.** A complaint has a subject, a description and a status. Maintenance categories, priority and the default closure remark are removed. The admin list has server-side search, sorting and pagination.
- **Roles.** Primary Admin, Mess Manager (menu, dishes, rules) and Complaints Officer. Users and Settings are primary-admin-only, and tabs and routes are hidden or guarded by permission.
- **Smart Menu Rules** is now its own tab, with a tag library (tag chips, usage counts, warnings for unknown tags) and a soft `PREFER` rule type next to `LIMIT`, `ALLOW_IF` and `REQUIRE_IF`.
- **Menu change requests** replace auto-generation on vote. A voter threshold plus a cooldown decides when an admin may generate drafts, and a menu is never published automatically.
- **Student onboarding.** Students join with a hostel join code and wait for admin approval. Bulk import is students-only with a preview and a 200-row cap. New accounts must change the default password at first login, and admins can reset passwords.
- **Maintainability.** Settings tabs are URL-linkable, status changes update the UI optimistically, the dishes page is split into small components, the app name lives in one config file, and `npm run seed` creates demo data.
- **Tests.** 57 backend and 16 frontend unit tests.
- **Security.** Forced password change on first login is enforced on both backend API (via `requirePasswordChanged` middleware) and frontend.

---

## Key Features

### 1. Intelligent Menu Optimization & AI Rules
- **MILP Solver**: Mixed-Integer Linear Programming solver (`javascript-lp-solver`) schedules weekly meals balancing nutritional variety, pricing, repetition penalties, and student popularity.
- **Smart Menu Rules**: Natural language constraints parsed with Google Gemini into pure JsonLogic expressions:
  - `ALLOW_IF`: restricts placement based on condition.
  - `REQUIRE_IF`: mandates dishes on specific days or meals.
  - `LIMIT`: caps occurrences with optional sliding window size.
  - `PREFER`: soft preferences that nudge candidate scores by weights (-50 to 50) without hard infeasibility.
- **Menu Change Requests**: Students vote on whether they want a new menu. A threshold policy (`minVotersPercent`, `minVoters`, `cooldownDays`) evaluates change requests before drafts can be generated.

### 2. Multi-Tenant Architecture & Granular RBAC
- **Tenant Siloing**: Every query enforces `hostelId` extracted from cryptographically verified JWT tokens.
- **Student Join Code**: Unique 6-character join code per hostel allows students to self-register into a pending approval queue.
- **Granular Staff Permissions**:
  - **Primary Admin**: Complete administrative ownership, staff management, hostel settings, policy editing, and student registration approval.
  - **Mess Manager (`MANAGE_MENU`)**: Dish catalog curation, dish suggestions approval, menu generation, and publishing.
  - **Complaints Officer (`MANAGE_ISSUES`)**: Incident management, status resolution with notes, and filtered PDF report exports.
  - **Student**: View active weekly menus, vote on rotating dish preferences, review served meals, and submit complaints.

### 3. Server-Side Complaints Management
- **Optimized Query Engine**: Full text/regex search over subjects, descriptions, room numbers, and student names with server-driven pagination and 300ms debounce.
- **Audit Trails**: Status updates and notes recorded alongside immutable Activity Logs.

---

## User Roles & Permissions

| Role | Permissions | Access & Responsibilities |
| :--- | :--- | :--- |
| **Primary Admin** | All Permissions (`MANAGE_MENU`, `MANAGE_ISSUES`, Primary Flag) | Manages secondary admin users, sets change policies, approves pending student accounts, manages meal plans, deletes hostel data. |
| **Mess Manager** | `MANAGE_MENU` | Creates and edits dishes, approves student dish suggestions, configures AI menu rules, generates and publishes weekly menus. |
| **Complaints Officer** | `MANAGE_ISSUES` | Reviews open issues, filters and searches complaints, resolves tickets with resolver notes, exports filtered PDF reports. |
| **Student (Active)** | Standard Student Access | Views weekly menu, votes for preferred dishes, submits ratings and reviews for meals, submits complaints, requests menu changes. |
| **Student (Pending)** | None (Awaiting Approval) | Restricted from logging in until approved by Primary Admin in the "Pending approvals" dashboard. |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `8000` |
| `MONGODB_URI` | MongoDB connection connection string | `mongodb://localhost:27017/hostelHub` |
| `JWT_SECRET` | Secret key for signing Access and Refresh JWT tokens | `your_secure_jwt_secret_key` |
| `FRONTEND_URL` | Allowed CORS origin for frontend client requests | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API key for natural language menu rules | `your_gemini_api_key` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |

### Frontend (`frontend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API URL prefix for backend communication | `http://localhost:8000/api` |
| `VITE_APP_NAME` | Default application display name | `HostelHub` |
| `VITE_APP_ENVIRONMENT`| Frontend client environment mode | `development` |

---

## Local Development & Seeding

### 1. Installation
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Database Seeding
An idempotent seed script creates a complete demo hostel named **"Home"** (domain: `home`) populated with all roles and realistic mess data:

```bash
# Inside the backend/ directory:
npm run seed
```

> **Note**: In production environments (`NODE_ENV=production`), the script refuses to run without the `--force` flag:
> ```bash
> npm run seed -- --force
> ```

#### Seeded Demo Accounts (Password: `password123`):
- **Primary Admin**: `admin@home`
- **Mess Manager**: `manager@home`
- **Complaints Officer**: `complaints@home`
- **Students**: 20 students in rooms 101–120 (`101.1@home` through `120.1@home`)
- **Hostel Join Code**: Printed in the terminal output upon seed completion.

### 3. Running the Dev Servers
```bash
# Terminal 1 (Backend - port 8000)
cd backend && npm run dev

# Terminal 2 (Frontend - port 5173)
cd frontend && npm run dev
```

---

## Production Deployment Steps

### 1. Build Both Packages
```bash
# Build backend TypeScript
cd backend
npm run build

# Build frontend production bundle
cd ../frontend
npm run build
```

### 2. Run Backend in Production
```bash
cd backend
NODE_ENV=production node dist/server.js
```
*(Or manage with PM2: `pm2 start dist/server.js --name hostelhub-backend`)*

### 3. Serve Frontend Assets
Serve the generated `frontend/dist/` directory using Nginx, Caddy, or Cloudflare Pages with single-page application (SPA) fallback rewrites to `/index.html`.

### 4. Nginx Configuration Snippet
```nginx
server {
    listen 80;
    server_name your-hostelhub-domain.com;

    # Frontend static files
    location / {
        root /var/www/hostelhub/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API reverse proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Testing

Both packages are equipped with Vitest test suites:

```bash
# Run backend test suite (51 unit tests)
npm --prefix backend test

# Run frontend test suite (16 unit tests)
npm --prefix frontend test
```
