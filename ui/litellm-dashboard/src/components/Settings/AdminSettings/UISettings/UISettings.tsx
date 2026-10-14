"use client";

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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
        toast.success("页面可见性设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功。正在刷新页面...");
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
          toast.success("UI 设置更新成功。正在刷新页面...");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          toast.success("UI 设置更新成功");
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
          <h3>UI 设置</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-label="正在加载 UI 设置" className="space-y-3">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="error">
            <AlertTitle>无法加载 UI 设置</AlertTitle>
            {error instanceof Error && <AlertDescription>{error.message}</AlertDescription>}
          </Alert>
        ) : (
          <div className="space-y-6">
            {schema?.description && <p className="text-sm text-foreground">{schema.description}</p>}
            {updateError && (
              <Alert variant="error">
                <AlertTitle>无法更新 UI 设置</AlertTitle>
                {updateError instanceof Error && <AlertDescription>{updateError.message}</AlertDescription>}
              </Alert>
            )}

            <SettingRow
              checked={isDisabledForInternalUsers}
              disabled={isUpdating}
              onCheckedChange={handleToggle}
              ariaLabel={property?.description ?? "禁止内部用户添加模型"}
              label="禁止内部用户添加模型"
              description={property?.description}
            />
            <SettingRow
              checked={isDisabledTeamAdminDeleteTeamUser}
              disabled={isUpdating}
              onCheckedChange={handleToggleTeamAdminDelete}
              ariaLabel={disableTeamAdminDeleteProperty?.description ?? "禁止团队管理员删除团队用户"}
              label="禁止团队管理员删除团队用户"
              description={disableTeamAdminDeleteProperty?.description}
            />
            <SettingRow
              checked={Boolean(values.require_auth_for_public_ai_hub)}
              disabled={isUpdating}
              onCheckedChange={handleToggleRequireAuthForPublicAIHub}
              ariaLabel={requireAuthForPublicAIHubProperty?.description ?? "公开 AI Hub 需要认证"}
              label="公开 AI Hub 需要认证"
              description={requireAuthForPublicAIHubProperty?.description}
            />
            <SettingRow
              checked={Boolean(values.forward_client_headers_to_llm_api)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardClientHeaders}
              ariaLabel={forwardClientHeadersProperty?.description ?? "转发客户端 headers 到 LLM API"}
              label="转发客户端 headers 到 LLM API"
              description={
                forwardClientHeadersProperty?.description ??
                "将客户端 headers（Authorization、anthropic-beta 和 x-* 自定义 headers）转发到上游 LLM。Claude Code Max 订阅场景可开启它来转发 OAuth token，也可用于把自定义/追踪 headers 传给 provider。它独立于 BYOK 开关，请只开启需要的项。"
              }
            />
            <SettingRow
              checked={Boolean(values.forward_llm_provider_auth_headers)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardLLMProviderAuthHeaders}
              ariaLabel={forwardLLMProviderAuthHeadersProperty?.description ?? "转发 LLM provider 认证 headers"}
              label="转发 LLM provider 认证 headers"
              description={
                forwardLLMProviderAuthHeadersProperty?.description ??
                "将 provider 认证 headers（x-api-key、x-goog-api-key、api-key、ocp-apim-subscription-key）转发到上游 LLM，并覆盖该请求中 deployment 配置的 key。Claude Code BYOK 场景可开启它（客户端自带 API key）。它独立于客户端 headers 开关，请只开启需要的项。"
              }
            />
            {enableProjectsUIProperty && (
              <SettingRow
                checked={Boolean(values.enable_projects_ui)}
                disabled={isUpdating}
                onCheckedChange={handleToggleEnableProjectsUI}
                ariaLabel={enableProjectsUIProperty.description ?? "启用项目 UI"}
                label="[BETA] 启用项目（页面将刷新）"
                description={
                  enableProjectsUIProperty.description ??
                  "启用后，会在 UI 侧边栏显示 Projects 功能，并在密钥管理中显示项目字段。"
                }
              />
            )}
            <SettingRow
              checked={Boolean(values.enable_chat_ui)}
              disabled={isUpdating}
              onCheckedChange={handleToggleEnableChatUI}
              ariaLabel={enableChatUIProperty?.description ?? "启用聊天页面"}
              label="[BETA] 启用聊天页面（页面将刷新）"
              description={
                enableChatUIProperty?.description ??
                "启用后，会在 UI 侧边栏显示 Chat 页面，用户可与 LLM 对话，并通过 OAuth 连接自己的 MCP server 凭据。"
              }
            />

            <Separator />
            <SettingRow
              checked={isAgentsDisabled}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableAgents}
              ariaLabel={disableAgentsProperty?.description ?? "禁止内部用户使用 agents"}
              label="禁止内部用户使用 agents"
              description={disableAgentsProperty?.description}
            />
            <SettingRow
              checked={Boolean(values.allow_agents_for_team_admins)}
              disabled={isUpdating || !isAgentsDisabled}
              onCheckedChange={handleToggleAllowAgentsTeamAdmins}
              ariaLabel={allowAgentsTeamAdminsProperty?.description ?? "允许团队管理员使用 agents"}
              label="允许团队管理员使用 agents"
              description={allowAgentsTeamAdminsProperty?.description}
              indented
              muted={!isAgentsDisabled}
            />

            <Separator />
            <SettingRow
              checked={isVectorStoresDisabled}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableVectorStores}
              ariaLabel={disableVectorStoresProperty?.description ?? "禁止内部用户使用 vector stores"}
              label="禁止内部用户使用 vector stores"
              description={disableVectorStoresProperty?.description}
            />
            <SettingRow
              checked={Boolean(values.allow_vector_stores_for_team_admins)}
              disabled={isUpdating || !isVectorStoresDisabled}
              onCheckedChange={handleToggleAllowVectorStoresTeamAdmins}
              ariaLabel={allowVectorStoresTeamAdminsProperty?.description ?? "允许团队管理员使用 vector stores"}
              label="允许团队管理员使用 vector stores"
              description={allowVectorStoresTeamAdminsProperty?.description}
              indented
              muted={!isVectorStoresDisabled}
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.scope_user_search_to_org)}
              disabled={isUpdating}
              onCheckedChange={handleToggleScopeUserSearch}
              ariaLabel={scopeUserSearchProperty?.description ?? "将用户搜索限制在组织内"}
              label="将用户搜索限制在组织内"
              description={
                scopeUserSearchProperty?.description ??
                "启用后，用户搜索 endpoint 会按组织限制结果。关闭时，任何已认证用户都可以搜索所有用户。"
              }
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.disable_custom_api_keys)}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableCustomApiKeys}
              ariaLabel={disableCustomApiKeysProperty?.description ?? "禁用自定义虚拟密钥值"}
              label="禁用自定义虚拟密钥值"
              description={
                disableCustomApiKeysProperty?.description ??
                "启用后，用户不能指定自定义密钥值。所有密钥都必须自动生成。"
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
