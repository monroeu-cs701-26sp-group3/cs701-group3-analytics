# Bug Fix Log — Week 8 Update

**Branch:** `week_8`
**Date:** 2026-07-01
**Scope:** Bug fixes, performance, and UX polish following Week 7 review. Found via a
full manual code audit of the backend (FastAPI/SQLAlchemy) and frontend (React/Vite),
since no formal Week 7 written feedback was available to work from.

---

## Critical bugs

### 1. Login was completely broken for the documented demo credentials
- **File:** `backend/app/utils/auth.py`
- **Problem:** `verify_password()` did a plain `plain == hashed` string comparison
  instead of calling `pwd_context.verify()`. The real bcrypt check was present but
  commented out. Combined with the seed data storing placeholder strings like
  `'$2b$12$examplehash_admin'` instead of real bcrypt hashes, the documented login
  (`admin` / `Password123!`) never actually worked — you'd have had to type the
  placeholder string itself as the password.
- **Fix:** Restored real bcrypt verification via `pwd_context.verify(plain, hashed)`
  and removed the dead commented-out code.
- **Also fixed:** `database/seeds/mock_data.sql` now stores real bcrypt hashes of
  `Password123!` (generated with the app's own passlib context), so the documented
  demo accounts actually authenticate.

### 2. `passlib` + latest `bcrypt` crash at runtime
- **File:** `backend/requirements.txt`
- **Problem:** `passlib[bcrypt]==1.7.4` doesn't pin a `bcrypt` version. Installing
  fresh (e.g., for the live deploy) pulls `bcrypt` 5.x, which removed the
  `bcrypt.__about__` attribute passlib's version probe relies on, raising
  `AttributeError: module 'bcrypt' has no attribute '__about__'` on first password
  check — a hard crash, not just a warning. Reproduced locally.
- **Fix:** Pinned `bcrypt==4.0.1`, confirmed working with `passlib==1.7.4`.

### 3. Frontend could never reach a deployed backend
- **File:** `frontend/src/services/authService.js`
- **Problem:** `API_BASE` was hardcoded to `http://localhost:8000/api`, ignoring the
  `VITE_API_URL` env var the README already told teammates to set. Any deployed
  build would silently keep calling `localhost` from the visitor's browser and fail.
- **Fix:** `API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api"`.

### 4. Backend CORS hardcoded to localhost
- **Files:** `backend/app/config.py`, `backend/main.py`
- **Problem:** CORS `allow_origins` was a hardcoded list of localhost ports, so a
  deployed frontend would be blocked by the browser regardless of #3.
- **Fix:** Added `CORS_ORIGINS` setting (comma-separated), read from env, with the
  same localhost defaults for local dev.

### 5. "Export CSV" button called an endpoint that doesn't exist
- **File:** `frontend/src/pages/Dashboard.jsx`, `backend/app/routes/kpi.py`
- **Problem:** The button fetched `http://localhost:8000/api/analytics/export` —
  there is no `/api/analytics` router anywhere in the backend. Clicking it always
  produced a 404.
- **Fix:** Implemented a real `GET /api/kpi/top-categories/export` endpoint
  (same role restriction and audit logging as the existing `/top-categories` route)
  that streams a CSV. Wired the button to it via the shared `API_BASE`.

---

## Data correctness bugs

### 6. KPI dashboard showed fake, unchanging numbers
- **File:** `backend/app/services/etl_ingestion.py`
- **Problem:** `_generate_kpi_snapshot()` hardcoded `retention_rate=72.0`,
  `churn_rate=4.5`, `new_customers=3`, `returning_customers=7`, and
  `top_category="Electronics"` regardless of actual transaction data — explicitly
  marked `# placeholder` in the code.
- **Fix:** Now computed from real data per ETL run:
  - `returning_customers` = customers with >1 completed order; `new_customers` =
    active customers with exactly 1.
  - `retention_rate` = returning / active customers.
  - `churn_rate` = active customers whose most recent completed order is >90 days
    old.
  - `top_category` = category with the highest completed-order revenue.
  - This is a simplified, single-snapshot definition (not full cohort analysis) —
    reasonable for the current mock dataset size, called out here in case a more
    rigorous cohort model is wanted later (see Suggestions below).

---

## Performance

### 7. N+1 queries in the segmentation step
- **File:** `backend/app/services/etl_ingestion.py`
- **Problem:** `_run_segmentation()` ran one `SELECT` per customer to check if they
  were already segmented, plus a separate lazy-loaded query per customer for their
  transactions — 2 extra round trips per customer per ETL run.
- **Fix:** Fetch the full set of already-segmented `customer_id`s in one query
  up front, and eager-load `Customer.transactions` with `selectinload` in the
  initial query.

---

## UX polish

### 8. Divide-by-zero in the Top Categories bar chart
- **File:** `frontend/src/pages/Dashboard.jsx`
- **Problem:** Bar width was computed as `c.revenue / categories[0].revenue`. If the
  top category's revenue was ever `0`, every bar rendered as `NaN%` width.
- **Fix:** Guarded with `Math.max(categories[0].revenue, 1)`, and added an explicit
  empty state ("No category data yet.") instead of rendering a blank card when
  `categories` is empty.

### 9. Inconsistent indentation from a messy paste
- **File:** `frontend/src/pages/Dashboard.jsx` (Top Categories header block)
- **Problem:** A chunk of JSX used raw tabs/inconsistent indent depth, out of step
  with the rest of the file (likely from a copy-paste via the GitHub web upload UI —
  the repo history shows several "Delete/Add files via upload" commits).
  Cleaned up for consistency.

### 10. Repo hygiene
- **Problem:** No `.gitignore` — 11 `__pycache__/*.pyc` files were committed to git.
- **Fix:** Added `.gitignore` (Python caches, `.env`, `node_modules`, `dist`, editor
  files) and removed the tracked bytecode files with `git rm --cached`.

---

## Deployment status

The app is now deployment-ready (env-driven API URL and CORS), but **no live demo
was actually deployed** — spinning up hosting (Render/Vercel/etc.) requires signing
up for a third-party service under your own account/GitHub authorization, which
isn't something that can be done on your behalf. See the **Deployment** section
added to `README.md` for a concrete, free, ~10-minute path (Render for API +
Postgres, Vercel/Netlify for the frontend). Once deployed, add the frontend's URL to
the backend's `CORS_ORIGINS` env var and the backend's URL to the frontend's
`VITE_API_URL` env var.

**Not fixed / verified in this pass:**
- Frontend build was verified for syntax correctness by reading the compiled diff,
  but `npm run build` could not be exercised end-to-end in this environment because
  the local Node version (16) is older than Vite 5's minimum (18+) — this is a
  pre-existing local tooling constraint, not something introduced here. Please
  confirm the build succeeds with Node 18+ before/while deploying.

---

## Suggestions for further improvement

1. **Real cohort-based retention/churn** — the current retention/churn formulas
   (#6) are a reasonable single-snapshot approximation but not true month-over-month
   cohort tracking. Worth revisiting if the KPI page needs to support historical
   trend accuracy rather than the "last snapshot" view.
2. **Unused segment labels** — `SegmentTable.jsx` has badge styling for `At-Risk`
   and `Churned` segments, but `_run_segmentation()` only ever assigns `High-Value`,
   `Returning`, or `New`. Either implement the at-risk/churned rules or remove the
   dead badge styles.
3. **Duplicate `_log()` helper** — `customers.py`, `kpi.py`, and `segments.py` each
   define their own identical `_log(db, user, action, resource)` audit-logging
   helper. Worth extracting to a shared `app/utils/audit.py` to avoid drift.
4. **Loading state** — the dashboard's loading indicator is a single emoji + text;
   a skeleton layout matching the KPI grid would feel smoother on slower
   connections, especially once behind a real deployment with network latency.
5. **Automated tests** — `pytest`/`pytest-asyncio` are in `requirements.txt` but no
   test files exist yet. Even a handful of tests around auth (login success/failure,
   RBAC 403s) and the ETL segmentation logic would have caught bug #1 and #6 long
   before this review.
6. **Secrets in `config.py` defaults** — `SECRET_KEY` and `ENCRYPTION_KEY` fall back
   to placeholder strings if `.env` is missing, which is fine for local dev but easy
   to deploy by accident. Consider failing startup loudly in production if these
   are left at their default values.
