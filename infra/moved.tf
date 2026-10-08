moved {
  from = data.google_project.course
  to   = data.google_project.app
}

moved {
  from = google_billing_budget.course
  to   = google_billing_budget.monthly
}

moved {
  from = google_artifact_registry_repository.course
  to   = google_artifact_registry_repository.frontend
}

moved {
  from = google_cloud_run_v2_service.course
  to   = google_cloud_run_v2_service.frontend
}
