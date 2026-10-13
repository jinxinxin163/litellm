import { Page } from "./pages";

/**
 * Maps sidebar menu item labels to their corresponding page enum values.
 * This mapping is for the admin role.
 */
export const menuLabelToPage: Record<string, Page> = {
  "Virtual Keys": Page.ApiKeys,
  Models: Page.Models,
  "Models + Endpoints": Page.Models,
  Usage: Page.NewUsage,
  Teams: Page.Teams,
  "Internal Users": Page.Users,
  "Internal User": Page.Users, // Legacy label support
  Logs: Page.Logs,
  // Settings submenu items
  "Router Settings": Page.RouterSettings,
  "Logging & Alerts": Page.LoggingAndAlerts,
  "Admin Settings": Page.AdminPanel,
  "Response Cache": Page.Caching,
  Caching: Page.Caching, // Legacy label support
};
