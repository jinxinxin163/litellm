"use client";
import { useTranslation } from "@/i18n/useTranslation";

import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import { useUpdateUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUpdateUISettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import PageVisibilitySettings from "./PageVisibilitySettings";

interface SettingRowProps {
  ariaLabel: string;
  checked: boolean;
  description?: string;
  disabled: boolean;
  indented?: boolean;
  label: string;
  muted?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({
  ariaLabel,
  checked,
  description,
  disabled,
  indented = false,
  label,
  muted = false,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className={indented ? "ml-8 flex items-start gap-3" : "flex items-start gap-3"}>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={ariaLabel} />
      <div className="space-y-1">
        <p className={muted ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
          {label}
        </p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export default function UISettings() {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const { data, isLoading, isError, error } = useUISettings();
  const { mutate: updateSettings, isPending: isUpdating, error: updateError } = useUpdateUISettings(accessToken);

  const schema = data?.field_schema;
  const property = schema?.properties?.disable_model_add_for_internal_users;
  const disableTeamAdminDeleteProperty = schema?.properties?.disable_team_admin_delete_team_user;
  const requireAuthForPublicAIHubProperty = schema?.properties?.require_auth_for_public_ai_hub;
  const forwardClientHeadersProperty = schema?.properties?.forward_client_headers_to_llm_api;
  const forwardLLMProviderAuthHeadersProperty = schema?.properties?.forward_llm_provider_auth_headers;
  const enableProjectsUIProperty = schema?.properties?.enable_projects_ui;
  const enableChatUIProperty = schema?.properties?.enable_chat_ui;
  const enabledPagesProperty = schema?.properties?.enabled_ui_pages_internal_users;
  const disableAgentsProperty = schema?.properties?.disable_agents_for_internal_users;
  const allowAgentsTeamAdminsProperty = schema?.properties?.allow_agents_for_team_admins;
  const disableVectorStoresProperty = schema?.properties?.disable_vector_stores_for_internal_users;
  const allowVectorStoresTeamAdminsProperty = schema?.properties?.allow_vector_stores_for_team_admins;
  const scopeUserSearchProperty = schema?.properties?.scope_user_search_to_org;
  const disableCustomApiKeysProperty = schema?.properties?.disable_custom_api_keys;
  const values = data?.values ?? {};
  const isDisabledForInternalUsers = Boolean(values.disable_model_add_for_internal_users);
  const isDisabledTeamAdminDeleteTeamUser = Boolean(values.disable_team_admin_delete_team_user);
  const isAgentsDisabled = Boolean(values.disable_agents_for_internal_users);
  const isVectorStoresDisabled = Boolean(values.disable_vector_stores_for_internal_users);

  const handleToggle = (checked: boolean) => {
    updateSettings(
      { disable_model_add_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleTeamAdminDelete = (checked: boolean) => {
    updateSettings(
      { disable_team_admin_delete_team_user: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleUpdatePageVisibility = (settings: { enabled_ui_pages_internal_users: string[] | null }) => {
    updateSettings(settings, {
      onSuccess: () => {
        toast.success(t("admin.pageVisibilitySettingsUpdatedSuccessfully"));
      },
      onError: (error) => {
        toast.fromError(error);
      },
    });
  };

  const handleToggleForwardClientHeaders = (checked: boolean) => {
    updateSettings(
      { forward_client_headers_to_llm_api: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleForwardLLMProviderAuthHeaders = (checked: boolean) => {
    updateSettings(
      { forward_llm_provider_auth_headers: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleEnableProjectsUI = (checked: boolean) => {
    updateSettings(
      { enable_projects_ui: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfullyRefreshingPage"));
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleEnableChatUI = (checked: boolean) => {
    updateSettings(
      { enable_chat_ui: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfullyRefreshingPage"));
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleRequireAuthForPublicAIHub = (checked: boolean) => {
    updateSettings(
      { require_auth_for_public_ai_hub: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableAgents = (checked: boolean) => {
    updateSettings(
      { disable_agents_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleAllowAgentsTeamAdmins = (checked: boolean) => {
    updateSettings(
      { allow_agents_for_team_admins: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableVectorStores = (checked: boolean) => {
    updateSettings(
      { disable_vector_stores_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleAllowVectorStoresTeamAdmins = (checked: boolean) => {
    updateSettings(
      { allow_vector_stores_for_team_admins: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleScopeUserSearch = (checked: boolean) => {
    updateSettings(
      { scope_user_search_to_org: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableCustomApiKeys = (checked: boolean) => {
    updateSettings(
      { disable_custom_api_keys: checked },
      {
        onSuccess: () => {
          toast.success(t("admin.uiSettingsUpdatedSuccessfully"));
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("admin.uiSettings")}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-label={t("admin.loadingUiSettings")} className="space-y-3">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="error">
            <AlertTitle>{t("admin.couldNotLoadUiSettings")}</AlertTitle>
            {error instanceof Error && <AlertDescription>{error.message}</AlertDescription>}
          </Alert>
        ) : (
          <div className="space-y-6">
            {schema?.description && <p className="text-sm text-foreground">{schema.description}</p>}
            {updateError && (
              <Alert variant="error">
                <AlertTitle>{t("admin.couldNotUpdateUiSettings")}</AlertTitle>
                {updateError instanceof Error && <AlertDescription>{updateError.message}</AlertDescription>}
              </Alert>
            )}

            <SettingRow
              checked={isDisabledForInternalUsers}
              disabled={isUpdating}
              onCheckedChange={handleToggle}
              ariaLabel={property?.description ?? t("admin.disableModelAddForInternalUsers")}
              label={t("admin.disableModelAddForInternalUsers")}
              description={property?.description}
            />
            <SettingRow
              checked={isDisabledTeamAdminDeleteTeamUser}
              disabled={isUpdating}
              onCheckedChange={handleToggleTeamAdminDelete}
              ariaLabel={disableTeamAdminDeleteProperty?.description ?? t("admin.disableTeamAdminDeleteTeamUser")}
              label={t("admin.disableTeamAdminDeleteTeamUser")}
              description={disableTeamAdminDeleteProperty?.description}
            />

            <SettingRow
              checked={Boolean(values.forward_client_headers_to_llm_api)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardClientHeaders}
              ariaLabel={forwardClientHeadersProperty?.description ?? t("admin.forwardClientHeadersToLlmApi")}
              label={t("admin.forwardClientHeadersToLlmApi")}
              description={
                forwardClientHeadersProperty?.description ??
                t("admin.forwardsClientHeadersAuthorizationAnthropicBetaAndXCustom")
              }
            />
            <SettingRow
              checked={Boolean(values.forward_llm_provider_auth_headers)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardLLMProviderAuthHeaders}
              ariaLabel={forwardLLMProviderAuthHeadersProperty?.description ?? t("admin.forwardLlmProviderAuthHeaders")}
              label={t("admin.forwardLlmProviderAuthHeaders")}
              description={
                forwardLLMProviderAuthHeadersProperty?.description ?? t("admin.forwardsProviderAuthHeadersXApiKeyXGoog")
              }
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.scope_user_search_to_org)}
              disabled={isUpdating}
              onCheckedChange={handleToggleScopeUserSearch}
              ariaLabel={scopeUserSearchProperty?.description ?? t("admin.scopeUserSearchToOrganization")}
              label={t("admin.scopeUserSearchToOrganization")}
              description={
                scopeUserSearchProperty?.description ?? t("admin.ifEnabledTheUserSearchEndpointRestrictsResultsBy")
              }
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.disable_custom_api_keys)}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableCustomApiKeys}
              ariaLabel={disableCustomApiKeysProperty?.description ?? t("admin.disableCustomVirtualKeyValues")}
              label={t("admin.disableCustomVirtualKeyValues")}
              description={
                disableCustomApiKeysProperty?.description ?? t("admin.ifTrueUsersCannotSpecifyCustomKeyValuesAll")
              }
            />

            <Separator />
            <PageVisibilitySettings
              enabledPagesInternalUsers={values.enabled_ui_pages_internal_users}
              enabledPagesPropertyDescription={enabledPagesProperty?.description}
              isUpdating={isUpdating}
              onUpdate={handleUpdatePageVisibility}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
