# The Hestia Suite

## Your Sales Pipeline. Your Server. Your Rules.

---

The Hestia Suite is a lightweight, self-hosted CRM built for small, focused sales teams. It gives you everything you need to manage relationships and close deals — without monthly subscriptions, data stored on someone else's servers, or feature bloat designed for a 500-person enterprise.

---

## Who It's For

The Hestia Suite is purpose-built for **teams of 1–10 people** who want:

- Full ownership of their sales data
- A clean, fast tool with no unnecessary complexity
- Zero ongoing hosting costs
- Access from anywhere in the world — securely

---

## Key Features

### Contacts at Your Fingertips
Search, browse, and manage your entire contact base in seconds. Each contact has a full profile — company, title, email, phone — plus flexible tags so you can segment however you work. Every conversation is one click away.

### Pipeline Board — See the Whole Picture
A beautiful, drag-and-drop Kanban board across six stages: **Lead → Qualified → Proposal → Negotiation → Closed Won → Closed Lost**. Drag a card to move it. See the value and deal count at the top of every column. Know exactly where every opportunity stands, at a glance.

### Interaction Timelines — Never Lose Context
Log every call, email, note, and meeting against a contact. See the full chronological history the moment you open their profile. Link interactions to specific deals so you always know what was said, when, and about what.

### Live Dashboard
Open the app to an instant snapshot of your sales health: contacts in the system, open deals, total pipeline value, and deals won. The recent activity feed surfaces the latest touchpoints across your whole team.

---

## The Self-Hosted Advantage

| Feature | The Hestia Suite | Typical SaaS CRM |
|---------|-----------------|-----------------|
| Monthly cost | **$0** | $25–$150/user/month |
| Your data on your server | **Yes** | No |
| Works on local network | **Yes** | No |
| Customisable | **Fully** | Limited |
| Vendor lock-in | **None** | High |
| Scales to enterprise | Not the goal | Yes |

---

## How It Works

The Hestia Suite runs as a set of Docker containers on a standard Ubuntu server — a machine you already own or a low-cost VPS. A Cloudflare Zero Trust Tunnel creates a secure, encrypted bridge between your server and the internet, so your team can access the CRM from their phones, laptops, or home computers without opening any firewall ports.

**Setup is straightforward:**
1. Install Docker on your Ubuntu machine
2. Clone the repository
3. Set your password and Cloudflare tunnel token
4. Run one command: `docker compose --profile production up -d --build`

Within 60 seconds, your team has a fully operational CRM at `https://crm.yourcompany.com`.

---

## Technology

Built with modern, proven technology:

- **React + Vite** — fast, responsive user interface
- **Node.js + Express** — lightweight, reliable API
- **PostgreSQL** — battle-tested relational database
- **Docker** — consistent, reproducible deployment
- **Cloudflare Tunnel** — enterprise-grade security, zero cost

---

## What "Hestia" Means

In Greek mythology, Hestia is the goddess of the hearth — the keeper of the home fire that sustains the household. The Hestia Suite keeps your business relationships warm: tracking every conversation, every deal, and every follow-up so nothing falls through the cracks.

---

*The Hestia Suite — v1.0 — Self-hosted CRM for focused teams.*
