"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Copy, Info, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { ProviderLogo } from "@/components/molecules/models/ProviderLogo";
import { ModelData } from "@/components/model_dashboard/types";
import { DataTableSortHeader } from "@/components/shared/DataTable";
import { CellTooltip, DateCell, formatCellDate, IdCell, StatusBadge } from "@/components/shared/table_cells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";
import { getDisplayModelName } from "@/components/view_model/model_name_display";
import { copyToClipboard } from "@/utils/dataUtils";

export const MODEL_ID_COLUMN_ID = "model_info_id";
export const MODEL_NAME_COLUMN_ID = "model_name";
export const CREDENTIALS_COLUMN_ID = "litellm_credential_name";
export const CREATED_BY_COLUMN_ID = "model_info_created_by";
export const UPDATED_AT_COLUMN_ID = "model_info_updated_at";
export const COSTS_COLUMN_ID = "input_cost";
export const TEAM_ID_COLUMN_ID = "model_info_team_id";
export const ACCESS_GROUPS_COLUMN_ID = "model_info_access_groups";
export const STATUS_COLUMN_ID = "model_info_db_model";

const COLUMN_ID_TO_SERVER_SORT_FIELD: Record<string, string> = {
  [COSTS_COLUMN_ID]: "costs",
  [STATUS_COLUMN_ID]: "status",
  [CREATED_BY_COLUMN_ID]: "created_at",
  [UPDATED_AT_COLUMN_ID]: "updated_at",
};

export const toServerSortField = (columnId: string): string => COLUMN_ID_TO_SERVER_SORT_FIELD[columnId] ?? columnId;

const formatShortDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatCellDate(date, "date");
};

function ModelInformationCell({ model, displayName }: { model: ModelData; displayName: string }) {
  const litellmModelName = model.litellm_model_name || "-";

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <div className="flex min-w-0 items-center gap-2.5" data-testid={`model-information-${model.model_info.id}`} />
        }
      >
        {model.provider ? (
          <ProviderLogo provider={model.provider} className="size-6 shrink-0" />
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            -
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="max-w-60 truncate text-sm font-medium text-foreground" title={displayName}>
            {displayName}
          </span>
          <span className="max-w-60 truncate font-mono text-xs text-muted-foreground" title={litellmModelName}>
            {litellmModelName}
          </span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {model.provider ? <ProviderLogo provider={model.provider} className="size-4 shrink-0" /> : null}
            <span className="truncate text-xs text-muted-foreground">{model.provider || "未知 provider"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">公开模型名称</span>
            <span className="truncate text-sm font-medium text-foreground" title={displayName}>
              {displayName}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">LiteLLM 模型名称</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-sm text-foreground" title={litellmModelName}>
                {litellmModelName}
              </span>
              <button
                type="button"
                aria-label="复制 LiteLLM 模型名称"
                data-testid={`copy-litellm-model-name-${model.model_info.id}`}
                className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => void copyToClipboard(litellmModelName, "LiteLLM 模型名称已复制")}
              >
                <Copy className="size-3.5" />
              </button>
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CredentialsHeader() {
  return (
    <span className="flex items-center gap-1">
      凭据
      <HoverCard>
        <HoverCardTrigger
          render={
            <button
              type="button"
              aria-label="关于凭据类型"
              data-testid="credentials-header-info"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            />
          }
        >
          <Info className="size-3.5" />
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-80">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">凭据类型</span>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-info">
                <RefreshCw className="size-3.5" />
                可复用
              </span>
              <span className="text-xs text-muted-foreground">
                保存在 LiteLLM 中、可重复添加到模型的凭据。
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Pencil className="size-3.5" />
                手动
              </span>
              <span className="text-xs text-muted-foreground">
                在模型创建时直接添加，或在配置文件中定义的凭据。
              </span>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

function CredentialsCell({ credentialName }: { credentialName: string | undefined }) {
  if (!credentialName) {
    return (
      <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
        <Pencil className="size-3" />
        手动
      </Badge>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-info" title={credentialName}>
      <RefreshCw className="size-3 shrink-0" />
      <span className="truncate">{credentialName}</span>
    </span>
  );
}

function CreatedByCell({ model }: { model: ModelData }) {
  const isConfigModel = !model.model_info?.db_model;
  const createdAt = formatShortDate(model.model_info.created_at);
  const primary = isConfigModel ? "配置中定义" : model.model_info.created_by || "未知";
  const secondaryForDbModel = createdAt ?? "未知日期";

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="max-w-44 truncate text-sm text-foreground" title={primary}>
        {primary}
      </span>
      <span className="truncate text-xs text-muted-foreground">{isConfigModel ? "-" : secondaryForDbModel}</span>
    </div>
  );
}

function CostsCell({ model }: { model: ModelData }) {
  const { input_cost: inputCost, output_cost: outputCost } = model;

  if (inputCost == null && outputCost == null) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <CellTooltip
      content="每 100 万 tokens 成本"
      trigger={
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          {inputCost != null && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">IN</span>
              <span className="text-xs font-medium tabular-nums text-foreground">${inputCost}</span>
            </span>
          )}
          {outputCost != null && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">OUT</span>
              <span className="text-xs font-medium tabular-nums text-foreground">${outputCost}</span>
            </span>
          )}
        </div>
      }
    />
  );
}

function AccessGroupsCell({ accessGroups }: { accessGroups: string[] | null }) {
  if (!accessGroups || accessGroups.length === 0) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const [first, ...overflow] = accessGroups;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Badge variant="outline" className="max-w-36 truncate border-info/20 bg-info/10 font-normal text-info">
        {first}
      </Badge>
      {overflow.length > 0 && (
        <CellTooltip
          content={
            <div className="flex max-w-[280px] flex-col gap-0.5">
              {overflow.map((group) => (
                <span key={group}>{group}</span>
              ))}
            </div>
          }
          trigger={
            <Badge variant="outline" className="shrink-0 cursor-default font-normal">
              另有 {overflow.length} 个
            </Badge>
          }
        />
      )}
    </div>
  );
}

interface ModelRowActionsProps {
  model: ModelData;
  userRole: string;
  userID: string;
  isPausing: boolean;
  onDeleteClick?: (modelId: string) => void;
  onTogglePauseClick?: (modelId: string, blocked: boolean) => void | Promise<void>;
}

function ModelRowActions({
  model,
  userRole,
  userID,
  isPausing,
  onDeleteClick,
  onTogglePauseClick,
}: ModelRowActionsProps) {
  const modelId = model.model_info?.id;
  const isConfigModel = !model.model_info?.db_model;
  const isAdmin = userRole === "Admin";
  const canEditModel = isAdmin || model.model_info?.created_by === userID;
  const isBlocked = model.model_info?.blocked === true;
  const isPauseToggleable = !isConfigModel && isAdmin && Boolean(onTogglePauseClick);

  const resolvePauseTooltip = (): string => {
    if (isConfigModel) {
      return "配置模型不能从 dashboard 暂停。暂停状态依赖数据库。";
    }
    if (!isAdmin) {
      return "只有代理管理员可以暂停或恢复模型。";
    }
    return isBlocked ? "恢复模型，恢复正常路由。" : "暂停模型，在恢复前停止路由请求。";
  };

  const deleteTooltip = isConfigModel
    ? "配置模型不能从 dashboard 删除。请从配置文件中删除。"
    : "删除模型";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="flex w-8 shrink-0 items-center justify-center">
        {isPausing ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            data-testid={`model-pause-pending-${modelId}`}
          />
        ) : (
          <CellTooltip
            content={resolvePauseTooltip()}
            trigger={
              <span className="inline-flex">
                <Switch
                  size="sm"
                  checked={!isBlocked}
                  disabled={!isPauseToggleable}
                  aria-label={isBlocked ? "恢复模型" : "暂停模型"}
                  data-testid={`model-pause-toggle-${modelId}`}
                  onCheckedChange={(nextChecked) => {
                    if (isPauseToggleable && onTogglePauseClick && modelId) {
                      void onTogglePauseClick(modelId, !nextChecked);
                    }
                  }}
                />
              </span>
            }
          />
        )}
      </span>
      <CellTooltip
        content={deleteTooltip}
        trigger={
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="删除模型"
              data-testid={`model-delete-${modelId}`}
              disabled={isConfigModel || !canEditModel}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (onDeleteClick && modelId) {
                  onDeleteClick(modelId);
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        }
      />
    </div>
  );
}

export interface ModelsTableColumnDeps {
  userRole: string;
  userID: string;
  onModelIdClick: (modelId: string) => void;
  onTeamIdClick: (teamId: string) => void;
  onDeleteClick?: (modelId: string) => void;
  onTogglePauseClick?: (modelId: string, blocked: boolean) => void | Promise<void>;
  pausingModelId?: string | null;
}

export const getModelsTableColumns = ({
  userRole,
  userID,
  onModelIdClick,
  onTeamIdClick,
  onDeleteClick,
  onTogglePauseClick,
  pausingModelId,
}: ModelsTableColumnDeps): ColumnDef<ModelData>[] => [
  {
    id: MODEL_ID_COLUMN_ID,
    accessorFn: (row) => row.model_info.id,
    meta: { title: "模型 ID" },
    header: "模型 ID",
    enableSorting: false,
    size: 140,
    minSize: 90,
    cell: ({ row }) => (
      <IdCell
        value={row.original.model_info.id}
        onClick={onModelIdClick}
        dataTestId={`model-id-${row.original.model_info.id}`}
      />
    ),
  },
  {
    id: MODEL_NAME_COLUMN_ID,
    accessorFn: (row) => row.model_name ?? "",
    meta: { title: "模型信息", skeleton: "twoLine" },
    header: ({ column }) => <DataTableSortHeader column={column} title="模型信息" />,
    enableSorting: true,
    size: 280,
    minSize: 160,
    cell: ({ row }) => (
      <ModelInformationCell model={row.original} displayName={getDisplayModelName(row.original) || "-"} />
    ),
  },
  {
    id: CREDENTIALS_COLUMN_ID,
    accessorFn: (row) => row.litellm_params?.litellm_credential_name ?? "",
    meta: { title: "凭据" },
    header: () => <CredentialsHeader />,
    enableSorting: false,
    size: 180,
    minSize: 110,
    cell: ({ row }) => <CredentialsCell credentialName={row.original.litellm_params?.litellm_credential_name} />,
  },
  {
    id: CREATED_BY_COLUMN_ID,
    accessorFn: (row) => row.model_info.created_by ?? "",
    meta: { title: "创建者", skeleton: "twoLine" },
    header: ({ column }) => <DataTableSortHeader column={column} title="创建者" />,
    enableSorting: true,
    size: 180,
    minSize: 110,
    cell: ({ row }) => <CreatedByCell model={row.original} />,
  },
  {
    id: UPDATED_AT_COLUMN_ID,
    accessorFn: (row) => row.model_info.updated_at ?? "",
    meta: { title: "更新时间" },
    header: ({ column }) => <DataTableSortHeader column={column} title="更新时间" />,
    enableSorting: true,
    size: 140,
    minSize: 100,
    cell: ({ row }) => <DateCell value={row.original.model_info.updated_at} precision="date" />,
  },
  {
    id: COSTS_COLUMN_ID,
    accessorFn: (row) => row.input_cost,
    meta: { title: "成本" },
    header: ({ column }) => <DataTableSortHeader column={column} title="成本" />,
    enableSorting: true,
    size: 130,
    minSize: 90,
    cell: ({ row }) => <CostsCell model={row.original} />,
  },
  {
    id: TEAM_ID_COLUMN_ID,
    accessorFn: (row) => row.model_info.team_id ?? "",
    meta: { title: "团队 ID" },
    header: "团队 ID",
    enableSorting: false,
    size: 140,
    minSize: 90,
    cell: ({ row }) => (
      <IdCell
        value={row.original.model_info.team_id}
        onClick={onTeamIdClick}
        dataTestId={`model-team-id-${row.original.model_info.id}`}
      />
    ),
  },
  {
    id: ACCESS_GROUPS_COLUMN_ID,
    accessorFn: (row) => row.model_info.access_groups ?? [],
    meta: { title: "模型访问组", skeleton: "chips" },
    header: "模型访问组",
    enableSorting: false,
    size: 200,
    minSize: 120,
    cell: ({ row }) => <AccessGroupsCell accessGroups={row.original.model_info.access_groups} />,
  },
  {
    id: STATUS_COLUMN_ID,
    accessorFn: (row) => row.model_info.db_model,
    meta: { title: "来源", skeleton: "badge" },
    header: ({ column }) => <DataTableSortHeader column={column} title="来源" />,
    enableSorting: true,
    size: 140,
    minSize: 100,
    cell: ({ row }) =>
      row.original.model_info.db_model ? (
        <StatusBadge tone="info" label="数据库模型" />
      ) : (
        <StatusBadge tone="neutral" label="配置模型" />
      ),
  },
  {
    id: "actions",
    meta: { title: "操作", className: "text-right", headerClassName: "text-right" },
    header: "操作",
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 110,
    minSize: 110,
    cell: ({ row }) => (
      <ModelRowActions
        model={row.original}
        userRole={userRole}
        userID={userID}
        isPausing={pausingModelId === row.original.model_info?.id}
        onDeleteClick={onDeleteClick}
        onTogglePauseClick={onTogglePauseClick}
      />
    ),
  },
];
