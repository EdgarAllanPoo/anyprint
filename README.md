# Anyprint

Self-service document printing. A customer uploads a document, picks copies and print mode (B/W or Color), pays via QRIS (Doku), and gets an 8-digit print code. The print kiosk exchanges that code for the file. Admins track orders, revenue, and per-page prices in the admin portal.

## Repo layout

```
api/                 Express API (Node, CommonJS)
  config/            Postgres pool, S3 client, logger
  controllers/       HTTP handlers
  routes/            Route definitions (mounted in server.js)
  services/          Business logic and SQL
  payments/          Doku Checkout integration
  migrations/        SQL schema files, applied in order (000, 001, ...)
  scripts/           Maintenance scripts (storage cleanup)
  utils/             PDF conversion, code generator, Doku signatures
web/                 Next.js app (customer pages + /admin portal)
deploy.sh            One-command redeploy on the server
ecosystem.config.js  PM2 process definitions
docker-compose.yml   Local Postgres + MinIO for development only
```

## How it runs in production

```
            nginx (TLS)
             /        \
   /  -> :3000         /api/ -> :3001 (prefix stripped)
   anyprint-web        anyprint-api ---> PostgreSQL
   (next start)        (server.js)  ---> S3-compatible bucket
                                    ---> Doku (payments)
```

Both apps run under PM2 (see `ecosystem.config.js`). Logs go to `logs/` at the repo root.

Main API routes:

| Route | Purpose |
|---|---|
| `POST /jobs` | Upload a document, returns code and price |
| `GET /jobs/:code` | Kiosk claims a paid job (marks it printed) |
| `GET /jobs/:code/status` | Poll job status |
| `GET /prices` | Current per-page prices (public) |
| `POST /payments/:code` | Create a Doku payment |
| `POST /payments/callback/doku` | Doku payment notification |
| `/admin/*` | Admin login, reports, orders, prices (session auth) |
| `GET /health` | Returns 200 when the API can reach Postgres |

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 15+ and the `psql` client
- An S3-compatible bucket (MinIO locally)
- LibreOffice (`soffice`), which converts DOCX/PPTX to PDF
- ImageMagick (`convert`), which converts JPG/PNG to PDF
- On the server, also: PM2 (`npm i -g pm2`), nginx, git, curl

On Ubuntu:

```bash
sudo apt-get install -y postgresql-client libreoffice-core libreoffice-writer libreoffice-impress imagemagick
```

## Environment variables

Env files are git-ignored. Never commit them.

### `api/.env`

```bash
PORT=3001
FRONTEND_URL=https://example.com      # site origin; used for CORS and Doku redirect URLs
SESSION_SECRET=                       # long random string

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
FILE_BASE_URL=                        # public base URL for uploaded files

DOKU_BASE_URL=
DOKU_CLIENT_ID=
DOKU_SECRET_KEY=

ADMIN_USER=
ADMIN_PASSWORD=

IS_DEMO=false                         # true enables fake payment settlement; never in prod

# Optional, for scripts/cleanupStorage.js (days)
# RETENTION_USED_DAYS=7
# RETENTION_PAID_DAYS=90
# RETENTION_PENDING_DAYS=3
# RETENTION_ORPHAN_DAYS=30
```

### `web/.env.local`

```bash
NEXT_PUBLIC_API_URL=https://example.com/api
NEXT_PUBLIC_DOKU_ENV=production       # anything else uses the Doku sandbox
NEXT_PUBLIC_IS_DEMO=false
```

`NEXT_PUBLIC_*` values are baked in at build time. After changing them, rebuild the web app (`./deploy.sh` does this).

## Database setup

Schema files live in `api/migrations/` and are applied in filename order. Each file is safe to re-run.

| File | What it does |
|---|---|
| `000_create_jobs.sql` | `jobs` table and index |
| `001_print_prices.sql` | `print_prices` table, seeded with B/W 1000 and Color 2000 |

Run from the repo root, using the credentials in `api/.env`:

```bash
set -a; source api/.env; set +a

for f in api/migrations/*.sql; do
  echo "Applying $f"
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -f "$f"
done
```

To apply a single new file, run the same `psql` command with just that file.

If Postgres runs in Docker and the host has no `psql`:

```bash
docker exec -i <container> psql -U <db_user> -d <db_name> -v ON_ERROR_STOP=1 < api/migrations/<file>.sql
```

Check the result:

```bash
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
```

**Adding a schema change:** create the next numbered file (for example `002_something.sql`) and write it so re-running it is harmless (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`). On the server, apply it **before** running `./deploy.sh` so the new code never starts against an old schema.

## Local development

```bash
# 1. Start Postgres (host port 55432) and MinIO (API :9000, console :9001).
#    Their dev credentials are in docker-compose.yml.
docker compose up -d

# 2. Create the bucket in the MinIO console at http://localhost:9001

# 3. Create api/.env and web/.env.local (see above) pointing at localhost,
#    for example DB_PORT=55432 and NEXT_PUBLIC_API_URL=http://localhost:3001

# 4. Apply the schema (see "Database setup")

# 5. Run the API
cd api && npm install && npm start          # http://localhost:3001

# 6. Run the web app (in another terminal)
cd web && npm install && npm run dev        # http://localhost:3000
```

The admin portal is at `/admin` and logs in with `ADMIN_USER` and `ADMIN_PASSWORD`.

## First-time server setup

1. Install the prerequisites above, plus PM2 and nginx.
2. Clone the repo and create `api/.env` and `web/.env.local` with production values. `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` must be `https://` URLs, or `deploy.sh` refuses to run.
3. Apply all migrations (see "Database setup").
4. Configure nginx to proxy `/` to `127.0.0.1:3000` and `/api/` to `127.0.0.1:3001/` (the trailing slash strips the `/api` prefix).
5. Run `./deploy.sh`.
6. Make PM2 start on boot: run `pm2 startup` and follow the command it prints.

## Redeploying

On the server, from the repo root:

```bash
# 1. If this release adds a file in api/migrations/, pull and apply it first
git pull
# ...apply the new migration (see "Database setup")

# 2. Deploy
./deploy.sh
```

`deploy.sh` does the following:

1. Checks that node, npm, pm2, git and curl exist, that both env files exist, and that the production URLs are `https://`.
2. Pulls `main` with fast-forward only. It stops if the server has uncommitted changes.
3. Installs dependencies and builds the web app. A failed build stops here and leaves the running site untouched.
4. Reloads both PM2 apps.
5. Health-checks the API (`/health`) and the web app, then prints `pm2 status`.

Options:

```bash
SKIP_PULL=1 ./deploy.sh             # deploy the working tree as-is
BRANCH=hotfix ./deploy.sh           # deploy another branch
ALLOW_NONPROD_ENV=1 ./deploy.sh     # skip the https env checks (non-prod boxes only)
```

### Rolling back

If health checks fail, `deploy.sh` prints the exact rollback command. It looks like this:

```bash
git reset --hard <previous-sha> && SKIP_PULL=1 ./deploy.sh
```

Migrations are not rolled back automatically. The existing ones only add tables, so older code ignores them.

### Useful commands

```bash
pm2 status
pm2 logs --lines 100
pm2 logs anyprint-api
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3001/prices
```

## Changing print prices

Use **Admin → Pricing**. Changes apply to new orders immediately, with no redeploy needed. Orders that already exist keep the price they were quoted.

## Storage cleanup

`api/scripts/cleanupStorage.js` deletes uploaded files once they're no longer needed. It never touches rows in `jobs`. The script is a dry run unless you pass `--apply`.

```bash
cd api
npm run cleanup:storage                     # dry run: shows what would be deleted
node scripts/cleanupStorage.js --apply      # actually deletes
```

To run it daily via cron (`crontab -e`):

```cron
0 3 * * * cd /path/to/anyprint-web/api && /usr/bin/node scripts/cleanupStorage.js --apply >> /path/to/anyprint-web/logs/cleanup.log 2>&1
```
