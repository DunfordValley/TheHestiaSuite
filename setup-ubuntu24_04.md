# Ubuntu 24.04 LTS — Server Setup Guide for The Hestia Suite

This guide takes you from a fresh Ubuntu 24.04 LTS installation to a fully running Hestia Suite CRM, accessible by your whole team.

---

## 1. Initial Server Preparation

Log in to your Ubuntu machine and run the first-time update:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates
```

Add Docker's official apt repository (required for the Compose v2 plugin):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
```

Install Docker Engine and the Compose plugin:

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Add your user to the Docker group so you don't need `sudo` on every Docker command:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker is working:

```bash
docker run hello-world
docker compose version
```

---

## 2. Clone the Repository

```bash
git clone git@github.com:DunfordValley/TheHestiaSuite.git ~/hestia
cd ~/hestia
```

> If you're using HTTPS instead of SSH:
> ```bash
> git clone https://github.com/DunfordValley/TheHestiaSuite.git ~/hestia
> ```

---

## 3. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Set at minimum:

```env
# Change this to a strong random password — do not leave the default
POSTGRES_PASSWORD=YourStrongPasswordHere

# Only needed if you want internet access via Cloudflare tunnel (Step 6)
CLOUDFLARE_TUNNEL_TOKEN=YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 4. Build and Launch (LAN Access Only)

This starts the frontend, backend, and database — accessible on your local network:

```bash
docker compose up -d --build
```

Check that all containers started cleanly:

```bash
docker compose ps
```

You should see three containers with status `Up`:

```
NAME             STATUS
crm_frontend     Up
crm_backend      Up
crm_database     Up (healthy)
```

Verify the API is responding:

```bash
curl http://localhost/api/health
# Expected: {"status":"ok","service":"hestia-suite-api"}
```

Open a browser on any machine on the same network and navigate to:

```
http://<your-server-ip>
```

The Hestia Suite dashboard should load with demo data.

---

## 5. Find Your Server's IP Address

If you're unsure of the server's local IP:

```bash
ip a | grep 'inet ' | grep -v '127.0.0.1'
```

The address will look like `192.168.x.x` or `10.x.x.x`.

---

## 6. Internet Access via Cloudflare Zero Trust Tunnel (Optional)

This allows your team to reach the CRM from anywhere — no VPN, no open firewall ports.

### Prerequisites
- A Cloudflare account (free)
- A domain pointed to Cloudflare's nameservers (e.g., `yourcompany.com`)

### Steps

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Zero Trust → Networks → Tunnels**
3. Click **Create a tunnel** → name it `hestia-crm`
4. Copy the tunnel token shown on screen
5. Paste it into your `.env` file as `CLOUDFLARE_TUNNEL_TOKEN`
6. In the tunnel dashboard, click **Add a public hostname**:
   - **Subdomain:** `crm`
   - **Domain:** `yourcompany.com`
   - **Service type:** `HTTP`
   - **URL:** `crm-frontend:80`
7. Save the hostname

Then relaunch with the production profile:

```bash
docker compose --profile production up -d --build
```

A fourth container (`cloudflare_tunnel`) will start. Within 30 seconds, your team can access:

```
https://crm.yourcompany.com
```

Cloudflare handles TLS automatically — no certificate setup required.

### Restrict Access (Recommended)

In the Cloudflare dashboard, go to **Zero Trust → Access → Applications** and add an Access Policy for `crm.yourcompany.com` to restrict who can log in (e.g., by email address or Google Workspace domain).

---

## 7. Keeping the CRM Running After Reboots

The Docker containers already have `restart: always` configured, so they will restart automatically after a reboot. No further action needed.

To confirm:

```bash
sudo reboot
# wait ~60 seconds, then SSH back in
docker compose ps
```

All containers should be back up automatically.

---

## 8. Useful Management Commands

```bash
# View live logs from all containers
docker compose logs -f

# View logs from a specific container
docker compose logs -f crm-backend
docker compose logs -f crm-frontend

# Restart a single container
docker compose restart crm-backend

# Pull latest code and redeploy
git pull
docker compose up -d --build

# Stop everything (data is preserved)
docker compose down

# Stop everything AND delete the database (⚠️ destroys all data)
docker compose down -v
```

---

## 9. Gmail Integration Setup (Optional)

The Gmail integration requires a Google Cloud project and OAuth 2.0 credentials. This is a one-time setup performed by the administrator.

### Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with any Google account.
2. Click **Select a project → New Project**. Name it `Hestia CRM` (or similar).
3. In the left menu, go to **APIs & Services → Library**.
4. Search for **Gmail API** and click **Enable**.

### Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth 2.0 Client ID**.
3. If prompted, configure the OAuth consent screen first:
   - User Type: **External**
   - App name: `Hestia CRM`
   - User support email: your email
   - Add the Gmail address that will be used as an authorised test user
   - Scopes: add `gmail.send` and `gmail.readonly`
   - Save and return to Credentials.
4. Application type: **Web application**
5. Under **Authorised redirect URIs**, add both:
   - `http://localhost:5173/api/gmail/callback` (for local development)
   - `https://crm.yourcompany.com/api/gmail/callback` (your production domain)
6. Click **Create**. Copy the **Client ID** and **Client Secret**.

> The app does not need to be submitted for Google verification. You can leave it in "Testing" mode — add your Gmail address as a test user and it will work indefinitely for personal use.

### Step 3: Add Credentials to `.env`

```bash
nano ~/hestia/.env
```

Add these lines:

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://crm.yourcompany.com/api/gmail/callback
PUBLIC_URL=https://crm.yourcompany.com
```

Save and exit, then redeploy:

```bash
docker compose --profile production up -d --build
```

### Step 4: Connect Gmail in the CRM

1. Open the CRM in your browser.
2. Click **Settings** in the left sidebar.
3. Click **Connect Gmail** and complete the Google sign-in.
4. The Settings page will show a green "Connected" badge confirming the integration is active.

---

## 10. Firewall Configuration (Optional but Recommended)

If you want to lock down the server while still allowing web access:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> If using the Cloudflare tunnel for all external access, you can remove port 80/443 from the firewall and rely entirely on the tunnel — no ports need to be open to the internet at all.

---

## 11. Hardware Reference

| Component  | Minimum       | Recommended      |
|------------|---------------|------------------|
| CPU        | 4 cores       | 4+ cores         |
| RAM        | 8 GB          | 16 GB            |
| Storage    | 50 GB SSD     | 100 GB+ NVMe SSD |
| OS         | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Network    | 10 Mbps       | 100 Mbps+        |

---

## 12. Troubleshooting

**`docker compose ps` shows a container as `Restarting`**
Check its logs: `docker compose logs crm-backend`. The most common cause is the database not being ready — wait 30 seconds and check again.

**The page loads but shows no data**
The backend may still be running its database migrations. Wait 10–15 seconds and refresh.

**`curl http://localhost/api/health` returns `Connection refused`**
The frontend container may still be building. Run `docker compose logs crm-frontend` to check progress.

**Cloudflare tunnel container exits immediately**
Your `CLOUDFLARE_TUNNEL_TOKEN` in `.env` is missing or incorrect. Copy it again from the Cloudflare dashboard and run `docker compose --profile production up -d`.

**I need to reset the database to a clean state**
```bash
docker compose down -v
docker compose up -d --build
```
This deletes all data and re-seeds the demo data.
