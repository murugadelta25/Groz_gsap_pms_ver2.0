# Groz PMS v2.0 — Ubuntu IPC run steps

**Repository:** https://github.com/murugadelta25/Groz_gsap_pms_ver2.0.git  
**Branch:** `main`

This document is the runbook for the Ubuntu IPC. It covers first install next to EAP PMS, later updates (`git pull`), checks, and Feature Access Matrix (Monitor Mode / Site Admin).

| Service  | Port |
|----------|------|
| Backend  | 8010 |
| Frontend | 5174 |

Reuse the **existing MySQL database**. Do not create a new empty database if EAP PMS data must be kept.

Use a **new `CLIENT_NAME`** so systemd units do not clash with EAP PMS (for example `groz-gsap-backend` / `groz-gsap-frontend`).

Secrets (`deploy.env`, `database/db.config.json`, `backend/.env`) are gitignored. Do not commit them.

---

## A. First install (EAP PMS already on the IPC)

```bash
# 1. Stop the old EAP app so ports 8010 / 5174 are free
cd ~/EAP_PMS   # change if the EAP folder name differs
./run.sh stop

# If that folder is gone, stop by unit name:
# sudo systemctl list-units --type=service | grep -E 'backend|frontend'
# sudo systemctl stop <old-client>-backend <old-client>-frontend

# 2. Clone Groz v2.0 beside EAP (do not overwrite the EAP folder)
cd ~
git clone https://github.com/murugadelta25/Groz_gsap_pms_ver2.0.git
cd Groz_gsap_pms_ver2.0

# 3. Copy uploaded files (logos, part photos) from EAP
mkdir -p backend/static
cp -a ~/EAP_PMS/backend/static/. backend/static/   # skip if EAP path differs

# 4. Point at the SAME database, NEW client name
cp deploy.env.example deploy.env
nano deploy.env
```

Set at least:

```bash
CLIENT_NAME=groz-gsap
DB_USER=root
DB_PASS=<same MySQL password as EAP>
DB_NAME=<same database name as EAP>
BACKEND_PORT=8010
FRONTEND_PORT=5174
INSTALL_SYSTEMD=yes
```

Then:

```bash
chmod +x run.sh scripts/*.sh
./run.sh
```

On first run this:

1. Installs Python, Node.js, and MySQL client if missing
2. Creates the Python venv and runs `npm install`
3. Applies **additive** schema only (adds `site_admin` to `users.role`; does not wipe data)
4. Installs systemd units from `CLIENT_NAME`
5. Starts backend and frontend

---

## B. Already cloned — update only

```bash
cd ~/Groz_gsap_pms_ver2.0
git pull origin main
./run.sh preflight    # backup DB + apply new columns / ENUM
./run.sh restart
```

Do **not** overwrite `deploy.env`, `database/db.config.json`, or `backend/.env` after pull.

---

## Check it is up

```bash
cd ~/Groz_gsap_pms_ver2.0
./run.sh status
curl -s http://localhost:8010/health
curl -s http://localhost:8010/health/db
hostname -I
```

Open in a browser:

- `http://<IPC-IP>:5174`
- or `http://din.eappms` if nginx / LAN DNS is already configured

Logs:

```bash
./run.sh logs
# or
sudo journalctl -u groz-gsap-backend -u groz-gsap-frontend -f
```

Daily control:

```bash
./run.sh status
./run.sh stop
./run.sh restart
```

---

## After it is running — roles and Monitor Mode

1. Log in as **Super Admin** (`SuperAdmin` / `Password@123`) or **Admin**.
2. Open **Settings → Users → Feature Access Matrix**.
3. Confirm **Monitor Mode** is listed under Overview.
4. Tick Monitor Mode for **Site Admin** (and any other role that needs it).
5. If the shop login is `sie_admin`, edit that user and set role to **Site Admin**.
6. Click **Save access matrix**.
7. Log in as that user — only ticked pages appear in the sidebar; unticked pages are blocked.

Default Monitor Mode access:

| Role        | Monitor Mode default |
|-------------|----------------------|
| Super Admin | On                   |
| Admin       | On                   |
| Site Admin  | On                   |
| Other roles | Off until ticked     |

The matrix lists every page (Dashboard, overviews, production, QC, maintenance, alerts, operators, settings) plus action rows (approve model change, breakdown actions).

---

## If something fails

| Issue | What to do |
|--------|------------|
| Port already in use | `ss -tlnp \| grep -E '8010\|5174'` then stop the old EAP units |
| Empty UI / API 500 | `grep '^DATABASE_URL=' backend/.env` must match the live EAP database |
| Role enum error | `sudo systemctl restart groz-gsap-backend` (startup adds `site_admin`) |
| Frontend blank / `$RefreshSig$` | `./run.sh restart` so frontend uses `npm run preview`, not `npm run dev` |
| Wrong database | Compare `cat database/db.config.json` with EAP’s config; counts on `machines` / `stations` should be non-zero |

Confirm data is still in the live DB:

```bash
mysql -u root -p -e "
SELECT COUNT(*) AS machines FROM YOUR_DB.machines;
SELECT COUNT(*) AS stations FROM YOUR_DB.stations;
SELECT COUNT(*) AS site_config_rows FROM YOUR_DB.site_config;
"
```

---

## Related docs

- `DEPLOY-UBUNTU.md` — generic Ubuntu deploy notes
- `DEPLOY-SAFE-CHECKLIST.md` — preflight / backup checks before restart
- `UBUNTU_SETUP.md` — LAN access and troubleshooting
