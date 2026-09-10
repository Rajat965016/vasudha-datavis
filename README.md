# Vasudha — Climate, Energy & Power Data Platform

A full-stack web application for managing and publicly visualising Climate, Energy and Power
datasets. Admins upload CSV datasets and choose how they should be visualised; the Super Admin
reviews each submission; approved datasets are published automatically to a public portal that
needs no login.

Built for the Vasudha Foundation Full-Stack Technical Assignment.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Technology stack](#2-technology-stack)
3. [Project structure](#3-project-structure)
4. [Dependencies](#4-dependencies)
5. [Installation and setup](#5-installation-and-setup)
6. [Environment variables](#6-environment-variables)
7. [Database setup](#7-database-setup)
8. [Running locally](#8-running-locally)
9. [Default credentials](#9-default-credentials)
10. [Supported dataset structures](#10-supported-dataset-structures)
11. [How dynamic visualisation works](#11-how-dynamic-visualisation-works)
12. [API reference](#12-api-reference)
13. [Deployment](#13-deployment)
14. [Testing](#14-testing)
15. [Assumptions, limitations and known issues](#15-assumptions-limitations-and-known-issues)

---

## 1. Project overview

### Roles

| Role | Access |
| --- | --- |
| **Super Admin** | Full control: sees every dataset and its author, approves/rejects/edits/deletes any dataset, creates and manages Admin accounts, enables/disables them, resets their passwords. |
| **Admin** | Created by the Super Admin. Uploads datasets, sees their own datasets and approval status, edits and deletes their own datasets. |
| **Public user** | No login or signup. Browses every approved visualisation on the landing page and on the three domain pages. |

### Approval workflow

```
Admin uploads a CSV
        │  status = PENDING, hidden from the public site
        ▼
Approval request appears in the Super Admin's queue
        │  Super Admin previews the exact visualisation
        ▼
   Approve ──────────────► status = APPROVED
        │                  a publish sequence number is assigned
        │                  the chart appears on  /  and on its domain page
        │
   Reject ───────────────► status = REJECTED, with a reason
                           the Admin sees the reason on their dashboard
```

Approval assigns a monotonically increasing `publishSequence`. The public landing page orders by
that field, so charts appear in exactly the sequence they were approved — and re-approving an
edited dataset keeps its original position rather than reshuffling the page.

### Public routes

| Route | Contents |
| --- | --- |
| `/` | Every approved visualisation, in publish order |
| `/climate` | Approved Climate datasets |
| `/energy` | Approved Energy datasets |
| `/power` | Approved Power datasets |

---

## 2. Technology stack

**Frontend**

- React 18 + Vite 5
- React Router 6 (public, auth and role-guarded console routes)
- Tailwind CSS 3
- Recharts (line / bar / area charts)
- React-Leaflet + Leaflet (interactive India map and state choropleth)
- Axios

**Backend**

- Node.js 18+ / Express 4 (ES modules)
- **MySQL 8** + Sequelize 6 (`mysql2` driver)
- JWT authentication (`jsonwebtoken`) with bcrypt password hashing
- Zod request validation
- PapaParse CSV parsing, Multer in-memory uploads
- Helmet, CORS, compression, express-rate-limit
- Nodemailer (optional — bonus email features)

**Database:** MySQL 8 (relational), accessed through Sequelize.

Four tables — `users`, `datasets`, `dataset_rows`, `counters` — with real foreign keys:

- `datasets.created_by_id` → `users.id` is `ON DELETE RESTRICT`, so an Admin who still owns
  datasets cannot be deleted and the record of who published what survives.
- `dataset_rows.dataset_id` → `datasets.id` is `ON DELETE CASCADE`, so deleting a dataset removes
  its rows in one statement.
- `datasets.publish_sequence` is `UNIQUE`; it is allocated inside a transaction that locks a row in
  `counters`, so two simultaneous approvals can never claim the same position on the landing page.

Each CSV row lives in its own `dataset_rows` record, with the row's values in a `JSON` column. That
keeps dashboard queries off the data entirely, lets deletes cascade, and still supports a different
set of columns per chart type without a migration every time a new dataset shape is added —
`datasets.columns` describes what each row contains. The full DDL is in `backend/database/schema.sql`.

---

## 3. Project structure

```
vasudha-datavis/
├── backend/
│   ├── database/
│   │   └── schema.sql               # reviewable MySQL DDL (optional to run)
│   ├── samples/                     # the three sample CSVs from the Resources folder
│   └── src/
│       ├── config/
│       │   ├── constants.js         # roles, domains, chart types, statuses
│       │   ├── db.js                # Sequelize / MySQL connection
│       │   ├── env.js               # typed, validated environment config
│       │   └── indiaStates.js       # canonical state names + alias resolution
│       ├── controllers/             # HTTP layer only
│       │   ├── adminUserController.js
│       │   ├── authController.js
│       │   ├── datasetController.js
│       │   └── publicController.js
│       ├── middleware/
│       │   ├── auth.js              # requireAuth, requireRole, requireSuperAdmin
│       │   ├── errorHandler.js      # single JSON error envelope
│       │   ├── upload.js            # multer CSV upload guard
│       │   └── validate.js          # Zod → 422 with field errors
│       ├── database/sync.js         # `npm run db:sync` — create tables
│       ├── models/                  # User, Dataset, DatasetRow, Counter
│       │                            # + index.js: associations & foreign keys
│       ├── routes/                  # auth, admins, datasets, public
│       ├── seed/
│       │   ├── ensureSuperAdmin.js  # runs on every boot
│       │   └── seed.js              # optional demo admin + sample datasets
│       ├── services/                # business logic
│       │   ├── csvParser.js         # schema-driven parsing + validation
│       │   ├── datasetSchemas.js    # the dataset schema registry
│       │   └── datasetService.js    # listing, approval, publish ordering
│       ├── utils/                   # ApiError, asyncHandler, jwt, mailer, logger
│       ├── validators/              # Zod schemas
│       ├── app.js                   # express app assembly
│       └── server.js                # boot + graceful shutdown
│
├── frontend/
│   ├── public/data/india.geojson    # India state polygons (ST_NM properties)
│   └── src/
│       ├── api/                     # axios client + typed service functions
│       ├── components/
│       │   ├── admin/               # PageHeader, StatCards, DatasetTable,
│       │   │                        # CsvDropzone, CsvErrorReport
│       │   ├── charts/              # ChartRenderer + the three visualisations
│       │   ├── layout/              # PublicLayout, AdminLayout, ProtectedRoute
│       │   └── ui/                  # Button, Field, Badge, Modal, States
│       ├── config/constants.js      # mirrors the backend enums + display labels
│       ├── context/                 # AuthContext, ToastContext
│       ├── hooks/                   # useAsync, useIndiaGeoJson
│       ├── pages/
│       │   ├── admin/               # DatasetList, DatasetForm, Approvals, Users, Account
│       │   ├── auth/                # Login, ForgotPassword, ResetPassword
│       │   └── public/              # Landing, Domain, NotFound
│       ├── styles/index.css
│       ├── utils/                   # format, password
│       ├── App.jsx                  # route map
│       └── main.jsx
│
├── render.yaml                      # backend deployment blueprint
└── README.md
```

---

## 4. Dependencies

Everything installs from npm; there is nothing to install globally except Node.js and (for local
development) MySQL.

| Requirement | Version |
| --- | --- |
| Node.js | 18 or newer |
| npm | 9 or newer |
| MySQL | 8.0 or newer (MariaDB 10.5+ also works) |

Backend runtime dependencies: `express`, `sequelize`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `zod`,
`papaparse`, `multer`, `nodemailer`, `helmet`, `cors`, `compression`, `morgan`,
`express-rate-limit`, `dotenv`.

Frontend dependencies: `react`, `react-dom`, `react-router-dom`, `axios`, `recharts`, `leaflet`,
`react-leaflet`; dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`.

---

## 5. Installation and setup

```bash
git clone <your-repository-url>
cd vasudha-datavis

# Backend
cd backend
npm install
cp .env.example .env          # then edit .env (see below)

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

---

## 6. Environment variables

### `backend/.env`

**Server**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` enables stricter checks and hides stack traces |
| `PORT` | no | `5000` | HTTP port |
| `CORS_ORIGINS` | no | `http://localhost:5173` | Comma-separated allowed origins |
| `FRONTEND_URL` | no | `http://localhost:5173` | Used to build links inside emails |

**MySQL**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | no | — | Full connection string, e.g. `mysql://user:pass@host:3306/vasudha_datavis`. **Takes priority over the individual settings below.** |
| `DB_HOST` | yes* | `127.0.0.1` | Database host |
| `DB_PORT` | no | `3306` | Database port |
| `DB_NAME` | yes* | `vasudha_datavis` | Database name |
| `DB_USER` | yes* | `root` | Database user |
| `DB_PASSWORD` | yes* | empty | Database password |
| `DB_SSL` | no | `false` | Set `true` for a cloud MySQL host — nearly all require TLS |
| `DB_SSL_CA` | no | empty | PEM contents of the provider's CA certificate (Aiven and similar) |
| `DB_SSL_REJECT_UNAUTHORIZED` | no | `true` | Last resort for a certificate that cannot be verified |
| `DB_POOL_MAX` / `DB_POOL_MIN` | no | `10` / `0` | Connection pool size |
| `DB_LOGGING` | no | `false` | Log every SQL statement (development only) |
| `DB_SYNC` | no | `true` | Create missing tables on boot |

\* Not needed when `DATABASE_URL` is set.

**Authentication**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `JWT_SECRET` | **yes** | dev value | Signing key — use `openssl rand -hex 48` in production |
| `JWT_EXPIRES_IN` | no | `7d` | Access token lifetime |
| `PASSWORD_RESET_TTL_MINUTES` | no | `30` | Password-reset link expiry |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | no | `15` | Throttle window for credential endpoints |
| `AUTH_RATE_LIMIT_MAX` | no | `20` | Attempts allowed per window per IP |

**Seeding and uploads**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SUPER_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | no | see §9 | Default Super Admin created on first boot |
| `MAX_UPLOAD_BYTES` | no | `5242880` | Upload size limit (5 MB) |
| `MAX_DATASET_ROWS` | no | `20000` | Row limit per dataset |

**Email (optional bonus feature)**

| Variable | Required | Default |
| --- | --- | --- |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` | no | empty |

> Leaving `SMTP_HOST` empty disables email. Nothing breaks: account creation still works and the
> generated password is shown to the Super Admin once in the UI, and the password-reset link is
> returned in the API response outside production.

### `frontend/.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | **yes** | `http://localhost:5000/api` | Base URL of the backend API |
| `VITE_INDIA_GEOJSON_URL` | no | `/data/india.geojson` | Path to the India state polygons |

---

## 7. Database setup

### Schema

Four tables, created for you on first boot (`DB_SYNC=true`):

| Table | Contents |
| --- | --- |
| `users` | Super Admin and Admin accounts, bcrypt password hashes, active flag, hashed reset tokens |
| `datasets` | One uploaded CSV plus its visualisation configuration, status and review trail |
| `dataset_rows` | The validated rows of each CSV — one record per row, values in a `JSON` column |
| `counters` | Atomic named sequences; allocates `datasets.publish_sequence` |

```
users ──< datasets ──< dataset_rows
  │          │
  │          ├── created_by_id   → users.id   ON DELETE RESTRICT
  │          ├── updated_by_id   → users.id   ON DELETE SET NULL
  │          └── reviewed_by_id  → users.id   ON DELETE SET NULL
  └── created_by_id → users.id               ON DELETE SET NULL

dataset_rows.dataset_id → datasets.id        ON DELETE CASCADE
```

The complete DDL, with comments explaining each design decision, is in
[`backend/database/schema.sql`](backend/database/schema.sql).

### Local MySQL

```bash
# Ubuntu / Debian
sudo apt install mysql-server
sudo systemctl start mysql

# macOS
brew install mysql && brew services start mysql

# Windows: install MySQL Community Server from dev.mysql.com and start the service
```

Create the database and a dedicated user:

```sql
CREATE DATABASE vasudha_datavis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vasudha'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON vasudha_datavis.* TO 'vasudha'@'localhost';
FLUSH PRIVILEGES;
```

Run that with `sudo mysql` (Linux) or `mysql -u root -p`. Then fill in `backend/.env`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=vasudha_datavis
DB_USER=vasudha
DB_PASSWORD=choose_a_password
DB_SSL=false
```

### Hosted MySQL

| Provider | Free tier | Notes |
| --- | --- | --- |
| **Aiven for MySQL** | 1 GB RAM, 1 GB storage, 76 connections, no credit card, no time limit | Recommended. Requires TLS: set `DB_SSL=true` and paste the CA certificate from the Aiven console into `DB_SSL_CA`. Idle free services are powered off and can be reactivated from the console. |
| Railway | Trial credits | Simple if the backend is hosted there too |
| Clever Cloud | Small free MySQL add-on | Enough for this dataset volume |
| TiDB Cloud Starter | MySQL wire-compatible serverless | Works through the same `mysql2` driver |

Whichever you choose, either set `DATABASE_URL` to the connection string the provider gives you, or
fill in the individual `DB_*` values.

### Creating the tables

Three options, in order of convenience:

```bash
# 1. Automatic — the app creates missing tables on boot when DB_SYNC=true (the default)
npm start

# 2. Explicit — create the tables and exit
npm run db:sync

# 3. By hand — apply the SQL file (useful if the app's user may not create tables)
mysql -u vasudha -p vasudha_datavis < backend/database/schema.sql
```

`npm run db:sync -- --force` drops and recreates every table. It is destructive; use it only on a
throwaway development database.

### Seeding

The default Super Admin is created **automatically on every boot** if no Super Admin exists, so a
fresh deployment is immediately usable. An existing Super Admin is never overwritten.

```bash
cd backend
npm run seed        # Super Admin only
npm run seed:demo   # Super Admin + a demo Admin + the three sample datasets, pre-approved
```

`npm run seed:demo` is the fastest way to see the app populated: it loads the sample CSVs from the
assignment's Resources folder (`backend/samples/`) and publishes them.

---

## 8. Running locally

Two terminals:

```bash
# Terminal 1 — API on http://localhost:5000
cd backend
npm run dev

# Terminal 2 — app on http://localhost:5173
cd frontend
npm run dev
```

Then open <http://localhost:5173>.

Useful scripts:

| Command | Location | What it does |
| --- | --- | --- |
| `npm run dev` | backend | Starts the API with file watching |
| `npm start` | backend | Starts the API (production entry point) |
| `npm run db:sync` | backend | Creates any missing tables, then exits |
| `npm run seed` / `seed:demo` | backend | Seeds the database |
| `npm run dev` | frontend | Vite dev server |
| `npm run build` | frontend | Production build into `dist/` |
| `npm run preview` | frontend | Serves the production build locally |
---

## 9. Default credentials

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@vasudhaindia.org` | `Admin@123` |
| Demo Admin *(only after `npm run seed:demo`)* | `admin@vasudhaindia.org` | `Admin@123` |

Change the Super Admin password after the first sign-in via **My account → Change password**.

---

## 10. Supported dataset structures

Datasets are uploaded as `.csv`. Headers are matched case-insensitively, punctuation is ignored,
and a header that merely *starts* with a known name is accepted — so `Value (MW)`, `value`, and
`VALUE` all resolve to the value column. Any column the schema does not recognise is preserved and
shown in the data table and map popups rather than discarded.

### Latitude / Longitude → interactive India map

| Column | Required | Accepted headers |
| --- | --- | --- |
| Latitude | yes | `latitude`, `lat`, `y coordinate` |
| Longitude | yes | `longitude`, `long`, `lon`, `lng`, `x coordinate` |
| Value | yes | `value`, `val`, `amount`, `quantity`, `capacity`, `reading` |
| Location | no | `label`, `name`, `location`, `site`, `station`, `place` |
| Category | no | `category`, `type`, `group`, `segment`, `source` |

```csv
latitude,longitude,value
26.9157,70.9083,120
23.7337,69.8597,85
```

Latitude is validated to −90…90 and longitude to −180…180. Marker size scales with the value; an
optional `category` column colours the markers and produces a legend.

### State-wise → India state heatmap

| Column | Required | Accepted headers |
| --- | --- | --- |
| State / UT | yes | `state`, `state name`, `ST_NM`, `region`, `province` |
| Value | yes | `value`, `val`, `amount`, `quantity`, `capacity`, `total` |

```csv
state,value
Rajasthan,24500
Gujarat,21800
```

State names are resolved against the 38 `ST_NM` values in `india.geojson`, with aliases for common
variants (`Orissa`, `Pondicherry`, `NCT of Delhi`, two-letter codes such as `MH`, `TN`). Unknown
states and duplicate rows are rejected with the offending row number.

### Time series → line / bar / area chart

| Column | Required | Accepted headers |
| --- | --- | --- |
| Date / Year | yes | `date`, `year`, `period`, `month`, `time`, `timestamp` |
| Value | yes | `value`, `val`, `amount`, `reading`, `temperature`, `total` |
| Series | no | `series`, `category`, `group`, `name` |

```csv
year,value
2019,25.1
2020,25.4
```

Accepted period formats: `YYYY`, `YYYY-MM`, `YYYY-MM-DD` and `DD/MM/YYYY`. Rows are sorted
chronologically on upload. An optional `series` column is pivoted automatically into one plotted
series per distinct value, with a legend.

### Validation behaviour

An upload is rejected as a whole if any cell is invalid — the Admin sees a table of
`row · column · problem` (up to 50 entries) and can fix the file and retry. Missing required
columns are reported with the list of accepted header spellings and the headers actually found.

---

## 11. How dynamic visualisation works

The visualisation logic is **not** hardcoded to the sample datasets. Two registries drive
everything:

**Backend — `src/services/datasetSchemas.js`**
Each chart type declares its fields: key, label, accepted header aliases, whether it is required,
its type, its role (dimension / measure) and a parse function. `csvParser.js` reads only this
registry — it has no per-dataset branching. The Add Dataset form fetches the same registry from
`GET /api/datasets/schemas`, so the column requirements shown in the UI can never drift from what
the server enforces.

**Frontend — `src/components/charts/ChartRenderer.jsx`**
A lookup from `chartType` to a renderer. Each dataset carries its own configuration (`chartType`,
`chartVariant`, `columns`, `rows`, `valueUnit`), so every page renders any dataset by handing it to
`ChartRenderer`.

Adding a fourth visualisation type therefore means: add one schema entry on the backend, add one
renderer on the frontend, and add a display label. No page, route, controller or model changes.

---

## 12. API reference

Base URL: `<backend>/api`. Authenticated requests send `Authorization: Bearer <token>`.

### Public — no authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `GET` | `/meta` | Enumerations used by the UI |
| `GET` | `/public/visualisations` | Approved datasets, in publish order |
| `GET` | `/public/visualisations?domain=climate` | Filtered by domain (`climate`/`energy`/`power`) |
| `GET` | `/public/visualisations/:id` | One approved dataset |
| `GET` | `/public/stats` | Published counts per domain |

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/login` | Sign in, returns a JWT |
| `GET` | `/auth/me` | Current profile |
| `POST` | `/auth/change-password` | Change your own password |
| `POST` | `/auth/forgot-password` | Request a reset link |
| `POST` | `/auth/reset-password` | Consume a reset token |

### Datasets — Admin and Super Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/datasets` | Own datasets (Super Admin: all). Filters: `status`, `domain`, `chartType`, `search`, `page`, `limit` |
| `GET` | `/datasets/stats` | Counts by status |
| `GET` | `/datasets/schemas` | Column requirements per chart type |
| `GET` | `/datasets/:id` | One dataset including rows |
| `POST` | `/datasets` | Create (multipart: `file` + fields) |
| `PUT` | `/datasets/:id` | Update; `file` optional |
| `DELETE` | `/datasets/:id` | Delete |
| `PATCH` | `/datasets/:id/approve` | **Super Admin only** — publish |
| `PATCH` | `/datasets/:id/reject` | **Super Admin only** — reject with a `reason` |

### Admin accounts — Super Admin only

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/admins` | List Admins with their dataset counts |
| `POST` | `/admins` | Create an Admin (password optional — generated if omitted) |
| `PATCH` | `/admins/:id` | Rename, enable or disable |
| `POST` | `/admins/:id/reset-password` | Issue a new temporary password |
| `DELETE` | `/admins/:id` | Delete (refused while the Admin owns datasets) |

### Response shape

```jsonc
// success
{ "success": true, "message": "…", "data": { /* … */ } }

// failure
{
  "success": false,
  "message": "The CSV file contains 2 invalid value(s). …",
  "details": {
    "errors": [
      { "row": 3, "column": "state", "message": "\"Narnia\" is not a recognised Indian state or union territory" }
    ]
  }
}
```

---

## 13. Deployment

Three pieces deploy independently: the MySQL database, the backend API, and the frontend.

### Step 1 — MySQL database

Create a free MySQL instance (see §7 for the provider comparison; **Aiven** is the recommended
option — 1 GB, no credit card, no time limit). Note down the host, port, database name, user and
password, and download the CA certificate if the provider offers one.

The tables are created automatically the first time the backend boots, so there is nothing to run
here by hand.

### Step 2 — Backend → Render (free tier)

1. Push this repository to GitHub.
2. Render → **New → Web Service**, select the repo.
   - Root directory: `backend`
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Add environment variables:

   ```
   NODE_ENV=production
   JWT_SECRET=<output of: openssl rand -hex 48>
   DB_HOST=<from your MySQL provider>
   DB_PORT=<from your MySQL provider>
   DB_NAME=<from your MySQL provider>
   DB_USER=<from your MySQL provider>
   DB_PASSWORD=<from your MySQL provider>
   DB_SSL=true
   DB_SSL_CA=<paste the provider's CA certificate, or leave empty>
   CORS_ORIGINS=https://<your-frontend-domain>
   FRONTEND_URL=https://<your-frontend-domain>
   ```

   Providers that hand out a single connection string can use `DATABASE_URL` instead of the five
   `DB_*` values.
4. Deploy. The logs should show `MySQL connected`, `Database schema verified` and
   `Super Admin created` on the first boot.

A `render.yaml` blueprint is included — Render → **New → Blueprint** picks it up and only asks for
the environment-specific values.

### Step 3 — Frontend → Vercel (free tier)

1. Vercel → **New Project**, select the repo.
   - Root directory: `frontend`
   - Framework preset: Vite (auto-detected)
   - Build command: `npm run build`, output directory: `dist`
2. Add environment variable `VITE_API_BASE_URL=https://<your-backend-domain>/api`.
3. Deploy. `vercel.json` provides the SPA rewrite so `/climate` and `/admin/...` resolve correctly.

Netlify works identically — `public/_redirects` provides the same SPA fallback.

### Step 4 — Connect them

Set `CORS_ORIGINS` on the backend to the exact frontend origin (scheme + host, **no trailing
slash**) and redeploy the backend. A missing or mismatched origin here is the usual cause of
"Unable to reach the server" on an otherwise healthy deployment.

Verify with:

```bash
curl https://<your-backend-domain>/api/health
curl https://<your-backend-domain>/api/public/visualisations
```

> **Free-tier note:** Render's free web services sleep after inactivity, so the first request after
> an idle period can take 30–60 seconds while the service wakes up. Aiven powers off free database
> instances that go unused; they can be reactivated from the console in a few seconds.
---

## 14. Testing

Verification was done with two automated suites plus manual browser checks.

**API suite** — 48 assertions over the whole workflow: authentication and account-enumeration
resistance, RBAC (Admin cannot list admins, cannot approve their own dataset), CSV validation
(missing columns, out-of-range latitude, non-numeric values, unknown/duplicate states, missing
time-series variant, non-CSV uploads), header aliasing and extra-column preservation, the
pending → reject → approve transitions, publish ordering, public-payload scoping, dataset
ownership, edit-returns-to-pending, account enable/disable, the delete guard, and the full
forgot/reset-password cycle including single-use tokens. Database behaviour was verified directly
against MySQL as well: the `ON DELETE CASCADE` on `dataset_rows` leaves no orphans, the
`ON DELETE RESTRICT` on `datasets.created_by_id` blocks deleting an Admin who owns datasets, and
`database/schema.sql` applies cleanly to an empty database.

**Browser suite** — 17 assertions driving the real UI: sign-in, local CSV preview, malformed-upload
error reporting, a successful upload with aliased headers, absence from the public site while
pending, approval from the queue, appearance on both the landing page and the domain page in the
correct publish order, correctly shaded choropleth polygons, Admin creation with the temporary
password surfaced, no horizontal overflow at 390 px, and no uncaught page errors.

There is no unit-test harness in the repository — see the limitations below.

---

## 15. Assumptions, limitations and known issues

### Assumptions

- **One row per state** in a state-wise CSV. Duplicates are rejected rather than silently summed,
  since either behaviour could be wrong for a given dataset.
- **A dataset's rows are replaced, not appended**, when a new CSV is uploaded during an edit.
- **Editing an approved dataset returns it to Pending** when done by an Admin, because the content
  the Super Admin approved has changed. A Super Admin editing a dataset does not un-publish it.
- **Re-approval keeps the original publish position**, so correcting a chart does not move it to the
  bottom of the landing page.
- **Deleting an Admin who still owns datasets is refused.** Disabling is offered instead, which
  preserves the record of who published what.
- **The Super Admin account cannot be managed through `/api/admins`** — it can only change its own
  password. This prevents the platform being locked out of itself.
- **`valueUnit` is presentational.** No unit conversion is performed.

### Limitations

- **No automated unit-test suite in the repository.** Verification used the two end-to-end suites
  described above; adding Vitest/Jest coverage for `csvParser` and the approval service would be
  the first thing to add next.
- **No Figma prototype.** The UI was designed directly in code.
- **Row values are stored in a `JSON` column** rather than in typed columns, because each chart type
  has a different set of fields. The trade-off is that the database cannot enforce types inside a
  row or index individual fields — validation happens in `csvParser.js` before anything is written.
  A dataset is capped at `MAX_DATASET_ROWS` (default 20 000) to keep uploads and page loads
  predictable; the storage itself would handle far more.
- **Schema creation uses `sequelize.sync()`, not versioned migrations.** That is fine for a fresh
  deployment and keeps setup to one step, but a production system with evolving requirements would
  want Umzug or `sequelize-cli` migrations. `database/schema.sql` is the reviewable source of truth
  in the meantime, and `alter` is deliberately never used.
- **JWTs are stateless and stored in `localStorage`.** There is no server-side revocation list, so
  disabling an account is enforced on the *next* request rather than instantly invalidating an
  issued token (the `requireAuth` middleware re-checks `isActive` on every request, so the practical
  window is one in-flight request). Moving to httpOnly cookies plus refresh tokens would harden
  this further.
- **Email is optional and best-effort.** Without SMTP configured, credentials are shown once in the
  UI and reset links are returned in the API response outside production. Delivery failures are
  logged and never block the underlying action.
- **The public feed is unpaginated.** All approved datasets load at once; this is fine at the
  expected scale but would need pagination or lazy loading past a few dozen visualisations.
- **The whole public feed is loaded in two queries** (datasets, then their rows). That is
  deliberate — it avoids an N+1 — but a very large number of published datasets would need
  pagination rather than a bigger query.
- **The GeoJSON is a ~240 KB static asset** served from the frontend. It is fetched once and cached
  in memory for the session, but the first heatmap on a cold load pays that download.
- **Chart type cannot be changed without re-uploading a CSV**, because the stored rows have the
  shape of the previous type. The API returns a clear message explaining this.

### Known issues

- **Render free-tier cold starts.** The first request after inactivity can take up to a minute; the
  UI shows a loading state but a very slow wake-up can hit the 30-second Axios timeout and surface
  "Unable to reach the server". Retrying succeeds.
- **State-name matching is best-effort.** The alias table covers common spellings, historical names
  and two-letter codes, but an unusual spelling will be rejected. The error message names the
  offending value and row so it can be corrected in the source file.
- **Login is rate-limited to 20 attempts per 15 minutes per IP.** Repeated automated testing against
  the auth endpoints from a single IP will start returning HTTP 429.
- **Leaflet map tiles come from the CARTO CDN.** In a network-restricted environment the point map
  renders the India outline and its markers but without the basemap tiles. The state heatmap does
  not use tiles at all and is unaffected.
