# AGENTS.md

## What this is

hub-mason-portal is the issue-ingestion frontend of a GitOps factory. It is **not a server or web app** — it is a script that runs in GitHub Actions (`bun run src/index.ts` in `.github/workflows/issue-resolver.yml`) on `issues: [opened]`. The workflow injects `HUB_MASON_GITHUB_APP_TOKEN`; `hub-mason-core` GitHub helpers require it and throw without it.

Shared logic lives in `hub-mason-core` (`github/event`, `github/issues`, `lifecycle/*`, `adapters/github/*`, `utils/logger`). Do not reimplement locally.

## Tooling

- **Bun is the package manager** (`bun.lock`). Use `bun install`, never `npm`/`yarn`/`pnpm`.
- Commands: `bun run build` (`tsc --noEmit`), `bun run lint` (eslint), `bun test` (vitest **with coverage**), `bun run format` (prettier).
- Verification path is build + lint + tests.

## Testing

- **100% coverage is enforced and mandatory**: `vitest.config.ts` fails the run unless lines/branches/functions/statements all hit 100%. Coverage only counts `src/**`, so every new/edited `src` line needs a test. Use `/* v8 ignore next */` only for genuinely untestable code.
- Tests live in `tests/` mirroring `src/` paths. Globals are on (`describe/it/expect/vi` need no imports). `vi.mock` module paths and `vi.resetModules()` are used for entrypoint tests. Setup file is `tests/fixtures/setup.ts`.
- `vitest.config.ts` inlines `hub-mason-core`/`octokit` via `server.deps.inline` so core ESM loads under vitest.

## Architecture / conventions

- Entrypoint `src/index.ts`: `getEvent()`/`logEvent()` from `hub-mason-core/github/event`, then `AppContext.getInstance()`, then `routeEvent(event)`.
- `AppContext` (`src/context/app-context.ts`) is a singleton holding `GithubInfo`/`IssueInfo`/`RequestInfo`, plus a `MemoryStore<StepStatus>` (`store`), a `repository` getter (`{ owner, repo }`), `statusCommentId`, and `runError`. Step state lives in the store / `LifecycleManager`, not in `AppContext`.
- Router (`src/router/index.ts`): `updateStatus(OPENED)` → `lockIssue` → `assignIssueToUser` → match issue labels against `IssueType` values (exactly one allowed) → `updateStatus(INITIATED)` → dynamic import `../handlers/${type}/lifecycle` (`createLifecycle()`) → `syncStatusComment` → dynamic import `../handlers/${type}/handler` → `handle(event, { lifecycle })`. On error: `failActiveStep`, `cancelPending`, `setRunError`, `updateStatus(FAILED)`, resync comment. `finally` always runs `closeIssue` + `postSummaryComment`; sets `process.exit(1)` on error.
- Lifecycle/reporting: `portalLifecycleConfig` in `src/workflow/portal-config.ts` (statuses/transitions/emoji/`status:` prefix); comment/status/summary helpers in `src/workflow/portal-reporter.ts` backed by `hub-mason-core` comment/label reporters.
- Handlers live at `src/handlers/<IssueType value>/`, e.g. `repository/provision-repository/`: `lifecycle.ts` (`createLifecycle` + `createSteps` via `createBoundSteps`), `handler.ts` exporting `handle(event, context)` (`Handler`/`HandlerContext` in `src/types/context.ts`), `steps.ts` (`STEPS`/`Step`), `type.ts` for request shape, plus `request-validator.ts` (zod).
- New request types: add the label key to `IssueType` in `src/utils/constants.ts`, then create `src/handlers/<label>/lifecycle.ts` + `handler.ts` (+ `steps.ts`/`type.ts` as needed).
- Issue bodies are parsed by `@github/issue-parser` against a template file. The template is resolved from the `<!-- template-id: <file>.yml -->` comment in the body, read from `.github/ISSUE_TEMPLATE/`. Issue forms must be registered there (see `repo-provisioning-request.yml`).

## Code style

- Strict TS: `verbatimModuleSyntax` → use `import type` for type-only imports; `noUnusedLocals`/`noUnusedParameters`/`noPropertyAccessFromIndexSignature`/`noUncheckedIndexedAccess` are errors. Path alias `@/*` maps to repo root (e.g. `@/src/...`).
- Node builtins use `node:` prefix (`node:fs`, `node:path`). Group imports: builtins → external → internal → `import type`.
- Prettier: 4-space indent, single quotes, trailing commas, semicolons.
- Prefer fine-grained lodash imports (`import intersection from 'lodash/intersection'`).

## Git workflow

- Conventional commits (commitlint) enforced by husky `commit-msg`; `pre-commit` runs lint-staged (prettier + `eslint --max-warnings 0 .`).
- `pre-push` blocks direct pushes to `main`: always branch and open a PR. Codeowners: `* @tspyder7`.
- Use the repo-local skills `.agents/skills/commit-message` and `.agents/skills/pr-description` when writing commits/PRs.
