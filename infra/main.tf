# The user has already created this project. Manage resources inside it only.
data "google_project" "app" { project_id = var.project_id }

resource "google_project_service" "api" {
  for_each = toset([
    "run.googleapis.com", "artifactregistry.googleapis.com",
    "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com", "serviceusage.googleapis.com",
    "storage.googleapis.com", "billingbudgets.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Retained private migration backup; active state is in HCP Terraform.
resource "google_storage_bucket" "state" {
  name                        = "${var.project_id}-tfstate"
  project                     = var.project_id
  location                    = "EU"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  versioning { enabled = true }
  depends_on = [google_project_service.api]
  lifecycle { prevent_destroy = true }
}

resource "google_service_account" "deploy" {
  project      = var.project_id
  account_id   = "matjakt-course-deploy"
  display_name = "Matjakt GitHub deployment"
  depends_on   = [google_project_service.api]
}

resource "google_project_iam_member" "deploy" {
  for_each = toset(["roles/serviceusage.serviceUsageConsumer"])
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "matjakt-github"
  display_name              = "Matjakt GitHub"
  depends_on                = [google_project_service.api]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository_id" = "assertion.repository_id"
    "attribute.repository"    = "assertion.repository"
  }
  attribute_condition = "assertion.repository_id == '${var.github_repository_id}' && assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${var.github_repository}/.github/workflows/ci.yml@refs/heads/main'"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account_iam_member" "github" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_id/${var.github_repository_id}"
  depends_on         = [google_iam_workload_identity_pool_provider.github]
}

resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account_id
  display_name    = "Matjakt: 50 and 100 SEK warnings"
  budget_filter {
    projects        = ["projects/${data.google_project.app.number}"]
    calendar_period = "MONTH"
  }
  amount {
    specified_amount {
      currency_code = var.billing_currency
      units         = "100"
    }
  }
  threshold_rules { threshold_percent = 0.5 }
  threshold_rules { threshold_percent = 1.0 }
  depends_on = [google_project_service.api]
}

resource "google_artifact_registry_repository" "frontend" {
  project       = var.project_id
  location      = var.region
  repository_id = "matjakt-course"
  format        = "DOCKER"
  description   = "Immutable Matjakt release images"
  docker_config { immutable_tags = true }
  depends_on = [google_project_service.api]
  lifecycle { prevent_destroy = true }
}
resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "matjakt-course-runtime"
  display_name = "Matjakt static frontend (no project roles)"
  depends_on   = [google_project_service.api]
}
resource "google_cloud_run_v2_service" "frontend" {
  project              = var.project_id
  name                 = "matjakt-course"
  location             = var.region
  labels               = { app = "matjakt" }
  deletion_protection  = true
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = true
  scaling {
    min_instance_count = 0
    max_instance_count = 2
  }
  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = "30s"
    max_instance_request_concurrency = 80
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
    containers {
      # Bootstrap only. CD owns immutable release images and traffic.
      image = "us-docker.pkg.dev/cloudrun/container/hello:latest"
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1", memory = "256Mi" }
        cpu_idle          = true
        startup_cpu_boost = false
      }
    }
  }
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [template[0].containers[0].image, template[0].revision, traffic, client, client_version]
  }
  depends_on = [google_project_service.api]
}
resource "google_cloud_run_v2_service_iam_member" "deploy" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deploy.email}"
}
resource "google_artifact_registry_repository_iam_member" "deploy" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.frontend.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deploy.email}"
}
resource "google_service_account_iam_member" "runtime_deploy" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}
