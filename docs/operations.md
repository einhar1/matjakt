# Course operations

## Infrastructure bootstrap

Use the existing isolated GCP project `project-d3caac43-e28e-41c8-940`; Terraform does not create or replace the project. Region: `europe-north1`.

```sh
gcloud auth login
gcloud auth application-default login
gcloud services enable cloudresourcemanager.googleapis.com cloudbilling.googleapis.com --project=project-d3caac43-e28e-41c8-940 --billing-project=project-d3caac43-e28e-41c8-940
```

Copy `infra/terraform.tfvars.example` to ignored `infra/terraform.tfvars`, set the linked billing account and immutable GitHub repository ID (`gh api repos/einhar1/matjakt --jq .id`).

```sh
terraform -chdir=infra init
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
terraform -chdir=infra plan -out=course.tfplan
terraform -chdir=infra apply course.tfplan
```

Inspect the plan before apply. The first bootstrap uses local state. Copy `backend.tf.example` to `backend.tf` and `backend.gcs.hcl.example` to `backend.gcs.hcl`:

```sh
terraform -chdir=infra init -migrate-state -backend-config=backend.gcs.hcl
terraform -chdir=infra plan -detailed-exitcode
terraform -chdir=infra output -json github_variables
```

State has already been migrated to the private versioned GCS bucket. A subsequent plan must exit 0. CI initializes without a backend and cannot apply infrastructure. Infrastructure changes are reviewed and applied locally. Cloud Run scales to zero and allows at most two instances. The runtime identity has no project roles. The deployment identity can update this service, write this registry and act as this runtime identity.

Terraform creates a Google hello container for initial service establishment. The application bootstrap/release replaces it. Terraform ignores the deployed image, revision identifier, traffic and gcloud client metadata so it will not undo a release or rollback. Service, registry and state have destruction protection.

The 50/100 SEK monthly GCP budget alerts are warnings, not a cost cap. The separate Supabase bill is not covered by this GCP budget. Artifact images are retained for recovery; inspect storage and explicitly review retention/cleanup after grading.

## Course Supabase

Project `ixrkepmiwiyqdvckqflt`, Adams Org, Stockholm region, Micro. Approximate incremental compute cost agreed by the team: USD 10/month. The initial schema and seed have been applied; subsequent releases run migrations only.

The original schema was exported **read-only**, without data, and compared with application contracts. See `schema-provenance.md`. Do not reset a hosted database, migrate the original ref, copy production users or replace an already applied migration.

Use `supabase/hosted.config.toml.example` in an ignored workdir, substituting live/preview URLs, then inspect:

```sh
npx supabase config diff --project-ref COURSE_REF --workdir PRIVATE_WORKDIR
npx supabase config push --project-ref COURSE_REF --workdir PRIVATE_WORKDIR --yes
```

Hosted Data API exposes `public, coop`, search path `public, extensions`; Auth points to the course live URL and tagged preview, with email confirmation enabled. Undeclared hosted properties stay intact. Local confirmation is disabled only for disposable test users.

For first-time establishment only, run the course guard and then CLI `db push --project-ref COURSE_REF --include-seed`. Never use `--include-seed` in releases.

Catalog tables grant browser reads only. Profiles grant authenticated users select/update on their own row. The private signup trigger creates profiles. The public materialized deals view intentionally exposes catalog data; Supabase advisors warn about materialized API views because they do not apply RLS. This view has no account or private data. Refresh it after administrative catalog updates; no crawler is scheduled.

## GitHub setup

Environment `course` is restricted to protected branches; the workflow and OIDC trust permit main only. Main requires an up-to-date `CI gate`, one approval, dismissed stale reviews and resolved conversations. Force pushes and deletion are disabled, including for administrators.

Variables: `COURSE_GCP_PROJECT_ID`, `COURSE_GCP_REGION`, `COURSE_RUN_SERVICE`, `COURSE_IMAGE_REPOSITORY`, `COURSE_WORKLOAD_IDENTITY_PROVIDER`, `COURSE_DEPLOY_SERVICE_ACCOUNT`, `COURSE_SUPABASE_PROJECT_REF`, `COURSE_SUPABASE_URL`, `COURSE_SUPABASE_PUBLISHABLE_KEY`.

One environment secret: `COURSE_SUPABASE_DB_URL`, a TLS session-pooler connection with user `postgres.COURSE_REF`, port 5432 and `sslmode=require`. The migration script checks that its ref matches the browser/course configuration. IPv4 pooler connectivity has been verified. A personal Supabase API token and a Google service-account key are unnecessary. Never place the DB URL in a `VITE_` variable.

These settings are configured. Publish implementation through a reviewed PR; commits/pushes remain under the team's control. The unpublished workflow has not yet run on GitHub.

## Release, bootstrap and recovery

CI verifies the actual main commit, builds with course browser variables, applies migrations, authenticates through OIDC, pushes an immutable container tag, deploys a tagged zero-traffic revision, tests it, moves 100% traffic to that exact revision and tests live. Auth runs after dependencies and migration installation. No rebuild occurs inside the container.

`output/deployment/release.json` records commit, image, revision, URLs, previous traffic and promotion/test status. CI retains this and Playwright artifacts. A failed preview leaves live traffic unchanged. A live test failure still leaves recorded recovery information.

For explicitly approved manual bootstrap, keep the course environment in ignored `.env.course.local`, configure Docker auth, then:

```sh
gcloud auth configure-docker europe-north1-docker.pkg.dev --quiet
npm run build:course
npm run bootstrap:course
```

This uses local credentials and is **not** proof of an Actions deployment. The version file marks uncommitted local source as dirty.

Choose a previous revision from release metadata or `gcloud run revisions list`. Set `COURSE_GCP_PROJECT_ID`, `COURSE_GCP_REGION`, `COURSE_RUN_SERVICE` and `ROLLBACK_REVISION`, then:

```sh
npm run rollback:course
# Set PLAYWRIGHT_BASE_URL to live and GITHUB_SHA to the restored commit.
npx playwright test smoke.spec.ts
```

Rollback restores frontend traffic only. Database errors require a forward corrective migration. Coordinate manual operations so they do not overlap a release. Retain old revisions/images until recovery evidence is collected.

## Acceptance and cleanup

Collect an intentional failed PR, corrected green PR, successful Actions release, no-change Terraform plan, rollback and the second author's clean-clone check. Record real URLs and results in `evidence.md`. Keep credentials and account data out of artifacts.

Retain the course environment for grading. Afterwards explicitly review cleanup; destruction protection must deliberately be removed before a destroy. Delete the separate Supabase project only after grading and team approval.

Sources: [Cloud Run revisions and rollback](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), [public Cloud Run configuration](https://docs.cloud.google.com/run/docs/authenticating/public), [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations), [OIDC action](https://github.com/google-github-actions/auth).
