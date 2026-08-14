# Gorz PMS — GSAP Sync

Fork of **EAP_PMS_code** with GSAP Excel import and work-order integration.  
**EAP_PMS_code is unchanged** — all GSAP work lives in this folder only.

## Location

`D:\Project documents\2026\cursor_Titan_dev_projects\Gorz_PMS_code`

## GSAP Sync feature (phase 1)

| Item | Detail |
|------|--------|
| Menu | **Production → GSAP Sync** (`/gsap-sync`) |
| Upload | `.xlsx` with Material, Plant, Created On, Valid From, Operation, Work Centre, Op. Short Text, Setup Time, Machine Time |
| Storage | MySQL table `gsap_sync` |
| Work orders | Choose **Part Master** or **GSAP Sync** when creating/editing |

### Column mapping (phase 1)

| Excel (GSAP) | PMS usage |
|--------------|-----------|
| Material | Part No / Article No |
| Plant | Stored on `gsap_sync.plant` (Factory code — phase 2: Factory Setup) |
| Operation | Operation number / code |
| Work Centre | Machine type |
| Op. Short Text | Operation name |
| Machine Time | Process time (s) — stored for future planning |
| Setup Time | Stored for future planning |

## Run

```powershell
cd "D:\Project documents\2026\cursor_Titan_dev_projects\Gorz_PMS_code\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\frontend
pnpm install
cd ..
.\run.ps1
```

Restart backend once so `migrate_gsap_sync` creates the `gsap_sync` table.

## Git

This folder is **not** linked to the EAP_PMS_code GitHub repo. Do not push Gorz changes to that remote unless you set up a separate repository.
