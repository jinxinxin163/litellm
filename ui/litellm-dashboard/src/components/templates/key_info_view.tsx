import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useProjects } from "@/app/(dashboard)/hooks/projects/useProjects";
import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import useTeams from "@/app/(dashboard)/hooks/useTeams";
import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import { mapEmptyStringToNull } from "@/utils/keyUpdateUtils";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityLink } from "@/components/shared/EntityLink";
import { modelGroupHref, teamDetailHref } from "@/utils/entityLinks";
import { BadgeLink } from "@/components/shared/BadgeLink";
import { KeyInfoHeader } from "./KeyInfoHeader";
import KeySavingsTab from "./KeySavingsTab";
import { useEffect, useState } from "react";
import { isProxyAdminRole, isUserTeamAdminForSingleTeam, rolesWithWriteAccess } from "../../utils/roles";
import { mapDisplayToInternalNames, mapInternalToDisplayNames } from "../callback_info_helpers";
import AutoRotationView from "../common_components/AutoRotationView";
import DeleteResourceModal from "../common_components/DeleteResourceModal";
import RouterSettingsSummary from "../common_components/RouterSettingsSummary";
import { hasRouterSettings } from "../common_components/routerSettingsPayload";
import { extractLoggingSettings, formatMetadataForDisplay, stripTagsFromMetadata } from "../key_info_utils";
import { KeyResponse } from "../key_team_helpers/key_list";
import LoggingSettingsView from "../logging_settings_view";
import { toast } from "@/lib/toast";
import { getPolicyInfoWithGuardrails, keyDeleteCall, keyUpdateCall } from "../networking";
import { useResetKeySpend } from "@/app/(dashboard)/hooks/keys/useResetKeySpend";
import { useSetKeyBlockedState } from "@/app/(dashboard)/hooks/keys/useSetKeyBlockedState";
import { keyKeys } from "@/app/(dashboard)/hooks/keys/useKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useMCPServers } from "@/app/(dashboard)/hooks/mcpServers/useMCPServers";
import { useMCPToolsets } from "@/app/(dashboard)/hooks/mcpServers/useMCPToolsets";
import { extractMcpEntitlement } from "../mcp_server_management/mcpEntitlement";
import ObjectPermissionsView from "../object_permissions_view";
import { RegenerateKeyModal } from "../organisms/RegenerateKeyModal";
import { parseErrorMessage } from "../shared/errorUtils";
import { InheritedBudgetHint, inheritedBudgetGates } from "../shared/InheritedBudgetHint";
import { KeyEditView } from "./key_edit_view";

interface KeyInfoViewProps {
  keyId: string;
  onClose: () => void;
  keyData: KeyResponse | undefined;
  onKeyDataUpdate?: (data: Partial<KeyResponse>) => void;
  onDelete?: () => void;
  teams: any[] | null;
  backButtonText?: string;
}

// Premium fields (from LiteLLM_ManagementEndpoint_MetadataFields_Premium in
// litellm/proxy/_types.py) that the key-edit form submits as arrays/strings, where
// "empty" means "unset". The loop below drops them when they're empty-and-were-empty
// so a non-premium edit of unrelated fields doesn't trip the server's premium gate.
//
// Boolean premium fields (e.g. disable_global_guardrails) do NOT belong here: false is
// a real value, not "empty", so isEmptyValue(false) is false and the loop would never
// drop it — we'd resend false on every edit and trip the gate. Booleans get their own
// "send only when changed" guard instead (see disable_global_guardrails below).
const PREMIUM_METADATA_FIELDS = ["policies", "guardrails", "prompts", "tags", "allowed_passthrough_routes"] as const;

const isEmptyValue = (v: unknown): boolean =>
  v == null || (Array.isArray(v) && v.length === 0) || (typeof v === "string" && v.trim() === "");

/**
 * ─────────────────────────────────────────────────────────────────────────
 * @deprecated
 * This component is being DEPRECATED in favor of src/app/(dashboard)/virtual-keys/components/KeyInfoView.tsx
 * Please contribute to the new refactor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function KeyInfoView({
  onClose,
  keyData,
  teams,
  onKeyDataUpdate,
  onDelete,
  backButtonText = "返回密钥列表",
}: KeyInfoViewProps) {
  const { accessToken, userId: userID, userRole, premiumUser } = useAuthorized();
  const queryClient = useQueryClient();
  const canEditGuardrails = premiumUser || (userRole != null && rolesWithWriteAccess.includes(userRole));
  const { teams: teamsData } = useTeams();
  const { data: organizations } = useOrganizations();
  const { data: projects } = useProjects();
  const { data: uiSettingsData } = useUISettings();
  const { data: allMcpServers } = useMCPServers();
  const { data: allMcpToolsets } = useMCPToolsets();
  const enableProjectsUI = Boolean(uiSettingsData?.values?.enable_projects_ui);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isResetSpendModalOpen, setIsResetSpendModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const { mutate: resetKeySpend, isPending: resetSpendLoading } = useResetKeySpend();
  const { mutate: setKeyBlockedState, isPending: blockLoading } = useSetKeyBlockedState();
  // Add local state to maintain key data and track regeneration
  const [currentKeyData, setCurrentKeyData] = useState<KeyResponse | undefined>(keyData);
  const [lastRegeneratedAt, setLastRegeneratedAt] = useState<Date | null>(null);
  const [keyDataUpdateHeldUntilModalClose, setKeyDataUpdateHeldUntilModalClose] = useState<Partial<KeyResponse> | null>(
    null,
  );
  const [isRecentlyRegenerated, setIsRecentlyRegenerated] = useState(false);
  const [policyGuardrails, setPolicyGuardrails] = useState<Record<string, string[]>>({});
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Update local state when keyData prop changes (but don't reset to undefined)
  useEffect(() => {
    if (keyData) {
      setCurrentKeyData(keyData);
    }
  }, [keyData]);

  // Fetch resolved guardrails for all policies
  useEffect(() => {
    const fetchPolicyGuardrails = async () => {
      const policies = currentKeyData?.metadata?.policies;
      if (!accessToken || !policies || !Array.isArray(policies) || policies.length === 0) {
        return;
      }

      setLoadingPolicies(true);
      const guardrailsMap: Record<string, string[]> = {};

      try {
        await Promise.all(
          policies.map(async (policyName: string) => {
            try {
              const policyInfo = await getPolicyInfoWithGuardrails(accessToken, policyName);
              guardrailsMap[policyName] = policyInfo.resolved_guardrails || [];
            } catch (error) {
              console.error(`Failed to fetch guardrails for policy ${policyName}:`, error);
              guardrailsMap[policyName] = [];
            }
          }),
        );
        setPolicyGuardrails(guardrailsMap);
      } catch (error) {
        console.error("Failed to fetch policy guardrails:", error);
      } finally {
        setLoadingPolicies(false);
      }
    };

    fetchPolicyGuardrails();
  }, [accessToken, currentKeyData?.metadata?.policies]);

  // Reset recent regeneration indicator after 5 seconds
  useEffect(() => {
    if (isRecentlyRegenerated) {
      const timer = setTimeout(() => {
        setIsRecentlyRegenerated(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isRecentlyRegenerated]);

  // Use currentKeyData instead of keyData throughout the component
  if (!currentKeyData) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onClose} className="mb-4">
          <ArrowLeft className="size-4" />
          {backButtonText}
        </Button>
        <p className="text-sm">未找到密钥</p>
      </div>
    );
  }

  const handleKeyUpdate = async (formValues: Record<string, any>) => {
    try {
      if (!accessToken) return;

      const currentKey = formValues.token;
      formValues.key = currentKey;

      // Guard premium features
      if (!canEditGuardrails) {
        delete formValues.guardrails;
        delete formValues.prompts;
      }

      // Drop premium metadata fields that are empty AND were empty before.
      // The /key/update response echoes defaults like `policies: []` back into
      // state; without this, the next save resends `[]` and trips the premium
      // gate in prepare_metadata_fields for non-premium users.
      for (const field of PREMIUM_METADATA_FIELDS) {
        const previousValue =
          (currentKeyData.metadata as Record<string, unknown> | undefined)?.[field] ??
          (currentKeyData as unknown as Record<string, unknown>)[field];
        if (isEmptyValue(formValues[field]) && isEmptyValue(previousValue)) {
          delete formValues[field];
        }
      }

      // disable_global_guardrails is premium-gated server-side; only send it when it
      // changed so a non-premium edit of unrelated fields isn't blocked by that gate.
      const previousDisableGlobalGuardrails = Boolean(
        (currentKeyData.metadata as Record<string, unknown> | undefined)?.disable_global_guardrails,
      );
      if (Boolean(formValues.disable_global_guardrails) === previousDisableGlobalGuardrails) {
        delete formValues.disable_global_guardrails;
      }

      // Handle max budget empty string
      formValues.max_budget = mapEmptyStringToNull(formValues.max_budget);

      // Handle object_permission updates
      if (formValues.vector_stores !== undefined) {
        formValues.object_permission = {
          ...currentKeyData.object_permission,
          vector_stores: formValues.vector_stores || [],
        };
        // Remove vector_stores from the top level as it should be in object_permission
        delete formValues.vector_stores;
      }

      const mcpEntitlement = extractMcpEntitlement(formValues, allMcpServers ?? [], allMcpToolsets ?? []);
      if (mcpEntitlement) {
        // Without a catalog the grants an allowlist key still has are unresolvable, so nothing is
        // pruned and a revocation would save as a no-op while reporting success. Refuse instead.
        const unresolvableSelection =
          allMcpServers === undefined ||
          mcpEntitlement.mcp_toolsets.some(
            (toolsetId) => !(allMcpToolsets ?? []).some((toolset) => toolset.toolset_id === toolsetId),
          );
        if (unresolvableSelection && Object.keys(mcpEntitlement.mcp_tool_permissions).length > 0) {
          toast.error("MCP server 或 toolset 列表不可用，因此暂时无法保存 MCP 权限。请重试。");
          return;
        }
        formValues.object_permission = {
          ...(formValues.object_permission ?? currentKeyData.object_permission),
          ...mcpEntitlement,
        };
      }
      delete formValues.mcp_servers_and_groups;
      delete formValues.mcp_tool_permissions;

      // Handle agent permissions
      if (formValues.agents_and_groups !== undefined) {
        const { agents, accessGroups } = formValues.agents_and_groups || { agents: [], accessGroups: [] };
        formValues.object_permission = {
          ...formValues.object_permission,
          agents: agents || [],
          agent_access_groups: accessGroups || [],
        };
        delete formValues.agents_and_groups;
      }

      formValues.max_budget = mapEmptyStringToNull(formValues.max_budget);
      formValues.tpm_limit = mapEmptyStringToNull(formValues.tpm_limit);
      formValues.rpm_limit = mapEmptyStringToNull(formValues.rpm_limit);
      formValues.max_parallel_requests = mapEmptyStringToNull(formValues.max_parallel_requests);

      // Convert metadata back to an object if it exists and is a string
      if (formValues.metadata && typeof formValues.metadata === "string") {
        try {
          const parsedMetadata = JSON.parse(formValues.metadata);
          // Ensure tags are controlled via dedicated field, not in metadata textarea
          if ("tags" in parsedMetadata) {
            delete parsedMetadata["tags"];
          }
          formValues.metadata = {
            ...parsedMetadata,
            ...(Array.isArray(formValues.tags) && formValues.tags.length > 0 ? { tags: formValues.tags } : {}),
            ...(formValues.guardrails?.length > 0 ? { guardrails: formValues.guardrails } : {}),
            ...(Array.isArray(formValues.logging_settings) && formValues.logging_settings.length > 0
              ? { logging: formValues.logging_settings }
              : {}),
            ...(formValues.disabled_callbacks?.length > 0
              ? {
                  litellm_disabled_callbacks: mapDisplayToInternalNames(formValues.disabled_callbacks),
                }
              : {}),
          };
        } catch (error) {
          console.error("Error parsing metadata JSON:", error);
          toast.error("metadata JSON 无效");
          return;
        }
      } else {
        const baseMetadata = formValues.metadata || {};
        const { tags: _omitTags, ...rest } = baseMetadata;
        formValues.metadata = {
          ...rest,
          ...(Array.isArray(formValues.tags) && formValues.tags.length > 0 ? { tags: formValues.tags } : {}),
          ...(formValues.guardrails?.length > 0 ? { guardrails: formValues.guardrails } : {}),
          ...(Array.isArray(formValues.logging_settings) && formValues.logging_settings.length > 0
            ? { logging: formValues.logging_settings }
            : {}),
          ...(formValues.disabled_callbacks?.length > 0
            ? {
                litellm_disabled_callbacks: mapDisplayToInternalNames(formValues.disabled_callbacks),
              }
            : {}),
        };
      }

      // tags are merged into metadata; do not send as top-level field
      if ("tags" in formValues) {
        delete formValues.tags;
      }
      delete formValues.logging_settings;

      // Normalize any legacy word-form budget_duration to the canonical API format
      if (formValues.budget_duration) {
        const wordToCanonical: Record<string, string> = {
          hourly: "1h",
          daily: "24h",
          weekly: "7d",
          monthly: "30d",
        };
        formValues.budget_duration = wordToCanonical[formValues.budget_duration] ?? formValues.budget_duration;
      }

      const newKeyValues = await keyUpdateCall(accessToken, formValues);

      // Update local state
      setCurrentKeyData((prevData) => (prevData ? { ...prevData, ...newKeyValues } : undefined));

      if (onKeyDataUpdate) {
        onKeyDataUpdate(newKeyValues);
      }
      toast.success("密钥更新成功");
      setIsEditing(false);
      // Refresh key data here if needed
    } catch (error) {
      toast.fromError(parseErrorMessage(error));
      console.error("Error updating key:", error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      if (!accessToken) return;
      await keyDeleteCall(accessToken as string, currentKeyData.token || currentKeyData.token_id);
      toast.success("密钥删除成功");
      await queryClient.invalidateQueries({ queryKey: keyKeys.lists() });
      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (error) {
      console.error("Error deleting the key:", error);
      toast.fromError(error);
    } finally {
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleRegenerateKeyUpdate = (updatedKeyData: Partial<KeyResponse>) => {
    const regeneratedAt = new Date();
    // Update local state immediately with ALL the new data
    setCurrentKeyData((prevData) => {
      if (!prevData) return undefined;
      const newData = {
        ...prevData,
        ...updatedKeyData, // This should include the new token (key-id)
        // Update the created_at to show when it was regenerated
        created_at: regeneratedAt.toLocaleString(),
      };
      return newData;
    });

    // Track regeneration timestamp
    setLastRegeneratedAt(regeneratedAt);
    setIsRecentlyRegenerated(true);

    setKeyDataUpdateHeldUntilModalClose({
      ...updatedKeyData,
      created_at: regeneratedAt.toLocaleString(),
    });
  };

  const handleRegenerateModalClose = () => {
    setIsRegenerateModalOpen(false);
    if (keyDataUpdateHeldUntilModalClose) {
      setKeyDataUpdateHeldUntilModalClose(null);
      onKeyDataUpdate?.(keyDataUpdateHeldUntilModalClose);
    }
  };

  // Update the formatTimestamp function to use the desired date format
  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("zh-CN", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  };

  const canModifyKey =
    isProxyAdminRole(userRole || "") ||
    (teamsData &&
      isUserTeamAdminForSingleTeam(
        teamsData?.filter((team) => team.team_id === currentKeyData.team_id)[0]?.members_with_roles,
        userID || "",
      )) ||
    (userID === currentKeyData.user_id && userRole !== "Internal Viewer");

  const isKeyAdmin =
    isProxyAdminRole(userRole || "") ||
    Boolean(
      teamsData &&
        isUserTeamAdminForSingleTeam(
          teamsData?.filter((team) => team.team_id === currentKeyData.team_id)[0]?.members_with_roles,
          userID || "",
        ),
    );

  const canResetSpend = isKeyAdmin;
  const canBlockKey = isKeyAdmin;

  const handleResetSpend = () => {
    resetKeySpend(currentKeyData.token || currentKeyData.token_id, {
      onSuccess: () => {
        setCurrentKeyData((prevData) => (prevData ? { ...prevData, spend: 0 } : undefined));
        if (onKeyDataUpdate) {
          onKeyDataUpdate({ spend: 0 });
        }
        toast.success("密钥花费已重置为 $0");
        setIsResetSpendModalOpen(false);
      },
      onError: (error) => {
        toast.fromError(parseErrorMessage(error));
        console.error("Error resetting key spend:", error);
      },
    });
  };

  const isBlocked = currentKeyData.blocked === true;

  const handleToggleBlocked = () => {
    setKeyBlockedState(
      { keyToken: currentKeyData.token || currentKeyData.token_id, blocked: !isBlocked },
      {
        onSuccess: (response) => {
          const blocked = response.blocked === true;
          setCurrentKeyData((prevData) => (prevData ? { ...prevData, blocked } : undefined));
          if (onKeyDataUpdate) {
            onKeyDataUpdate({ blocked });
          }
          toast.success(blocked ? "密钥已阻止" : "密钥已解除阻止");
          setIsBlockModalOpen(false);
        },
        onError: (error) => {
          toast.fromError(parseErrorMessage(error));
          console.error("Error updating key blocked state:", error);
        },
      },
    );
  };

  const lastConfiguredAt = currentKeyData.settings_updated_at || currentKeyData.created_at;

  const parentTeam = currentKeyData.team_id ? teamsData?.find((team) => team.team_id === currentKeyData.team_id) : null;
  const orgId = currentKeyData.organization_id || currentKeyData.org_id || parentTeam?.organization_id || "";
  const parentOrg = orgId ? organizations?.find((org) => org.organization_id === orgId) : null;

  const hasOwnBudget = currentKeyData.max_budget !== null;
  const budgetDisplay = hasOwnBudget ? `$${formatNumberWithCommas(currentKeyData.max_budget, 2)}` : "无限制";
  const inheritedGates = hasOwnBudget ? [] : inheritedBudgetGates(parentTeam, parentOrg);

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <KeyInfoHeader
        data={{
          keyName: currentKeyData.key_alias || "虚拟密钥",
          keyId: currentKeyData.token_id || currentKeyData.token,
          userId: currentKeyData.user_id || "",
          userEmail: currentKeyData.user_email || "",
          userAlias: currentKeyData.user?.user_alias ?? null,
          teamId: currentKeyData.team_id || "",
          teamAlias: parentTeam?.team_alias ?? null,
          orgId,
          orgAlias: parentOrg?.organization_alias ?? null,
          createdBy:
            currentKeyData.created_by_user?.user_alias ||
            currentKeyData.created_by_user?.user_email ||
            currentKeyData.created_by ||
            "",
          createdById: currentKeyData.created_by_user?.user_id || currentKeyData.created_by || "",
          createdAt: currentKeyData.created_at ? formatTimestamp(currentKeyData.created_at) : "",
          lastUpdated: lastConfiguredAt ? formatTimestamp(lastConfiguredAt) : "",
          lastActive: currentKeyData.last_active ? formatTimestamp(currentKeyData.last_active) : "从不",
          expires: currentKeyData.expires ? formatTimestamp(currentKeyData.expires) : "从不",
        }}
        onBack={onClose}
        onRegenerate={() => setIsRegenerateModalOpen(true)}
        onDelete={() => setIsDeleteModalOpen(true)}
        onResetSpend={canResetSpend ? () => setIsResetSpendModalOpen(true) : undefined}
        onToggleBlocked={canBlockKey ? () => setIsBlockModalOpen(true) : undefined}
        isBlocked={isBlocked}
        canModifyKey={canModifyKey}
        backButtonText={backButtonText}
        regenerateDisabled={!premiumUser}
        regenerateTooltip={
          !premiumUser ? "这是 LiteLLM Enterprise 功能，需要有效 license 才能使用。" : undefined
        }
      />

      {/* Add RegenerateKeyModal */}
      <RegenerateKeyModal
        selectedToken={currentKeyData}
        visible={isRegenerateModalOpen}
        onClose={handleRegenerateModalClose}
        onKeyUpdate={handleRegenerateKeyUpdate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteResourceModal
        isOpen={isDeleteModalOpen}
        title="删除密钥"
        alertMessage="此操作不可逆，并会立即撤销所有使用此密钥的应用访问权限。"
        message="确定要删除此虚拟密钥吗？"
        resourceInformationTitle="密钥信息"
        resourceInformation={[
          {
            label: "密钥别名",
            value: currentKeyData?.key_alias || "-",
          },
          {
            label: "密钥 ID",
            value: currentKeyData?.token_id || currentKeyData?.token || "-",
            code: true,
          },
          {
            label: "团队 ID",
            value: currentKeyData?.team_id || "-",
            code: true,
          },
          {
            label: "花费",
            value: currentKeyData?.spend ? `$${formatNumberWithCommas(currentKeyData.spend, 4)}` : "$0.0000",
          },
        ]}
        onCancel={() => {
          setIsDeleteModalOpen(false);
        }}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
        requiredConfirmation={currentKeyData?.key_alias}
      />

      {/* Reset Spend Confirmation Modal */}
      <Dialog open={isResetSpendModalOpen} onOpenChange={(open) => setIsResetSpendModalOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密钥花费</DialogTitle>
          </DialogHeader>
          <p>
            将 <strong>{currentKeyData?.key_alias || currentKeyData?.token_id || "此密钥"}</strong> 的花费重置为{" "}
            <strong>$0</strong>?
          </p>
          <p style={{ color: "#666", fontSize: "0.875rem", marginTop: 8 }}>
            当前花费：<strong>${formatNumberWithCommas(currentKeyData.spend, 4)}</strong>。花费历史会保留在日志中。此操作会重置当前周期花费计数器，效果与自动预算重置相同。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetSpendModalOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleResetSpend} disabled={resetSpendLoading}>
              重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockModalOpen} onOpenChange={(open) => setIsBlockModalOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isBlocked ? "解除阻止密钥" : "阻止密钥"}</DialogTitle>
          </DialogHeader>
          <p>
            {isBlocked ? "解除阻止" : "阻止"}{" "}
            <strong>{currentKeyData?.key_alias || currentKeyData?.token_id || "此密钥"}</strong>？
          </p>
          <p style={{ color: "#666", fontSize: "0.875rem", marginTop: 8 }}>
            {isBlocked
              ? "使用此密钥的请求将重新被接受。"
              : "在解除阻止前，使用此密钥的请求将被 401 拒绝。密钥不会被删除，可随时解除阻止。"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>
              取消
            </Button>
            <Button
              variant={isBlocked ? "default" : "destructive"}
              onClick={handleToggleBlocked}
              disabled={blockLoading}
            >
              {isBlocked ? "解除阻止" : "阻止"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 h-auto w-full justify-start rounded-none border-b p-0">
          <TabsTrigger value="overview" className="flex-none rounded-none px-4 py-2">
            概览
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex-none rounded-none px-4 py-2">
            节省
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-none rounded-none px-4 py-2">
            设置
          </TabsTrigger>
        </TabsList>

        <div>
          {/* Overview Panel */}
          <TabsContent value="overview" keepMounted>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="block p-6">
                <p className="text-sm">花费</p>
                <div className="mt-2">
                  <h3 className="text-lg font-medium">${formatNumberWithCommas(currentKeyData.spend, 4)}</h3>
                  <p className="text-sm">
                    / {budgetDisplay}
                    <InheritedBudgetHint gates={inheritedGates} />
                  </p>
                  {currentKeyData.budget_reset_at && (
                    <p className="text-sm">重置时间 {formatTimestamp(currentKeyData.budget_reset_at)}</p>
                  )}
                </div>
              </Card>

              <Card className="block p-6">
                <p className="text-sm">速率限制</p>
                <div className="mt-2">
                  <p className="text-sm">
                    TPM: {currentKeyData.tpm_limit !== null ? currentKeyData.tpm_limit : "无限制"}
                  </p>
                  <p className="text-sm">
                    RPM: {currentKeyData.rpm_limit !== null ? currentKeyData.rpm_limit : "无限制"}
                  </p>
                  {Boolean(currentKeyData.metadata?.throttle_on_budget_exceeded) && (
                    <p className="text-sm">预算超限时限流：是</p>
                  )}
                </div>
              </Card>

              <Card className="block p-6">
                <p className="text-sm">模型</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentKeyData.models && currentKeyData.models.length > 0 ? (
                    currentKeyData.models.map((model, index) => (
                      <BadgeLink key={index} href={modelGroupHref(model)} className="min-w-0 break-words">
                        {model}
                      </BadgeLink>
                    ))
                  ) : (
                    <p className="text-sm">未指定模型</p>
                  )}
                </div>
              </Card>

              <Card className="block p-6">
                <ObjectPermissionsView
                  objectPermission={currentKeyData.object_permission}
                  variant="inline"
                  accessToken={accessToken}
                />
              </Card>

              <Card className="block p-6">
                <p className="text-sm font-medium mb-3">Guardrails 配置</p>
                {Array.isArray(currentKeyData.metadata?.guardrails) && currentKeyData.metadata.guardrails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentKeyData.metadata.guardrails.map((guardrail: string, index: number) => (
                      <Badge key={index} variant="secondary" className="min-w-0 break-words">
                        {guardrail}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未配置 guardrails</p>
                )}
                {typeof currentKeyData.metadata?.disable_global_guardrails === "boolean" &&
                  currentKeyData.metadata.disable_global_guardrails === true && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Badge variant="destructive">全局 Guardrails 已禁用</Badge>
                    </div>
                  )}
              </Card>

              <Card className="block p-6">
                <p className="text-sm font-medium mb-3">Policies 策略</p>
                {Array.isArray(currentKeyData.metadata?.policies) && currentKeyData.metadata.policies.length > 0 ? (
                  <div className="space-y-4">
                    {currentKeyData.metadata.policies.map((policy: string, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="min-w-0 break-words">
                            {policy}
                          </Badge>
                          {loadingPolicies && <p className="text-xs text-muted-foreground">正在加载 guardrails...</p>}
                        </div>
                        {!loadingPolicies && policyGuardrails[policy] && policyGuardrails[policy].length > 0 && (
                          <div className="ml-4 pl-3 border-l-2 border-border">
                            <p className="text-xs text-muted-foreground mb-1">解析后的 Guardrails：</p>
                            <div className="flex flex-wrap gap-1">
                              {policyGuardrails[policy].map((guardrail: string, gIndex: number) => (
                                <Badge key={gIndex} variant="secondary" className="min-w-0 break-words">
                                  {guardrail}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未配置 policies</p>
                )}
              </Card>

              <LoggingSettingsView
                loggingConfigs={extractLoggingSettings(currentKeyData.metadata)}
                disabledCallbacks={
                  Array.isArray(currentKeyData.metadata?.litellm_disabled_callbacks)
                    ? mapInternalToDisplayNames(currentKeyData.metadata.litellm_disabled_callbacks)
                    : []
                }
                variant="card"
              />

              <AutoRotationView
                autoRotate={currentKeyData.auto_rotate}
                rotationInterval={currentKeyData.rotation_interval}
                lastRotationAt={currentKeyData.last_rotation_at}
                keyRotationAt={currentKeyData.key_rotation_at}
                nextRotationAt={currentKeyData.next_rotation_at}
                variant="card"
              />
            </div>
          </TabsContent>

          {/* Savings Panel. No keepMounted: this tab sweeps the daily rollup, and staying mounted
              would fire that request on every key page open for people who never look at it. */}
          <TabsContent value="savings">
            <KeySavingsTab
              accessToken={accessToken}
              keyToken={currentKeyData.token}
              userId={userID}
              userRole={userRole}
            />
          </TabsContent>

          {/* Settings Panel */}
          <TabsContent value="settings" keepMounted>
            <Card className="block p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">密钥设置</h3>
                {!isEditing && canModifyKey && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    编辑设置
                  </Button>
                )}
              </div>

              {isEditing ? (
                <KeyEditView
                  keyData={currentKeyData}
                  onCancel={() => setIsEditing(false)}
                  onSubmit={handleKeyUpdate}
                  teams={teams}
                  accessToken={accessToken}
                  userID={userID}
                  userRole={userRole}
                  premiumUser={premiumUser}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">密钥 ID</p>
                    <p className="text-sm font-mono">{currentKeyData.token_id || currentKeyData.token}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">密钥别名</p>
                    <p className="text-sm">{currentKeyData.key_alias || "未设置"}</p>
                  </div>

                  <div>
                      <p className="text-sm font-medium">Secret Key 密钥</p>
                    <p className="text-sm font-mono">{currentKeyData.key_name}</p>
                  </div>

                  <div>
                      <p className="text-sm font-medium">团队 ID</p>
                    <p className="text-sm">
                      {currentKeyData.team_id ? (
                        <EntityLink href={teamDetailHref(currentKeyData.team_id)} className="font-normal">
                          {currentKeyData.team_id}
                        </EntityLink>
                      ) : (
                        "未设置"
                      )}
                    </p>
                  </div>

                  {enableProjectsUI && (
                    <div>
                      <p className="text-sm font-medium">项目</p>
                      <p className="text-sm">
                        {currentKeyData.project_id
                          ? (() => {
                              const project = projects?.find((p) => p.project_id === currentKeyData.project_id);
                              return project?.project_alias
                                ? `${project.project_alias} (${currentKeyData.project_id})`
                                : currentKeyData.project_id;
                            })()
                          : "未设置"}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">组织</p>
                    <p className="text-sm">{(currentKeyData.organization_id ?? currentKeyData.org_id) || "未设置"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">创建时间</p>
                    <p className="text-sm">{formatTimestamp(currentKeyData.created_at)}</p>
                  </div>

                  {lastRegeneratedAt && (
                    <div>
                      <p className="text-sm font-medium">上次重新生成</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm">{formatTimestamp(lastRegeneratedAt)}</p>
                        <Badge variant="secondary">最近</Badge>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">过期时间</p>
                    <p className="text-sm">
                      {currentKeyData.expires ? formatTimestamp(currentKeyData.expires) : "从不"}
                    </p>
                  </div>

                  {Boolean(currentKeyData.metadata?.enable_prompt_caching) && (
                    <div>
                      <p className="text-sm font-medium">Prompt 缓存</p>
                      <p className="text-sm">
                        已启用（会在 Anthropic 和 Bedrock Claude 请求中自动注入 cache_control 标记）
                      </p>
                    </div>
                  )}

                  <AutoRotationView
                    autoRotate={currentKeyData.auto_rotate}
                    rotationInterval={currentKeyData.rotation_interval}
                    lastRotationAt={currentKeyData.last_rotation_at}
                    keyRotationAt={currentKeyData.key_rotation_at}
                    nextRotationAt={currentKeyData.next_rotation_at}
                    variant="inline"
                    className="pt-4 border-t border-border"
                  />

                  <div>
                    <p className="text-sm font-medium">花费</p>
                    <p className="text-sm">${formatNumberWithCommas(currentKeyData.spend, 4)} USD</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">预算</p>
                    <p className="text-sm">
                      {currentKeyData.max_budget !== null
                        ? `$${formatNumberWithCommas(currentKeyData.max_budget, 2)}`
                        : "无限制"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">预算重置</p>
                    <p data-testid="budget-reset-value" className="text-sm">
                      {currentKeyData.budget_reset_at
                        ? `${currentKeyData.budget_duration ? `每 ${currentKeyData.budget_duration}，下次 ` : ""}${formatTimestamp(currentKeyData.budget_reset_at)}`
                        : "从不"}
                    </p>
                  </div>

                  {currentKeyData.budget_fallbacks && Object.keys(currentKeyData.budget_fallbacks).length > 0 && (
                    <div>
                      <p className="text-sm font-medium">预算故障回退</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(currentKeyData.budget_fallbacks).map(([model, fallbacks]) => (
                          <div key={model} className="text-xs text-muted-foreground">
                            <span className="font-medium">{model}</span>
                            <span className="mx-1 text-muted-foreground">-&gt;</span>
                            {fallbacks.join(", ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasRouterSettings(currentKeyData.router_settings) && (
                    <div>
                      <p className="text-sm font-medium">Router Settings 路由设置</p>
                      <div className="mt-1">
                        <RouterSettingsSummary routerSettings={currentKeyData.router_settings} />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">Tags 标签</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Array.isArray(currentKeyData.metadata?.tags) && currentKeyData.metadata.tags.length > 0
                        ? currentKeyData.metadata.tags.map((tag, index) => (
                            <span key={index} className="px-2 mr-2 py-1 bg-info/15 rounded-sm text-xs">
                              {tag}
                            </span>
                          ))
                        : "未指定 tags"}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Prompts 提示词</p>
                    <p className="text-sm">
                      {Array.isArray(currentKeyData.metadata?.prompts) && currentKeyData.metadata.prompts.length > 0
                        ? currentKeyData.metadata.prompts.map((prompt, index) => (
                            <span key={index} className="px-2 mr-2 py-1 bg-info/15 rounded-sm text-xs">
                              {prompt}
                            </span>
                          ))
                        : "未指定 prompts"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">允许的 Routes</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Array.isArray(currentKeyData.allowed_routes) && currentKeyData.allowed_routes.length > 0 ? (
                        currentKeyData.allowed_routes.map((route, index) => (
                          <span key={index} className="px-2 py-1 bg-info/15 rounded-sm text-xs">
                            {route}
                          </span>
                        ))
                      ) : (
                        <Badge variant="secondary">允许所有 routes</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">允许的 Pass Through Routes</p>
                    <p className="text-sm">
                      {Array.isArray(currentKeyData.metadata?.allowed_passthrough_routes) &&
                      currentKeyData.metadata.allowed_passthrough_routes.length > 0
                        ? currentKeyData.metadata.allowed_passthrough_routes.map((route, index) => (
                            <span key={index} className="px-2 mr-2 py-1 bg-info/15 rounded-sm text-xs">
                              {route}
                            </span>
                          ))
                        : "未指定 pass through routes"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">禁用全局 Guardrails</p>
                    <p className="text-sm">
                      {currentKeyData.metadata?.disable_global_guardrails === true ? (
                        <Badge variant="destructive">已启用 - 绕过全局 guardrails</Badge>
                      ) : (
                        <Badge variant="secondary">已禁用 - 全局 guardrails 生效</Badge>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">模型</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentKeyData.models && currentKeyData.models.length > 0 ? (
                        currentKeyData.models.map((model, index) => (
                          <BadgeLink key={index} href={modelGroupHref(model)} className="min-w-0 break-words">
                            {model}
                          </BadgeLink>
                        ))
                      ) : (
                        <p className="text-sm">未指定模型</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">速率限制</p>
                    <p className="text-sm">
                      TPM: {currentKeyData.tpm_limit !== null ? currentKeyData.tpm_limit : "无限制"}
                    </p>
                    <p className="text-sm">
                      RPM: {currentKeyData.rpm_limit !== null ? currentKeyData.rpm_limit : "无限制"}
                    </p>
                    <p className="text-sm">
                      最大并发请求数：{" "}
                      {currentKeyData.max_parallel_requests !== null
                        ? currentKeyData.max_parallel_requests
                        : "无限制"}
                    </p>
                    <p className="text-sm">
                      模型 TPM 限制：{" "}
                      {currentKeyData.metadata?.model_tpm_limit
                        ? JSON.stringify(currentKeyData.metadata.model_tpm_limit)
                        : "无限制"}
                    </p>
                    <p className="text-sm">
                      模型 RPM 限制：{" "}
                      {currentKeyData.metadata?.model_rpm_limit
                        ? JSON.stringify(currentKeyData.metadata.model_rpm_limit)
                        : "无限制"}
                    </p>
                    <p className="text-sm">
                      Tag RPM 限制：{" "}
                      {currentKeyData.metadata?.tag_rpm_limit &&
                      Object.keys(currentKeyData.metadata.tag_rpm_limit).length > 0
                        ? JSON.stringify(currentKeyData.metadata.tag_rpm_limit)
                        : "无限制"}
                    </p>
                    <p className="text-sm">
                      预估输出 Tokens：{" "}
                      {currentKeyData.metadata?.default_estimated_output_tokens != null
                        ? String(currentKeyData.metadata.default_estimated_output_tokens)
                        : "默认"}
                    </p>
                    <p className="text-sm">
                      每个模型的预估输出 Tokens：{" "}
                      {currentKeyData.metadata?.default_estimated_output_tokens_per_model
                        ? JSON.stringify(currentKeyData.metadata.default_estimated_output_tokens_per_model)
                        : "默认"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Metadata 元数据</p>
                    <pre className="bg-muted p-2 rounded-sm text-xs overflow-auto mt-1">
                      {formatMetadataForDisplay(stripTagsFromMetadata(currentKeyData.metadata))}
                    </pre>
                  </div>

                  <ObjectPermissionsView
                    objectPermission={currentKeyData.object_permission}
                    variant="inline"
                    className="pt-4 border-t border-border"
                    accessToken={accessToken}
                  />

                  <LoggingSettingsView
                    loggingConfigs={extractLoggingSettings(currentKeyData.metadata)}
                    disabledCallbacks={
                      Array.isArray(currentKeyData.metadata?.litellm_disabled_callbacks)
                        ? mapInternalToDisplayNames(currentKeyData.metadata.litellm_disabled_callbacks)
                        : []
                    }
                    variant="inline"
                    className="pt-4 border-t border-border"
                  />
                </div>
              )}
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
