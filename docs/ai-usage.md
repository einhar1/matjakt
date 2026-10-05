# AI-assisted tools

## Recorded assistance

- 2026-10-03: OpenAI Codex assisted with reading the 2026 grading criteria and inspecting Matjakt, then proposed the DevOps design. The team selected Terraform, an isolated course environment, a small cloud budget and synthetic data.
- 2026-10-03: Codex generated and edited CI/CD workflows, Terraform, a reconstructed course database baseline/RPCs, tests, operating instructions and the report source. It also repaired existing lint issues and extracted fuel-cost calculation for testing.
- Codex ran available checks and recorded outcomes in `evidence.md`. Tool execution is verification evidence; it is not proof of human review or a successful hosted release.

- 2026-10-03: The team requested Cloud Run instead of Firebase for course hosting and explicitly approved deployment and removal of unused course Firebase IAM. Codex implemented tagged revisions, preview tests and traffic promotion, created the separate Micro project in Adams Org, applied synthetic fixtures, configured GitHub and tested recovery. Existing Matjakt was not modified remotely.

## Provenance and review

The baseline was initially reconstructed from application contracts. After CLI access was restored, Codex exported public/coop schema definitions read-only, compared the app-facing contracts, and added exported search/vector definitions through a new migration. At that stage no original data was copied. The later approved catalog snapshot is documented separately. See schema-provenance.md.

Before submission, both authors must inspect and understand generated configuration, verify the identity trust restriction, read the SQL/RLS policies, review test assertions, reproduce the workflow, and explain limitations. Record human reviews below; leave unfinished work explicitly unfinished.

| Reviewer | Commit/files reviewed | Verification performed | Date |
|---|---|---|---|
| Pending | Pending | Pending | Pending |

No automated AI code review service is enabled. The AI-assisted implementation and this planning session satisfy the subject of disclosure; the team must keep this record accurate as further tools are used.

- 2026-10-03: At the team's request, Codex created HCP workspace einar-org/matjakt-course and migrated existing GCS state with Terraform init. Following the clarified requirement, it configured VCS-driven remote automatic plan/apply, separate read-only plan and privileged apply identities, and Google OIDC without private keys. A one-time local identity bootstrap preceded remote execution. The user separately authorized a setup merge in this repository copy after green checks.

- 2026-10-03: Codex verified a VCS-triggered HCP speculative plan, automatic main apply and a following remote no-change plan. An initially missing attestation-read permission was corrected during bootstrap. The setup merge temporarily bypassed admin review enforcement as explicitly authorized, then restored it; this is not human peer review.

- 2026-10-05: After explicit team approval, Codex exported only seven production catalog tables read-only, backed up the course catalog, added NULL-compatible schema changes and a guarded one-time importer. A Unicode COPY-row parsing issue received a regression test. Attempts failed on course disk/WAL capacity; rollback and unchanged course profiles were verified. After the team expanded disk capacity, the import committed and SQL/hosted smoke and checkout verification passed; see catalog-snapshot.md.
