# Technical Design: security-hardening

## Metadata
- **Feature**: security-hardening
- **Status**: APPROVED
- **Created**: 2026-02-25
- **Author**: Factory Design Mode

---

## 1. Overview

### 1.1 Summary
Add defense-in-depth security layers to the MNVD-scan Express + Next.js application. Static API key authentication, CORS restriction, input validation, webhook URL encryption at rest, file locking, error sanitization, and hardened HTTP security headers. All changes are proportional to the trusted-network (Tailnet) deployment context.

### 1.2 Goals
- Close 6 critical, 2 high, and 2 medium OWASP findings
- Maintain backwards compatibility (auth disabled if API_KEY not set)
- Zero new frameworks — use Node built-ins + one small locking library
- No breaking changes to frontend/backend contract

### 1.3 Non-Goals
- Multi-user authentication (Keycloak/OIDC)
- Structured logging overhaul
- Data migration system
- Per-user rate limiting
- Full disk encryption of all JSON data

---

## 2. Architecture

### 2.1 High-Level Design

```
┌──────────┐   X-API-Key    ┌────────────────────────────────────┐
│ Frontend │───────────────▶│ Express Backend                     │
│ (Next.js)│  CORS locked   │                                    │
└──────────┘                │  ┌──────────┐  ┌───────────────┐   │
                            │  │ Auth MW  │─▶│ Input Validate│   │
                            │  └──────────┘  └───────┬───────┘   │
                            │                        │            │
                            │  ┌─────────┐  ┌────────▼────────┐  │
                            │  │ Helmet  │  │  Route Handlers  │  │
                            │  │CSP/HSTS │  └────────┬────────┘  │
                            │  └─────────┘           │            │
                            │           ┌────────────┴──────┐    │
                            │           ▼                   ▼    │
                            │  ┌──────────────┐  ┌────────────┐  │
                            │  │ DAL          │  │ NAL        │  │
                            │  │ +file locks  │  │ +encrypt   │  │
                            │  └──────┬───────┘  └──────┬─────┘  │
                            │         ▼                  ▼        │
                            │  ┌─────────────────────────────┐   │
                            │  │   data/*.json (locked I/O)  │   │
                            │  │   webhooks.json (encrypted)  │   │
                            │  └─────────────────────────────┘   │
                            └────────────────────────────────────┘
```

### 2.2 Component Breakdown

| Component | Responsibility | Files |
|-----------|---------------|-------|
| Auth Middleware | Validate X-API-Key header | `backend/server.js` |
| Input Validators | Sanitize route params and body fields | `backend/server.js` |
| Crypto Utils | AES-256-GCM encrypt/decrypt | `backend/crypto-utils.js` |
| DAL (enhanced) | File locking on read/write | `backend/dal/index.js` |
| NAL (enhanced) | Encrypt/decrypt webhook URLs | `backend/nal/index.js` |
| Helmet Config | CSP, HSTS, security headers | `backend/server.js` |
| Next.js Headers | CSP, HSTS for frontend | `frontend/next.config.js` |
| Frontend Proxy | Forward API key to backend | `frontend/lib/apiProxy.js` |

### 2.3 Data Flow

**Request flow with auth:**
1. Frontend proxy adds `X-API-Key` header from server-side env var
2. Express receives request, rate limiter runs first
3. Auth middleware checks `X-API-Key` against `process.env.API_KEY`
4. If invalid → 401. If no API_KEY configured → passthrough.
5. Route handler validates input (ID format, string lengths, types)
6. Business logic executes
7. DAL acquires file lock → reads/writes JSON → releases lock
8. NAL decrypts webhook URLs on read, encrypts on write
9. Response returned with sanitized error messages (no internal details)

---

## 3. Detailed Design

### 3.1 Auth Middleware

```javascript
function authMiddleware(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next();
  const provided = req.headers['x-api-key'];
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

### 3.2 Input Validation

```javascript
const validate = {
  id(value) {
    return typeof value === 'string' && /^\d+$/.test(value);
  },
  string(value, maxLength) {
    return typeof value === 'string' && value.length <= maxLength;
  },
  cpeId(value) {
    return typeof value === 'string' && value.length <= 256;
  }
};
```

### 3.3 Crypto Utils (AES-256-GCM)

- Key: 32-byte hex from `WEBHOOK_ENCRYPTION_KEY` env var
- IV: 16 random bytes per encryption
- Format: `enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
- Plaintext passthrough: if string doesn't start with `enc:`, return as-is

### 3.4 File Locking

Uses `proper-lockfile` with retry config:
- Retries: 5
- Min timeout: 50ms
- Max timeout: 500ms
- Lock files stored alongside data files (e.g. `queries.json.lock`)

---

## 4. Key Decisions

### 4.1 Static API Key vs Full Auth
**Context**: Need authentication but app is on a Tailnet.
**Decision**: Static API key in env var.
**Rationale**: Proportional to threat model. Network boundary provides first layer. Key prevents accidental cross-service access.

### 4.2 Encrypt Webhook URLs Only
**Context**: Data at rest is all plaintext JSON.
**Decision**: Only encrypt webhook URLs, not all data.
**Rationale**: Webhook tokens are the only sensitive data. CVE info is public. Encrypting everything adds complexity to every I/O operation for no security gain.

### 4.3 proper-lockfile vs write-file-atomic
**Context**: Need concurrent access safety for JSON files.
**Decision**: proper-lockfile for full lock/unlock semantics.
**Rationale**: write-file-atomic prevents partial writes but not read-during-write races. proper-lockfile handles both.

---

## 5. Implementation Plan

### 5.1 Phase Summary

| Phase | Tasks | Parallel | Description |
|-------|-------|----------|-------------|
| Foundation (L1) | 2 | Yes | Dependencies + crypto module |
| Core (L2) | 3 | Yes | DAL locking, NAL encryption, server hardening |
| Integration (L3) | 3 | Yes | Frontend proxy, env config, NVD API key |
| Quality (L4) | 2 | Yes | README + smoke test verification |

### 5.2 File Ownership

| File | Task ID | Operation |
|------|---------|-----------|
| `backend/package.json` | SEC-L1-001 | modify |
| `backend/package-lock.json` | SEC-L1-001 | modify |
| `backend/crypto-utils.js` | SEC-L1-002 | create |
| `backend/dal/index.js` | SEC-L2-001 | modify |
| `backend/nal/index.js` | SEC-L2-002 | modify |
| `backend/server.js` | SEC-L2-003 | modify |
| `frontend/lib/apiProxy.js` | SEC-L3-001 | modify |
| `frontend/next.config.js` | SEC-L3-001 | modify |
| `backend/nvd-client.js` | SEC-L3-002 | modify |
| `env_template` | SEC-L3-003 | modify |
| `docker-compose.yml` | SEC-L3-003 | modify |
| `docker-compose.production.yml` | SEC-L3-003 | modify |
| `docker-compose.versioned.yml` | SEC-L3-003 | modify |
| `README.md` | SEC-L4-001 | modify |

### 5.3 Dependency Graph

```
Level 1 (parallel):
  SEC-L1-001 [Install proper-lockfile]
  SEC-L1-002 [Create crypto-utils.js]

Level 2 (parallel, depends on L1):
  SEC-L2-001 [DAL file locking]        ← SEC-L1-001
  SEC-L2-002 [NAL webhook encryption]  ← SEC-L1-002
  SEC-L2-003 [Server hardening]        ← (no L1 dep, but same level)

Level 3 (parallel, depends on L2):
  SEC-L3-001 [Frontend proxy + headers] ← SEC-L2-003
  SEC-L3-002 [NVD API key]             ← (independent)
  SEC-L3-003 [Env config]              ← SEC-L2-003

Level 4 (parallel, depends on L3):
  SEC-L4-001 [README security section]  ← all L3
  SEC-L4-002 [Smoke test verification]  ← all L3
```

### 5.4 Consumer Matrix

| Task | Creates/Modifies | Consumed By | Integration Test |
|------|-----------------|-------------|-----------------|
| SEC-L1-001 | `backend/package.json` | SEC-L2-001 | — |
| SEC-L1-002 | `backend/crypto-utils.js` | SEC-L2-002 | — |
| SEC-L2-001 | `backend/dal/index.js` | SEC-L2-003 (via routes) | SEC-L4-002 |
| SEC-L2-002 | `backend/nal/index.js` | SEC-L2-003 (via routes) | SEC-L4-002 |
| SEC-L2-003 | `backend/server.js` | SEC-L3-001, SEC-L3-003 | SEC-L4-002 |
| SEC-L3-001 | `frontend/lib/apiProxy.js`, `frontend/next.config.js` | leaf | — |
| SEC-L3-002 | `backend/nvd-client.js` | leaf | — |
| SEC-L3-003 | env_template, docker-compose files | leaf | — |
| SEC-L4-001 | `README.md` | leaf | — |
| SEC-L4-002 | (verification only) | leaf | — |

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Encryption key lost, can't decrypt webhooks | Low | High | Document key generation in README, plaintext passthrough on decrypt |
| File locking deadlock | Low | Medium | proper-lockfile has stale lock detection and retries |
| CSP breaks MUI styles | Medium | Low | `style-src 'unsafe-inline'` allows MUI inline styles |
| Existing plaintext webhooks after upgrade | N/A | N/A | Handled: decrypt returns plaintext as-is, encrypt on next write |

---

## 7. Testing Strategy

### 7.1 Smoke Tests
- Backend starts with new env vars set
- Auth middleware rejects requests without key (401)
- Auth middleware allows requests with correct key (200)
- Health endpoint remains open without key (200)
- Crypto utils round-trip: encrypt → decrypt matches original
- Plaintext passthrough works in decrypt

### 7.2 Verification Commands
Each task has a specific verification command in the task graph.

---

## 8. Parallel Execution Notes

### 8.1 Safe Parallelization
- Level 1: 2 tasks, fully parallel (no shared files)
- Level 2: 3 tasks, fully parallel (each owns different files)
- Level 3: 3 tasks, fully parallel (each owns different files)
- Level 4: 2 tasks, fully parallel

### 8.2 Recommended Workers
- Minimum: 1 worker (sequential)
- Optimal: 3 workers (matches widest level)
- Maximum: 3 workers

---

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Architecture | User | 2026-02-25 | APPROVED (via brainstorming session) |
