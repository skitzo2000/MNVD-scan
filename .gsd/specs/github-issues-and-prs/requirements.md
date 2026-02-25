# Requirements: Resolve GitHub Issues and PRs

**Feature**: github-issues-and-prs
**Status**: APPROVED
**Created**: 2026-02-25
**Author**: ZERG Plan

---

## Summary

Resolve 1 open GitHub issue and 3 Dependabot pull requests on the MNVD-scan repository. All items are maintenance/dependency work with no new feature development.

**Note**: PR #133 (eslint 10 major bump) is deferred to a separate session due to peer dependency conflicts requiring manual resolution.

---

## Work Items

### Issue #132: Frontend Dockerfile uses legacy ENV format

**Priority**: Low (non-blocking warning, forward compatibility)
**Effort**: Trivial

**Problem**: The frontend Dockerfile (`frontend/Dockerfile`) uses the deprecated `ENV key value` syntax on lines 21, 30, 32, 56, 57. Docker emits `LegacyKeyValueFormat` warnings during build.

**Requirements**:
1. Replace all `ENV key value` lines with `ENV key=value` format in `frontend/Dockerfile`
2. Affected lines:
   - Line 21: `ENV NEXT_TELEMETRY_DISABLED 1` -> `ENV NEXT_TELEMETRY_DISABLED=1`
   - Line 30: `ENV NODE_ENV production` -> `ENV NODE_ENV=production`
   - Line 32: `ENV NEXT_TELEMETRY_DISABLED 1` -> `ENV NEXT_TELEMETRY_DISABLED=1`
   - Line 56: `ENV PORT 3000` -> `ENV PORT=3000`
   - Line 57: `ENV HOSTNAME "0.0.0.0"` -> `ENV HOSTNAME="0.0.0.0"`
3. Verify Docker build still succeeds after changes

**Additional note from issue**: `npm audit` reports 8 moderate vulnerabilities in frontend. This may be partially addressed by PR #136 (ajv security fix). Remaining audit findings should be evaluated separately.

**Acceptance Criteria**:
- [ ] No `LegacyKeyValueFormat` warnings during `docker build`
- [ ] Frontend container starts and serves correctly
- [ ] Close issue #132

---

### PR #136: bump ajv from 6.12.6 to 6.14.0 in /frontend

**Priority**: Medium (security fix - CVE-2025 $data exploit via regex)
**Author**: Dependabot
**CI Status**: All checks pass
**Merge State**: CLEAN / MERGEABLE
**Files Changed**: `frontend/package-lock.json` only

**Requirements**:
1. Review the ajv 6.14.0 changelog — adds `regExp` option to address a CVE
2. Merge PR via `gh pr merge 136`
3. This is a lockfile-only change (transitive dependency), low risk

**Acceptance Criteria**:
- [ ] PR merged successfully
- [ ] No regression in frontend build

---

### PR #135: bump minimatch and nodemon in /backend

**Priority**: Medium (security + bug fixes for minimatch; nodemon bugfixes)
**Author**: Dependabot
**CI Status**: All checks pass
**Merge State**: CLEAN / MERGEABLE
**Files Changed**: `backend/package-lock.json`, `backend/package.json` (nodemon 3.1.11 -> 3.1.14)

**Requirements**:
1. This PR updates nodemon to 3.1.14 (includes minimatch security fix)
2. Note: PR #134 is a subset of this (nodemon 3.1.13). PR #135 supersedes #134
3. Merge PR #135 via `gh pr merge 135`
4. Close PR #134 as superseded (or let Dependabot auto-close it after merge conflict)

**Acceptance Criteria**:
- [ ] PR #135 merged successfully
- [ ] PR #134 closed (superseded)
- [ ] Backend `npm install` resolves cleanly

---

### PR #134: bump nodemon from 3.1.11 to 3.1.13 in /backend (all-dependencies group)

**Priority**: Superseded by PR #135
**Author**: Dependabot
**CI Status**: All checks pass
**Merge State**: CLEAN / MERGEABLE
**Files Changed**: `backend/package-lock.json`, `backend/package.json`

**Requirements**:
1. This PR is superseded by PR #135 (which bumps nodemon to 3.1.14 and includes minimatch fix)
2. Close this PR after PR #135 is merged — Dependabot will likely auto-close due to conflict
3. If not auto-closed, manually close with comment explaining superseded by #135

**Acceptance Criteria**:
- [ ] PR closed (superseded by #135)

---

### PR #133: bump the all-dependencies group in /frontend with 5 updates

**Priority**: Medium-High (eslint major version bump, multiple dev dependency updates)
**Author**: Dependabot
**CI Status**: Frontend build FAILS (ERESOLVE peer dependency conflict)
**Merge State**: UNSTABLE (failing CI)

**Packages Updated**:
- eslint: 9.39.2 -> 10.0.0 (MAJOR version bump)
- @eslint/js: 9.39.2 -> 10.0.1 (MAJOR version bump)
- @typescript-eslint/parser: 8.53.0 -> 8.56.0
- @typescript-eslint/eslint-plugin: 8.53.0 -> 8.56.0
- @next/bundle-analyzer: 16.1.2 -> 16.1.6

**Root Cause of Failure**: `eslint-plugin-react@7.37.5` has peer dependency `eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7"` — does NOT support eslint 10.x yet.

**Requirements**:
1. Cannot merge as-is due to peer dependency conflict
2. Options (choose one):
   - **Option A (Recommended)**: Close PR #133 and handle manually — bump only the compatible packages (@typescript-eslint/*, @next/bundle-analyzer) while keeping eslint at 9.x until eslint-plugin-react supports v10
   - **Option B**: Update eslint-plugin-react to a version supporting eslint 10 (if available), then rebase PR
   - **Option C**: Close PR and wait for Dependabot to regenerate once ecosystem catches up
3. Regardless of option: @typescript-eslint packages and @next/bundle-analyzer should be updated

**Acceptance Criteria**:
- [ ] PR #133 resolved (merged after fix, or closed with manual alternative)
- [ ] Frontend eslint configuration remains functional
- [ ] Docker build passes for frontend

---

## Execution Order

Recommended sequence to minimize conflicts:

1. **PR #136** (ajv security fix) — independent, lockfile-only, merge first
2. **PR #135** (minimatch + nodemon) — independent backend change, merge second
3. **PR #134** — close as superseded after #135 merges
4. **Issue #132** (Dockerfile ENV format) — independent, fix on main after PRs merged
5. ~~**PR #133** (eslint major bump)~~ — **DEFERRED** to separate session

---

## Scope Boundaries

**In Scope**:
- Merging 2 Dependabot PRs (#135, #136) and closing 1 superseded PR (#134)
- Fixing frontend Dockerfile ENV format (issue #132)

**Out of Scope**:
- PR #133 (eslint 10 major bump) — deferred to separate session
- npm audit remediation beyond what these PRs address
- Any feature development
- CI/CD workflow changes
- Production deployment

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| eslint 10 breaks existing lint config | Medium | Keep eslint at 9.x if plugin ecosystem isn't ready |
| Dependabot PRs conflict after sequential merge | Low | Merge in recommended order; Dependabot auto-rebases |
| nodemon update breaks dev workflow | Low | Dev dependency only, well-tested upstream |

---

## Infrastructure Requirements

None. All changes are dependency updates and Dockerfile syntax fixes.
