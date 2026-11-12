# Website repository working rules

## Working style

- Work independently on clearly requested tasks.
- Avoid unnecessary repeated reviews, audits, and verification cycles.
- Run only checks relevant to the files and functionality changed.
- Preserve existing website content, CMS behavior, integrations, and configuration unless the task explicitly requires a change.

## Validation

- Run JavaScript syntax checks for changed JavaScript files where applicable.
- Run `git diff --check` before committing.
- Run relevant functional tests for the changed behavior.
- Confirm that no unrelated files, secrets, credentials, or unintended changes are included.
- Never invent test results or claim a deployment succeeded without confirmation.

## Commit and deployment

- When all required checks pass, automatically commit and push the approved changes to the `main` branch.
- Use Vercel's existing Git integration for production deployment; do not perform a separate manual deployment unless explicitly requested.
- Confirm that the production deployment is Ready and perform a brief smoke test of the affected public routes or functionality.
- Report the commit, deployment status, tests passed, and any remaining issue.

## Approval gates

- Do not request approval for routine code edits, relevant tests, commits, pushes, or production deployments when the requested task is clear and all rules above are satisfied.
- Stop and request approval before sensitive changes involving credentials, environment variables, DNS, authentication, database structure, RLS, security permissions, destructive operations, or major architectural changes.
- Do not modify Supabase data or schema, secrets, DNS, or protected deployment settings unless explicitly authorized.

## Failed checks

- If a required check fails, make at most one focused repair attempt.
- If the repaired check still fails, stop and explain the issue instead of repeatedly rerunning the same check.
