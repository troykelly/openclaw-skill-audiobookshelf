# Epic Ralph Template

Use this template when working through an Epic (multiple related issues) with `/ralph-loop`.

## Invocation Template

```text
/ralph-loop "You are working in repo ~/molt/repos/troykelly/openclaw-skill-audiobookshelf.

## EPIC OVERVIEW
<Epic title and description>

## ISSUES IN SCOPE
<List of issue numbers with titles>

## NON-NEGOTIABLE RULES
- Work ONLY on a branch; never commit to main.
- Use TDD (write failing tests first), and run tests locally; do NOT use CI as first line of defense.
- Do not log secrets/PII.
- Preserve existing conventions in the repo.
- One issue → one PR → merge before moving to next issue.

## AGENTIC CODING RULES (must follow)
- Issue-driven: every change maps to a GitHub issue with acceptance criteria; keep the issue updated as you work.
- Type safety: avoid `any`; use `unknown` only at boundaries and narrow immediately.
- No silent failures: handle/propagate errors with context; never log secrets/PII.
- Separation of concerns; keep I/O at the edges.
- Idempotency: operations safe to retry; use upserts/existence checks.
- Configuration: no hardcoded secrets/URLs/ports; use env/config.
- Incremental verification + atomic commits: small, tested commits; format `[#issue] Brief description`.

## PROCESS (must follow in order for EACH issue)
1. Read the issue and restate the acceptance criteria
2. Create branch: issue/<number>-<slug>
3. Implement with TDD (failing tests first)
4. Full testing locally before PR (NEVER use CI as first defense)
5. Update issue with completion; mark acceptance criteria complete only if truly complete + tested
6. Commit + push branch + raise PR
7. Perform code review: security + blind spot at least
8. Action ALL code review items
9. Fix CI issues until green
10. Unless PR marked human-approval-only: approve + merge
11. Fetch, switch to main, pull
12. Continue with next issue in scope

## STOP CONDITIONS
- If blocked after reasonable attempts, document blockers in the issue and stop.
- Only output <promise>EPIC COMPLETE</promise> when ALL issues in scope are merged to main." \
--completion-promise "EPIC COMPLETE" \
--max-iterations 150
```

## Key Points

- **Epic scope is fixed**: Only work on the issues listed in the prompt
- **Sequential delivery**: Complete each issue fully (merged to main) before starting the next
- **Completion promise**: Only emit when ALL issues are done and merged
- **Iteration cap**: 150 is a reasonable default; adjust based on epic size
