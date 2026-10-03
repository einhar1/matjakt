# Verification and acceptance evidence

Observed by Codex on **2026-10-03**. Human review is recorded separately in [AI usage](ai-usage.md).

| Check | Observed result |
|---|---|
| ESLint and TypeScript | Passed |
| Vitest | 9 tests passed |
| Database tests | 15 pgTAP assertions passed; A cannot read/update B's profile |
| Playwright | 4 local tests passed against real Supabase |
| Dependency audit | Full npm audit: 0 vulnerabilities |
| Original schema comparison | public/coop definitions exported read-only; no data copied; [provenance](schema-provenance.md) |
| Course database | All 3 migrations and synthetic fixtures applied; local/remote migration histories match |
| Hosted configuration | public/coop Data API, course Auth URLs, email confirmation enabled |
| Security advisors | No errors; documented warning for public catalog materialized view |
| Terraform fmt / validate | Passed |
| Infrastructure / state | State migrated to HCP; VCS remote auto-apply enabled for main/infra; private GCS history retained |
| Automatic HCP plan/apply | [PR speculative plan passed](https://app.terraform.io/app/einar-org/workspaces/matjakt-course/runs/run-LPkj3WXZpJz3f7oS); [main auto-apply passed](https://app.terraform.io/app/einar-org/workspaces/matjakt-course/runs/run-XNzxH5XxuZUUybFU) with 0 added, 1 changed, 0 destroyed; Google OIDC for both phases |
| No-change plan | Local exit 0 before/after manual releases; [HCP remote plan](https://app.terraform.io/app/einar-org/workspaces/matjakt-course/runs/run-f6DcdhoHRbTzhJTp) finished with 0 add/change/destroy after auto-apply; [sanitized record](terraform-verification.txt) |
| GitHub settings | Course variables/secret configured; main requires CI gate and HCP plan, current branch, 1 review and resolved discussions; setup merge used the explicitly authorized admin exception and protection was restored |
| Hosted manual releases | Two tagged-preview and live smoke-test runs passed |
| Frontend recovery | Previous app revision received 100% traffic and passed smoke; current revision then restored |
| Clean source reproduction | Passed: npm ci, fresh matjakt-repro migrations/seed, lint, TypeScript, 9 unit tests, 15 database assertions and 4 browser tests. This is an automated source snapshot, not the second author's independent clone. |
| Actual GitHub CI / OIDC release | [PR #1 merged](https://github.com/einhar1/matjakt/pull/1) after [green final PR checks](https://github.com/einhar1/matjakt/actions/runs/37131393199); [main CI and release passed](https://github.com/einhar1/matjakt/actions/runs/37131650365), preview/live version matches commit 22ca42a338b5e571a9b594b63e81a87e73dd7390 with dirty=false |
| Intentional failed PR gate | Observed: [failed run](https://github.com/einhar1/matjakt/actions/runs/37128787926) on probe commit 3635e18; expected fuel cost 15 instead of 14 caused unit failure, CI gate failed, course release skipped; assertion restored |
| Second author's clean clone | Pending independent human verification |
| Report PDF | English source prepared with three intended pages; built-in compiler unavailable (platform directories error). PDF/page count unverified |

## Automatic release evidence

The VCS main commit 22ca42a338b5e571a9b594b63e81a87e73dd7390 triggered both HCP Terraform and GitHub Actions. HCP applied the service label through its apply identity. Actions applied pending course migrations, published one immutable container, smoke-tested its tagged preview and promoted that same revision to live. Both version endpoints returned the exact commit and dirty=false. No local credentials were used in either remote execution.

## Hosted manual evidence

Live: https://matjakt-course-s6jsqt6gca-lz.a.run.app
Preview: https://course-preview---matjakt-course-s6jsqt6gca-lz.a.run.app
Supabase course ref: `ixrkepmiwiyqdvckqflt`.

Both manual releases packaged source metadata `cf0959b5b80e027e368183cc316b71871b253579` with `dirty: true`: implementation changes were uncommitted. They are **not** evidence of a released immutable commit or a GitHub Actions run.

Previous application revision: `matjakt-course-r-cf0959b5b80e-bootstrap-1791035615617-1`.
Current application revision: `matjakt-course-r-cf0959b5b80e-bootstrap-1791035851420-1`.
Recovery was verified at 2026-10-03T13:59:56Z. These revisions serve the same source artifact; the exercise proves traffic recovery, not correction of a defective change.

Private local release/rollback metadata is in ignored `output/deployment/`. CI publishes its own release metadata and browser traces/screenshots as artifacts. No state, passwords or administrative keys belong in artifacts.

## Complete before hand-in

Automatic infrastructure and app release evidence is linked above. Have Christopher independently verify a clean clone, record human SQL/IAM review, and compile/check the final 2-3 page report. The course proposal was already submitted by the team; no new proposal is created here.

## Repository and merge authorization

The user confirmed this repository is a copy of the real project and explicitly authorized Codex to merge the PR when checks pass. Normal main protection remains configured. Any administrator exception for this setup merge is user-authorized and is not evidence of independent human code review.
