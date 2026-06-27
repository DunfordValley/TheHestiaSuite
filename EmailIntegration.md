# The Hestia Suite — Gmail Integration: Implementation Plan

*Status: Planned | Target: v1.1*

---

## Overview

This document covers the end-to-end implementation plan for adding Gmail OAuth email integration to The Hestia Suite. The feature set is designed to match the core email capabilities of HubSpot for a single-user consulting practice.

### Features in scope (v1.1)

| Feature | Description |
|---|---|
| Gmail OAuth connection | Connect/disconnect Gmail account via OAuth 2.0 |
| Send from CRM | Compose and send emails from contact profiles; auto-logged to timeline |
| Email templates | Reusable templates with `{name}` / `{company}` placeholder substitution |
| Inbox sync | Background poll every 5 min; auto-log emails to/from known contacts |
| Open tracking | 1×1 pixel embedded in sent emails; "Opened" badge on timeline |

### Out of scope for v1.1

- **BCC-to-CRM logging** — requires a separate SMTP ingestion server (Mailgun Inbound, etc.), which is disproportionate for a single-user app. Inbox sync covers the same use case automatically.
- **Bulk email / sequences** — better served by a dedicated tool (e.g. Mailchimp).
- **Multi-user email accounts** — single-user architecture; one Gmail account connected per CRM instance.

---

## Critical Architectural Notes

**Migration runner re-executes every file on startup.** `backend/src/db/migrate.ts` reads all `.sql` files alphabetically and runs them on every container start. Every statement in new migration files must be fully idempotent: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`.

**OAuth callback is a browser redirect, not an XHR call.** The `/api/gmail/callback` route is reached via a browser navigation from Google, not an Axios call. In development, the redirect URI must point to the Vite dev server (`http://localhost:5173/api/gmail/callback`) so Vite proxies it to Express. In production, nginx already proxies `/api/` to the backend. Both URIs must be registered in Google Cloud Console.

**Single-row credential store.** The app has one user (Karen). OAuth tokens are stored in a single-row `gmail_settings` table — no session or auth middleware needed.

**Tracking pixel must be publicly reachable.** Gmail fetches tracking pixels through its own proxy servers from the public internet. The `PUBLIC_URL` env var must be the Cloudflare tunnel URL (or `http://localhost:3001` in dev for testing). `COALESCE(opened_at, NOW())` ensures the first-open timestamp is never overwritten by subsequent prefetches.

**`prompt: 'consent'` is mandatory on every auth URL.** Google only issues a `refresh_token` on the first authorisation for a given client ID + user pair, unless `prompt: 'consent'` is passed. Without it, reconnecting after a disconnect will succeed from Google's side but return no refresh token, breaking all API calls after the 1-hour access token expiry.

---

## Environment Variables

Add to `.env.example` and `.env`:

```env
# Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Production: https://crm.yourcompany.com/api/gmail/callback
# Development: http://localhost:5173/api/gmail/callback
GOOGLE_REDIRECT_URI=https://crm.yourcompany.com/api/gmail/callback

# Publicly reachable base URL — used to construct the tracking pixel URL
# Production: https://crm.yourcompany.com
# Development: http://localhost:3001
PUBLIC_URL=https://crm.yourcompany.com
```

Add to `docker-compose.yml` under `crm-backend` → `environment`:

```yaml
GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
PUBLIC_URL: ${PUBLIC_URL}
```

---

## Phase 1 — Database Migration

### New file: `backend/src/migrations/002_gmail.sql`

```sql
-- Gmail OAuth token store (single row per CRM instance)
CREATE TABLE IF NOT EXISTS gmail_settings (
  id             SERIAL PRIMARY KEY,
  gmail_email    TEXT,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  history_id     TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Reusable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend interactions with email-specific fields
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS gmail_message_id  TEXT,
  ADD COLUMN IF NOT EXISTS email_subject     TEXT,
  ADD COLUMN IF NOT EXISTS email_to          TEXT,
  ADD COLUMN IF NOT EXISTS email_from        TEXT,
  ADD COLUMN IF NOT EXISTS direction         TEXT,
  ADD COLUMN IF NOT EXISTS source            TEXT,
  ADD COLUMN IF NOT EXISTS tracking_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS open_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_at         TIMESTAMPTZ;

-- Prevents duplicate import of the same Gmail message during sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_gmail_message_id
  ON interactions (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;
```

**Column reference:**

| Column | Values | Notes |
|---|---|---|
| `direction` | `sent`, `received` | Relative to the CRM user |
| `source` | `manual`, `gmail_sent`, `gmail_sync` | How the interaction was created |
| `tracking_pixel_id` | UUID | Used to match the pixel fetch back to the interaction |
| `open_count` | integer | Increments on each pixel fetch |
| `opened_at` | timestamp | Set on first fetch only (`COALESCE`) |

The partial unique index on `gmail_message_id` allows `INSERT … ON CONFLICT DO NOTHING` as a safety net during sync, while permitting unlimited `NULL` values in the column (manually logged interactions have no Gmail message ID).

---

## Phase 2 — Backend Dependency

In `backend/package.json`, add to `dependencies`:

```json
"googleapis": "^144.0.0"
```

The `googleapis` package provides a typed Gmail API client and handles OAuth token refresh automatically, firing a `'tokens'` event when it refreshes so the new access token can be persisted without manual expiry tracking.

---

## Phase 3 — Backend Service Layer

### New file: `backend/src/services/gmail.ts`

Owns all OAuth2 client construction and token persistence. Every route that needs to make Gmail API calls imports from here.

**Exports:**

- `getOAuthClient()` — constructs a fresh `google.auth.OAuth2` instance from env vars. Stateless.
- `getStoredTokens()` — `SELECT * FROM gmail_settings LIMIT 1`. Returns `null` if not connected.
- `saveTokens(data: Partial<TokenRow>)` — upserts the single `gmail_settings` row.
- `getAuthenticatedGmailClient()` — fetches stored tokens, throws `Error('Gmail not connected')` if no refresh token, sets credentials, registers a `'tokens'` listener to auto-persist refreshed tokens, returns a `google.gmail({ version: 'v1', auth })` instance.
- `clearTokens()` — `DELETE FROM gmail_settings`. Called on disconnect.

### New file: `backend/src/services/emailSync.ts`

**Exports:**

- `syncGmailInbox()` — async, returns void. All errors are caught and logged internally so a failing sync never crashes the server.
- `startSyncPoller(intervalMs = 300_000)` — schedules an initial sync 5 seconds after startup, then on the configured interval. Interval is configurable via `GMAIL_SYNC_INTERVAL_MS` env var.

**`syncGmailInbox()` logic:**

1. Call `getStoredTokens()`. If no `refresh_token`, return immediately (Gmail not yet connected — normal state before setup).
2. Fetch all contacts with a non-null email: `SELECT id, name, email FROM contacts WHERE email IS NOT NULL`. Build a `Map<lowercased_email, ContactRow>`.
3. Determine `after` epoch: use `settings.last_synced_at` if present, otherwise 7 days ago. Construct Gmail query: `` `after:${epochSeconds}` ``.
4. Call `gmail.users.messages.list({ userId: 'me', q, maxResults: 100 })`.
5. For each `{ id: messageId }`:
   - Skip if already logged: `SELECT id FROM interactions WHERE gmail_message_id = $1`.
   - Fetch metadata headers only: `gmail.users.messages.get({ format: 'metadata', metadataHeaders: ['From','To','Subject','Date'] })`.
   - Parse `From` and `To` to bare email addresses. Match against contacts map to determine `contact_id` and `direction`.
   - If no contact match, skip.
   - Insert: `INSERT INTO interactions … ON CONFLICT (gmail_message_id) DO NOTHING`.
6. Update `last_synced_at` in `gmail_settings`.

**Gmail API quota:** `messages.list` = 5 units, `messages.get` = 5 units. At 5-minute intervals with a typical 0–20 new messages per poll: ~4,800 units/day against a 1-billion free quota. Negligible impact.

---

## Phase 4 — Backend Routes

### New file: `backend/src/routes/gmail.ts`

Mounted at `app.use('/api/gmail', gmailRouter)`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/status` | Returns `{ connected: boolean, email?: string }` |
| `GET` | `/auth` | Generates consent URL with `access_type: 'offline'`, `prompt: 'consent'`; redirects browser to Google |
| `GET` | `/callback` | Exchanges auth code for tokens; fetches `userinfo.email`; calls `saveTokens()`; redirects to `/settings?gmail=connected` (or `?gmail=error`) |
| `DELETE` | `/disconnect` | Revokes token (best-effort), calls `clearTokens()`, returns `{ disconnected: true }` |

### New file: `backend/src/routes/email.ts`

Mounted at `app.use('/api/email', emailRouter)`.

#### `POST /send`

Request body:
```json
{
  "contact_id": 4,
  "deal_id": 2,
  "to": "alice@acmecorp.com",
  "subject": "Following up on the proposal",
  "body": "Hi Alice,\n\nJust checking in..."
}
```

Logic:
1. Validate required fields (`contact_id`, `to`, `subject`, `body`).
2. Confirm Gmail is connected — return `400` if not.
3. Generate `trackingPixelId = crypto.randomUUID()`.
4. Append tracking pixel `<img>` tag to body (HTML email).
5. Build RFC 2822 raw email string; base64url-encode.
6. Call `gmail.users.messages.send()`. Store returned Gmail message ID.
7. Insert interaction row with `source = 'gmail_sent'`, `direction = 'sent'`, `tracking_pixel_id`.
8. Return `201` with the new interaction.

#### Template CRUD

| Method | Path | Description |
|---|---|---|
| `GET` | `/templates` | List all, ordered by name |
| `POST` | `/templates` | Create — `{ name, subject, body }` required |
| `PUT` | `/templates/:id` | Update — 404 if not found |
| `DELETE` | `/templates/:id` | Delete — returns `{ deleted: true }` |

### New file: `backend/src/routes/tracking.ts`

Mounted at `app.use('/api/track', trackingRouter)`.

#### `GET /:pixelId`

```sql
UPDATE interactions
SET open_count = open_count + 1,
    opened_at  = COALESCE(opened_at, NOW())
WHERE tracking_pixel_id = $1
```

Always returns a 1×1 transparent GIF (`Content-Type: image/gif`, `Cache-Control: no-store`), regardless of whether the pixel ID matched any row. Unrecognised IDs update zero rows — no error response.

---

## Phase 5 — Update `backend/src/index.ts`

```typescript
import gmailRouter    from './routes/gmail';
import emailRouter    from './routes/email';
import trackingRouter from './routes/tracking';
import { startSyncPoller } from './services/emailSync';

// After existing router mounts:
app.use('/api/gmail',    gmailRouter);
app.use('/api/email',    emailRouter);
app.use('/api/track',    trackingRouter);

// Inside start(), after runMigrations():
startSyncPoller();
```

---

## Phase 6 — Frontend Types

### Modified: `frontend/src/types/index.ts`

Extend the existing `Interaction` interface with optional email fields (nullable in DB):

```typescript
export interface Interaction {
  // ... existing fields unchanged ...
  gmail_message_id?: string | null;
  email_subject?:    string | null;
  email_to?:         string | null;
  email_from?:       string | null;
  direction?:        'sent' | 'received' | null;
  source?:           'manual' | 'gmail_sent' | 'gmail_sync' | null;
  tracking_pixel_id?: string | null;
  open_count?:       number;
  opened_at?:        string | null;
}

export interface GmailStatus {
  connected: boolean;
  email?: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailPayload {
  contact_id: number;
  deal_id?: number | null;
  to: string;
  subject: string;
  body: string;
}
```

---

## Phase 7 — Frontend API Layer

### Modified: `frontend/src/lib/api.ts`

```typescript
// Gmail status
export const fetchGmailStatus = () =>
  api.get<GmailStatus>('/gmail/status').then(r => r.data);

export const disconnectGmail = () =>
  api.delete('/gmail/disconnect').then(r => r.data);

// Email sending
export const sendEmail = (data: SendEmailPayload) =>
  api.post<Interaction>('/email/send', data).then(r => r.data);

// Templates
export const fetchTemplates = () =>
  api.get<EmailTemplate[]>('/email/templates').then(r => r.data);

export const createTemplate = (data: Pick<EmailTemplate, 'name' | 'subject' | 'body'>) =>
  api.post<EmailTemplate>('/email/templates', data).then(r => r.data);

export const updateTemplate = (id: number, data: Pick<EmailTemplate, 'name' | 'subject' | 'body'>) =>
  api.put<EmailTemplate>(`/email/templates/${id}`, data).then(r => r.data);

export const deleteTemplate = (id: number) =>
  api.delete(`/email/templates/${id}`).then(r => r.data);
```

---

## Phase 8 — Frontend Components and Pages

### New file: `frontend/src/pages/SettingsPage.tsx`

Two sections:

**Gmail Connection**
- `useQuery(['gmail-status'], fetchGmailStatus)`
- Reads `?gmail=connected` / `?gmail=error` from URL on mount for one-time banner; clears query param via `useNavigate` after reading.
- Not connected: "Connect Gmail" renders as `<a href="/api/gmail/auth">` (full browser navigation — not Axios).
- Connected: green badge with email address + "Disconnect" button.
- Disconnect: `useMutation(disconnectGmail)` → `invalidateQueries(['gmail-status'])`.

**Email Templates**
- `useQuery(['email-templates'], fetchTemplates)`
- List of templates with Edit and Delete per row.
- "New Template" button opens inline form (or modal matching `ContactModal` pattern).
- Fields: Template Name, Subject, Body (textarea). Placeholder hint shown below body field.
- Create/update/delete mutations each invalidate `['email-templates']`.

### New file: `frontend/src/components/email/ComposeModal.tsx`

Follows the same fixed-overlay pattern as `ContactModal.tsx`.

Props: `{ contact: Contact; onClose: () => void }`

State: `to` (pre-filled from `contact.email`, readonly), `subject`, `body`, `selectedTemplateId`

- Template picker `<select>`: on selection, sets `subject` and `body` with placeholder substitution applied (`{name}` → `contact.name`, `{company}` → `contact.company ?? ''`).
- Send: `useMutation(sendEmail)` → on success, `invalidateQueries(['contact', contact.id])` + `onClose()`.
- Error: red error paragraph below the form.

### Modified: `frontend/src/pages/ContactDetailPage.tsx`

1. Add `useQuery(['gmail-status'], fetchGmailStatus)`.
2. Add `const [composing, setComposing] = useState(false)`.
3. In the contact header button group: render `<button onClick={() => setComposing(true)}>Send Email</button>` (with `Send` icon from lucide-react) when `gmailStatus?.connected && contact.email`.
4. At the bottom of JSX: `{composing && <ComposeModal contact={contact} onClose={() => setComposing(false)} />}`.

### Modified: `frontend/src/components/timeline/Timeline.tsx`

For interactions where `source` is `gmail_sent` or `gmail_sync`:
- Show `email_subject` as italic subtitle below the type label.
- Show open tracking status:
  - `open_count > 0`: green "Opened · N×" badge with `Eye` icon + formatted `opened_at`.
  - `source === 'gmail_sent'` and no opens: muted "Not opened yet".
- Synced interactions (`source === 'gmail_sync'`): small "Synced" pill badge next to type label.

---

## Phase 9 — Routing and Navigation

### Modified: `frontend/src/App.tsx`

```typescript
import SettingsPage from './pages/SettingsPage';
// Inside Routes:
<Route path="/settings" element={<SettingsPage />} />
```

### Modified: `frontend/src/components/Layout.tsx`

Add Settings nav item using the `Settings` icon from lucide-react, pointing to `/settings`.

---

## Implementation Phases

| Phase | Work | Estimate |
|---|---|---|
| **A — Infrastructure** | `002_gmail.sql` migration; `googleapis` install; `gmail.ts` service; `/api/gmail/status` route; mount in `index.ts` | ½ day |
| **B — OAuth Flow** | Google Cloud Console setup; `/auth` + `/callback` + `/disconnect` routes; end-to-end token storage test | ½ day |
| **C — Settings UI** | `SettingsPage.tsx`; `/settings` route; nav item; connect/disconnect flow | ½ day |
| **D — Send Email** | `/email/send` endpoint; `ComposeModal.tsx`; Send Email button on contact profiles | 1 day |
| **E — Templates** | Template CRUD endpoints; template section in Settings; template picker in compose modal | ½ day |
| **F — Open Tracking** | `tracking.ts` route; pixel embed in send; open badge on timeline | ½ day |
| **G — Inbox Sync** | `emailSync.ts` service; `startSyncPoller()` in `index.ts`; Synced badge on timeline | 1 day |

**Total: ~4.5 days**

Phases A → B → C must be done in sequence (each depends on the previous). Phases D, E, F, G can each begin after C is complete and are largely independent of one another.

---

## Risks and Gotchas

**Refresh token issued only once without `prompt: 'consent'`.** Always include `prompt: 'consent'` and `access_type: 'offline'` on the auth URL. Without it, reconnecting after a disconnect returns a valid access token but no refresh token, causing all API calls to silently fail after one hour.

**Dev and prod require separate redirect URIs.** Register both `http://localhost:5173/api/gmail/callback` (dev) and the production Cloudflare URL in Google Cloud Console. Using the wrong one in `.env` will cause the OAuth callback to fail with a redirect_uri_mismatch error.

**No Google app verification needed.** Because Karen is the only user, the app can remain in "Testing" mode in Google Cloud Console indefinitely. Add her Gmail address as an authorised test user.

**OAuth tokens are stored as plaintext in PostgreSQL.** Acceptable for a self-hosted single-user instance on an internal Docker network. Consistent with the existing trust model (`.env` already contains secrets). If encryption at rest is added to the DB in a future version, tokens should be revisited.

**Gmail image proxy and open tracking.** Gmail routes image fetches through its own servers — Karen's IP is never recorded; Google's proxy IP is. Gmail may also prefetch images speculatively. `COALESCE(opened_at, NOW())` prevents overwriting the first-open timestamp; `open_count` accumulates for analytical completeness.

**Inbox sync matches on exact email only.** The sync compares the Gmail `From`/`To` header against `contacts.email` (case-insensitive). If a contact uses multiple email addresses, only the one stored in the CRM is matched. Known v1 limitation.

**Migration runner has no file-level guard.** The runner re-executes every SQL file on every startup. `002_gmail.sql` must be fully idempotent — `IF NOT EXISTS` on every DDL statement. A `schema_migrations` tracking table would solve this properly but is a separate task.

---

## File Inventory

### New backend files
| File | Purpose |
|---|---|
| `backend/src/migrations/002_gmail.sql` | DB schema additions |
| `backend/src/services/gmail.ts` | OAuth client, token persistence |
| `backend/src/services/emailSync.ts` | Background inbox sync |
| `backend/src/routes/gmail.ts` | OAuth endpoints |
| `backend/src/routes/email.ts` | Send + template CRUD |
| `backend/src/routes/tracking.ts` | Open tracking pixel |

### Modified backend files
| File | Change |
|---|---|
| `backend/src/index.ts` | Mount 3 new routers; call `startSyncPoller()` |
| `backend/package.json` | Add `googleapis` dependency |
| `docker-compose.yml` | Add 4 env vars to `crm-backend` |
| `.env.example` | Document new env vars |

### New frontend files
| File | Purpose |
|---|---|
| `frontend/src/pages/SettingsPage.tsx` | Gmail connect + template management |
| `frontend/src/components/email/ComposeModal.tsx` | Email compose window |

### Modified frontend files
| File | Change |
|---|---|
| `frontend/src/types/index.ts` | Extend `Interaction`; add `GmailStatus`, `EmailTemplate`, `SendEmailPayload` |
| `frontend/src/lib/api.ts` | Add Gmail, email, template API functions |
| `frontend/src/App.tsx` | Add `/settings` route |
| `frontend/src/components/Layout.tsx` | Add Settings nav item |
| `frontend/src/pages/ContactDetailPage.tsx` | Add Send Email button + `ComposeModal` |
| `frontend/src/components/timeline/Timeline.tsx` | Add open tracking badges + email metadata |
