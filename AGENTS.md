# AGENTS.md

## What this is

hub-mason-portal is the issue-ingestion frontend of a GitOps factory. It is **not a server or web app** — it is a script that runs in GitHub Actions (`bun run src/index.ts` in `.github/workflows/issue-resolver.yml`) whenever an issue is opened. The workflow injects `HUB_MASON_APP_TOKEN` (required by `OctokitClient`); without it, GitHub API helpers throw.

## Tooling

- **Bun is the package manager** (`bun.lock`). Use `bun install`, never `npm`/`yarn`/`pnpm`.
- Commands: `bun run lint` (eslint), `bun test` (vitest **with coverage**), `bun run format` (prettier).
- There is no typecheck script; lint + tests are the verification path.

## Testing

- **100% coverage is enforced and mandatory**: `vitest.config.ts` fails the run unless lines/branches/functions/statements all hit 100%. Coverage only counts `src/**`, so every new/edited `src` line needs a test. Use `/* v8 ignore next */` only for genuinely untestable code (see the singleton constructor in `src/helpers/github/client/octokit-client.ts`).
- Tests live in `tests/` mirroring `src/` paths. Globals are on (`describe/it/expect/vi` need no imports). `vi.mock` module paths and `vi.resetModules()` are used for entrypoint tests.

## Architecture / conventions

- Entrypoint `src/index.ts` reads the GitHub event from `@actions/github` context and logs it.
- Router (`src/router/index.ts`) dispatches by issue **label**: a label name must equal a directory under `src/handlers/<label>/handler`, which must export `handle(event)` (`Handler` type). Only one known label per issue is allowed.
- New request types: add the label key to `IssueType` in `src/utils/constants.ts`, then create `src/handlers/<label>/handler.ts` (+ `type.ts` for request types).
- Issue bodies are parsed by `@github/issue-parser` against a template file. The template is resolved from the `<!-- template-id: <file>.yml -->` comment in the body, read from `.github/ISSUE_TEMPLATE/`. Issue forms must be registered there (see `repo-provisioning-request.yml`).

## Code style

- Strict TS: `verbatimModuleSyntax` → use `import type` for type-only imports; `noUnusedLocals`/`noUnusedParameters`/`noPropertyAccessFromIndexSignature` are errors.
- Prettier: 4-space indent, single quotes, trailing commas, semicolons.
- Prefer fine-grained lodash imports (`import intersection from 'lodash/intersection'`).

## Git workflow

- Conventional commits (commitlint) enforced by husky `commit-msg`; `pre-commit` runs lint-staged (prettier + `eslint --max-warnings 0 .`).
- `pre-push` blocks direct pushes to `main`: always branch and open a PR. Codeowners: `@tspyder7`.
- Use the repo-local skills `.opencode/skills/generate-commit-message` and `generate-pr-description` when writing commits/PRs.
