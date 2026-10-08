output "github_variables" {
  value = {
    GCP_PROJECT_ID             = var.project_id
    RUN_SERVICE                = google_cloud_run_v2_service.frontend.name
    GCP_REGION                 = var.region
    IMAGE_REPOSITORY           = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.frontend.repository_id}/frontend"
    WORKLOAD_IDENTITY_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    DEPLOY_SERVICE_ACCOUNT     = google_service_account.deploy.email
  }
}
output "state_bucket" { value = google_storage_bucket.state.name }
output "live_url" { value = google_cloud_run_v2_service.frontend.uri }
