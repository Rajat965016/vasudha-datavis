# Implemented features

Every requirement from the assignment brief, with where it lives in the code.

Legend: ✅ implemented · ⭐ bonus / additional feature

---

## 1. Roles & permissions

### Super Admin

| Requirement | Status | Where |
| --- | --- | --- |
| Default Super Admin created during deployment (`superadmin@vasudhaindia.org` / `Admin@123`) | ✅ | `backend/src/seed/ensureSuperAdmin.js` — runs on every boot; never overwrites an existing account |
| Login with Super Admin credentials | ✅ | `POST /api/auth/login` |
| View all datasets added by different Admins | ✅ | `/admin/datasets` — role-aware filter in `datasetService.buildAdminListFilter` |
| View which Admin added each dataset | ✅ | "Added by" column, shown only to the Super Admin |
| Approve or reject datasets | ✅ | `/admin/approvals`; `PATCH /api/datasets/:id/approve` and `/reject` |
| Edit datasets added by any Admin | ✅ | `PUT /api/datasets/:id` |
| Delete datasets added by any Admin | ✅ | `DELETE /api/datasets/:id` |
| Create new Admin accounts | ✅ | `/admin/users`; `POST /api/admins` |
| Manage existing Admin accounts | ✅ | Rename, reset password, delete |
| Enable / disable Admin accounts | ✅ | `PATCH /api/admins/:id` — a disabled Admin is blocked at login *and* on every subsequent request |
| Manage administrative access | ✅ | `requireSuperAdmin` guards the whole `/api/admins` router and the review endpoints |

### Admin

| Requirement | Status | Where |
| --- | --- | --- |
| Log in with credentials created by the Super Admin | ✅ | `/login` |
| Dashboard in tabular format | ✅ | `frontend/src/components/admin/DatasetTable.jsx` |
| — datasets added by the Admin | ✅ | Admins are scoped to their own rows |
| — dataset domain / category | ✅ | Colour-coded domain badge |
| — selected chart type | ✅ | Including the time-series variant, e.g. "Time series · Line chart" |
| — dataset status | ✅ | Row count and source file name |
| — approval status | ✅ | Pending / Approved / Rejected badge, with the rejection reason inline |
| — chart title | ✅ | First column |
| Add dataset via `.csv` upload | ✅ | `/admin/datasets/new` |
| Schema validation rejecting malformed fields with error messages | ✅ | `backend/src/services/csvParser.js` → a `row · column · problem` table in the UI |
| Dataset defaults to Pending and stays hidden until approved | ✅ | `Dataset.status` defaults to `PENDING`; the public API filters on `APPROVED` |
| Select domain: Climate / Energy / Power | ✅ | |
| Select chart type | ✅ | Map points, state heatmap, time series |
| Select Line / Bar / Area for time series | ✅ | Required for — and only for — time-series datasets |
| Provide a chart title | ✅ | |

### Public user

| Requirement | Status | Where |
| --- | --- | --- |
| No login or signup | ✅ | `/api/public/*` has no auth middleware |
| Publicly accessible URL | ✅ | Deployed frontend root |
| View published charts and maps | ✅ | `/` |
| Explore Climate / Energy / Power data | ✅ | `/climate`, `/energy`, `/power` |
| Navigate between sections | ✅ | Header navigation + domain cards |
| Interact with charts | ✅ | Recharts tooltips, hover, multi-series legend |
| Interact with maps | ✅ | Zoom, pan, click-for-details popups, hover highlighting |
| Only approved datasets visible | ✅ | Enforced server-side, not in the UI |

---

## 2. Dataset approval workflow

| Requirement | Status | Notes |
| --- | --- | --- |
| New datasets do not appear publicly | ✅ | |
| Approval request available to the Super Admin | ✅ | `/admin/approvals`, defaulting to the Pending filter |
| Super Admin reviews the dataset | ✅ | ⭐ A preview modal renders the exact visualisation before deciding |
| Approve → published to landing page and domain page | ✅ | Automatic; no extra step |
| Reject → not published, Admin sees the status | ✅ | ⭐ With a required, stored rejection reason |

---

## 3. Public website structure

| Requirement | Status | Notes |
| --- | --- | --- |
| Landing page shows all approved charts | ✅ | |
| Ordered by the sequence in which they were approved | ✅ | An atomic `publishSequence` counter is assigned on approval; the public feed sorts by it |
| Newly approved datasets slot into that sequence | ✅ | ⭐ Re-approving an edited dataset keeps its original position |
| Same visualisation also appears on its domain page | ✅ | One feed, filtered by domain |

---

## 4. Domain-wise routes

| Requirement | Status |
| --- | --- |
| `/climate` | ✅ |
| `/energy` | ✅ |
| `/power` | ✅ |
| All approved datasets of a domain listed under it | ✅ |

---

## 5–6. Data visualisation

| Requirement | Status | Notes |
| --- | --- | --- |
| Visualisation generated dynamically from dataset structure + admin configuration | ✅ | Schema registry on the backend, renderer registry on the frontend |
| Not hardcoded to the sample datasets | ✅ | Verified by uploading a new CSV with different headers (`State`, `Value (MW)`) and different states |
| Lat/Long → interactive India map | ✅ | React-Leaflet |
| — zoom in / out | ✅ | |
| — pan | ✅ | |
| — view individual data points | ✅ | ⭐ Marker radius scales with the value |
| — click a point for information | ✅ | Popup with location, value, coordinates and every extra CSV column |
| State-wise → India state-level heatmap | ✅ | Choropleth over the supplied `india.geojson` |
| — differences between states are readable | ✅ | Sequential ramp, hover highlight + tooltip, legend with a "no data" swatch |
| Time series → Line / Bar / Area | ✅ | Recharts; the Admin's choice is honoured |

---

## 7. Dataset structures

| Requirement | Status | Notes |
| --- | --- | --- |
| Latitude / Longitude / Value | ✅ | ⭐ Optional `label` and `category` columns |
| State / Value | ✅ | ⭐ 38 canonical names + aliases (`Orissa`, `NCT of Delhi`, `MH`, `TN`, …) |
| Date-or-Year / Value | ✅ | ⭐ `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `DD/MM/YYYY`; optional `series` column pivots into multiple lines |
| The three sample datasets from the Resources folder work | ✅ | Shipped in `backend/samples/`, loaded by `npm run seed:demo` |
| New datasets can be added through the Admin interface using the same structures | ✅ | ⭐ Header aliasing and prefix matching accept real-world headers such as `Value (MW)` |

---

## 8–11. Stack, deployment, code quality, repository

| Requirement | Status | Notes |
| --- | --- | --- |
| React frontend | ✅ | React 18 + Vite |
| Node.js / Express backend | ✅ | Express 4, ES modules |
| SQL or NoSQL database | ✅ | MongoDB + Mongoose |
| Deployed and publicly accessible | ✅ | `render.yaml` for the API, `vercel.json` for the frontend |
| Clean, modular, component-based, reusable code | ✅ | Controllers → services → models; a shared UI kit; a single `ChartRenderer` |
| Meaningful naming, proper folder structure | ✅ | See the structure section of the README |
| Proper error handling | ✅ | `ApiError` + one central handler; `ErrorBoundary`, loading/error/empty states in the UI |
| Environment variables for sensitive configuration | ✅ | `.env.example` on both sides; nothing secret is committed |
| No unnecessary duplication | ✅ | One dataset table, one form for add/edit, one domain page for three routes |
| Meaningful commits per feature | ✅ | See `git log` |

---

## 12. Bonus / additional features

| Bonus requirement | Status | Notes |
| --- | --- | --- |
| **Email notification when the Super Admin creates an Admin** | ✅ ⭐ | Nodemailer with an HTML template. Degrades gracefully: with no SMTP configured the generated password is shown once in the UI instead |
| **Responsive design (desktop / tablet / mobile)** | ✅ ⭐ | Verified at 390 px, 768 px and 1366 px with no horizontal overflow; collapsible navigation on both layouts |
| **Forgot password / reset password** | ✅ ⭐ | Forgot-password link on login; emailed reset link; SHA-256-hashed, single-use token with a configurable expiry (default 30 min); secure password update |
| **Figma prototype** | ❌ | Not produced — the UI was designed directly in code |

### Additional features beyond the brief

| Feature | Notes |
| --- | --- |
| Visualisation preview before approving | The Super Admin sees the rendered chart or map in a modal in the approval queue |
| Required rejection reason, surfaced to the Admin | Shown inline on the Admin's dashboard row |
| Local CSV preview before upload | First rows are parsed in the browser so mistakes are caught before submitting |
| Structured validation report | A `row · column · problem` table, plus missing-column guidance listing accepted header spellings |
| Header aliasing and prefix matching | `Value (MW)`, `Reading (kWh)`, `Lat`, `ST_NM` all resolve correctly |
| Extra CSV columns preserved | Unrecognised columns survive upload and appear in map popups and the data table |
| "View underlying data" table | Every public visualisation can be inspected as rows |
| Dashboard statistics and filters | Counts by status; filter by status, domain, chart type; search by title |
| Per-Admin dataset counts | The Super Admin sees approved / pending / rejected counts per Admin |
| Admin password reset by the Super Admin | Issues a new temporary password, emailed when possible |
| Change-your-own-password screen | With a prompt when a temporary password is still in use |
| Multi-series time-series support | An optional `series` column is pivoted automatically, with a legend |
| Category-coloured map markers with a legend | Driven by an optional `category` column |
| Value-scaled marker radii | Magnitude is readable without clicking |
| Security hardening | Helmet, CORS allow-list, compression, rate-limited auth routes, bcrypt, account-enumeration-resistant responses, JWT re-validated against live account state on every request |
| Graceful shutdown | SIGTERM/SIGINT handling for clean redeploys |
| Health check endpoint | `/api/health`, wired into the Render blueprint |
| Code-split map and chart bundles | Leaflet and Recharts load only when a visualisation needs them |
| Error boundary | A failing chart cannot blank the whole app |
