# HRAI Platform v2 — Migration Guide

## What Changed

| Before (v1) | After (v2) |
|---|---|
| Single HTML file | Node.js backend + frontend |
| localStorage | SQLite/PostgreSQL database |
| Direct Anthropic calls | Server-side AI (key stays private) |
| No authentication | JWT tokens + bcrypt |
| No real-time sync | Auto-polling + proper state |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and JWT_SECRET

# 3. Create database + tables
npx prisma db push

# 4. Seed admin accounts
node scripts/seed.js

# 5. Start development server
npm run dev

# OR production
npm start
```

## File Structure
```
hrai-platform/
├── server.js              ← Express entry point
├── .env                   ← Environment variables (gitignored)
├── prisma/
│   └── schema.prisma      ← Database schema
├── src/
│   ├── db.js              ← Prisma singleton
│   ├── middleware/
│   │   └── auth.js        ← JWT middleware
│   └── routes/
│       ├── auth.js        ← Login, register, /me
│       ├── campaigns.js   ← Campaign CRUD
│       ├── responses.js   ← Survey responses
│       ├── pulse.js       ← ESI public survey
│       ├── users.js       ← User management
│       └── ai.js          ← Anthropic AI (server-side)
├── public/
│   └── index.html         ← Patched React frontend
└── scripts/
    └── seed.js            ← DB seeding
```

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | ❌ | Login → JWT token |
| POST | /api/auth/register | ❌ | Register (pending approval) |
| GET | /api/auth/me | ✅ | Verify token |

### Campaigns
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/campaigns | ✅ | List campaigns |
| POST | /api/campaigns | Admin | Create campaign |
| PUT | /api/campaigns/:id | Admin | Update campaign |
| DELETE | /api/campaigns/:id | Admin | Delete campaign |
| POST | /api/campaigns/:id/report-access | Admin | Add report email |
| DELETE | /api/campaigns/:id/report-access/:email | Admin | Remove report email |

### Responses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/campaigns/:id/responses | ❌ | Submit survey response |
| GET | /api/campaigns/:id/responses | ✅ | Get responses |

### Pulse (ESI)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/pulse | ❌ | Submit ESI response |
| GET | /api/pulse | ✅ Admin | Get all ESI responses |
| GET | /api/pulse/count | ❌ | Public count for meter |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Admin | List client users |
| GET | /api/users/pending | Admin | Pending users |
| PUT | /api/users/:id/verify | Admin | Approve user |
| DELETE | /api/users/:id | Admin | Delete user |
| GET | /api/users/admins | Superadmin | List admins |
| POST | /api/users/admins | Superadmin | Create admin |
| PUT | /api/users/admins/:id | Superadmin | Update admin |
| DELETE | /api/users/admins/:id | Superadmin | Delete admin |

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/ai/campaign-insights | ✅ | Campaign AI analysis |
| POST | /api/ai/pdf-report | ✅ | PDF report content |
| POST | /api/ai/esi-insights | ✅ | ESI AI analysis |

## Switching to PostgreSQL

1. In `prisma/schema.prisma`: change `provider = "sqlite"` → `"postgresql"`
2. In `.env`: change `DATABASE_URL` to your PostgreSQL connection string
3. Run `npx prisma db push` again

## Production Checklist

- [ ] Change `JWT_SECRET` to a 64+ char random string
- [ ] Set strong `ANTHROPIC_API_KEY`
- [ ] Change all default admin passwords
- [ ] Set `NODE_ENV=production`
- [ ] Set correct `CORS_ORIGIN` to your domain
- [ ] Use PostgreSQL instead of SQLite for multi-instance deployments
- [ ] Set up HTTPS (nginx/Caddy reverse proxy)
