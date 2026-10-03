# Bootstrap locally once; thereafter HCP uses phase-specific OIDC credentials.
resource "google_service_account" "hcp" {
  for_each     = toset(["plan", "apply"])
  project      = var.project_id
  account_id   = "matjakt-hcp-${each.key}"
  display_name = "Matjakt HCP Terraform ${each.key}"
  depends_on   = [google_project_service.api]
}
# Google provider pool refresh also reads attestation rules.
resource "google_project_iam_custom_role" "hcp_read" {
  project = var.project_id
  role_id = "matjaktHcpPlan"
  title   = "Matjakt HCP read-only infrastructure plan"
  permissions = [
    "resourcemanager.projects.get", "resourcemanager.projects.getIamPolicy",
    "serviceusage.services.get", "serviceusage.services.list", "serviceusage.services.use",
    "iam.serviceAccounts.get", "iam.serviceAccounts.getIamPolicy",
    "iam.roles.get",
    "iam.workloadIdentityPools.get", "iam.workloadIdentityPools.getAttestationRules", "iam.workloadIdentityPoolProviders.get",
    "storage.buckets.get", "storage.buckets.getIamPolicy",
    "artifactregistry.repositories.get", "artifactregistry.repositories.getIamPolicy",
    "run.services.get", "run.services.getIamPolicy",
    "billing.resourcebudgets.read"
  ]
}
resource "google_project_iam_custom_role" "hcp_budget" {
  project     = var.project_id
  role_id     = "matjaktHcpBudget"
  title       = "Matjakt single-project budget management"
  permissions = ["billing.resourcebudgets.read", "billing.resourcebudgets.write", "resourcemanager.projects.get"]
}
resource "google_project_iam_member" "hcp_read" {
  for_each = google_service_account.hcp
  project  = var.project_id
  role     = google_project_iam_custom_role.hcp_read.name
  member   = "serviceAccount:${each.value.email}"
}
resource "google_project_iam_member" "hcp_apply" {
  for_each = toset([
    "roles/serviceusage.serviceUsageAdmin",
    "roles/iam.serviceAccountAdmin", "roles/iam.serviceAccountUser",
    "roles/iam.workloadIdentityPoolAdmin", "roles/iam.roleAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/run.admin", "roles/artifactregistry.admin", "roles/storage.admin"
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.hcp["apply"].email}"
}
resource "google_project_iam_member" "hcp_budget" {
  project = var.project_id
  role    = google_project_iam_custom_role.hcp_budget.name
  member  = "serviceAccount:${google_service_account.hcp["apply"].email}"
}
resource "google_iam_workload_identity_pool" "hcp" {
  project                   = var.project_id
  workload_identity_pool_id = "matjakt-hcp"
  display_name              = "Matjakt HCP Terraform"
  depends_on                = [google_project_service.api]
}
resource "google_iam_workload_identity_pool_provider" "hcp" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.hcp.workload_identity_pool_id
  workload_identity_pool_provider_id = "terraform"
  attribute_mapping = {
    "google.subject"      = "assertion.sub"
    "attribute.run_phase" = "assertion.terraform_run_phase"
  }
  attribute_condition = "assertion.terraform_organization_id == 'org-5D8QQTKoCy4k3sDN' && assertion.terraform_workspace_id == 'ws-whFcFoMPb3PQAsHX' && assertion.terraform_workspace_name == 'matjakt-course' && assertion.terraform_organization_name == 'einar-org'"
  oidc { issuer_uri = "https://app.terraform.io" }
}
resource "google_service_account_iam_member" "hcp" {
  for_each           = google_service_account.hcp
  service_account_id = each.value.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.hcp.name}/attribute.run_phase/${each.key}"
  depends_on         = [google_iam_workload_identity_pool_provider.hcp]
}
output "hcp_authentication" {
  value = {
    TFC_GCP_PROVIDER_AUTH               = "true"
    TFC_GCP_WORKLOAD_PROVIDER_NAME      = google_iam_workload_identity_pool_provider.hcp.name
    TFC_GCP_PLAN_SERVICE_ACCOUNT_EMAIL  = google_service_account.hcp["plan"].email
    TFC_GCP_APPLY_SERVICE_ACCOUNT_EMAIL = google_service_account.hcp["apply"].email
  }
}
