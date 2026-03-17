# HRAI Intelligence Platform v2.0.0

HR analytics platform with JWT auth, PostgreSQL (Prisma), server-side Anthropic AI, campaign management, ESI pulse surveys, certification framework, and 10 focused survey banks.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL (PostgreSQL), ANTHROPIC_API_KEY, JWT_SECRET

# 3. Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# 4. Seed admin accounts
node scripts/seed.js

# 5. Start development server
npm run dev
```

Server runs at `http://localhost:3000`

## Default Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Superadmin | team@hrassociationofindia.com | HRAI@2026 |
| Admin | admin2@hrassociationofindia.com | Hr@admin2 |
| Admin | admin3@hrassociationofindia.com | Hr@admin3 |

> Change these passwords immediately in production.

## Deploy to Vercel

### Prerequisites
- A PostgreSQL database — free options: [Neon](https://neon.tech), [Supabase](https://supabase.com), [Vercel Postgres](https://vercel.com/storage/postgres)
- An [Anthropic API key](https://console.anthropic.com/)

### Steps

1. **Push to GitHub**
   ```bash
   git init && git add . && git commit -m "HRAI Platform v2"
   git remote add origin https://github.com/YOUR_USERNAME/hrai-platform.git
   git push -u origin main
   ```

2. **Import to Vercel** — [vercel.com/new](https://vercel.com/new) → Import repo

3. **Set Environment Variables** in Vercel dashboard:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
   | `JWT_SECRET` | A 64+ char random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `https://your-app.vercel.app` |

4. **Deploy** — Vercel auto-builds using `vercel.json`

5. **Initialize Database** (one-time, run locally):
   ```bash
   DATABASE_URL="postgresql://..." npx prisma db push
   DATABASE_URL="postgresql://..." node scripts/seed.js
   ```

## Architecture (v2)

```
v1 (single HTML + localStorage)  →  v2 (Node.js backend + PostgreSQL)
─────────────────────────────────────────────────────────────────────
localStorage                    →  PostgreSQL via Prisma ORM
Hardcoded admin credentials     →  Bcrypt-hashed passwords in DB
Direct Anthropic browser calls  →  Server-side AI (key never exposed)
No real auth                    →  JWT tokens + role-based access
Single-browser data             →  Multi-user, multi-device, persistent
```

## Project Structure

```
hrai-platform/
├── server.js              ← Express entry point
├── vercel.json            ← Vercel serverless config
├── .env.example           ← Environment template
├── prisma/
│   └── schema.prisma      ← PostgreSQL schema (User, Campaign, Response, PulseResponse, ReportAccess)
├── src/
│   ├── db.js              ← Prisma singleton
│   ├── middleware/
│   │   └── auth.js        ← JWT middleware (authenticate, requireAdmin, requireSuperadmin)
│   └── routes/
│       ├── auth.js        ← Login, register, /me
│       ├── campaigns.js   ← Campaign CRUD + report access
│       ├── responses.js   ← Survey response submission + metrics merging
│       ├── pulse.js       ← ESI public survey (submit, list, count)
│       ├── users.js       ← User management + admin CRUD
│       └── ai.js          ← Anthropic AI (campaign insights, PDF reports, ESI, culture analysis)
├── public/
│   ├── index.html         ← React frontend (migrated to use /api/*)
│   ├── manifest.json      ← PWA manifest
│   └── sw.js              ← Service worker
└── scripts/
    └── seed.js            ← Seeds 3 admin accounts
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login → JWT token |
| POST | /api/auth/register | No | Register (pending approval) |
| GET | /api/auth/me | Yes | Verify token |

### Campaigns
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/campaigns | Yes | List campaigns (filtered by role) |
| GET | /api/campaigns/:id | Yes | Single campaign detail |
| POST | /api/campaigns | Admin | Create campaign |
| PUT | /api/campaigns/:id | Admin | Update campaign |
| DELETE | /api/campaigns/:id | Admin | Delete campaign |
| POST | /api/campaigns/:id/report-access | Admin | Add report email |
| DELETE | /api/campaigns/:id/report-access/:email | Admin | Remove report email |

### Responses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/campaigns/:id/responses | No | Submit survey + merge metrics |
| GET | /api/campaigns/:id/responses | Yes | Get responses |

### Pulse (ESI)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/pulse | No | Submit ESI response |
| GET | /api/pulse | Admin | Get all ESI responses |
| GET | /api/pulse/count | No | Public count for meter |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Admin | List client users |
| GET | /api/users/pending | Admin | Pending users |
| PUT | /api/users/:id/verify | Admin | Approve user |
| PUT | /api/users/verify-all | Admin | Approve all |
| DELETE | /api/users/:id | Admin | Delete user |
| GET | /api/users/admins | Superadmin | List admins |
| POST | /api/users/admins | Superadmin | Create admin |
| PUT | /api/users/admins/:id | Superadmin | Update admin |
| DELETE | /api/users/admins/:id | Superadmin | Delete admin |

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/ai/campaign-insights | Yes | Campaign AI analysis |
| POST | /api/ai/pdf-report | Yes | PDF report content |
| POST | /api/ai/esi-insights | Yes | ESI AI analysis |
| POST | /api/ai/culture-insight | Yes | Quick culture analysis |

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT + bcrypt
- **AI:** Anthropic Claude (server-side only)
- **Frontend:** React 18 (CDN) + Babel standalone
- **Security:** Helmet CSP, CORS, rate limiting
- **PWA:** Service worker + manifest
