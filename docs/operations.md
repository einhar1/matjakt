# Course operations

## Infrastructure and HCP Terraform

The isolated GCP project is `project-d3caac43-e28e-41c8-940`; region `europe-north1`. Terraform reads the supplied project and manages resources inside it.

Active state and execution: [HCP Terraform workspace](https://app.terraform.io/app/einar-org/workspaces/matjakt-course), organization `einar-org`, workspace `matjakt-course`. The VCS connection tracks `einhar1/matjakt`, branch `main`, working directory `infra`. Changes under that directory trigger a remote plan and **automatic apply** after a successful plan. Pull requests receive speculative plans and cannot apply. Application-only changes do not trigger infrastructure runs.

Google authentication uses HCP dynamic OIDC credentials, restricted to the immutable organization/workspace IDs. The plan service account has read permissions; the apply account manages course resources. No Google service account key is stored in HCP. Environment variables are the four names returned by `terraform -chdir=infra output -json hcp_authentication`, plus `GOOGLE_CLOUD_QUOTA_PROJECT` set to the course project. Terraform variables in HCP are `project_id`, `billing_account_id`, `github_repository_id`, `github_repository`, `region`; currency defaults to SEK. Never set `GOOGLE_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS` manually in HCP.

Normal infrastructure changes use a PR: edit configuration, inspect the speculative plan and CI, then merge. HCP serializes state operations and applies from main automatically. Check its run result before treating infrastructure as ready. GitHub Actions runs only `terraform -chdir=infra fmt -check`; HCP Terraform performs initialization, validation and planning through the GitHub App. Actions needs no HCP token or state access.

For read-only investigation:

```sh
terraform login
terraform -chdir=infra init
terraform -chdir=infra output -json github_variables
```

Do not run a local apply or initialize a second workspace against these resources. HCP VCS-connected workspaces receive configuration through GitHub. Workspace settings and variables are administrative bootstrap configuration; changing them requires updating this runbook as well.

State was first migrated from local storage to private versioned GCS, then to HCP. Interactive `terraform init` copied the GCS state; resource IDs and entry count were identical afterwards. HCP assigned a new lineage, and the subsequent local verification plan had no changes. A final local bootstrap created HCP's OIDC identities before remote mode was enabled. All later infrastructure changes run in HCP. Ignored local backups and the protected GCS bucket retain historical state; neither is an active backend.

Fresh establishment requires Google ADC and sufficient project permissions for APIs, IAM, registry, service and project budget management. Establish the resources and HCP OIDC trust once, migrate state into the intended HCP workspace, set the variables above, then enable remote execution, VCS, auto-apply and queue-all-runs. The last setting enables VCS queuing on a newly created workspace. Coordinate migration with no concurrent Terraform operations. Use interactive init, not `-force-copy`.

Cloud Run scales to zero and allows at most two instances. Its runtime identity has no project roles. The deployment identity can update this service, write this registry and act as this runtime identity. Terraform initially establishes a Google hello container; course bootstrap/release replaces it. Terraform ignores release image/revision, traffic and gcloud client metadata, so it cannot undo a release or rollback. Service, registry and the retained GCS backup have destruction protection.

The 50/100 SEK monthly GCP budget alerts warn but do not cap spending. Supabase is billed separately. Artifact images are retained for recovery; inspect storage and review retention/cleanup after grading.

## Course Supabase

Project `ixrkepmiwiyqdvckqflt`, Adams Org, Stockholm region, Micro. Approximate incremental compute cost agreed by the team: USD 10/month. The initial schema and seed have been applied; subsequent releases run migrations only.

The original schema was exported **read-only**, without data, and compared with application contracts. See `schema-provenance.md`. Do not reset a hosted database, migrate the original ref, copy production users or replace an already applied migration.

Use `supabase/hosted.config.toml.example` in an ignored workdir, substituting live/preview URLs, then inspect:

```sh
pnpm exec supabase config diff --project-ref COURSE_REF --workdir PRIVATE_WORKDIR
pnpm exec supabase config push --project-ref COURSE_REF --workdir PRIVATE_WORKDIR --yes
```

Hosted Data API exposes `public, coop`, search path `public, extensions`; Auth points to the course live URL and tagged preview, with email confirmation enabled. Undeclared hosted properties stay intact. Local confirmation is disabled only for disposable test users.

For first-time establishment only, run the course guard and then CLI `db push --project-ref COURSE_REF --include-seed`. Never use `--include-seed` in releases.

Catalog tables grant browser reads only. Profiles grant authenticated users select/update on their own row. The private signup trigger creates profiles. The public materialized deals view intentionally exposes catalog data; Supabase advisors warn about materialized API views because they do not apply RLS. This view has no account or private data. Refresh it after administrative catalog updates; no crawler is scheduled.

## GitHub setup

Environment `course` is restricted to protected branches; the workflow and OIDC trust permit main only. Main rulesets require an up-to-date `CI gate`, the HCP Terraform status and configured code-scanning/quality checks. Force pushes and deletion are disabled, including for administrators.

Variables: `COURSE_GCP_PROJECT_ID`, `COURSE_GCP_REGION`, `COURSE_RUN_SERVICE`, `COURSE_IMAGE_REPOSITORY`, `COURSE_WORKLOAD_IDENTITY_PROVIDER`, `COURSE_DEPLOY_SERVICE_ACCOUNT`, `COURSE_SUPABASE_PROJECT_REF`, `COURSE_SUPABASE_URL`, `COURSE_SUPABASE_PUBLISHABLE_KEY`.

One environment secret: `COURSE_SUPABASE_DB_URL`, a TLS session-pooler connection with user `postgres.COURSE_REF`, port 5432 and `sslmode=require`. The migration script checks that its ref matches the browser/course configuration. IPv4 pooler connectivity has been verified. A personal Supabase API token and a Google service-account key are unnecessary. Never place the DB URL in a `VITE_` variable.

These settings are configured. PR #1 has demonstrated a failed gate and a corrected green run. The user authorized Codex to merge this setup PR in the course copy after checks pass; normal review protection stays configured. Independent human review is still needed for course hand-in.

## Release, bootstrap and recovery

CI verifies the actual main commit, builds with course browser variables, applies migrations, authenticates through OIDC, pushes an immutable container tag, deploys a tagged zero-traffic revision, tests it, moves 100% traffic to that exact revision and tests live. Auth runs after dependencies and migration installation. No rebuild occurs inside the container.

`output/deployment/release.json` records commit, image, revision, URLs, previous traffic and promotion/test status. CI retains this and Playwright artifacts. A failed preview leaves live traffic unchanged. A live test failure still leaves recorded recovery information.

For explicitly approved manual bootstrap, keep the course environment in ignored `.env.course.local`, configure Docker auth, then:

```sh
gcloud auth configure-docker europe-north1-docker.pkg.dev --quiet
pnpm run build:course
pnpm run bootstrap:course
```

This uses local credentials and is **not** proof of an Actions deployment. The version file marks uncommitted local source as dirty.

Choose a previous revision from release metadata or `gcloud run revisions list`. Set `COURSE_GCP_PROJECT_ID`, `COURSE_GCP_REGION`, `COURSE_RUN_SERVICE` and `ROLLBACK_REVISION`, then:

```sh
pnpm run rollback:course
# Set PLAYWRIGHT_BASE_URL to live and GITHUB_SHA to the restored commit.
SMOKE_SEARCH_TERM=mjölk pnpm exec playwright test smoke.spec.ts
```

Rollback restores frontend traffic only. Database errors require a forward corrective migration. Coordinate manual operations so they do not overlap a release. Retain old revisions/images until recovery evidence is collected.

## Acceptance and cleanup

Collect an intentional failed PR, corrected green PR, successful Actions release, no-change Terraform plan, rollback and the second author's clean-clone check. Record real URLs and results in `evidence.md`. Keep credentials and account data out of artifacts.

Retain the course environment for grading. Afterwards explicitly review cleanup; destruction protection must deliberately be removed before a destroy. Delete the separate Supabase project only after grading and team approval.

Sources: [HCP state migration](https://developer.hashicorp.com/terraform/cloud-docs/migrate), [HCP execution modes](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings), [Cloud Run revisions and rollback](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), [public Cloud Run configuration](https://docs.cloud.google.com/run/docs/authenticating/public), [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations), [OIDC action](https://github.com/google-github-actions/auth).

The required HCP GitHub status is `Terraform Cloud/einar-org/repo-id-xYJjys86WtdnrsLN`, supplied by the Terraform Cloud GitHub App (integration ID `39328`). This is the aggregated status for the current repository connection; the old workspace-specific status is not required. HCP posts a successful aggregated status for application-only pull requests that do not trigger an infrastructure plan. If the VCS connection or aggregation mode changes, inspect a recent PR and update the ruleset to the actual status name. The GitHub Actions `CI gate` includes application verification and Terraform formatting; HCP planning is enforced independently by the GitHub ruleset. A passing PR plan does not prove that the post-merge apply succeeded.

## Catalog snapshot

A team-approved one-time production catalog import completed on 2026-10-05 after course disk expansion. See [snapshot status and procedure](catalog-snapshot.md). Local and CI fixtures remain synthetic; no production users are copied.
