# HSEA 2026 — Submission Portal Backend

Production backend for the Holcim Structural Excellence Awards 2026
competition submission system. Node.js + Express + PostgreSQL, designed
to be **stateless and horizontally scalable** for thousands of applicants
submitting around the same deadline.

**There is no file upload in this system.** Applicants manage their own
Google Drive folder and paste the folder URL into the site; the backend
only stores and format-validates that URL.

---

## 1. Local development setup

```bash
cd backend
cp .env.example .env      # then fill in real values
npm install
```

Requirements: Node.js 18.18+, a local or remote PostgreSQL 14+ instance,
optionally Redis (recommended even locally if you want to test rate
limiting behavior that matches production).

## 2. PostgreSQL setup

Create a database and a dedicated app user:

```sql
CREATE DATABASE hsea2026;
CREATE USER hsea_app WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE hsea2026 TO hsea_app;
```

Point `DATABASE_URL` in `.env` at it, then run migrations (see below).

PostgreSQL should **never** be exposed directly to the public internet —
only your backend servers should be able to reach it (VPC/private
networking + security group / firewall rules).

## 3. Environment variables

See `.env.example` for the full list with comments. Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs access/refresh tokens (32+ chars in production) |
| `COOKIE_SECRET` | Signs cookies |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |
| `REDIS_URL` | Optional but strongly recommended in production (distributed rate limiting) |

Never commit `.env`. Only commit `.env.example`.

## 4. Running migrations

```bash
npm run migrate
```

This applies every `.sql` file in `src/db/migrations/` in order, tracked
in a `schema_migrations` table, and is safe to re-run — already-applied
files are skipped. Run it as a deploy step before starting new instances
whenever migrations change.

## 5. Importing IAB members

Membership data is supplied separately by the organizers as CSV
(`iab_membership_number,member_name,status`). No fake records are seeded.

```bash
npm run import:iab -- path/to/iab_members.csv
```

Re-running with an updated CSV upserts existing numbers and adds new ones.

## 6. Importing university domains

Same pattern, for approved university email domains
(`university_name,email_domain,status`):

```bash
npm run import:universities -- path/to/universities.csv
```

Personal-email domains (gmail.com, yahoo.com, etc.) are never added here,
which is what makes student verification reject them automatically.

## 7. Starting the backend (development)

```bash
npm run dev
```

Restarts on file changes (Node's built-in `--watch`). Listens on `PORT`
(default `4000`).

## 8. Production build/run

There's no separate build step (plain ESM Node.js). For production:

```bash
NODE_ENV=production npm start
```

Run this under a process supervisor (systemd, pm2, or your container
orchestrator) that restarts the process on crash and forwards `SIGTERM`
on deploy/scale-down so graceful shutdown (see below) can run.

## 9. Running multiple Node.js instances

The backend is **stateless**: no session state, rate-limit counters, or
submission state live in process memory (rate limiting uses Redis when
configured; everything else lives in PostgreSQL). This means you can run
as many instances as you want, all pointed at the same `DATABASE_URL` and
`REDIS_URL`, and requests can land on any of them interchangeably.

Example (systemd, three instances on different ports):

```bash
PORT=4000 npm start &
PORT=4001 npm start &
PORT=4002 npm start &
```

Or run N replicas of the same container in Kubernetes/ECS/Cloud Run with
no code changes.

## 10. Reverse proxy / load balancer setup

See `nginx/nginx.conf.example` for a ready-to-adapt config that:

- load-balances across multiple upstream Node.js instances,
- terminates TLS,
- proxies `/health` for the load balancer's own health checks,
- caps request body size (no file uploads, so this stays small),
- forwards `X-Forwarded-*` headers (the app trusts the first proxy hop
  via `app.set("trust proxy", 1)`).

If you're using a managed load balancer (AWS ALB, GCP Load Balancer,
Kubernetes Ingress, etc.) instead of self-hosted Nginx, point its health
check at `GET /health` (liveness) and use `GET /health/ready` for
readiness/startup gating, and replicate the same TLS-termination and
`X-Forwarded-*` behavior.

## 11. HTTPS requirements

Production must run behind HTTPS end-to-end. Auth cookies are set with
`Secure`, `HttpOnly`, and `SameSite=strict` when `NODE_ENV=production` —
they will not be sent over plain HTTP, so TLS is not optional.

## 12. Database backup strategy

This is an infrastructure concern, not something the app server does —
**do not** have the Node.js process attempt to copy the database itself.
At minimum:

- Automated **daily** full backups (most managed PostgreSQL offerings —
  RDS, Cloud SQL, etc. — do this natively; enable it).
- **Point-in-time recovery** (WAL archiving) if your provider supports it,
  so you can restore to just before an incident rather than only to last
  night's snapshot.
- Retain backups for at least 30 days; store them in a separate
  region/account from the primary database.
- **Test restores periodically** — an untested backup is not a backup.

## 13. Health checks

- `GET /health` — liveness. Always returns `200 { "status": "ok" }` if the
  process is up. No dependencies checked; keep this cheap and frequent.
- `GET /health/ready` — readiness. Verifies PostgreSQL connectivity and
  returns `503` if the database is unreachable, so a load balancer can
  pull a not-yet-ready or degraded instance out of rotation.

## 14. Monitoring

The app logs structured JSON (via Winston) in production, including a
`requestId` on every log line so a single submission attempt can be
traced across instances. Useful metrics to wire up from your platform/APM
of choice:

- Request count and error rate (by route/status code)
- p50/p95/p99 latency
- PostgreSQL pool usage (`pool.totalCount`, `pool.idleCount`,
  `pool.waitingCount` are available on the `pg` `Pool` instance if you
  want to export them)
- Authentication failures
- Rate-limit rejections (429s)
- Submission starts vs. successful finalizations vs. failed finalizations

Nothing sensitive (passwords, tokens, full connection strings, identity
document contents) is ever logged.

## 15. Load testing

Because thousands of applicants may submit near the deadline, load-test
before relying on any specific capacity number — this repo does not claim
a number without evidence. Suggested tools: `k6`, `autocannon`, or
`artillery`.

Suggested scenarios:

1. **Normal traffic** — a few hundred concurrent users browsing/drafting.
2. **High traffic** — thousands of concurrent users hitting login, start
   submission, draft save, IAB verification, and university verification
   concurrently.
3. **Submission spike** — a large burst of `POST
   /api/submissions/:id/submit` calls in a short window (simulate the
   last hour before the deadline), including deliberately retried/
   duplicate requests to confirm idempotency and double-submission
   protection hold under concurrency.

Capture and review: requests/sec, average/p95/p99 latency, error rate,
PostgreSQL connection pool saturation, CPU, memory, and slow-query logs.
Tune `DATABASE_POOL_MAX` and the number of Node.js instances based on
what you observe, not guesswork.

---

## API overview

All responses use the envelope:

```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "message": "...", "errors": [] }
```

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me            (requires session)
POST /api/auth/refresh
```

### IAB
```
GET /api/iab/verify/:membershipNumber
```

### Universities
```
GET /api/universities/verify-email-domain?email=...
```

### Submissions
```
POST /api/submissions/start
GET  /api/submissions/:applicationId
PUT  /api/submissions/:applicationId
POST /api/submissions/:applicationId/submit   (Idempotency-Key header optional but recommended)
```

Guest-created drafts return a one-time `guestAccessToken` from
`POST /start`; guests must send it back as the `X-Guest-Access-Token`
header on subsequent `GET`/`PUT`/`submit` calls for that Application ID.
Registered users authenticate via their session cookie instead.

### Health
```
GET /health
GET /health/ready
```

---

## Key design decisions

- **Three separate identifiers, on purpose:** internal `id` (UUID, never
  exposed), public `application_id` (`HSEA26-XXXXXX`, safe to display),
  and `project_name` (never unique — two applicants can share a project
  name).
- **No file upload, no Drive API calls.** The backend only regex-validates
  the shape of the Drive folder URL the applicant pastes in.
- **Server-side re-verification always wins.** IAB membership and
  university-domain checks run again at final submission time regardless
  of what status was cached on the draft — the frontend can never mark
  itself verified.
- **Double-submission protection** comes from PostgreSQL, not app memory:
  final submission only updates rows where `status = 'DRAFT'`, executed
  inside a transaction with a row lock (`SELECT ... FOR UPDATE`), so two
  concurrent requests for the same Application ID can't both succeed —
  this holds true across multiple Node.js instances.
- **Idempotency-Key support** on final submission additionally protects
  against network-retry duplicates by replaying the first stored response
  for a given key + Application ID pair, stored in PostgreSQL (not
  process memory) so it works correctly across instances.
