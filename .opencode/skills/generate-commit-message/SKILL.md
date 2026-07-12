---
name: generate-commit-message
description:
    Generate conventional commit messages automatically. Use when user runs git commit, stages
    changes, or asks for commit message help. Analyzes git diff to create clear, descriptive
    conventional commit messages. Triggers on git commit, staged changes, commit message requests.
compatibility: opencode
metadata:
    audience: developers
    workflow: git
---

## Rules

1. Run `git diff --staged` to inspect changes. If empty, prompt user to stage files and **STOP**.
2. Generate a conventional commit message: `type(scope): subject` (imperative mood, no period, max 72 chars).
3. Display the message AND a copyable `git commit -m "..."` command, then **STOP**.
4. Wait for user reply: `yes` = commit, `edit` = revise, `no` = regenerate, `cancel` = abort.
5. **NEVER** run `git add`/`git stage`, skip hooks (husky), use `--no-verify`, or modify code on failure.
6. If `git commit` fails, report error and **STOP** — never auto-fix.

---

## Confirmation Gate

```
─────────────────────────────────────────
  Proposed commit message:

  <type>(scope): subject

  Optional body (what & why, not how)

  Optional footer (Closes #123, BREAKING CHANGE: ...)
─────────────────────────────────────────

  git commit -m "<type>(scope): subject

  Optional body

  Optional footer>"

─────────────────────────────────────────
  [yes / edit / no / cancel]
```

| Reply | Action |
|---|---|
| `yes`/`y` | Run `git commit -m "..."`. On failure: report error, STOP. |
| `edit`/`e` | Show editable block, user pastes back, re-show gate. |
| `no`/`n` | Regenerate new suggestion, re-show gate. |
| `cancel`/`c` | Abort — discard message, do nothing. |

---

## Change Types

| Observation | Type |
|---|---|
| New feature | `feat` |
| Bug fix | `fix` |
| Urgent patch | `hotfix` |
| Restructure (no behavior change) | `refactor` |
| Tests only | `test` |
| Docs | `docs` |
| CI/deps/tooling | `chore` |
| Performance | `perf` |
| Breaking | add `!` after type + `BREAKING CHANGE:` footer |

---

## Example

```
─────────────────────────────────────────
  feat(auth): add JWT-based authentication

  - Implement login/logout flow
  - Add token management service
  - Guard protected routes with auth middleware

  Closes #42
─────────────────────────────────────────

  git commit -m "feat(auth): add JWT-based authentication

  - Implement login/logout flow
  - Add token management service
  - Guard protected routes with auth middleware

  Closes #42"

─────────────────────────────────────────
  [yes / edit / no / cancel]
```
