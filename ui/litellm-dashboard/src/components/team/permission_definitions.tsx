import { translate } from "@/i18n/useTranslation";

export interface PermissionInfo {
  method: string;
  endpoint: string;
  description: string;
  route: string;
}

/**
 * Map of permission endpoint patterns to their descriptions
 */
const PERMISSION_DESCRIPTION_KEYS: Record<string, string> = {
  "/key/generate": "teamPermissions.generateKey",
  "/key/service-account/generate": "teamPermissions.generateServiceAccountKey",
  "/key/update": "teamPermissions.updateKey",
  "/key/delete": "teamPermissions.deleteKey",
  "/key/info": "teamPermissions.keyInfo",
  "/key/regenerate": "teamPermissions.regenerateKey",
  "/key/{key_id}/regenerate": "teamPermissions.regenerateKey",
  "/key/list": "teamPermissions.listKeys",
  "/key/block": "teamPermissions.blockKey",
  "/key/unblock": "teamPermissions.unblockKey",
  "/key/access_group_assignment": "teamPermissions.assignAccessGroups",
  "/team/daily/activity": "teamPermissions.viewTeamUsage",
  "/spend/logs": "teamPermissions.viewTeamSpendLogs",
};

export const PERMISSION_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(PERMISSION_DESCRIPTION_KEYS).map(([endpoint, key]) => [endpoint, translate(key)]),
);

/**
 * Determines the HTTP method for a given permission endpoint
 */
export const getMethodForEndpoint = (endpoint: string): string => {
  if (
    endpoint.includes("/info") ||
    endpoint.includes("/list") ||
    endpoint.includes("/activity") ||
    endpoint === "/spend/logs"
  ) {
    return "GET";
  }
  return "POST";
};

/**
 * Parses a permission string into a structured PermissionInfo object
 */
export const getPermissionInfo = (permission: string, t = translate): PermissionInfo => {
  const method = getMethodForEndpoint(permission);
  const endpoint = permission;

  // Find exact match or fallback to default description
  let description = PERMISSION_DESCRIPTION_KEYS[permission];

  // If no exact match, try to find a partial match based on patterns
  if (!description) {
    for (const [pattern, desc] of Object.entries(PERMISSION_DESCRIPTION_KEYS)) {
      if (permission.includes(pattern)) {
        description = desc;
        break;
      }
    }
  }

  return {
    method,
    endpoint,
    description: description ? t(description) : t("teamPermissions.access", { permission }),
    route: permission,
  };
};
