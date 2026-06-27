# The Hestia Suite — User Guide

Welcome to The Hestia Suite, your team's self-hosted CRM. This guide covers everything you need to manage contacts, track deals, and log interactions.

---

## Getting Started

Open your browser and navigate to your team's CRM address (e.g., `https://crm.yourcompany.com`). You will see the **Dashboard** — your home base showing a live summary of your sales activity.

No login is required on the local network; access control is handled at the Cloudflare tunnel level by your administrator.

---

## Dashboard

The dashboard gives you an at-a-glance view of the whole pipeline:

| Card | What it shows |
|------|---------------|
| **Total Contacts** | How many contacts are in the system |
| **Open Deals** | Deals not yet closed (won or lost) |
| **Pipeline Value** | Total £/$ value of all open deals |
| **Deals Won** | Count of successfully closed deals |

Below the stats, **Recent Activity** shows the latest 10 interactions logged across all contacts — calls, emails, notes, and meetings.

Click any contact name in the activity feed to jump directly to their profile.

---

## Contacts

### Viewing Contacts

Click **Contacts** in the left sidebar. You will see a grid of contact cards showing each person's name, job title, company, email, phone, and any tags assigned to them.

### Searching

Use the search bar at the top to filter contacts by name, email address, or company. The list updates as you type.

### Adding a Contact

1. Click the **Add Contact** button (top right).
2. Fill in the form:
   - **Full Name** (required)
   - Email, Phone, Company, Job Title (all optional but recommended)
   - **Tags**: comma-separated labels, e.g. `enterprise, warm, decision-maker`
3. Click **Create Contact**.

### Editing a Contact

On any contact card, click **Edit** to open the edit form. Make your changes and click **Save Changes**.

### Viewing a Contact's Full Profile

Click **View →** on a contact card (or any contact name link throughout the app) to open their full profile page. This page has two tabs:

- **Timeline** — Every interaction logged with this contact
- **Deals** — All deals associated with this contact and their current stages

### Deleting a Contact

Open the contact's profile page and click **Delete**. You will be asked to confirm. Deleting a contact also removes all their interaction history. Linked deals are kept but the contact link is cleared.

---

## Pipeline

The Pipeline is a **Kanban board** showing all your deals across six stages:

| Stage | Meaning |
|-------|---------|
| **Lead** | An unqualified prospect — earliest stage |
| **Qualified** | You've confirmed they have budget and intent |
| **Proposal** | A formal proposal or quote has been sent |
| **Negotiation** | Active back-and-forth on terms |
| **Closed Won** | Deal signed — congratulations! |
| **Closed Lost** | Deal did not proceed |

Each column shows the number of deals and the total value at the top.

### Moving a Deal

**Drag a deal card** from one column and drop it onto another. The change is saved automatically. You can also reorder cards within the same column by dragging them up or down.

### Adding a Deal

- Click the **+ New Deal** button at the top right, or
- Click the **+** icon at the top of any column to create a deal pre-assigned to that stage.

Fill in the deal form:
- **Title** (required) — e.g. "Acme Corp Q3 Contract"
- **Contact** — link to an existing contact (optional)
- **Stage** — which column to place it in
- **Value** — expected deal value in dollars
- **Close Date** — your target close date
- **Notes** — any free-form context

---

## Interactions (Activity Timeline)

Every conversation, call, meeting, or note with a contact is logged as an **interaction** on their timeline.

### Logging an Interaction

1. Open a contact's profile page.
2. On the **Timeline** tab, click **Log an interaction**.
3. Choose the type:
   - **Call** — a phone call
   - **Email** — an email exchange
   - **Note** — any free-form note
   - **Meeting** — an in-person or video meeting
4. Optionally link the interaction to one of the contact's deals.
5. Write your summary in the text area.
6. Click **Save**.

The new interaction appears immediately at the top of the timeline.

### Deleting an Interaction

Click the trash icon on the right side of any timeline entry to remove it.

---

## Email

The Hestia Suite connects to your Gmail account so you can send emails, use templates, and automatically track email activity — all without leaving the CRM.

### Connecting Gmail

Before you can send emails, you need to connect your Gmail account:

1. Click **Settings** in the left sidebar.
2. Under **Gmail**, click **Connect Gmail**.
3. You will be redirected to Google — sign in and grant the CRM access to your Gmail account.
4. You will be returned to the Settings page with a green "Connected" badge showing your Gmail address.

To disconnect, click the **Disconnect** button on the Settings page.

### Sending an Email

1. Open a contact's profile page.
2. Click the **Send Email** button in the contact header (only visible when Gmail is connected and the contact has an email address).
3. The Compose window opens pre-filled with the contact's email address.
4. Optionally select a **template** from the dropdown — the subject and body will be filled in automatically, with `{name}` and `{company}` replaced with the contact's details.
5. Edit the subject and body as needed.
6. Click **Send**.

The email is sent from your Gmail account and immediately logged as an interaction on the contact's timeline.

### Email Open Tracking

When you send an email from the CRM, a small invisible tracking pixel is embedded. When the recipient opens the email, the timeline entry updates to show:

- A green **Opened** badge with the number of times the email has been opened
- The date and time of first open

If the email has not been opened yet, the entry shows **Not opened yet** in grey.

> Gmail's image proxy means the open timestamp reflects when Gmail fetched the image, which is typically within seconds of the email being opened.

### Email Templates

Templates let you save and reuse common email structures with personalisation placeholders.

**Creating a template:**
1. Go to **Settings → Email Templates**.
2. Click **New Template**.
3. Fill in a name, subject, and body. Use `{name}` and `{company}` as placeholders — they are replaced automatically when you compose.
4. Click **Save**.

**Editing or deleting:** click **Edit** or **Delete** next to any template in the list.

### Inbox Sync

The CRM quietly checks your Gmail inbox every 5 minutes. Any email sent to or received from a known contact's email address is automatically added to that contact's timeline — so your history stays complete even for emails you send directly from Gmail rather than from the CRM.

Synced entries are marked with a **Synced** badge on the timeline to distinguish them from emails sent within the CRM.

---

## Tips & Best Practices

- **Log interactions immediately** after a call or meeting — details fade fast.
- Use **tags** on contacts to quickly filter and segment your pipeline (e.g. `hot`, `warm`, `cold`, `enterprise`, `inbound`).
- Keep **deal values** updated — the Dashboard pipeline value is only as accurate as your data.
- Move deals through stages promptly — a stale pipeline is harder to read.
- Use the **Notes** field on deals to record key context: objections, decision criteria, competitors mentioned.

---

## Troubleshooting

**The page won't load**
- Check with your administrator that the server is running.
- On Ubuntu: `sudo docker compose ps` should show all containers as `Up`.

**Data I entered disappeared**
- This should not happen. Contact your administrator to check the database container logs: `sudo docker compose logs crm-backend`.

**I can't access the CRM from outside the office**
- The Cloudflare tunnel must be active. Ask your administrator to check: `sudo docker compose --profile production ps`.

**The Send Email button is not showing on a contact's profile**
- Check that Gmail is connected: go to **Settings** and confirm the green "Connected" badge is showing.
- Check that the contact has an email address on their profile. The button only appears when both conditions are met.

**I sent an email but it doesn't show on the timeline**
- Refresh the page. The interaction is logged immediately on send — if it's still missing, check the backend logs: `sudo docker compose logs crm-backend`.

**The "Opened" badge isn't appearing**
- Open tracking relies on the recipient's email client loading images. Some clients (and some Gmail settings) block remote images. If images are blocked, no open event is recorded.
- Also check that `PUBLIC_URL` in `.env` is set to the correct publicly reachable address — the tracking pixel must be fetchable from the internet.

**Inbox sync isn't picking up emails**
- The sync runs every 5 minutes. Wait a few minutes and refresh.
- Check that the contact's email address in the CRM exactly matches the address used in Gmail.
- Check the backend logs for sync errors: `sudo docker compose logs crm-backend`.
