output "github_variables" {
  value = {
    COURSE_GCP_PROJECT_ID             = var.project_id
    COURSE_RUN_SERVICE                = google_cloud_run_v2_service.course.name
    COURSE_GCP_REGION                 = var.region
    COURSE_IMAGE_REPOSITORY           = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.course.repository_id}/frontend"
    COURSE_WORKLOAD_IDENTITY_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    COURSE_DEPLOY_SERVICE_ACCOUNT     = google_service_account.deploy.email
  }
}
output "state_bucket" { value = google_storage_bucket.state.name }
output "live_url" { value = google_cloud_run_v2_service.course.uri }
