"use client";
import { keyKeys } from "@/app/(dashboard)/hooks/keys/useKeys";
import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import { useProjects } from "@/app/(dashboard)/hooks/projects/useProjects";
import { useTags } from "@/app/(dashboard)/hooks/tags/useTags";
import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useCan from "@/app/(dashboard)/hooks/useCan";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect, type MultiSelectOption } from "@/components/shared/MultiSelect";
import { PaginatedSearchSelect } from "@/components/shared/PaginatedSearchSelect";
import { SearchSelect, type SearchSelectOption } from "@/components/shared/SearchSelect";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { ChevronDown, Info } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { type Control, useForm, useWatch, type UseFormSetValue } from "react-hook-form";
import { rolesWithWriteAccess } from "../../utils/roles";
import AgentSelector from "../agent_management/AgentSelector";
import AccessGroupSelector from "../common_components/AccessGroupSelector";
import BudgetDurationDropdown from "../common_components/budget_duration_dropdown";
import SchemaFormFields from "../common_components/check_openapi_schema";
import KeyLifecycleSettings from "../common_components/KeyLifecycleSettings";
import ModelAliasManager from "../common_components/ModelAliasManager";
import {
  MountedFormField,
  MountedFormProvider,
  projectMountedValues,
  useMountRegistry,
  type MountedFormValues,
} from "../common_components/MountedFormField";
import PassThroughRoutesSelector from "../common_components/PassThroughRoutesSelector";
import PremiumLoggingSettings from "../common_components/PremiumLoggingSettings";
import RateLimitTypeFormItem from "../common_components/RateLimitTypeFormItem";
import RouterSettingsAccordion, {
  RouterSettingsAccordionRef,
  RouterSettingsAccordionValue,
} from "../common_components/RouterSettingsAccordion";
import TeamDropdown from "../common_components/team_dropdown";
import OrganizationDropdown from "../common_components/OrganizationDropdown";
import ProjectDropdown from "../common_components/ProjectDropdown";
import { CreateUserButton } from "../CreateUserButton";
import { BudgetFallbacksEditor } from "../key_team_helpers/BudgetFallbacksEditor";
import { BudgetWindowEntry, BudgetWindowsEditor } from "../key_team_helpers/BudgetWindowsEditor";
import { ModelMaxBudget, ModelMaxBudgetEditor } from "../key_team_helpers/ModelMaxBudgetEditor";
import { TagRateLimitEditor, TagRateLimitEntry } from "../key_team_helpers/TagRateLimitEditor";
import {
  excludeProxyWideSentinel,
  getModelDisplayName,
  hasAllModelsSentinel,
} from "../key_team_helpers/fetch_available_models_team_key";
import { Team } from "../key_team_helpers/key_list";
import MCPServerSelector from "../mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "../mcp_server_management/MCPToolPermissions";
import { toast } from "@/lib/toast";
import {
  getAgentsList,
  getGuardrailsList,
  getPoliciesList,
  getPossibleUserRoles,
  getPromptsList,
  keyCreateCall,
  keyCreateServiceAccountCall,
  modelAvailableCall,
  proxyBaseUrl,
  userFilterUICall,
} from "../networking";
import CreatedKeyDisplay from "../shared/CreatedKeyDisplay";
import NumericalInput from "../shared/numerical_input";
import VectorStoreSelector from "../vector_store_management/VectorStoreSelector";
import { buildKeyCreatePayload, type KeyCreateInput } from "./createKeyPayload";
import { simplifyKeyGenerateError } from "./utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY_TYPE_OPTIONS = [
  { value: "llm_api", label: "AI APIs", hint: "Can call only AI API routes (chat/completions, embeddings, etc.)" },
  { value: "management", label: "Management", hint: "Can call only management routes (user/team/key management)" },
  { value: "default", label: "Full Access", hint: "Can call all routes (AI APIs, Management, and read-only)" },
];

const KEY_OWNER_LABEL_CLASS = "flex items-center gap-2 text-sm font-normal text-foreground";

const SECTION_HEADER_CLASS = "group/section flex w-full items-center justify-between px-4 py-3 text-left";
const SECTION_CHEVRON_CLASS =
  "size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180";

type FieldWrite = (value: unknown) => void;

type McpSelectorValue = { servers: string[]; accessGroups: string[]; toolsets?: string[] };

type AgentSelectorValue = { agents: string[]; accessGroups: string[] };

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "";

const requiredRule = (required: boolean, message: string) => ({
  validate: (value: unknown) => (required && isBlank(value) ? message : true),
});

const ceilingRule = (ceiling: number | null | undefined, message: (limit: number) => string) => ({
  validate: (value: unknown) =>
    value && ceiling !== null && ceiling !== undefined && (value as number) > ceiling ? message(ceiling) : true,
});

interface McpToolPermissionsFieldProps {
  readonly accessToken: string;
  readonly control: Control<MountedFormValues>;
  readonly setValue: UseFormSetValue<MountedFormValues>;
}

const McpToolPermissionsField: React.FC<McpToolPermissionsFieldProps> = ({ accessToken, control, setValue }) => {
  const selection = useWatch({ control, name: "allowed_mcp_servers_and_groups" }) as
    | { servers?: string[]; accessGroups?: string[]; toolsets?: string[] }
    | undefined;
  const toolPermissions = useWatch({ control, name: "mcp_tool_permissions" }) as Record<string, string[]> | undefined;

  return (
    <div className="mt-6">
      <MCPToolPermissions
        accessToken={accessToken}
        selectedServers={selection?.servers || []}
        selectedAccessGroups={selection?.accessGroups || []}
        selectedToolsets={selection?.toolsets || []}
        toolPermissions={toolPermissions || {}}
        onChange={(toolPerms) => setValue("mcp_tool_permissions", toolPerms)}
      />
    </div>
  );
};

/**
 * Interface for pre-filling the create key form from URL parameters
 */
export interface CreateKeyPrefillData {
  owned_by?: "you" | "service_account" | "another_user";
  team_id?: string;
  key_alias?: string;
  models?: string[];
  key_type?: "default" | "llm_api" | "management";
}

interface CreateKeyProps {
  team: Team | null;
  data: any[] | null;
  teams: Team[] | null;
  addKey: (data: any) => void;
  autoOpenCreate?: boolean;
  prefillData?: CreateKeyPrefillData;
}

interface User {
  user_id: string;
  user_email: string;
  role?: string;
}

export const fetchTeamModels = async (
  userID: string,
  userRole: string,
  accessToken: string,
  teamID: string | null,
): Promise<string[]> => {
  try {
    if (userID === null || userRole === null) {
      return [];
    }

    if (accessToken !== null) {
      const model_available = await modelAvailableCall(accessToken, userID, userRole, true, teamID, true);
      let available_model_names = model_available["data"].map((element: { id: string }) => element.id);
      return available_model_names;
    }
    return [];
  } catch (error) {
    console.error("Error fetching user models:", error);
    return [];
  }
};

export const fetchUserModels = async (
  userID: string,
  userRole: string,
  accessToken: string,
  setUserModels: (models: string[]) => void,
) => {
  try {
    if (userID === null || userRole === null) {
      return;
    }

    if (accessToken !== null) {
      const model_available = await modelAvailableCall(accessToken, userID, userRole);
      let available_model_names = model_available["data"].map((element: { id: string }) => element.id);
      setUserModels(available_model_names);
    }
  } catch (error) {
    console.error("Error fetching user models:", error);
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * @deprecated
 * This component is being DEPRECATED in favor of src/app/(dashboard)/virtual-keys/components/CreateKey.tsx
 * Please contribute to the new refactor.
 * ─────────────────────────────────────────────────────────────────────────
 */
const CreateKey: React.FC<CreateKeyProps> = ({ team, teams, data, addKey, autoOpenCreate, prefillData }) => {
  const { accessToken, userId: userID, userRole, premiumUser } = useAuthorized();
  const canEditGuardrails = premiumUser || (userRole != null && rolesWithWriteAccess.includes(userRole));
  const canViewPolicies = useCan("viewPolicies");
  const canViewPrompts = useCan("viewPrompts");
  const { data: organizations, isLoading: isOrganizationsLoading } = useOrganizations();
  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const { data: uiSettingsData } = useUISettings();
  const { data: tagsData } = useTags();
  const enableProjectsUI = Boolean(uiSettingsData?.values?.enable_projects_ui);
  const disableCustomApiKeys = Boolean(uiSettingsData?.values?.disable_custom_api_keys);
  const tagOptions = tagsData ? Object.values(tagsData).map((tag) => ({ value: tag.name, label: tag.name })) : [];
  const queryClient = useQueryClient();
  const [formDefaults] = useState<MountedFormValues>(() => ({
    team_id: team ? team.team_id : null,
    key_type: "llm_api",
    tpm_limit_type: null,
    rpm_limit_type: null,
    mcp_tool_permissions: {},
    duration: "",
  }));
  const form = useForm<MountedFormValues>({
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: formDefaults,
  });
  const registry = useMountRegistry();
  const mountedForm = useMemo(() => ({ control: form.control, registry }), [form.control, registry]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [userModels, setUserModels] = useState<string[]>([]);
  const [modelsToPick, setModelsToPick] = useState<string[]>([]);
  const [keyOwner, setKeyOwner] = useState("you");
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [pendingPrefillModels, setPendingPrefillModels] = useState<string[] | null>(null);
  const [guardrailsList, setGuardrailsList] = useState<string[]>([]);
  const [policiesList, setPoliciesList] = useState<string[]>([]);
  const [promptsList, setPromptsList] = useState<string[]>([]);
  const [loggingSettings, setLoggingSettings] = useState<any[]>([]);
  const [selectedCreateKeyTeam, setSelectedCreateKeyTeam] = useState<Team | null>(team);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [possibleUIRoles, setPossibleUIRoles] = useState<Record<string, Record<string, string>>>({});
  const [userOptions, setUserOptions] = useState<SearchSelectOption[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const latestUserSearchRef = useRef(0);
  const [disabledCallbacks, setDisabledCallbacks] = useState<string[]>([]);
  const [keyType, setKeyType] = useState<string>("llm_api");
  const [modelAliases, setModelAliases] = useState<{ [key: string]: string }>({});
  const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(false);
  const [rotationInterval, setRotationInterval] = useState<string>("30d");
  const [routerSettings, setRouterSettings] = useState<RouterSettingsAccordionValue | null>(null);
  const routerSettingsRef = useRef<RouterSettingsAccordionRef>(null);
  const [budgetLimits, setBudgetLimits] = useState<BudgetWindowEntry[]>([]);
  const [modelMaxBudget, setModelMaxBudget] = useState<ModelMaxBudget>({});
  const [tagRateLimits, setTagRateLimits] = useState<TagRateLimitEntry[]>([]);
  const [budgetFallbacks, setBudgetFallbacks] = useState<Record<string, string[]>>({});
  const [budgetFallbacksKey, setBudgetFallbacksKey] = useState<number>(0);
  const [routerSettingsKey, setRouterSettingsKey] = useState<number>(0);
  const [agentsList, setAgentsList] = useState<{ agent_id: string; agent_name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedModels: string[] = (useWatch({ control: form.control, name: "models" }) as string[] | undefined) ?? [];
  const handleCancel = () => {
    setIsModalVisible(false);
    setApiKey(null);
    setSelectedCreateKeyTeam(null);
    form.reset(formDefaults);
    setLoggingSettings([]);
    setDisabledCallbacks([]);
    setKeyType("llm_api");
    setModelAliases({});
    setAutoRotationEnabled(false);
    setRotationInterval("30d");
    setRouterSettings(null);
    setRouterSettingsKey((prev) => prev + 1);
    setSelectedAgentId(null);
    setSelectedOrganizationId(null);
    setSelectedProjectId(null);
    setBudgetLimits([]);
    setTagRateLimits([]);
    setBudgetFallbacks({});
    setBudgetFallbacksKey((k) => k + 1);
  };

  useEffect(() => {
    if (userID && userRole && accessToken) {
      fetchUserModels(userID, userRole, accessToken, setUserModels);
    }
  }, [accessToken, userID, userRole]);

  useEffect(() => {
    if (accessToken) {
      getAgentsList(accessToken)
        .then((res) => setAgentsList(res?.agents || []))
        .catch(() => setAgentsList([]));
    }
  }, [accessToken]);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const response = await getGuardrailsList(accessToken);
        const guardrailNames = response.guardrails.map((g: { guardrail_name: string }) => g.guardrail_name);
        setGuardrailsList(guardrailNames);
      } catch (error) {
        console.error("Failed to fetch guardrails:", error);
      }
    };

    const fetchPolicies = async () => {
      try {
        const response = await getPoliciesList(accessToken);
        const policyNames = response.policies.map((p: { policy_name: string }) => p.policy_name);
        setPoliciesList(policyNames);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      }
    };

    const fetchPrompts = async () => {
      try {
        const response = await getPromptsList(accessToken);
        setPromptsList(Array.from(new Set(response.prompts.map((prompt) => prompt.prompt_id))));
      } catch (error) {
        console.error("Failed to fetch prompts:", error);
      }
    };

    fetchGuardrails();
    if (canViewPolicies) fetchPolicies();
    if (canViewPrompts) fetchPrompts();
  }, [accessToken, canViewPolicies, canViewPrompts]);

  // Fetch possible user roles when component mounts
  useEffect(() => {
    const fetchPossibleRoles = async () => {
      try {
        if (accessToken) {
          // Check if roles are cached in session storage
          const cachedRoles = sessionStorage.getItem("possibleUserRoles");
          if (cachedRoles) {
            setPossibleUIRoles(JSON.parse(cachedRoles));
          } else {
            const availableUserRoles = await getPossibleUserRoles(accessToken);
            sessionStorage.setItem("possibleUserRoles", JSON.stringify(availableUserRoles));
            setPossibleUIRoles(availableUserRoles);
          }
        }
      } catch (error) {
        console.error("Error fetching possible user roles:", error);
      }
    };

    fetchPossibleRoles();
  }, [accessToken]);

  // Auto-open modal and prefill form from URL params (deep link).
  // Guarded by write access so we don't open for read-only users.
  useEffect(() => {
    if (autoOpenCreate && !hasPrefilled && teams && userRole && rolesWithWriteAccess.includes(userRole)) {
      // Open the modal
      setIsModalVisible(true);
      setHasPrefilled(true);

      // Apply prefill data if provided
      if (prefillData) {
        // Set key owner (owned_by) - validate that "another_user" is only allowed for Admin
        if (prefillData.owned_by) {
          if (prefillData.owned_by === "another_user" && userRole !== "Admin") {
            // Ignore invalid owned_by for non-admin users, fall back to default
            setKeyOwner("you");
          } else {
            setKeyOwner(prefillData.owned_by);
          }
        }

        // Set team - find the team by ID and set it (only if team exists in user's teams)
        if (prefillData.team_id) {
          const selectedTeam = teams?.find((t) => t.team_id === prefillData.team_id) || null;
          if (selectedTeam) {
            setSelectedCreateKeyTeam(selectedTeam);
            form.setValue("team_id", prefillData.team_id);
          }
          // Silently ignore invalid team_id - don't prefill with a team user doesn't have access to
        }

        // Set key alias
        if (prefillData.key_alias) {
          form.setValue("key_alias", prefillData.key_alias);
        }

        // Defer model selection until we load the allowed model list.
        if (prefillData.models && prefillData.models.length > 0) {
          setPendingPrefillModels(prefillData.models);
        }

        // Set key type
        if (prefillData.key_type) {
          setKeyType(prefillData.key_type);
          form.setValue("key_type", prefillData.key_type);
        }
      }
    }
  }, [autoOpenCreate, prefillData, teams, hasPrefilled, form, userRole]);

  // Check if team selection is required
  const isTeamSelectionRequired = modelsToPick.includes("no-default-models");
  const isFormDisabled = isTeamSelectionRequired && !selectedCreateKeyTeam;

  const handleCreate = async (formValues: MountedFormValues) => {
    try {
      const input: KeyCreateInput = {
        formValues,
        existingKeys: data,
        keyOwner,
        userID,
        selectedAgentId,
        loggingSettings,
        disabledCallbacks,
        autoRotationEnabled,
        rotationInterval,
        modelAliases,
        routerSettings: routerSettingsRef.current?.getValue() ?? routerSettings,
        budgetLimits,
        modelMaxBudget,
        tagRateLimits,
        budgetFallbacks,
      };
      const built = buildKeyCreatePayload(input);
      if (built.kind === "duplicate_alias") {
        throw new Error(`密钥别名 ${built.alias} 已存在于团队 ${built.teamId}，请提供其他密钥别名`);
      }

      toast.info("正在调用 API");
      setIsModalVisible(true);

      if (built.kind === "agent_not_selected") {
        toast.fromError("请选择 Agent");
        return;
      }
      const { payload, endpoint } = built;

      const response =
        endpoint === "service_account"
          ? await keyCreateServiceAccountCall(accessToken, payload)
          : await keyCreateCall(accessToken, userID, payload);

      // Add the data to the state in the parent component
      // Also directly update the keys list in VirtualKeysTable without an API call
      addKey(response);

      // Invalidate and refetch all keys list queries to update the table
      // This will trigger a refetch of all key list queries regardless of pagination
      queryClient.invalidateQueries({ queryKey: keyKeys.lists() });

      setApiKey(response["key"]);
      toast.success("Virtual Key Created");
      form.reset(formDefaults);
      setBudgetLimits([]);
      setTagRateLimits([]);
      setBudgetFallbacks({});
      setBudgetFallbacksKey((k) => k + 1);
      localStorage.removeItem("userData" + userID);
    } catch (error) {
      const simplifiedError = simplifyKeyGenerateError(error);
      toast.fromError(simplifiedError);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    void form.handleSubmit(() => handleCreate(projectMountedValues(registry, form.getValues)))(event);

  // Fetch available models when team or auth changes.
  // Note: Model prefill from URL params is handled by the useEffect below, which
  // watches for pendingPrefillModels + modelsToPick to both be populated.
  useEffect(() => {
    if (selectedProjectId) {
      // When a project is selected, use the project's models
      const project = projects?.find((p) => p.project_id === selectedProjectId);
      const projectModels = project?.models ?? [];
      setModelsToPick(projectModels);
      form.setValue("models", []);
      return;
    }
    if (userID && userRole && accessToken) {
      fetchTeamModels(userID, userRole, accessToken, selectedCreateKeyTeam?.team_id ?? null).then((models) => {
        const allModels = excludeProxyWideSentinel(
          Array.from(new Set([...(selectedCreateKeyTeam?.models ?? []), ...models])),
        );
        setModelsToPick(allModels);
      });
    }
    // Only clear models if we don't have pending prefill models
    if (!pendingPrefillModels) {
      form.setValue("models", []);
    }
    // Clear MCP server selection when team changes (available servers may differ)
    form.setValue("allowed_mcp_servers_and_groups", { servers: [], accessGroups: [] });
  }, [selectedCreateKeyTeam, selectedProjectId, accessToken, userID, userRole, form]);

  // Apply deferred model prefill once the available model list arrives.
  // This handles timing where prefill data arrives before or after models are fetched.
  useEffect(() => {
    if (!pendingPrefillModels || pendingPrefillModels.length === 0) {
      return;
    }
    if (!modelsToPick || modelsToPick.length === 0) {
      return;
    }

    const validModels = pendingPrefillModels.filter((model) => modelsToPick.includes(model));
    if (validModels.length > 0) {
      form.setValue("models", validModels);
    }
    setPendingPrefillModels(null);
  }, [pendingPrefillModels, modelsToPick, form]);

  // Sync team when project is selected but teams loaded later (race condition)
  useEffect(() => {
    if (!selectedProjectId || !teams) return;
    const project = projects?.find((p) => p.project_id === selectedProjectId);
    if (!project?.team_id) return;
    // If team is already set correctly, skip
    if (selectedCreateKeyTeam?.team_id === project.team_id) return;
    const projectTeam = teams.find((t) => t.team_id === project.team_id) || null;
    if (projectTeam) {
      setSelectedCreateKeyTeam(projectTeam);
      form.setValue("team_id", projectTeam.team_id);
    }
  }, [teams, selectedProjectId, projects]);

  // Add a callback function to handle user creation
  const handleUserCreated = (userId: string) => {
    form.setValue("user_id", userId);
    setIsCreateUserModalVisible(false);
  };

  const fetchUsers = async (searchText: string): Promise<void> => {
    const searchId = latestUserSearchRef.current + 1;
    latestUserSearchRef.current = searchId;
    const isLatestSearch = (): boolean => searchId === latestUserSearchRef.current;

    if (!searchText) {
      setUserOptions([]);
      setUserSearchLoading(false);
      return;
    }

    setUserSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("user_email", searchText); // Always search by email
      if (accessToken == null) {
        return;
      }
      const response = await userFilterUICall(accessToken, params);
      if (!isLatestSearch()) return;

      const data: User[] = response;
      const options: SearchSelectOption[] = data.map((user) => ({
        label: `${user.user_email} (${user.user_id})`,
        value: user.user_id,
      }));

      setUserOptions(options);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (isLatestSearch()) toast.fromError("Failed to search for users");
    } finally {
      if (isLatestSearch()) setUserSearchLoading(false);
    }
  };

  const changeOrganization = (write: FieldWrite) => (orgId: string | null) => {
    write(orgId ?? undefined);
    setSelectedOrganizationId(orgId);
    // Clear team and project when org changes
    setSelectedCreateKeyTeam(null);
    setSelectedProjectId(null);
    form.setValue("team_id", undefined);
    form.setValue("project_id", undefined);
  };

  const selectTeam = (team: Team | null) => {
    setSelectedCreateKeyTeam(team);
    setSelectedProjectId(null);
    form.setValue("project_id", undefined);
    // Auto-populate org from team for non-admin users
    if (team?.organization_id) {
      setSelectedOrganizationId(team.organization_id);
      form.setValue("organization_id", team.organization_id);
    } else if (!team) {
      setSelectedOrganizationId(null);
      form.setValue("organization_id", undefined);
    }
  };

  const changeProject = (write: FieldWrite) => (projectId: string) => {
    write(projectId);
    if (!projectId) {
      setSelectedProjectId(null);
      setSelectedCreateKeyTeam(null);
      form.setValue("team_id", undefined);
      return;
    }
    setSelectedProjectId(projectId);
  };

  const modelOptions: MultiSelectOption[] = [
    ...(selectedProjectId === null && selectedCreateKeyTeam
      ? [{ value: "all-team-models", label: "全部团队模型" }]
      : []),
    ...(selectedProjectId === null && !selectedCreateKeyTeam
      ? [{ value: "all-proxy-models", label: "全部代理模型" }]
      : []),
    ...modelsToPick.map((model) => ({
      value: model,
      label: getModelDisplayName(model),
      disabled: hasAllModelsSentinel(selectedModels),
    })),
  ];

  const changeKeyType = (write: FieldWrite) => (value: string) => {
    write(value);
    setKeyType(value);
    // Clear models field and disable if management or read_only
    if (value === "management" || value === "read_only") {
      form.setValue("models", []);
    }
  };

  return (
    <div>
      {userRole && rolesWithWriteAccess.includes(userRole) && (
        <Button className="mx-auto" onClick={() => setIsModalVisible(true)} data-testid="create-key-button">
          + 创建新密钥
        </Button>
      )}
      <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">创建新密钥</DialogTitle>
          </DialogHeader>
          <MountedFormProvider value={mountedForm}>
            <form onSubmit={handleSubmit}>
              {/* Section 1: Key Ownership */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-foreground mb-4">密钥归属</h3>
                <Field className="mb-4">
                  <FieldLabel>
                    <span>
                      所有者{" "}
                      <SimpleTooltip content="选择此虚拟密钥的所有者">
                        <Info className="ml-1 inline size-3.5 align-text-bottom" />
                      </SimpleTooltip>
                    </span>
                  </FieldLabel>
                  <RadioGroup
                    className="flex flex-wrap items-center gap-4"
                    value={keyOwner}
                    onValueChange={(value: unknown) => setKeyOwner(String(value))}
                  >
                    <label className={KEY_OWNER_LABEL_CLASS}>
                      <RadioGroupItem value="you" />
                      你
                    </label>
                    <label className={KEY_OWNER_LABEL_CLASS}>
                      <RadioGroupItem value="service_account" />
                      Service Account
                    </label>
                    {userRole === "Admin" && (
                      <label className={KEY_OWNER_LABEL_CLASS}>
                        <RadioGroupItem value="another_user" />
                        其他用户
                      </label>
                    )}
                  </RadioGroup>
                </Field>

                {keyOwner === "another_user" && (
                  <MountedFormField
                    label={
                      <span>
                        User ID{" "}
                        <SimpleTooltip content="拥有此密钥并对其用量负责的用户">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="user_id"
                    className="mt-4"
                    required
                    rules={requiredRule(
                      keyOwner === "another_user",
                      "请输入要分配密钥的用户 ID",
                    )}
                  >
                    {(control) => (
                      <div>
                        <div className="mb-2 flex">
                          <PaginatedSearchSelect
                            options={userOptions}
                            value={typeof control.value === "string" ? control.value : undefined}
                            onValueChange={control.onChange}
                            onSearchChange={fetchUsers}
                            isLoading={userSearchLoading}
                            placeholder="输入邮箱搜索用户"
                            emptyText="未找到用户"
                            loadingText="搜索中..."
                            inputId={control.id}
                            aria-required={control["aria-required"] === "true" ? true : undefined}
                            aria-invalid={control["aria-invalid"] === "true" ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                          <Button variant="outline" className="ml-2" onClick={() => setIsCreateUserModalVisible(true)}>
                            创建用户
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">按邮箱搜索用户</div>
                      </div>
                    )}
                  </MountedFormField>
                )}
                {keyOwner === "agent" && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md dark:bg-purple-950 dark:border-purple-800">
                    <div className="mb-3">
                      <label htmlFor="create-key-agent" className="text-sm font-medium text-foreground">
                        选择 Agent <span className="text-destructive">*</span>
                      </label>
                    </div>
                    <SearchSelect
                      inputId="create-key-agent"
                      placeholder="选择 Agent"
                      emptyText="未找到 Agent"
                      value={selectedAgentId ?? undefined}
                      onValueChange={(value) => setSelectedAgentId(value === "" ? null : value)}
                      options={agentsList.map((a) => ({
                        label: a.agent_name || a.agent_id,
                        value: a.agent_id,
                      }))}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      此密钥将由所选 Agent 用于向 LiteLLM 发起请求
                    </div>
                  </div>
                )}
                
                <MountedFormField
                  label={
                    <span>
                      团队{" "}
                      <SimpleTooltip content="此密钥所属的团队，决定可用模型和预算限制">
                        <Info className="ml-1 inline size-3.5 align-text-bottom" />
                      </SimpleTooltip>
                    </span>
                  }
                  name="team_id"
                  className="mt-4"
                  required={keyOwner === "service_account"}
                  rules={requiredRule(keyOwner === "service_account", "请为服务账号选择团队")}
                  help={keyOwner === "service_account" ? "必填" : ""}
                >
                  {(control) => (
                    <TeamDropdown
                      id={control.id}
                      value={control.value as string | undefined}
                      onChange={control.onChange}
                      disabled={selectedProjectId !== null}
                      organizationId={selectedOrganizationId}
                      onTeamSelect={selectTeam}
                    />
                  )}
                </MountedFormField>
                {enableProjectsUI && (
                  <MountedFormField
                    label={
                      <span>
                        项目{" "}
                        <SimpleTooltip content="将此密钥分配给项目。选择项目后，团队会锁定为项目所属团队。">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="project_id"
                    className="mt-4"
                  >
                    {(control) => (
                      <ProjectDropdown
                        id={control.id}
                        value={control.value as string | undefined}
                        projects={projects}
                        teamId={selectedCreateKeyTeam?.team_id}
                        loading={isProjectsLoading || !teams}
                        onChange={changeProject(control.onChange)}
                      />
                    )}
                  </MountedFormField>
                )}
              </div>

              {/* Show message when team selection is required */}
              {isFormDisabled && (
                <div className="mb-8 p-4 bg-info/10 border border-info/20 rounded-md">
                  <p className="text-info text-sm">
                    请先选择团队，再继续配置虚拟密钥。如果看不到任何团队，请联系代理管理员为你开通模型访问权限或将你加入团队。
                  </p>
                </div>
              )}

              {/* Section 2: Key Details */}
              {!isFormDisabled && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-foreground mb-4">密钥详情</h3>
                  <MountedFormField
                    label={
                      <span>
                        {keyOwner === "you" || keyOwner === "another_user" ? "密钥名称" : "服务账号 ID"}{" "}
                        <SimpleTooltip
                          content={
                            keyOwner === "you" || keyOwner === "another_user"
                              ? "用于识别此密钥的描述性名称"
                              : "此服务账号的唯一标识"
                          }
                        >
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="key_alias"
                    required
                    rules={requiredRule(
                      true,
                      `请输入${keyOwner === "you" ? "密钥名称" : "服务账号 ID"}`,
                    )}
                    help="必填"
                  >
                    {(control) => <Input {...control} value={(control.value as string | undefined) ?? ""} />}
                  </MountedFormField>

                  <MountedFormField
                    label={
                      <span>
                        模型{" "}
                        <SimpleTooltip content="选择此密钥可访问的模型。选择“全部团队模型”表示授予团队可用的全部模型访问权限；留空表示允许访问全部模型。">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="models"
                    help={
                      keyType === "management" || keyType === "read_only"
                        ? "此密钥类型已禁用模型字段"
                        : "可选，留空表示允许访问全部模型"
                    }
                    className="mt-4"
                  >
                    {(control) => (
                      <MultiSelect
                        id={control.id}
                        options={modelOptions}
                        value={(control.value as string[] | undefined) ?? []}
                        placeholder="选择模型"
                        disabled={keyType === "management" || keyType === "read_only"}
                        onValueChange={(values) => {
                          control.onChange(values);
                          if (values.includes("all-team-models")) {
                            form.setValue("models", ["all-team-models"]);
                          } else if (values.includes("all-proxy-models")) {
                            form.setValue("models", ["all-proxy-models"]);
                          }
                        }}
                      />
                    )}
                  </MountedFormField>

                  <MountedFormField
                    label={
                      <span>
                        密钥类型{" "}
                        <SimpleTooltip content="选择密钥类型，以决定此密钥可访问的路由和操作">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="key_type"
                    className="mt-4"
                  >
                    {(control) => (
                      <Select
                        items={KEY_TYPE_OPTIONS}
                        value={control.value as string | undefined}
                        onValueChange={(value: string | null) =>
                          value != null && changeKeyType(control.onChange)(value)
                        }
                      >
                        <SelectTrigger
                          id={control.id}
                          className="w-full"
                          aria-invalid={control["aria-invalid"]}
                          aria-describedby={control["aria-describedby"]}
                        >
                          <SelectValue placeholder="选择密钥类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {KEY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="py-1">
                                <div className="font-medium">{option.label}</div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </MountedFormField>
                </div>
              )}

              {/* Section 3: Optional Settings */}
              {!isFormDisabled && (
                <div className="mb-8">
                  <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                    <h3 className="m-0 text-lg font-medium text-foreground">
                      <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                        可选设置
                        <ChevronDown className={SECTION_CHEVRON_CLASS} />
                      </CollapsibleTrigger>
                    </h3>
                    <CollapsibleContent className="px-4 pb-3">
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            最大预算 (USD){" "}
                            <SimpleTooltip content="此密钥可消耗的最大美元金额。达到后，该密钥将无法继续发起请求">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="max_budget"
                        help={`预算不能超过团队最大预算：$${team?.max_budget !== null && team?.max_budget !== undefined ? team?.max_budget : "无限制"}`}
                        rules={ceilingRule(
                          team?.max_budget,
                          (limit) => `预算不能超过团队最大预算：$${formatNumberWithCommas(limit, 4)}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={0.01}
                            precision={2}
                            width={200}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            重置预算{" "}
                            <SimpleTooltip content="预算重置频率。例如设置为 'daily' 会每 24 小时重置一次预算">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="budget_duration"
                        help={`团队重置预算：${team?.budget_duration !== null && team?.budget_duration !== undefined ? team?.budget_duration : "无"}`}
                      >
                        {(control) => (
                          <BudgetDurationDropdown
                            id={control.id}
                            value={control.value as string | null | undefined}
                            showNeverResets
                            placeholder="未设置"
                            onChange={control.onChange}
                          />
                        )}
                      </MountedFormField>
              
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            Tokens per minute Limit (TPM){" "}
                            <SimpleTooltip content="此密钥每分钟可处理的最大 token 数，用于控制用量和成本">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="tpm_limit"
                        help={`TPM 不能超过团队 TPM 限制：${team?.tpm_limit !== null && team?.tpm_limit !== undefined ? team?.tpm_limit : "无限制"}`}
                        rules={ceilingRule(
                          team?.tpm_limit,
                          (limit) => `TPM 限制不能超过团队 TPM 限制：${limit}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={1}
                            width={400}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField name="tpm_limit_type" bare>
                        {(control) => (
                          <RateLimitTypeFormItem
                            type="tpm"
                            name="tpm_limit_type"
                            className="mt-4"
                            showDetailedDescriptions
                            id={control.id}
                            value={control.value as string | null | undefined}
                            onChange={control.onChange}
                            aria-invalid={control["aria-invalid"] ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            Requests per minute Limit (RPM){" "}
                            <SimpleTooltip content="此密钥每分钟可发起的最大 API 请求数，用于防止滥用并管理负载">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="rpm_limit"
                        help={`RPM 不能超过团队 RPM 限制：${team?.rpm_limit !== null && team?.rpm_limit !== undefined ? team?.rpm_limit : "无限制"}`}
                        rules={ceilingRule(
                          team?.rpm_limit,
                          (limit) => `RPM 限制不能超过团队 RPM 限制：${limit}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={1}
                            width={400}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField name="rpm_limit_type" bare>
                        {(control) => (
                          <RateLimitTypeFormItem
                            type="rpm"
                            name="rpm_limit_type"
                            className="mt-4"
                            showDetailedDescriptions
                            id={control.id}
                            value={control.value as string | null | undefined}
                            onChange={control.onChange}
                            aria-invalid={control["aria-invalid"] ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <Field className="mt-4">
                        <FieldLabel>
                          <span>
                            按 Tag 速率限制{" "}
                            <SimpleTooltip content="将速率限制限定到请求 tag，让每个 tag（例如单元或组）拥有自己的 RPM 计数器。没有匹配 tag 的请求会回退到密钥级限制。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        </FieldLabel>
                        <TagRateLimitEditor value={tagRateLimits} onChange={setTagRateLimits} />
                      </Field>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            超出预算时限流{" "}
                            <SimpleTooltip content="当此密钥超过最大预算时，将其 TPM/RPM 限流到全局配置比例，而不是完全阻止访问。需要在 litellm_settings 中配置 budget_exceeded_throttle_percentage，并在密钥上设置 TPM/RPM 限制。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="throttle_on_budget_exceeded"
                      >
                        {(control) => (
                          <Switch
                            id={control.id}
                            checked={control.value === true}
                            onCheckedChange={control.onChange}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            启用 Prompt Caching{" "}
                            <SimpleTooltip content="为此密钥发起的请求自动添加 prompt caching 断点（cache_control markers），降低重复 prompts 的输入成本。适用于 Anthropic 和 Bedrock Claude 模型；已自行设置 cache_control markers 的请求不受影响。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="enable_prompt_caching"
                      >
                        {(control) => (
                          <Switch
                            id={control.id}
                            checked={control.value === true}
                            onCheckedChange={control.onChange}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Guardrails{" "}
                            <SimpleTooltip content="为此密钥应用安全 guardrails，用于过滤内容或执行 policies">
                              <a
                                href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                              >
                                <Info className="ml-1 inline size-3.5 align-text-bottom" />
                              </a>
                            </SimpleTooltip>
                          </span>
                        }
                        name="guardrails"
                        className="mt-4"
                        help={
                          canEditGuardrails
                            ? "选择已有 guardrails 或输入新的 guardrails"
                            : "高级功能：升级后可按密钥设置 guardrails"
                        }
                      >
                        {(control) => (
                          <TagsInput
                            id={control.id}
                            value={(control.value as string[] | undefined) ?? []}
                            onValueChange={control.onChange}
                            disabled={!canEditGuardrails}
                            placeholder={
                              !canEditGuardrails
                                ? "高级功能：升级后可按密钥设置 guardrails"
                                : "选择或输入 guardrails"
                            }
                            options={guardrailsList.map((name) => ({ value: name, label: name }))}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            禁用全局 Guardrails{" "}
                            <SimpleTooltip content="启用后，此密钥会绕过所有配置为每次请求都运行的 guardrails（全局 guardrails）">
                              <a
                                href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                              >
                                <Info className="ml-1 inline size-3.5 align-text-bottom" />
                              </a>
                            </SimpleTooltip>
                          </span>
                        }
                        name="disable_global_guardrails"
                        className="mt-4"
                        help={
                          canEditGuardrails
                            ? "此密钥绕过全局 guardrails"
                            : "高级功能：升级后可按密钥禁用全局 guardrails"
                        }
                      >
                        {(control) => (
                          <Switch
                            id={control.id}
                            checked={control.value === true}
                            onCheckedChange={control.onChange}
                            disabled={!canEditGuardrails}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      
                    
                      
                      <MountedFormField
                        label={
                          <span>
                            Metadata{" "}
                            <SimpleTooltip content="包含此密钥附加信息的 JSON 对象，用于跟踪或自定义逻辑">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="metadata"
                        className="mt-4"
                      >
                        {(control) => (
                          <Textarea
                            {...control}
                            value={(control.value as string | undefined) ?? ""}
                            rows={4}
                            placeholder="以 JSON 输入 metadata"
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Tags{" "}
                            <SimpleTooltip content="用于跟踪花费和/或基于 tag 路由的 tags，可用于分析和过滤">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="tags"
                        className="mt-4"
                        help="用于跟踪花费和/或基于 tag 路由的 tags。"
                      >
                        {(control) => (
                          <TagsInput
                            id={control.id}
                            value={(control.value as string[] | undefined) ?? []}
                            onValueChange={control.onChange}
                            placeholder="选择或输入 tags"
                            tokenSeparators={[","]}
                            options={tagOptions}
                          />
                        )}
                      </MountedFormField>
                  

                      {premiumUser ? (
                        <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                          <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                            <b>日志设置</b>
                            <ChevronDown className={SECTION_CHEVRON_CLASS} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-3">
                            <div className="mt-4">
                              <PremiumLoggingSettings
                                value={loggingSettings}
                                onChange={setLoggingSettings}
                                premiumUser={true}
                                disabledCallbacks={disabledCallbacks}
                                onDisabledCallbacksChange={setDisabledCallbacks}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <SimpleTooltip
                          className="w-full"
                          content={
                            <span>
                              密钥级日志设置是企业版功能，请联系 -
                              <a href="https://www.litellm.ai/enterprise" target="_blank">
                                https://www.litellm.ai/enterprise
                              </a>
                            </span>
                          }
                          side="top"
                        >
                          <div style={{ position: "relative" }}>
                            <div style={{ opacity: 0.5 }}>
                              <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                                <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                                  <b>日志设置</b>
                                  <ChevronDown className={SECTION_CHEVRON_CLASS} />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="px-4 pb-3">
                                  <div className="mt-4">
                                    <PremiumLoggingSettings
                                      value={loggingSettings}
                                      onChange={setLoggingSettings}
                                      premiumUser={false}
                                      disabledCallbacks={disabledCallbacks}
                                      onDisabledCallbacksChange={setDisabledCallbacks}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                            <div style={{ position: "absolute", inset: 0, cursor: "not-allowed" }} />
                          </div>
                        </SimpleTooltip>
                      )}

                      <Collapsible
                        key={`router-settings-accordion-${routerSettingsKey}`}
                        className="mt-4 mb-4 overflow-hidden rounded-lg border"
                      >
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>路由设置</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4 w-full">
                            <RouterSettingsAccordion
                              key={routerSettingsKey}
                              ref={routerSettingsRef}
                              accessToken={accessToken || ""}
                              value={routerSettings || undefined}
                              onChange={setRouterSettings}
                              modelData={
                                userModels.length > 0
                                  ? { data: userModels.map((model) => ({ model_name: model })) }
                                  : undefined
                              }
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>模型别名</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              创建可在 API 调用中使用的自定义模型别名，用于为特定模型设置快捷名称。
                            </p>
                            <ModelAliasManager
                              accessToken={accessToken}
                              initialModelAliases={modelAliases}
                              onAliasUpdate={setModelAliases}
                              showExampleConfig={false}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>密钥生命周期</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4">
                            <MountedFormField name="duration" bare>
                              {(control) => (
                                <KeyLifecycleSettings
                                  id={control.id}
                                  value={control.value as string | undefined}
                                  onChange={control.onChange}
                                  autoRotationEnabled={autoRotationEnabled}
                                  onAutoRotationChange={setAutoRotationEnabled}
                                  rotationInterval={rotationInterval}
                                  onRotationIntervalChange={setRotationInterval}
                                  isCreateMode={true}
                                />
                              )}
                            </MountedFormField>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <div className="flex items-center gap-2">
                            <b>高级设置</b>
                            <SimpleTooltip
                              content={
                                <span>
                                  在我们的{" "}
                                  <a
                                    href={
                                      proxyBaseUrl
                                        ? `${proxyBaseUrl}/#/key%20management/generate_key_fn_key_generate_post`
                                        : `/#/key%20management/generate_key_fn_key_generate_post`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info hover:text-info/80"
                                  >
                                    文档
                                  </a>
                                </span>
                              }
                            >
                              <Info className="size-4 text-muted-foreground hover:text-foreground cursor-help" />
                            </SimpleTooltip>
                          </div>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <SchemaFormFields
                            schemaComponent="GenerateKeyRequest"
                            setValue={form.setValue}
                            excludedFields={[
                              "key_alias",
                              "team_id",
                              "organization_id",
                              "models",
                              "duration",
                              "metadata",
                              "tags",
                              "guardrails",
                              "max_budget",
                              "budget_duration",
                              "tpm_limit",
                              "rpm_limit",
                              ...(disableCustomApiKeys ? ["key"] : []),
                            ]}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              <div style={{ textAlign: "right", marginTop: "10px" }}>
                <Button type="submit" disabled={isFormDisabled}>
                  创建密钥
                </Button>
              </div>
            </form>
          </MountedFormProvider>
        </DialogContent>
      </Dialog>

      {/* Add the Create User Modal */}
      {isCreateUserModalVisible && (
        <Dialog open={isCreateUserModalVisible} onOpenChange={(open) => !open && setIsCreateUserModalVisible(false)}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
            </DialogHeader>
            <CreateUserButton
              userID={userID}
              accessToken={accessToken}
              possibleUIRoles={possibleUIRoles}
              onUserCreated={handleUserCreated}
              isEmbedded={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {apiKey && (
        <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2 w-full">
              <DialogTitle className="text-lg font-medium text-foreground">保存你的密钥</DialogTitle>
              {apiKey != null ? (
                <CreatedKeyDisplay apiKey={apiKey} />
              ) : (
                <p className="text-sm">密钥正在创建中，可能需要 30 秒</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CreateKey;
