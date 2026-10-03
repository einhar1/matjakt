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
| Infrastructure / state | Provisioned with Terraform; private versioned GCS state |
| No-change plan | Exit 0, both before and after manual Cloud Run releases; [sanitized record](terraform-verification.txt) |
| GitHub settings | Course variables/secret configured; main requires CI gate, current branch, 1 review and resolved discussions |
| Hosted manual releases | Two tagged-preview and live smoke-test runs passed |
| Frontend recovery | Previous app revision received 100% traffic and passed smoke; current revision then restored |
| Clean source reproduction | Passed: npm ci, fresh matjakt-repro migrations/seed, lint, TypeScript, 9 unit tests, 15 database assertions and 4 browser tests. This is an automated source snapshot, not the second author's independent clone. |
| Actual GitHub CI / OIDC release | [PR #1](https://github.com/einhar1/matjakt/pull/1) published; corrected PR run and automatic main release pending |
| Intentional failed PR gate | Observed: [failed run](https://github.com/einhar1/matjakt/actions/runs/37128787926) on probe commit 3635e18; expected fuel cost 15 instead of 14 caused unit failure, CI gate failed, course release skipped; assertion restored |
| Second author's clean clone | Pending independent human verification |
| Report PDF | English source prepared with three intended pages; built-in compiler unavailable (platform directories error). PDF/page count unverified |

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

Record the PR and Actions URLs once observed. After human approval/merge, verify the automatic main release and exact `/version.json` commit. Demonstrate a failed required check followed by its correction. Have Christopher independently verify a clean clone, record human SQL/IAM review, compile/check the final 2–3 page report and link evidence. The course proposal was already submitted by the team; no new proposal is created here.

## Repository and merge authorization

The user confirmed this repository is a copy of the real project and explicitly authorized Codex to merge the PR when checks pass. Normal main protection remains configured. Any administrator exception for this setup merge is user-authorized and is not evidence of independent human code review.
