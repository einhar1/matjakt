terraform {
  required_version = "~> 1.15.2"
  required_providers {
    google      = { source = "hashicorp/google", version = "~> 7.0" }
    google-beta = { source = "hashicorp/google-beta", version = "~> 7.0" }
  }
}
provider "google" {
  project               = var.project_id
  billing_project       = var.project_id
  user_project_override = true
  region                = "europe-north1"
}
provider "google-beta" {
  project               = var.project_id
  billing_project       = var.project_id
  user_project_override = true
}
