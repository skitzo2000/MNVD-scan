# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remediate 10 OWASP security findings across critical/high/medium severity for the MNVD-scan project.

**Architecture:** Add defense-in-depth layers to an Express + Next.js app deployed on a private Tailnet. Static API key auth, input validation, webhook encryption, file locking, and hardened HTTP headers. No new frameworks — uses Node built-ins and one small dependency.

**Tech Stack:** Node.js (Express 5), Next.js 16, Node `crypto` module, `proper-lockfile`

---

### Task 1: Add `proper-lockfile` dependency

**Files:**
- Modify: `backend/package.json`

**Step 1: Install dependency**

Run:
```bash
cd /home/skitz0/Projects/MNVD-scan/backend && npm install proper-lockfile
```

Expected: `proper-lockfile` added to `dependencies` in `package.json`, lockfile updated.

**Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore(deps): add proper-lockfile for file locking"
```

---

### Task 2: Create `backend/crypto-utils.js`

**Files:**
- Create: `backend/crypto-utils.js`

**Step 1: Write crypto-utils module**

```javascript
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:';

function getKey() {
  const hex = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY environment variable is not set');
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  return buf;
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext.startsWith(PREFIX)) {
    return ciphertext; // plaintext passthrough
  }
  const key = getKey();
  const parts = ciphertext.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

module.exports = { encrypt, decrypt, isEncrypted };
```

**Step 2: Verify it loads**

Run:
```bash
cd /home/skitz0/Projects/MNVD-scan/backend && node -e "
const key = require('crypto').randomBytes(32).toString('hex');
process.env.WEBHOOK_ENCRYPTION_KEY = key;
const { encrypt, decrypt, isEncrypted } = require('./crypto-utils');
const plain = 'https://discord.com/api/webhooks/123/abc';
const enc = encrypt(plain);
console.log('encrypted:', enc.substring(0, 30) + '...');
console.log('is encrypted:', isEncrypted(enc));
const dec = decrypt(enc);
console.log('roundtrip matches:', dec === plain);
const passthrough = decrypt(plain);
console.log('plaintext passthrough:', passthrough === plain);
"
```

Expected:
```
encrypted: enc:...
is encrypted: true
roundtrip matches: true
plaintext passthrough: true
```

**Step 3: Commit**

```bash
git add backend/crypto-utils.js
git commit -m "feat: add AES-256-GCM crypto utils for webhook URL encryption"
```

---

### Task 3: Add file locking to DAL

**Files:**
- Modify: `backend/dal/index.js`

**Step 1: Add locking to readFile and writeFile**

At the top of `backend/dal/index.js`, add the require:

```javascript
const lockfile = require('proper-lockfile');
```

Replace the `readFile` method (lines 61-69) with:

```javascript
  async readFile(filePath) {
    let release;
    try {
      release = await lockfile.lock(filePath, { retries: { retries: 5, minTimeout: 50, maxTimeout: 500 } });
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    } finally {
      if (release) await release();
    }
  }
```

Replace the `writeFile` method (lines 71-79) with:

```javascript
  async writeFile(filePath, data) {
    let release;
    try {
      release = await lockfile.lock(filePath, { retries: { retries: 5, minTimeout: 50, maxTimeout: 500 } });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      return false;
    } finally {
      if (release) await release();
    }
  }
```

**Step 2: Verify DAL still works**

Run:
```bash
cd /home/skitz0/Projects/MNVD-scan/backend && node -e "
const DataAccessLayer = require('./dal');
const path = require('path');
(async () => {
  const dal = new DataAccessLayer(path.join(__dirname, 'data'));
  await dal.initialize();
  const queries = await dal.getAllQueries();
  console.log('queries loaded:', Array.isArray(queries));
  console.log('count:', queries.length);
})().catch(console.error);
"
```

Expected: `queries loaded: true` and a count number.

**Step 3: Commit**

```bash
git add backend/dal/index.js
git commit -m "feat: add file locking to DAL read/write operations"
```

---

### Task 4: Add webhook URL encryption to NAL

**Files:**
- Modify: `backend/nal/index.js`

**Step 1: Add crypto-utils require and encrypt/decrypt helpers**

At the top of `backend/nal/index.js` (after line 2), add:

```javascript
const cryptoUtils = require('../crypto-utils');
```

Add two private helper methods to the `NotificationAccessLayer` class, just before the `getNotifications()` method (before line 99):

```javascript
  /**
   * Encrypt a webhook URL if WEBHOOK_ENCRYPTION_KEY is set
   */
  _encryptUrl(url) {
    if (!process.env.WEBHOOK_ENCRYPTION_KEY) return url;
    if (cryptoUtils.isEncrypted(url)) return url;
    return cryptoUtils.encrypt(url);
  }

  /**
   * Decrypt a webhook URL, passing through plaintext if not encrypted
   */
  _decryptUrl(url) {
    if (!process.env.WEBHOOK_ENCRYPTION_KEY) return url;
    return cryptoUtils.decrypt(url);
  }
```

**Step 2: Encrypt on write in `addWebhook`**

In the `addWebhook` method (around line 141), change the `newWebhook` object so `url` is encrypted:

Replace:
```javascript
        url,
```
with:
```javascript
        url: this._encryptUrl(url),
```

**Step 3: Encrypt on write in `updateWebhook`**

In the `updateWebhook` method (around line 180), encrypt the URL if it's being updated. After the URL validation block (line 178), add:

```javascript
      if (updates.url) {
        updates.url = this._encryptUrl(updates.url);
      }
```

**Step 4: Decrypt on read in `sendNotification`**

In `sendNotification` (line 259), change:
```javascript
      const success = await notificationService.sendNotification(webhook.url, vulnerability);
```
to:
```javascript
      const success = await notificationService.sendNotification(this._decryptUrl(webhook.url), vulnerability);
```

**Step 5: Decrypt on read in `sendNotificationToCategory`**

In `sendNotificationToCategory` (line 281), change:
```javascript
          const success = await notificationService.sendNotification(webhook.url, vulnerability);
```
to:
```javascript
          const success = await notificationService.sendNotification(this._decryptUrl(webhook.url), vulnerability);
```

**Step 6: Decrypt on read in `sendBatchNotification`**

In `sendBatchNotification` (line 313), change:
```javascript
      const success = await notificationService.sendBatchNotification(webhook.url, vulnerabilities, cpeId);
```
to:
```javascript
      const success = await notificationService.sendBatchNotification(this._decryptUrl(webhook.url), vulnerabilities, cpeId);
```

**Step 7: Decrypt on read in `sendBatchNotificationToCategory`**

In `sendBatchNotificationToCategory` (line 335), change:
```javascript
          const success = await notificationService.sendBatchNotification(webhook.url, vulnerabilities, cpeId);
```
to:
```javascript
          const success = await notificationService.sendBatchNotification(this._decryptUrl(webhook.url), vulnerabilities, cpeId);
```

**Step 8: Commit**

```bash
git add backend/nal/index.js
git commit -m "feat: encrypt webhook URLs at rest in NAL"
```

---

### Task 5: Harden `backend/server.js` — auth, CORS, validation, error sanitization, Helmet

This is the largest task. All changes go in `backend/server.js`.

**Files:**
- Modify: `backend/server.js`

**Step 1: Add input validation helpers**

After the existing require block (after line 13), add:

```javascript
const { isValidCPE } = require('./nvd-client');

// Input validation helpers
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

**Step 2: Add auth middleware**

After the `const PORT` line (after line 16), add:

```javascript
// API key authentication middleware
function authMiddleware(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next(); // no key configured = no auth enforced
  const provided = req.headers['x-api-key'];
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

**Step 3: Configure Helmet with explicit options**

Replace line 19 (`app.use(helmet());`) with:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

**Step 4: Configure CORS with explicit options**

Replace line 20 (`app.use(cors());`) with:

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://frontend:3000',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: false,
}));
```

**Step 5: Apply auth middleware to all API routes except health**

After the rate limiter `app.use('/api/', limiter);` line (after line 27), add:

```javascript
app.use('/api/', (req, res, next) => {
  if (req.path === '/health') return next();
  authMiddleware(req, res, next);
});
```

**Step 6: Add input validation to POST /api/queries**

In the `POST /api/queries` handler, after the `const { cpe_id, name, description } = req.body;` line (line 60), replace the existing `cpe_id` check with:

```javascript
    if (!cpe_id || !validate.cpeId(cpe_id)) {
      return res.status(400).json({ error: 'Invalid or missing CPE ID' });
    }
    if (name !== undefined && !validate.string(name, 500)) {
      return res.status(400).json({ error: 'Name must be a string (max 500 chars)' });
    }
    if (description !== undefined && !validate.string(description, 500)) {
      return res.status(400).json({ error: 'Description must be a string (max 500 chars)' });
    }
```

**Step 7: Add ID validation to GET /api/queries/:id/cves**

In the handler (after line 140 `const { id } = req.params;`), add:

```javascript
    if (!validate.id(id)) {
      return res.status(400).json({ error: 'Invalid query ID' });
    }
```

**Step 8: Add ID validation to DELETE /api/queries/:id**

In the handler (after line 154 `const { id } = req.params;`), add:

```javascript
    if (!validate.id(id)) {
      return res.status(400).json({ error: 'Invalid query ID' });
    }
```

**Step 9: Add CPE validation to POST /api/test-cpe**

In the handler, after the existing `cpe_id` check (line 191), add:

```javascript
    if (!validate.cpeId(cpe_id)) {
      return res.status(400).json({ error: 'Invalid CPE ID format' });
    }
```

**Step 10: Remove error detail leaks**

In `POST /api/scan` error handler (line 181), change:
```javascript
    res.status(500).json({ error: 'Failed to run scan', details: error.message });
```
to:
```javascript
    res.status(500).json({ error: 'Failed to run scan' });
```

In `POST /api/test-cpe` error handler (lines 209-213), change:
```javascript
    res.status(500).json({
      error: 'Failed to test CPE',
      details: error.message,
      status: error.response?.status
    });
```
to:
```javascript
    res.status(500).json({ error: 'Failed to test CPE' });
```

**Step 11: Commit**

```bash
git add backend/server.js
git commit -m "feat: add API key auth, CORS restriction, input validation, Helmet config, and sanitize errors"
```

---

### Task 6: Send NVD API key in requests

**Files:**
- Modify: `backend/nvd-client.js`

**Step 1: Enable API key header**

Replace the axios instance creation (lines 16-22):

```javascript
const apiClient = axios.create({
  timeout: 30000, // 30 seconds
  headers: {
    'User-Agent': 'MNVD-Scanner/1.0.0'
    // Temporarily disabled API key: ...(API_KEY && { 'apiKey': API_KEY })
  }
});
```

with:

```javascript
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'MNVD-Scanner/1.0.0',
    ...(API_KEY && { 'apiKey': API_KEY }),
  }
});
```

**Step 2: Commit**

```bash
git add backend/nvd-client.js
git commit -m "fix: send NVD API key in request headers for higher rate limits"
```

---

### Task 7: Add API key header to frontend proxy

**Files:**
- Modify: `frontend/lib/apiProxy.js`

**Step 1: Send X-API-Key in proxy requests**

In `createProxyHandler`, replace the headers object (lines 18-19):

```javascript
        headers: {
          'Content-Type': 'application/json',
        },
```

with:

```javascript
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
        },
```

Do the same in `createDynamicProxyHandler` (lines 49-50):

```javascript
        headers: {
          'Content-Type': 'application/json',
        },
```

with:

```javascript
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
        },
```

**Step 2: Commit**

```bash
git add frontend/lib/apiProxy.js
git commit -m "feat: forward API key from frontend proxy to backend"
```

---

### Task 8: Add CSP and HSTS headers to Next.js

**Files:**
- Modify: `frontend/next.config.js`

**Step 1: Add security headers**

Replace the `headers` array inside the `headers()` function (lines 51-63):

```javascript
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
```

with:

```javascript
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
```

**Step 2: Commit**

```bash
git add frontend/next.config.js
git commit -m "feat: add CSP and HSTS security headers to Next.js"
```

---

### Task 9: Update env_template and docker-compose files

**Files:**
- Modify: `env_template`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.production.yml`
- Modify: `docker-compose.versioned.yml`

**Step 1: Update env_template**

Add the following section at the end of `env_template`:

```env

# Security Configuration
# API key for authenticating requests to the backend
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=

# CORS origin restriction (defaults to http://frontend:3000)
# CORS_ORIGIN=http://frontend:3000

# Encryption key for webhook URLs stored at rest (32 bytes / 64 hex chars)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WEBHOOK_ENCRYPTION_KEY=
```

**Step 2: Update docker-compose.yml**

In the `backend` service `environment` block, after `- PORT=3000`, add:

```yaml
      - API_KEY=${API_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://frontend:3000}
      - WEBHOOK_ENCRYPTION_KEY=${WEBHOOK_ENCRYPTION_KEY}
```

In the `frontend` service `environment` block, after `- BACKEND_URL=http://backend:3000`, add:

```yaml
      - API_KEY=${API_KEY}
```

**Step 3: Update docker-compose.production.yml**

In the `backend` service `environment` block, after `- PORT=3000`, add:

```yaml
      - API_KEY=${API_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://frontend:3000}
      - WEBHOOK_ENCRYPTION_KEY=${WEBHOOK_ENCRYPTION_KEY}
```

In the `frontend` service `environment` block, after `- BACKEND_URL=http://backend:3000`, add:

```yaml
      - API_KEY=${API_KEY}
```

**Step 4: Update docker-compose.versioned.yml**

In the `backend` service `environment` block, after `- PORT=3000`, add:

```yaml
      - API_KEY=${API_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://frontend:3000}
      - WEBHOOK_ENCRYPTION_KEY=${WEBHOOK_ENCRYPTION_KEY}
```

In the `frontend` service `environment` block, after `- BACKEND_URL=http://backend:3000`, add:

```yaml
      - API_KEY=${API_KEY}
```

**Step 5: Commit**

```bash
git add env_template docker-compose.yml docker-compose.production.yml docker-compose.versioned.yml
git commit -m "feat: add security env vars to env_template and docker-compose files"
```

---

### Task 10: Update README with security section

**Files:**
- Modify: `README.md`

**Step 1: Replace the existing "Security Best Practices" section**

Replace the existing section (lines 275-281):

```markdown
## Security Best Practices

- Store API keys securely using environment variables
- Use HTTPS in production
- Regularly rotate API keys
- Monitor application logs for security issues
- Keep dependencies updated (automated via [Dependabot](docs/DEPENDABOT.md))
```

with:

```markdown
## Security

### Deployment Context

MNVD-scan is designed for **trusted-network deployment only** (VPN, Tailnet, LAN). It is **not intended for public internet exposure** for the following reasons:

- **Single-tenant design** — there is no multi-user account system, no RBAC, and no session management. The app assumes a single trusted operator.
- **Static API key authentication** — the backend uses a shared API key rather than per-user credentials. This is appropriate for a private network but insufficient for public access.
- **No built-in TLS termination** — the app serves HTTP. TLS must be provided by the network layer (e.g., Tailscale HTTPS, reverse proxy). On a public network, all traffic including the API key would be transmitted in cleartext.
- **JSON file storage** — data is stored in plaintext JSON files on disk. There is no database-level access control or audit logging.

If you need to expose this app beyond a trusted network, place it behind an authenticating reverse proxy with TLS termination and restrict access at the network level.

### Authentication

All API endpoints (except `/api/health`) require an `X-API-Key` header matching the `API_KEY` environment variable. If `API_KEY` is not set, authentication is disabled.

Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Webhook URL Encryption

Webhook URLs stored in `data/webhooks.json` are encrypted at rest using AES-256-GCM when `WEBHOOK_ENCRYPTION_KEY` is set. Existing plaintext URLs are automatically encrypted on the next write operation.

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | API key for backend authentication | Recommended |
| `CORS_ORIGIN` | Allowed CORS origin (default: `http://frontend:3000`) | No |
| `WEBHOOK_ENCRYPTION_KEY` | AES-256 key for webhook URL encryption (64 hex chars) | Recommended |

### Best Practices

- Store API keys securely using environment variables
- Regularly rotate `API_KEY` and `WEBHOOK_ENCRYPTION_KEY`
- Monitor application logs for security issues
- Keep dependencies updated (automated via [Dependabot](docs/DEPENDABOT.md))

### Future Improvements

The following items are tracked for future work:
- Structured logging with log levels and centralized output
- Data migration system for JSON schema changes
```

**Step 2: Update the Environment Variables table**

In the existing Environment Variables table (around line 267), add the three new variables:

After the `DATA_DIR` row, add:

```markdown
| `API_KEY` | API key for backend authentication | Recommended |
| `CORS_ORIGIN` | Allowed CORS origin (default: `http://frontend:3000`) | No |
| `WEBHOOK_ENCRYPTION_KEY` | AES-256 key for webhook URL encryption (64 hex chars) | Recommended |
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add security section to README with deployment context and configuration"
```

---

### Task 11: Integration test — build and smoke test

**Step 1: Verify backend starts with new env vars**

Run:
```bash
cd /home/skitz0/Projects/MNVD-scan/backend && API_KEY=test123 WEBHOOK_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") node -e "
require('dotenv').config();
process.env.API_KEY = 'test123';
// Just verify the modules load without error
require('./crypto-utils');
require('./dal');
require('./nal');
console.log('All modules loaded successfully');
"
```

Expected: `All modules loaded successfully`

**Step 2: Verify auth middleware rejects unauthenticated requests**

Start the server briefly and test:
```bash
cd /home/skitz0/Projects/MNVD-scan/backend && timeout 5 node -e "
process.env.API_KEY = 'test123';
process.env.CORS_ORIGIN = 'http://localhost:3000';
const http = require('http');

// Quick test: make request without API key
setTimeout(() => {
  http.get('http://localhost:3000/api/queries', (res) => {
    console.log('No key status:', res.statusCode);

    // Now with key
    const req2 = http.get('http://localhost:3000/api/queries', { headers: { 'X-API-Key': 'test123' } }, (res2) => {
      console.log('With key status:', res2.statusCode);
      process.exit(0);
    });
  });
}, 2000);

require('./server');
" 2>&1 || true
```

Expected: `No key status: 401`, `With key status: 200`

**Step 3: Verify health endpoint remains open**

```bash
cd /home/skitz0/Projects/MNVD-scan/backend && timeout 5 node -e "
process.env.API_KEY = 'test123';
const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/api/health', (res) => {
    console.log('Health status:', res.statusCode);
    process.exit(0);
  });
}, 2000);

require('./server');
" 2>&1 || true
```

Expected: `Health status: 200`

---

### Task 12: Final review commit

**Step 1: Check for any unstaged changes**

Run:
```bash
cd /home/skitz0/Projects/MNVD-scan && git status && git diff
```

**Step 2: If clean, done. If anything remains, stage and commit.**
