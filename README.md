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
- MongoDB + Mongoose 8
- JWT authentication (`jsonwebtoken`) with bcrypt password hashing
- Zod request validation
- PapaParse CSV parsing, Multer in-memory uploads
- Helmet, CORS, compression, express-rate-limit
- Nodemailer (optional — bonus email features)

**Database:** MongoDB (NoSQL). Chosen because uploaded CSVs have varying shapes; storing normalised
rows as documents avoids a schema migration each time a new dataset structure is supported.

---

## 3. Project structure

```
vasudha-datavis/
├── backend/
│   ├── samples/                     # the three sample CSVs from the Resources folder
│   └── src/
│       ├── config/
│       │   ├── constants.js         # roles, domains, chart types, statuses
│       │   ├── db.js                # MongoDB connection
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
│       ├── models/                  # User, Dataset, Counter
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
development) MongoDB.

| Requirement | Version |
| --- | --- |
| Node.js | 18 or newer |
| npm | 9 or newer |
| MongoDB | 6 or newer, local or MongoDB Atlas |

Backend runtime dependencies: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `zod`,
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

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` enables stricter checks and hides stack traces |
| `PORT` | no | `5000` | HTTP port |
| `MONGODB_URI` | **yes** | local URI | MongoDB connection string |
| `JWT_SECRET` | **yes** | dev value | Signing key — use `openssl rand -hex 48` in production |
| `JWT_EXPIRES_IN` | no | `7d` | Access token lifetime |
| `PASSWORD_RESET_TTL_MINUTES` | no | `30` | Password-reset link expiry |
| `CORS_ORIGINS` | no | `http://localhost:5173` | Comma-separated allowed origins |
| `FRONTEND_URL` | no | `http://localhost:5173` | Used to build links inside emails |
| `SUPER_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | no | see below | Default Super Admin created on first boot |
| `MAX_UPLOAD_BYTES` | no | `5242880` | Upload size limit (5 MB) |
| `MAX_DATASET_ROWS` | no | `20000` | Row limit per dataset |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` | no | empty | Optional outbound email |

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

No migrations are needed — Mongoose creates collections and indexes on first use.

**Local MongoDB**

```bash
# Ubuntu/Debian example
sudo systemctl start mongod
# .env
MONGODB_URI=mongodb://127.0.0.1:27017/vasudha_datavis
```

**MongoDB Atlas (free tier)**

1. Create a free M0 cluster.
2. Database Access → add a user with read/write permissions.
3. Network Access → allow `0.0.0.0/0` (or your host's IPs).
4. Copy the connection string into `MONGODB_URI`, appending the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/vasudha_datavis?retryWrites=true&w=majority`

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

The frontend and backend deploy independently.

### Backend → Render (free tier)

1. Push this repository to GitHub.
2. Render → **New → Web Service**, select the repo.
   - Root directory: `backend`
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Add environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`,
   `CORS_ORIGINS=https://<your-frontend-domain>`, `FRONTEND_URL=https://<your-frontend-domain>`.
4. Deploy. On first boot the default Super Admin is created automatically.

A `render.yaml` blueprint is included — Render → **New → Blueprint** picks it up and only asks for
the environment-specific values.

### Frontend → Vercel (free tier)

1. Vercel → **New Project**, select the repo.
   - Root directory: `frontend`
   - Framework preset: Vite (auto-detected)
   - Build command: `npm run build`, output directory: `dist`
2. Add environment variable `VITE_API_BASE_URL=https://<your-backend-domain>/api`.
3. Deploy. `vercel.json` provides the SPA rewrite so `/climate` and `/admin/...` resolve correctly.

Netlify works identically — `public/_redirects` provides the same SPA fallback.

### After deploying

Set `CORS_ORIGINS` on the backend to the exact frontend origin (scheme + host, no trailing slash)
and redeploy the backend. A missing origin here is the usual cause of "Unable to reach the server".

> **Free-tier note:** Render's free web services sleep after inactivity, so the first request after
> an idle period can take 30–60 seconds while the service wakes up.

---

## 14. Testing

Verification was done with two automated suites plus manual browser checks.

**API suite** — 47 assertions over the whole workflow: authentication and account-enumeration
resistance, RBAC (Admin cannot list admins, cannot approve their own dataset), CSV validation
(missing columns, out-of-range latitude, non-numeric values, unknown/duplicate states, missing
time-series variant, non-CSV uploads), header aliasing and extra-column preservation, the
pending → reject → approve transitions, publish ordering, public-payload scoping, dataset
ownership, edit-returns-to-pending, account enable/disable, the delete guard, and the full
forgot/reset-password cycle including single-use tokens.

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
- **Rows are stored inline in the dataset document.** MongoDB's 16 MB document limit therefore caps
  a dataset at roughly 100k simple rows; `MAX_DATASET_ROWS` defaults to a conservative 20 000. A
  separate rows collection or GridFS would be the fix for genuinely large datasets.
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
