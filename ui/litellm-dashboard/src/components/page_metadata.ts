/**
 * Page metadata for UI Settings configuration
 * This file contains descriptions and metadata for all navigation pages
 */

// Page descriptions for UI Settings configuration
export const pageDescriptions: Record<string, string> = {
  "api-keys": "Manage virtual keys for API access and authentication",
  models: "Configure and manage LLM models and endpoints",
  new_usage: "View usage analytics and metrics",
  logs: "Access request and response logs",
  users: "Manage internal user accounts and permissions",
  teams: "Create and manage teams for access control",
  projects: "Manage projects within teams",
  caching: "Configure response caching and coordination Redis settings",
  "router-settings": "Configure routing and load balancing settings",
  "logging-and-alerts": "Set up logging and alert configurations",
  "admin-panel": "Access admin panel and settings",
};

export interface PageMetadata {
  page: string;
  label: string;
  group: string;
  description: string;
}
