# Technical Design: github-issues-and-prs

## Metadata
- **Feature**: github-issues-and-prs
- **Status**: APPROVED
- **Created**: 2026-02-25
- **Author**: ZERG Design

---

## 1. Overview

### 1.1 Summary
Merge 2 Dependabot PRs (#136, #135), close 1 superseded PR (#134), and fix 5 legacy `ENV` syntax lines in `frontend/Dockerfile` (issue #132). All work is maintenance — no new features, no architecture changes.

### 1.2 Goals
- Merge ajv security fix (PR #136)
- Merge minimatch + nodemon update (PR #135)
- Close superseded PR #134
- Fix Docker `LegacyKeyValueFormat` warnings in frontend Dockerfile (issue #132)
- Close GitHub issue #132

### 1.3 Non-Goals
- PR #133 (eslint 10 major bump) — deferred to separate session
- npm audit remediation beyond these PRs
- Feature development, CI/CD changes, production deployment

---

## 2. Architecture

### 2.1 High-Level Design

No architecture changes. This is purely maintenance work:

```
PR #136 (ajv)     ──merge──┐
                            ├── main branch ── Issue #132 fix ── commit + close
PR #135 (nodemon) ──merge──┤
                            │
PR #134 (nodemon) ──close───┘
```

### 2.2 Component Breakdown

| Component | Responsibility | Files |
|-----------|---------------|-------|
| PR #136 merge | Security fix for ajv CVE | `frontend/package-lock.json` |
| PR #135 merge | nodemon + minimatch bump | `backend/package.json`, `backend/package-lock.json` |
| PR #134 close | Superseded cleanup | No file changes |
| Issue #132 fix | Dockerfile ENV syntax | `frontend/Dockerfile` |

### 2.3 Data Flow
N/A — no data flow changes. All work is dependency updates and Dockerfile syntax.

---

## 3. Detailed Design

### 3.1 PR Merges

Both PRs (#136, #135) have passing CI and CLEAN merge state. Merge via `gh pr merge` with squash strategy (Dependabot standard).

### 3.2 Dockerfile ENV Fix

Five lines in `frontend/Dockerfile` need format change from `ENV key value` to `ENV key=value`:

| Line | Before | After |
|------|--------|-------|
| 21 | `ENV NEXT_TELEMETRY_DISABLED 1` | `ENV NEXT_TELEMETRY_DISABLED=1` |
| 30 | `ENV NODE_ENV production` | `ENV NODE_ENV=production` |
| 32 | `ENV NEXT_TELEMETRY_DISABLED 1` | `ENV NEXT_TELEMETRY_DISABLED=1` |
| 56 | `ENV PORT 3000` | `ENV PORT=3000` |
| 57 | `ENV HOSTNAME "0.0.0.0"` | `ENV HOSTNAME="0.0.0.0"` |

---

## 4. Key Decisions

### 4.1 Merge Order

**Context**: Multiple PRs touching different parts of the monorepo need merging.

**Options Considered**:
1. Merge all simultaneously — risk of conflicts
2. Merge sequentially (#136 → #135) — safe, minimal conflict risk
3. Merge #135 first — no advantage over #136 first

**Decision**: Merge #136 first, then #135.

**Rationale**: #136 is lockfile-only (lowest risk). #135 touches `package.json` + lockfile. Different directories (frontend vs backend) so no actual conflict, but sequential merge is safest.

**Consequences**: Straightforward sequential execution.

### 4.2 PR #134 Closure

**Context**: PR #134 (nodemon 3.1.13) is a subset of PR #135 (nodemon 3.1.14).

**Decision**: Let Dependabot auto-close after #135 merge creates a conflict. If not auto-closed, manually close with comment.

**Rationale**: Dependabot typically auto-closes superseded PRs when merge conflicts arise.

### 4.3 Issue #132 Fix Timing

**Decision**: Fix on main branch after PR merges, commit directly.

**Rationale**: Trivial syntax change, no need for a separate PR. Reduces overhead.

---

## 5. Implementation Plan

### 5.1 Phase Summary

| Phase | Tasks | Parallel | Description |
|-------|-------|----------|-------------|
| Level 1: PR Merges | 2 | Yes | Merge #136 and #135 (independent repos) |
| Level 2: PR Cleanup | 1 | No | Close #134 if not auto-closed |
| Level 3: Dockerfile Fix | 1 | No | Fix ENV syntax, commit, close issue |
| Level 4: Verification | 1 | No | Pull main, verify clean state |

### 5.2 File Ownership

| File | Task ID | Operation |
|------|---------|-----------|
| `frontend/package-lock.json` | TASK-001 | merge (via PR #136) |
| `backend/package.json` | TASK-002 | merge (via PR #135) |
| `backend/package-lock.json` | TASK-002 | merge (via PR #135) |
| `frontend/Dockerfile` | TASK-004 | modify |

### 5.3 Dependency Graph

```
TASK-001 (Merge PR #136) ──┐
                            ├── TASK-003 (Close PR #134) ── TASK-004 (Fix Dockerfile) ── TASK-005 (Verify)
TASK-002 (Merge PR #135) ──┘
```

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PR merge conflict | Very Low | Low | PRs touch different directories |
| Dependabot doesn't auto-close #134 | Low | Trivial | Manual close with comment |
| Dockerfile change breaks build | Very Low | Medium | Syntax change only, well-documented format |
| nodemon update breaks dev workflow | Low | Low | Dev dependency, well-tested upstream |

---

## 7. Testing Strategy

### 7.1 PR Verification
- CI passes on both PRs (already confirmed green)
- Post-merge: `git pull` and verify clean working tree

### 7.2 Dockerfile Verification
- After ENV fix: verify no `LegacyKeyValueFormat` warnings
- Optional: `docker build` frontend to confirm (CI will validate on next push)

### 7.3 Verification Commands
- `gh pr view 136 --json state` → state should be MERGED
- `gh pr view 135 --json state` → state should be MERGED
- `gh pr view 134 --json state` → state should be CLOSED
- `gh issue view 132 --json state` → state should be CLOSED

---

## 8. Parallel Execution Notes

### 8.1 Safe Parallelization
- TASK-001 and TASK-002 can run in parallel (different directories)
- All subsequent tasks are sequential

### 8.2 Recommended Workers
- Minimum: 1 worker (sequential execution)
- Optimal: 2 workers (parallelize Level 1)
- Maximum: 2 workers (no benefit beyond 2)

---

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Architecture | | | PENDING |
| Engineering | | | PENDING |
