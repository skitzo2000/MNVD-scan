# Security Hardening Requirements

**Status**: APPROVED
**Created**: 2026-02-25
**Source**: OWASP security scan + docs/plans/2026-02-25-security-hardening-design.md

## Summary

Remediate 10 OWASP security findings (6 critical, 2 high, 2 medium) for the MNVD-scan project. The app runs on a private Tailnet, not the public internet.

## Deployment Assumptions

- Always behind a VPN/Tailnet — not internet-facing
- Single-tenant (one operator, no multi-user)
- Docker containers on same host, same network

## Functional Requirements

### FR-1: Static API Key Authentication (Critical)
- Add `API_KEY` env var
- Create auth middleware checking `X-API-Key` header
- Apply to all `/api/*` routes except `/api/health`
- Frontend proxy sends key via server-side env var
- 401 response for missing/invalid key
- If `API_KEY` is not set, auth is disabled (backwards-compatible)

### FR-2: CORS Restriction (Critical)
- Replace open `cors()` with explicit config
- `CORS_ORIGIN` env var, defaults to `http://frontend:3000`
- Methods: `GET, POST, DELETE`
- Credentials: `false`

### FR-3: Input Validation (Critical)
- Validate `:id` route params are numeric strings, return 400 if not
- `POST /api/queries`: `cpe_id` string max 256, `name`/`description` string max 500, reject non-string types
- `POST /api/test-cpe`: same `cpe_id` validation
- Small `validate` helper at top of `server.js`

### FR-4: Webhook URL Encryption at Rest (Critical)
- New `backend/crypto-utils.js` using Node `crypto` module
- AES-256-GCM with random IV per encryption
- `WEBHOOK_ENCRYPTION_KEY` env var (32-byte hex)
- Stored format: `enc:<iv>:<authTag>:<ciphertext>`
- NAL encrypts on write, decrypts on read
- Plaintext URLs passthrough and auto-encrypt on next write

### FR-5: File Locking (High)
- Add `proper-lockfile` dependency
- Wrap DAL `readFile`/`writeFile` with lock acquire/release
- Lock files in `data/` directory
- Change contained to DAL only

### FR-6: Error Detail Sanitization (High)
- Remove `details: error.message` from `POST /api/scan`
- Remove `details`/`status` from `POST /api/test-cpe`
- Keep `console.error` for server-side debugging

### FR-7: Security Headers (Medium)
- Configure Helmet explicitly: CSP, HSTS
- Add CSP and HSTS to Next.js `headers()` in `next.config.js`

### FR-8: NVD API Key Usage (Medium)
- Send `apiKey` header in `nvd-client.js` axios requests when defined
- Was commented out, re-enable it

### FR-9: Environment Configuration
- Add `API_KEY`, `CORS_ORIGIN`, `WEBHOOK_ENCRYPTION_KEY` to `env_template`
- Add new env vars to all docker-compose files
- Frontend gets `API_KEY` for proxy forwarding

### FR-10: README Security Section
- Document trusted-network-only deployment context with reasons
- Document API key auth, webhook encryption, security env vars
- Note deferred improvements (structured logging, data migrations)

## Files to Create
- `backend/crypto-utils.js`

## Files to Modify
- `backend/server.js`
- `backend/nvd-client.js`
- `backend/dal/index.js`
- `backend/nal/index.js`
- `frontend/next.config.js`
- `frontend/lib/apiProxy.js`
- `env_template`
- `docker-compose.yml`
- `docker-compose.production.yml`
- `docker-compose.versioned.yml`
- `README.md`
- `backend/package.json` (new dependency)

## New Dependencies
- `proper-lockfile` (backend)

## Out of Scope
- Per-user rate limits (single-tenant)
- Structured logging (separate effort)
- Data migration system (separate effort)
- Dependency pinning (lockfiles suffice)
- Hardcoded backend:3000 URL (Docker network by design)
