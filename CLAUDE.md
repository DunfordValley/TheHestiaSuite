# The Hestia Suite — Developer Guide

## Project Overview

The Hestia Suite is a self-hosted CRM for small sales teams (1–10 users). It runs entirely on a single Ubuntu machine exposed securely via a Cloudflare Zero Trust Tunnel — no SaaS fees, no data leaving your network.

## Repository Structure

```
TheHestiaSuite/
├── frontend/          Vite + React + TypeScript (UI)
├── backend/           Node.js + Express + TypeScript (API)
├── docker-compose.yml Full stack orchestration
├── .env.example       Environment variable template
├── CLAUDE.md          This file
├── UserGuide.md       End-user documentation
├── Requirements.md    Original requirements reference
├── Brochure.md        Product overview
└── EmailIntegration.md Gmail integration implementation plan
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Vite 5, React 18, TypeScript        |
| Styling     | Tailwind CSS 3                      |
| Routing     | React Router v6                     |
| Data fetching | TanStack Query v5               |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable   |
| Icons       | Lucide React                        |
| Backend     | Node.js 20, Express 4, TypeScript   |
| Database    | PostgreSQL 16                       |
| DB client   | node-postgres (pg)                  |
| Email       | Gmail API via googleapis SDK        |
| Container   | Docker + Docker Compose             |
| Tunnel      | Cloudflare cloudflared              |

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally
- A database named `crm_prod` with user `crm_user`

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your local DB credentials
npm run dev
# API runs on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI runs on http://localhost:5173
# Vite proxies /api → localhost:3001 automatically
```

## Docker (recommended)

```bash
cp .env.example .env
# Edit .env — change POSTGRES_PASSWORD at minimum

# Start the app (no Cloudflare tunnel)
docker compose up -d --build

# Start with Cloudflare tunnel (add CLOUDFLARE_TUNNEL_TOKEN to .env first)
docker compose --profile production up -d --build

# View logs
docker compose logs -f crm-backend
docker compose logs -f crm-frontend

# Stop everything
docker compose down

# Stop and destroy database volume (⚠️ deletes all data)
docker compose down -v
```

## Environment Variables

| Variable                  | Default               | Description                                           |
|---------------------------|-----------------------|-------------------------------------------------------|
| `POSTGRES_PASSWORD`       | `SecurePassword123`   | PostgreSQL password — **change in prod**              |
| `CLOUDFLARE_TUNNEL_TOKEN` | (none)                | Required for `--profile production`                   |
| `GOOGLE_CLIENT_ID`        | (none)                | OAuth 2.0 Client ID from Google Cloud Console         |
| `GOOGLE_CLIENT_SECRET`    | (none)                | OAuth 2.0 Client Secret from Google Cloud Console     |
| `GOOGLE_REDIRECT_URI`     | (none)                | Must match URI registered in Google Cloud Console     |
| `PUBLIC_URL`              | (none)                | Publicly reachable base URL — used for tracking pixel |
| `GMAIL_SYNC_INTERVAL_MS`  | `300000`              | Inbox sync interval in ms (default 5 minutes)         |

`GOOGLE_REDIRECT_URI` depends on environment — all registered URIs must be added to Google Cloud Console:

| Environment | Value |
|---|---|
| Local Docker | `http://localhost/api/gmail/callback` |
| Local Vite dev server | `http://localhost:5173/api/gmail/callback` |
| Production | `https://crm.yourcompany.com/api/gmail/callback` |

`PUBLIC_URL` should be `http://localhost` for local testing (send works; open tracking requires a public URL).

## Database Migrations

Migrations live in `backend/src/migrations/` and run automatically on every backend startup. Add new migrations as sequentially numbered SQL files: `002_add_feature.sql`, `003_...`, etc.

The migration runner reads files alphabetically, so naming is important.

## API Endpoints

Base URL: `http://localhost:3001/api` (dev) or via nginx proxy in Docker

### Contacts
| Method | Path              | Description                     |
|--------|-------------------|---------------------------------|
| GET    | /contacts         | List all; `?search=` for filter |
| GET    | /contacts/:id     | Single contact with deals+timeline |
| POST   | /contacts         | Create contact                  |
| PUT    | /contacts/:id     | Update contact                  |
| DELETE | /contacts/:id     | Delete contact                  |

### Deals
| Method | Path              | Description                     |
|--------|-------------------|---------------------------------|
| GET    | /deals            | List all; `?contact_id=` filter |
| GET    | /deals/stats      | Aggregate stats for dashboard   |
| GET    | /deals/:id        | Single deal                     |
| POST   | /deals            | Create deal                     |
| PUT    | /deals/:id        | Full update                     |
| PATCH  | /deals/:id/stage  | Move to new stage (Kanban drop) |
| DELETE | /deals/:id        | Delete deal                     |

### Interactions
| Method | Path                  | Description                       |
|--------|-----------------------|-----------------------------------|
| GET    | /interactions         | List; `?contact_id=` & `?limit=`  |
| POST   | /interactions         | Create interaction                |
| DELETE | /interactions/:id     | Delete interaction                |

### Gmail OAuth
| Method | Path                 | Description                                        |
|--------|----------------------|----------------------------------------------------|
| GET    | /gmail/status        | Returns `{ connected, email? }`                    |
| GET    | /gmail/auth          | Redirects browser to Google consent screen         |
| GET    | /gmail/callback      | OAuth callback — exchanges code, stores tokens     |
| DELETE | /gmail/disconnect    | Revokes token and clears stored credentials        |

### Email
| Method | Path                    | Description                                    |
|--------|-------------------------|------------------------------------------------|
| POST   | /email/send             | Send email via Gmail; auto-logs to timeline    |
| GET    | /email/templates        | List all email templates                       |
| POST   | /email/templates        | Create template                                |
| PUT    | /email/templates/:id    | Update template                                |
| DELETE | /email/templates/:id    | Delete template                                |

### Open Tracking
| Method | Path              | Description                                         |
|--------|-------------------|-----------------------------------------------------|
| GET    | /track/:pixelId   | Serves 1×1 GIF; records open on matching interaction |

### Health
| Method | Path        | Description          |
|--------|-------------|----------------------|
| GET    | /api/health | Service health check |

## Frontend Architecture

```
src/
├── components/
│   ├── Layout.tsx              App shell (sidebar + outlet)
│   ├── contacts/
│   │   ├── ContactCard.tsx     Grid card with edit/view actions
│   │   └── ContactModal.tsx    Create/Edit form modal
│   ├── email/
│   │   └── ComposeModal.tsx    Email compose window with template picker
│   ├── pipeline/
│   │   ├── DealCard.tsx        Sortable Kanban card (@dnd-kit)
│   │   ├── DealModal.tsx       New deal form modal
│   │   └── PipelineColumn.tsx  Droppable stage column
│   └── timeline/
│       ├── Timeline.tsx        Chronological interaction list (with open tracking badges)
│       └── InteractionForm.tsx Inline log-new-interaction form
├── pages/
│   ├── DashboardPage.tsx       Stats + recent activity
│   ├── ContactsPage.tsx        Search + contact grid
│   ├── ContactDetailPage.tsx   Contact profile + tabs (with Send Email button)
│   ├── PipelinePage.tsx        Full Kanban board with DnD
│   └── SettingsPage.tsx        Gmail connection + email template management
├── lib/
│   └── api.ts                  Typed Axios wrappers for all endpoints
└── types/
    └── index.ts                Shared TypeScript interfaces
```

## Adding New Features

1. Add a migration file in `backend/src/migrations/` if DB changes needed
2. Add route handlers in `backend/src/routes/`
3. Register the router in `backend/src/index.ts`
4. Add typed API wrappers in `frontend/src/lib/api.ts`
5. Update `frontend/src/types/index.ts` with new interfaces
6. Build the UI components and pages
7. Update `UserGuide.md` and `Brochure.md` to reflect new functionality

## Production Checklist

- [ ] Change `POSTGRES_PASSWORD` in `.env` to a strong random string
- [ ] Set `CLOUDFLARE_TUNNEL_TOKEN` in `.env`
- [ ] Configure Cloudflare Tunnel to route `crm.yourcompany.com → http://crm-frontend:80`
- [ ] Enable Cloudflare Access policy to restrict who can reach the tunnel
- [ ] Run `docker compose --profile production up -d --build`
- [ ] Verify `https://crm.yourcompany.com/api/health` returns `{"status":"ok"}`

### Gmail Integration (additional)
- [ ] Create a Google Cloud project and enable the Gmail API
- [ ] Create an OAuth 2.0 Client ID (Web application type)
- [ ] Register both dev and prod redirect URIs in Google Cloud Console
- [ ] Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `PUBLIC_URL` in `.env`
- [ ] Connect Gmail account via Settings → Gmail in the CRM UI
- [ ] Send a test email and verify it appears on the contact's timeline
