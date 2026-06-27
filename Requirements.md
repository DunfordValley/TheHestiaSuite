# The Hestia Suite — Requirements Reference

*Derived from: "Requirements for CRM Build - V1.0.pdf"*
*Document version: 1.0 | Status: Implemented*

---

## 1. Hardware Requirements (Host Machine)

Target audience: 1–10 concurrent users. Resource footprint is minimal.

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Processor | 4-core (Intel Core i5/i7 or AMD Ryzen/EPYC) | Same |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB SSD/NVMe | 100 GB+ NVMe |
| OS | Ubuntu 24.04 LTS Server | Ubuntu 24.04 LTS Desktop (if GUI preferred) |

> HDDs are not recommended — PostgreSQL query performance degrades noticeably on spinning disk.

---

## 2. Software & Account Prerequisites

### Required Accounts (all free tiers)

| Account | Purpose |
|---------|---------|
| **GitHub** | Source code repository; CI/CD bridge |
| **Cloudflare** | Zero Trust Tunnel for secure public access; custom domain DNS |
| **Google Cloud Console** | OAuth 2.0 credentials for Gmail integration |
| **Supabase** *(optional)* | Cloud-managed PostgreSQL alternative to local Docker DB |

### Custom Domain

A domain (e.g., `yourcompany.com`) must be pointed to Cloudflare's nameservers so the tunnel can serve `crm.yourcompany.com`.

### Ubuntu Server Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

---

## 3. Architecture Blueprint

### Application Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React (TypeScript) |
| Backend API | Node.js + Express (TypeScript) |
| Database | PostgreSQL 16 |
| Container orchestration | Docker Compose |
| Secure tunnel | Cloudflare cloudflared (Zero Trust) |

### Service Topology

```
Internet
   │
   ▼
Cloudflare Zero Trust Tunnel (cloudflared)
   │
   ▼  [internal Docker network: crm-net]
crm-frontend (nginx, port 80)
   │  proxies /api/*
   ▼
crm-backend (Node/Express, port 3001)
   │
   ▼
crm-db (PostgreSQL 16, port 5432 — internal only)
```

No host ports are exposed externally. All traffic flows through the encrypted Cloudflare tunnel.

### Docker Compose Services

| Service | Container | Image / Build |
|---------|-----------|---------------|
| `crm-frontend` | `crm_frontend` | `./frontend/Dockerfile` (nginx + built React app) |
| `crm-backend` | `crm_backend` | `./backend/Dockerfile` (Node.js API) |
| `crm-db` | `crm_database` | `postgres:16-alpine` |
| `cloudflare-tunnel` | `cloudflare_tunnel` | `cloudflare/cloudflared:latest` *(production profile only)* |

---

## 4. Functional Requirements

### 4.1 Contacts Module
- List all contacts with search/filter by name, email, company
- Create, read, update, delete (CRUD) individual contacts
- Fields: name, email, phone, company, job title, tags (multi-value)
- Timestamps: created_at, updated_at

### 4.2 Pipeline Module
- Kanban board view with six stages: Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
- Drag-and-drop cards between columns to change deal stage (persisted to database)
- Reorder cards within a column
- Per-column deal count and total value display
- Deal fields: title, contact (linked), stage, value, close date, notes

### 4.3 Interaction Timeline Module
- Per-contact chronological activity log
- Interaction types: call, email, note, meeting
- Optional link to a specific deal
- Create and delete interactions
- Dashboard feed shows most recent interactions across all contacts

### 4.4 Dashboard
- Aggregate stats: total contacts, open deal count, pipeline value, deals won
- Recent activity feed (last 10 interactions, cross-contact)

### 4.5 Email Integration Module
- Gmail OAuth 2.0 connection — user authorises CRM access to their Gmail account
- Send emails directly from a contact's profile; sent emails auto-logged as interactions
- Email templates with `{name}` and `{company}` placeholder substitution
- Gmail inbox sync — background poll every 5 minutes; emails to/from known contacts auto-logged on their timelines
- Open tracking — 1×1 tracking pixel embedded in sent emails; timeline shows "Opened" badge, open count, and timestamp
- Settings page: Gmail connect/disconnect, template CRUD, last-synced timestamp
- BCC-to-CRM logging deferred to v2 (covered by inbox sync for v1)

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Concurrent users | 1–10 |
| Availability | Self-managed; restart policy `always` in Docker |
| Data persistence | Named Docker volume (`postgres_data`) survives restarts |
| Access control | Cloudflare Access policy (outside-office access) |
| Encryption in transit | Cloudflare tunnel (TLS 1.3) |
| Encryption at rest | OS-level (Ubuntu full-disk encryption recommended) |
| Hosting cost | $0/month ongoing (self-hosted) |
| Browser support | Modern evergreen browsers (Chrome, Firefox, Safari, Edge) |
| Responsive design | Tablet (768px+) and desktop |

---

## 6. Deployment Workflow

### Step A: Build

Clone the repository onto the Ubuntu host:

```bash
git clone https://github.com/yourusername/TheHestiaSuite.git /home/ubuntu/crm
cd /home/ubuntu/crm
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and CLOUDFLARE_TUNNEL_TOKEN
```

### Step B: Set Up Cloudflare Tunnel

1. Log in to Cloudflare Dashboard → **Zero Trust → Networks → Tunnels**
2. Create a tunnel named `ubuntu-crm`
3. Copy the tunnel token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`
4. In the tunnel dashboard, add a public hostname:
   - Hostname: `crm.yourcompany.com`
   - Service: `http://crm-frontend:80`

### Step C: Launch

```bash
# Without Cloudflare tunnel (LAN access only)
sudo docker compose up -d --build

# With Cloudflare tunnel (internet access)
sudo docker compose --profile production up -d --build
```

The full stack is live within 60 seconds.

### Verify

```bash
# Check all containers running
sudo docker compose ps

# Check backend health
curl http://localhost:3001/api/health
```

---

## 6b. Environment Variables

| Variable                  | Required  | Description                                        |
|---------------------------|-----------|----------------------------------------------------|
| `POSTGRES_PASSWORD`       | Always    | PostgreSQL password                                |
| `CLOUDFLARE_TUNNEL_TOKEN` | Prod only | Activates `--profile production`                   |
| `GOOGLE_CLIENT_ID`        | Email     | OAuth 2.0 Client ID from Google Cloud Console      |
| `GOOGLE_CLIENT_SECRET`    | Email     | OAuth 2.0 Client Secret from Google Cloud Console  |
| `GOOGLE_REDIRECT_URI`     | Email     | Registered redirect URI (dev and prod differ)      |
| `PUBLIC_URL`              | Email     | Publicly reachable base URL for open tracking pixel |

---

## 7. Database Schema

### contacts
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | TEXT NOT NULL | |
| email | TEXT | |
| phone | TEXT | |
| company | TEXT | |
| title | TEXT | |
| tags | TEXT[] | Array of tag strings |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### deals
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| title | TEXT NOT NULL | |
| contact_id | INTEGER FK → contacts.id | ON DELETE SET NULL |
| stage | TEXT NOT NULL | Default: 'Lead' |
| value | NUMERIC(12,2) | |
| close_date | DATE | |
| notes | TEXT | |
| position | INTEGER | Sort order within stage |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### interactions
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| contact_id | INTEGER FK → contacts.id | ON DELETE CASCADE |
| deal_id | INTEGER FK → deals.id | ON DELETE SET NULL, nullable |
| type | TEXT NOT NULL | call, email, note, meeting |
| summary | TEXT NOT NULL | |
| occurred_at | TIMESTAMPTZ | Default: NOW() |
| created_at | TIMESTAMPTZ | Auto |
| gmail_message_id | TEXT | Unique; prevents duplicate sync imports |
| email_subject | TEXT | Subject line of sent/received email |
| email_to | TEXT | Recipient address |
| email_from | TEXT | Sender address |
| direction | TEXT | `sent` or `received` |
| source | TEXT | `manual`, `gmail_sent`, or `gmail_sync` |
| tracking_pixel_id | TEXT | UUID used for open tracking |
| open_count | INTEGER | Incremented on each pixel fetch |
| opened_at | TIMESTAMPTZ | Timestamp of first open |

### gmail_settings *(new — added in migration 002)*
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| gmail_email | TEXT | Connected Gmail address |
| access_token | TEXT | Current OAuth access token |
| refresh_token | TEXT | Long-lived refresh token |
| token_expiry | TIMESTAMPTZ | When the access token expires |
| history_id | TEXT | Gmail API history cursor |
| last_synced_at | TIMESTAMPTZ | Timestamp of most recent sync run |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### email_templates *(new — added in migration 002)*
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | TEXT NOT NULL | Display name for template picker |
| subject | TEXT NOT NULL | Supports `{name}`, `{company}` placeholders |
| body | TEXT NOT NULL | Supports `{name}`, `{company}` placeholders |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |
