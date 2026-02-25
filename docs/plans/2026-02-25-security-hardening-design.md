# Security Hardening Design

Date: 2026-02-25
Status: Approved

## Context

OWASP security scan identified 15 findings (6 critical, 2 high, 6 medium, 2 low). The app runs on a Tailnet (private overlay network), not the public internet. This design remediates the actionable findings while staying proportional to the threat model.

## Deployment Assumptions

- Always behind a VPN/Tailnet — not internet-facing
- Single-tenant (one operator, no multi-user)
- Docker containers on same host, same network

## Findings Addressed

### Critical

#### 1. Static API Key Authentication
- Add `API_KEY` env var to `.env` / `env_template`
- Create `authMiddleware` in `server.js` that checks `X-API-Key` header
- Apply to all `/api/*` routes except `/api/health`
- Frontend sends key via `NEXT_PUBLIC_API_KEY` env var in proxy handler headers
- 401 response for missing/invalid key

#### 2. CORS Restriction
- Replace `app.use(cors())` with explicit config
- `CORS_ORIGIN` env var, defaults to `http://frontend:3000`
- Methods: `GET, POST, DELETE`
- Credentials: `false`

#### 3 & 4. Input Validation
- Validate `:id` params are numeric strings, return 400 if not
- `POST /api/queries`: validate `cpe_id` is string, max 256 chars; `name`/`description` are strings if present, max 500 chars; reject non-string types
- `POST /api/test-cpe`: same `cpe_id` validation
- Small `validate` helper object at top of `server.js`

#### 5. Webhook URL Encryption
- New `backend/crypto-utils.js` using Node built-in `crypto`
- AES-256-GCM with random IV per encryption
- `WEBHOOK_ENCRYPTION_KEY` env var (32-byte hex)
- Stored format: `enc:<iv>:<authTag>:<ciphertext>`
- NAL encrypts on write, decrypts on read
- Plaintext URLs auto-encrypted on next write (migration-free)

### High

#### 7. File Locking
- Add `proper-lockfile` dependency
- Wrap DAL `readFile`/`writeFile` with lock acquire/release
- Lock files in `data/` directory (e.g. `queries.json.lock`)
- Change contained to DAL only

#### 8. Error Detail Leaks
- Remove `details: error.message` from `POST /api/scan` (line 181)
- Remove `details`/`status` from `POST /api/test-cpe` (lines 209-213)
- Keep `console.error` for server-side debugging

### Medium

#### 9 & 10. Security Headers
- Configure Helmet explicitly: CSP (`script-src 'self'`, `style-src 'self' 'unsafe-inline'`), HSTS (1 year)
- Add CSP and HSTS to Next.js `headers()` in `next.config.js`

#### 14. NVD API Key Usage
- Send `apiKey` header in `nvd-client.js` axios requests when `API_KEY` is defined
- Adjust rate limit constants for authenticated tier

## Findings Deferred (Out of Scope)

| # | Finding | Reason |
|---|---------|--------|
| 11 | Per-user rate limits | Single-tenant app, no meaningful user distinction |
| 12 | Structured logging | Cross-cutting, not a vulnerability — separate effort |
| 13 | Data migration system | Reliability improvement, not a security fix |
| 15 | Dependency pinning | Lockfiles already pin; caret ranges are standard |

## Findings Dismissed

| # | Finding | Reason |
|---|---------|--------|
| 16 | Hardcoded backend:3000 | Containers always share a Docker network by design |

## README Security Section

Add a "Security" section to README documenting:
- App designed for trusted-network deployment (VPN/Tailnet/LAN)
- Not intended for public internet exposure, with reasons
- API key authentication required
- Env var reference for new security-related vars
- Future improvements noted (structured logging, data migrations)

## New Dependencies

- `proper-lockfile` (backend) — advisory file locking

## New Files

- `backend/crypto-utils.js` — AES-256-GCM encrypt/decrypt

## Modified Files

- `backend/server.js` — auth middleware, CORS config, input validation, error detail removal, Helmet config
- `backend/nvd-client.js` — send API key header
- `backend/dal/index.js` — file locking
- `backend/nal/index.js` — webhook URL encryption/decryption
- `frontend/next.config.js` — CSP and HSTS headers
- `frontend/lib/apiProxy.js` — send API key header
- `env_template` — new vars (API_KEY, CORS_ORIGIN, WEBHOOK_ENCRYPTION_KEY)
- `README.md` — security section
- `docker-compose.yml` — new env vars
- `docker-compose.production.yml` — new env vars
