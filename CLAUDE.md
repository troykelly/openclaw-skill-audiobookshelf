# CLAUDE.md — openclaw-skill-audiobookshelf

You are Claude Code working in `troykelly/openclaw-skill-audiobookshelf`.

This repo is intended to be maintained by both humans and automated agents. The process rules below are **non-negotiable**.

## Mandatory source docs (read first)

1. **Dev Runbook:** `/home/moltbot/molt/dev/DEV-RUNBOOK.md`
2. **Agentic Coding Rules:** `CODING.md` (this repo)
3. Repo-local guidelines: `AGENTS.md` (this repo)

If you have not read them in this environment, stop and read them.

## Non‑negotiable workflow

- **Issue-driven development only**
  - Every change maps to a GitHub issue with acceptance criteria.
  - If acceptance criteria are vague, refine them in the issue before coding.

- **Branch-only work**
  - Never commit to `main` directly.
  - Prefer `issue/<number>-<slug>` branch names.

- **One issue → one PR**
  - PR title should begin with `[#NN]`.
  - PR body must include `Closes #NN`.

- **TDD + real verification**
  - Write failing tests first.
  - Run tests locally before pushing.
  - If the dev environment provides real services, include integration coverage against the real service.

- **Type safety**
  - Avoid `any`.
  - Use `unknown` only at trust boundaries and narrow immediately.

- **No silent failures**
  - Handle errors explicitly and add context.
  - Don't log secrets or PII.

## Project-specific notes

This is an OpenClaw skill package. Key conventions:

- **SKILL.md** — The skill definition file with YAML frontmatter (name, description, metadata)
- **src/** — TypeScript source for CLI and library
- **bin/** — CLI entry points
- Package manager: **pnpm**
- Node version: Current LTS or latest

## Tooling responsibilities

- **Claude Code is for implementation only.**
- **Codex CLI is for review only** (security + blind spot pass).
- For long-running autonomous work across multiple issues, use **ralph-loop** per the runbook:
  - always set `--max-iterations`
  - only emit the completion promise when the work is truly complete

## Devcontainer / environment

- dev-major must work inside the repo devcontainer.
- The devcontainer must load `GITHUB_TOKEN` and `GITHUB_TOKEN_TROY` from a local `.env` (not committed) per the runbook.

## Commit discipline

- Small, atomic commits, each passing local tests.
- Commit message format: `[#NN] Brief description of change`.

## If you get blocked

- Do not keep hacking.
- Write down the blocker in the issue, create a dedicated blocker issue if needed, and stop.
