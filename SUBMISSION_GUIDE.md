# Submission guide

Everything you need to run this project, deploy it, record the demo, and answer questions about it.

Read **Part A** first if you have not read the assignment brief — it explains, in plain language,
what was asked for and how this project answers it.

---

## Part A — What the assignment asked for

### The problem in one paragraph

Vasudha Foundation wants a web application where staff can upload Climate, Energy and Power
datasets as CSV files and choose how each one should be drawn (a map, a heatmap, or a chart). A
senior person must approve each dataset before anyone outside the organisation can see it. Once
approved, the chart appears automatically on a public website that anyone can browse without
logging in.

### The three kinds of user

| User | What they can do |
| --- | --- |
| **Super Admin** | One built-in account. Sees every dataset and who uploaded it. Approves or rejects them. Can edit or delete anyone's dataset. Creates Admin accounts, disables them, resets their passwords. |
| **Admin** | Created by the Super Admin — there is no public signup. Uploads CSV datasets, picks the domain and chart type, and sees the approval status of their own datasets. |
| **Public user** | No account at all. Browses the published charts and maps. |

### The core rule — the approval workflow

This is the part the brief calls out as mandatory, so expect to be asked about it:

```
Admin uploads a CSV
   → the dataset is saved with status PENDING
   → it is NOT visible on the public site
       ↓
Super Admin sees it in an approvals queue
       ↓
   Approve → status APPROVED
             the chart appears on the landing page AND on its domain page
             (automatically — nobody publishes it a second time)

   Reject  → status REJECTED, with a reason
             the Admin sees that reason on their dashboard
             it stays hidden from the public
```

One extra detail the brief is specific about: **the landing page must show approved charts in the
order they were approved.** This project does that with a `publish_sequence` number handed out at
approval time from a counter locked inside a database transaction.

### The three visualisation types

The Admin picks one when uploading, based on what the CSV contains:

| CSV contains | Visualisation | Example from the Resources folder |
| --- | --- | --- |
| `latitude, longitude, value` | Interactive India map with clickable points | `LatLong_Map_Data` |
| `state, value` | India state-level heatmap (choropleth) | `State_Heatmap_Data` |
| `year/date, value` | Line, Bar or Area chart — the Admin chooses which | `Temperature_TimeSeries` |

Three domains — **Climate**, **Energy**, **Power** — each with its own public page at `/climate`,
`/energy` and `/power`.

### The requirement people fail

> "The visualisation logic should not be hardcoded only for the provided sample datasets."

In other words: it must work for *any* CSV of the right shape, not just the three sample files. If
you are asked about this, the answer is:

- The backend has a **schema registry** (`backend/src/services/datasetSchemas.js`). Each chart type
  declares which columns it needs, what header spellings are accepted, and how each value is parsed.
  The CSV parser reads only that registry — there is no `if (dataset === 'temperature')` anywhere.
- The frontend has a **renderer registry** (`frontend/src/components/charts/ChartRenderer.jsx`).
  Each dataset carries its own configuration, and the page just hands it to `ChartRenderer`.
- Adding a fourth chart type means adding one schema entry and one renderer. No page, route,
  controller or table changes.

This was tested by uploading a completely new CSV with different headers (`State`, `Value (MW)`) and
different states, and it rendered correctly.

### What was asked in the submission email

| Requirement | Status |
| --- | --- |
| Public GitHub repository with the full source | You push it — see Part C |
| Meaningful commits, not one big commit | ✅ 26 feature-scoped commits already in the history |
| List of implemented features | ✅ [`FEATURES.md`](FEATURES.md) |
| Detailed `README.md` | ✅ [`README.md`](README.md) |
| Deployed, publicly accessible URL | You deploy it — see Part D |
| Screen recording, max 5 minutes | See Part E |
| Assumptions / limitations / known issues documented | ✅ README §15 |

### Bonus items

| Bonus | Status |
| --- | --- |
| Email when the Super Admin creates an Admin | ✅ Built. Works without SMTP too — the password is then shown once in the UI |
| Responsive design (desktop / tablet / mobile) | ✅ Tested at 390 px, 768 px, 1366 px |
| Forgot password / reset password | ✅ Emailed link, hashed single-use token, 30-minute expiry |
| Figma prototype | ❌ Not done — documented honestly in the README |

---

## Part B — Run it on your own machine

### What you need

- **Node.js 18+** — check with `node -v`
- **MySQL 8+** — check with `mysql --version`
- **Git**

### 1. Install MySQL (skip if you already have it)

**Windows** — download MySQL Community Server from `dev.mysql.com/downloads/mysql/`, run the
installer, and remember the root password you set.

**macOS**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu / Debian**
```bash
sudo apt update && sudo apt install mysql-server
sudo systemctl start mysql
```

### 2. Create the database

Open a MySQL prompt (`mysql -u root -p`, or `sudo mysql` on Linux) and run:

```sql
CREATE DATABASE vasudha_datavis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vasudha'@'localhost' IDENTIFIED BY 'vasudha_pw_123';
GRANT ALL PRIVILEGES ON vasudha_datavis.* TO 'vasudha'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

You do **not** need to create any tables — the app does that on first start.

### 3. Set up the backend

```bash
cd vasudha-datavis/backend
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```

Open `backend/.env` and set these four lines to match what you just created:

```
DB_NAME=vasudha_datavis
DB_USER=vasudha
DB_PASSWORD=vasudha_pw_123
JWT_SECRET=any-long-random-string-you-like-at-least-32-chars
```

Leave everything else as it is.

### 4. Load the sample data

```bash
npm run seed:demo
```

This creates the Super Admin, a demo Admin, and the three sample datasets from the assignment's
Resources folder — already approved, so the public site has something to show.

You should see:

```
MySQL connected → vasudha_datavis
Super Admin created → superadmin@vasudhaindia.org
Demo Admin created → admin@vasudhaindia.org / Admin@123
Sample dataset seeded → Average Annual Temperature — India (7 rows)
Sample dataset seeded → Renewable Energy Capacity — State Wise (5 rows)
Sample dataset seeded → Power Generation Sites — India (5 rows)
```

### 5. Start the backend

```bash
npm run dev
```

Leave this terminal running. It should say `API listening on port 5000`.

Check it works: open <http://localhost:5000/api/health> — you should see `{"success":true,...}`.

### 6. Start the frontend — in a **second** terminal

```bash
cd vasudha-datavis/frontend
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm run dev
```

Open <http://localhost:5173>.

### 7. Log in

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@vasudhaindia.org` | `Admin@123` |
| Demo Admin | `admin@vasudhaindia.org` | `Admin@123` |

### If something goes wrong

| Symptom | Cause and fix |
| --- | --- |
| `ER_ACCESS_DENIED_ERROR` | `DB_USER` / `DB_PASSWORD` in `backend/.env` do not match the MySQL user you created |
| `ECONNREFUSED ... 3306` | MySQL is not running. Start the service |
| `Unknown database 'vasudha_datavis'` | You skipped the `CREATE DATABASE` step |
| Frontend loads but says "Unable to reach the server" | The backend is not running, or `VITE_API_BASE_URL` in `frontend/.env` is wrong |
| Login says "Too many attempts" | The rate limiter. Wait 15 minutes, or raise `AUTH_RATE_LIMIT_MAX` in `backend/.env` |
| Port 5000 already in use | Change `PORT` in `backend/.env`, and match it in `frontend/.env` |

---

## Part C — Push to GitHub

The project already has a full commit history, so do **not** re-initialise git.

1. Create a new **public** repository on GitHub. Do not add a README, .gitignore or licence —
   the repo already has them.
2. In the project folder:

```bash
cd vasudha-datavis
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Confirm on GitHub that the **Commits** tab shows many commits, not one. That is an explicit
requirement in the email.

`.env` files are git-ignored, so no passwords or secrets are pushed — only `.env.example`.

---

## Part D — Deploy it

Three pieces: database, backend, frontend. Do them in this order.

### D1. Database — Aiven (free, no credit card)

1. Sign up at <https://aiven.io/free-mysql-database>.
2. Create a service → **MySQL** → **Free plan** → pick a region close to you → create.
3. Wait until the service is **Running** (a few minutes).
4. From the service Overview page, copy: **Host**, **Port**, **User**, **Password**, **Database
   name** (usually `defaultdb`), and download the **CA certificate**.

Open the CA certificate file in a text editor — you will paste its whole contents in the next step.

### D2. Backend — Render (free)

1. Go to <https://render.com> → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Instance Type:** Free
3. Add these environment variables:

   ```
   NODE_ENV           = production
   JWT_SECRET         = (click "Generate" or paste a long random string)
   DB_HOST            = (from Aiven)
   DB_PORT            = (from Aiven)
   DB_NAME            = defaultdb
   DB_USER            = avnadmin
   DB_PASSWORD        = (from Aiven)
   DB_SSL             = true
   DB_SSL_CA          = (paste the whole CA certificate file contents)
   DB_SYNC            = true
   CORS_ORIGINS       = (leave blank for now — you fill this in at step D4)
   FRONTEND_URL       = (leave blank for now)
   ```

4. Create the service. Watch the logs — you want to see:

   ```
   MySQL connected → defaultdb
   Database schema verified
   Super Admin created → superadmin@vasudhaindia.org
   API listening on port ...
   ```

5. Copy the backend URL, e.g. `https://vasudha-datavis-api.onrender.com`.
6. Test it: open `https://<your-backend-url>/api/health` in a browser.

### D3. Frontend — Vercel (free)

1. Go to <https://vercel.com> → **Add New → Project** → import the same repo.
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (detected automatically)
3. Environment variable:

   ```
   VITE_API_BASE_URL = https://<your-backend-url>/api
   ```

   Note the `/api` at the end — it is required.
4. Deploy, then copy the frontend URL, e.g. `https://vasudha-datavis.vercel.app`.

### D4. Connect them — do not skip this

Go back to Render → your service → **Environment**, and set:

```
CORS_ORIGINS = https://vasudha-datavis.vercel.app
FRONTEND_URL = https://vasudha-datavis.vercel.app
```

No trailing slash. Save — Render redeploys automatically.

**This is the step most people miss.** Without it the frontend loads but every request is blocked
by the browser and you get "Unable to reach the server".

### D5. Add the sample data to the live site (optional)

The live database starts empty apart from the Super Admin. To populate it, either:

- **Through the UI** — log in as Super Admin, create an Admin, upload the three CSVs from
  `backend/samples/`, then approve them. This is also a good rehearsal for the demo video.
- **Or from your machine** — temporarily point your local `backend/.env` at the Aiven database and
  run `npm run seed:demo`.

### D6. Final check

- Open the frontend URL in a **private/incognito window** — the public site must work with no login.
- Click through `/climate`, `/energy`, `/power`.
- Log in at `/login` with the Super Admin credentials.

> Render's free tier sleeps after inactivity. The first request after a quiet period can take
> 30–60 seconds. Open the site once a couple of minutes before recording your demo or sending the
> link.

---

## Part E — The demo recording (max 5 minutes)

Use OBS Studio, Loom, or the Windows Game Bar (`Win + G`). Record at 1080p and keep it under
5 minutes. Suggested run-through — this covers everything the email asks for:

| Time | What to show | Why it matters |
| --- | --- | --- |
| 0:00–0:40 | **Public site**, logged out. Landing page with all three chart types. Zoom and pan the map, click a point, hover states on the heatmap. | Proves "public access without login" and "interact with charts and maps" |
| 0:40–1:00 | Click **Climate**, **Energy**, **Power** in the nav. | Proves the domain routes |
| 1:00–1:20 | Sign in as **Admin**. Show the dashboard table — title, domain, chart type, status. | Proves the Admin dashboard requirement |
| 1:20–2:10 | **Add dataset.** Upload a *deliberately broken* CSV first — show the row-by-row error table. Then fix it and upload a valid one. Point out it is saved as **Pending**. | Proves CSV schema validation with error messages |
| 2:10–2:30 | Open the public site in another tab — **the new dataset is not there.** | Proves nothing is published before approval |
| 2:30–3:20 | Sign in as **Super Admin** → **Approvals**. Preview the dataset, then **Approve**. | Proves the approval workflow |
| 3:20–3:50 | Back to the public site, refresh — the chart is now on the landing page **and** on its domain page. | Proves auto-publishing to both locations |
| 3:50–4:20 | **Admin accounts** — create an Admin, disable one, show the reject flow with a reason. | Proves user management |
| 4:20–4:50 | Resize the browser to phone width, or open on a phone. | Proves responsive design (bonus) |

**Make a broken CSV before you start recording.** Save this as `broken.csv`:

```csv
state,value
Rajasthan,24500
Narnia,999
Gujarat,not-a-number
```

Upload it as a **State-wise heatmap** and it will show two clear errors — a state that does not
exist, and a value that is not a number.

---

## Part F — What to send back

Reply to the assignment email with:

1. **GitHub repository link** — public.
2. **Deployed application URL** — the Vercel link.
3. **Backend URL** — the Render link (helpful for the reviewer).
4. **Login credentials:**
   - Super Admin: `superadmin@vasudhaindia.org` / `Admin@123`
5. **Implemented features** — link to `FEATURES.md` in the repo, or paste its summary.
6. **Demo recording** — an unlisted YouTube link or a Google Drive link with sharing enabled.
7. **Note on limitations** — point them at README §15, which already documents the assumptions,
   the known issues, and the two things that were not done (no unit-test suite, no Figma prototype).

---

## Part G — Likely questions, and honest answers

**Why MySQL rather than a NoSQL database?**
The brief allows either. The data is genuinely relational — users own datasets, datasets have rows,
reviewers reference users — so foreign keys do real work here: `ON DELETE CASCADE` removes a
dataset's rows automatically, and `ON DELETE RESTRICT` prevents deleting an Admin whose datasets are
still published, which keeps the audit trail intact.

**Why are the row values in a JSON column instead of typed columns?**
Because each chart type has a different set of columns, and the brief requires supporting new
dataset structures without changing code. Typed columns would mean a migration for every new shape.
Validation still happens strictly — in `csvParser.js`, before anything is written — so the JSON
column never receives an unchecked value.

**How do you guarantee the landing page order?**
`publish_sequence` is allocated on approval from a `counters` row that is locked inside a
transaction (`SELECT … FOR UPDATE`), and the column has a `UNIQUE` constraint. Two simultaneous
approvals cannot get the same number. The public feed just orders by that column.

**What happens if an Admin edits an already-published dataset?**
It goes back to `PENDING` and disappears from the public site until re-approved — the content the
Super Admin approved has changed, so it needs another look. It keeps its original
`publish_sequence`, so re-approving does not move it to the bottom of the page.

**How is a disabled Admin blocked if their JWT is still valid?**
The auth middleware re-reads the user row from the database on every request rather than trusting
the token's contents, so `is_active = false` takes effect immediately.

**What would you do next, with more time?**
Add a Vitest suite for `csvParser` and the approval service (the current verification is two
end-to-end suites, not unit tests), replace `sequelize.sync()` with versioned migrations, and move
the JWT from `localStorage` into an httpOnly cookie with refresh tokens.
