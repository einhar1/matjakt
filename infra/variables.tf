variable "project_id" {
  type        = string
  default     = "project-d3caac43-e28e-41c8-940"
  description = "Existing, isolated deployment project. Terraform does not create or replace it."
  validation {
    condition     = var.project_id != "matjakt-27b7f"
    error_message = "The existing Matjakt hosting project must not be used."
  }
}
variable "billing_account_id" {
  type        = string
  description = "Billing account associated with the deployment project, e.g. 000000-000000-000000."
}
variable "billing_currency" {
  type        = string
  default     = "SEK"
  description = "Must match the billing account currency; thresholds below are denominated in this currency."
  validation {
    condition     = var.billing_currency == "SEK"
    error_message = "This budget implements 50/100 SEK alarms and needs an SEK billing account."
  }
}
variable "github_repository" {
  type    = string
  default = "einhar1/matjakt"
}
variable "github_repository_id" {
  type        = string
  description = "Immutable numeric GitHub repository ID; get it with gh api repos/einhar1/matjakt --jq .id."
}

variable "region" {
  type    = string
  default = "europe-north1"
}
