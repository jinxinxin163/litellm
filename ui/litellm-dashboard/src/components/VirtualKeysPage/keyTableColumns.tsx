"use client";

import { Info } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableMultiSortHeader, DataTableSortHeader, type DataTableSortField } from "@/components/shared/DataTable";
import { inheritedBudgetGates } from "@/components/shared/InheritedBudgetHint";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DateCell,
  IdCell,
  IdentityCell,
  ModelsCell,
  SpendBudgetCell,
  StatusBadge,
  type StatusTone,
} from "@/components/shared/table_cells";

import DefaultProxyAdminTag from "../common_components/DefaultProxyAdminTag";
import { KeyResponse, Team } from "../key_team_helpers/key_list";
import { Organization } from "../networking";

interface KeyStatus {
  tone: StatusTone;
  label: string;
  tooltip?: string;
}

const SPEND_BUDGET_SORT_FIELDS: DataTableSortField[] = [
  { id: "spend", label: "花费" },
  { id: "max_budget", label: "预算" },
];

export const KEY_TABLE_SORT_FIELDS: readonly string[] = [
  "key_alias",
  "token",
  "created_at",
  "updated_at",
  ...SPEND_BUDGET_SORT_FIELDS.map((field) => field.id),
];

const getKeyStatus = (key: KeyResponse): KeyStatus => {
  if (key.blocked === true) {
    const isScimBlocked = (key.metadata as Record<string, unknown> | null | undefined)?.scim_blocked === true;
    return {
      tone: "error",
      label: "已阻止",
      tooltip: isScimBlocked
        ? "已被 SCIM 阻止，外部身份提供商停用或删除了所属用户。"
        : "已阻止。使用此密钥的请求将返回 401。",
    };
  }
  const expiresAt = key.expires ? Date.parse(key.expires) : Number.NaN;
  if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
    return { tone: "warning", label: "已过期", tooltip: "此密钥已超过过期时间。" };
  }
  return {
    tone: "success",
    label: "可用",
    tooltip: "此密钥未被阻止且未过期。",
  };
};

const UserPopoverCell = ({
  userAlias,
  userEmail,
  userId,
  width,
}: {
  userAlias: string | null;
  userEmail: string | null;
  userId: string | null;
  width: number;
}) => {
  const displayValue = userAlias || userEmail || userId;
  const isDefaultAdmin = userId === "default_user_id";

  const popoverContent = (
    <div className="flex flex-col gap-2 text-xs min-w-[200px] max-w-[300px]">
      {[
        { label: "用户别名", value: userAlias },
        { label: "用户邮箱", value: userEmail },
        { label: "User ID", value: userId },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col min-w-0">
          <span className="text-muted-foreground">{label}</span>
          {value ? (
            <IdCell value={value} variant="plain" copyable className="max-w-full" />
          ) : (
            <span className="font-mono">-</span>
          )}
        </div>
      ))}
    </div>
  );

  if (isDefaultAdmin && !userAlias && !userEmail) {
    return (
      <HoverCard>
        <HoverCardTrigger render={<span className="cursor-default" />}>
          <DefaultProxyAdminTag userId={userId} />
        </HoverCardTrigger>
        <HoverCardContent align="start">{popoverContent}</HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span
            className="font-mono text-xs truncate block cursor-default"
            style={{ maxWidth: width, overflow: "hidden" }}
          />
        }
      >
        {displayValue || "-"}
      </HoverCardTrigger>
      <HoverCardContent align="start">{popoverContent}</HoverCardContent>
    </HoverCard>
  );
};

const InfoHeader = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <span className="flex items-center gap-1">
    {label}
    <HoverCard>
      <HoverCardTrigger render={<Info className="size-3 text-muted-foreground cursor-help" />} />
      <HoverCardContent className="w-auto">{tooltip}</HoverCardContent>
    </HoverCard>
  </span>
);

interface KeyTableColumnsDeps {
  allTeams: Team[];
  organizations: Organization[];
  onSelectKey: (key: KeyResponse) => void;
}

export const getKeyTableColumns = ({
  allTeams,
  organizations,
  onSelectKey,
}: KeyTableColumnsDeps): ColumnDef<KeyResponse>[] => [
  {
    id: "key_alias",
    accessorKey: "key_alias",
    meta: {
      title: "密钥",
      renderSkeleton: () => (
        <div className="flex flex-col gap-1 py-1">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ),
    },
    header: ({ column }) => <DataTableSortHeader column={column} title="密钥" variant="header-cycle" />,
    size: 260,
    enableSorting: true,
    cell: ({ row }) => {
      const status = getKeyStatus(row.original);
      return (
        <IdentityCell
          title={row.original.key_alias || "-"}
          subtitle={row.original.key_name}
          badge={
            <StatusBadge
              tone={status.tone}
              label={status.label}
              tooltip={status.tooltip}
              dataTestId={`key-status-${row.original.token_id}`}
            />
          }
          onClick={() => onSelectKey(row.original)}
        />
      );
    },
  },
  {
    id: "token",
    accessorKey: "token",
    meta: { title: "密钥 ID" },
    header: ({ column }) => <DataTableSortHeader column={column} title="密钥 ID" variant="header-cycle" />,
    size: 120,
    enableSorting: true,
    cell: (info) => <IdCell value={info.getValue() as string | null} onClick={() => onSelectKey(info.row.original)} />,
  },
  {
    id: "team_alias",
    accessorKey: "team_id",
    meta: { title: "团队" },
    header: "团队",
    size: 120,
    enableSorting: false,
    cell: (info) => {
      const teamId = info.getValue() as string | null;
      if (!teamId) return "-";
      const team = allTeams.find((t) => t.team_id === teamId);
      const displayValue = team?.team_alias || teamId;
      const width = info.cell.column.getSize();
      return (
        <span className="font-mono text-xs truncate block" style={{ maxWidth: width, overflow: "hidden" }}>
          {displayValue}
        </span>
      );
    },
  },
  {
    id: "organization_alias",
    accessorKey: "org_id",
    meta: { title: "组织" },
    header: "组织",
    size: 140,
    enableSorting: false,
    cell: (info) => {
      const orgId = info.getValue() as string | null;
      if (!orgId) return "-";
      const org = organizations.find((o) => o.organization_id === orgId);
      const displayValue = org?.organization_alias || orgId;
      const width = info.cell.column.getSize();
      return (
        <span className="font-mono text-xs truncate block" style={{ maxWidth: width, overflow: "hidden" }}>
          {displayValue}
        </span>
      );
    },
  },
  {
    id: "user",
    accessorKey: "user",
    meta: { title: "用户" },
    header: () => (
      <InfoHeader label="用户" tooltip="显示第一个可用值：用户别名、用户邮箱或 User ID。" />
    ),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => {
      const key = row.original;
      return (
        <UserPopoverCell
          userAlias={key.user?.user_alias ?? null}
          userEmail={key.user?.user_email ?? key.user_email ?? null}
          userId={key.user_id ?? null}
          width={160}
        />
      );
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    meta: { title: "创建时间" },
    header: ({ column }) => <DataTableSortHeader column={column} title="创建时间" variant="header-cycle" />,
    size: 120,
    enableSorting: true,
    cell: (info) => <DateCell value={info.getValue() as string | null} precision="date" />,
  },
  {
    id: "created_by",
    accessorKey: "created_by",
    meta: { title: "创建者" },
    header: "创建者",
    size: 160,
    enableSorting: false,
    cell: (info) => {
      const userId = info.getValue() as string | null;
      if (!userId) return "-";
      const createdByUser = info.row.original.created_by_user;
      return (
        <UserPopoverCell
          userAlias={createdByUser?.user_alias ?? null}
          userEmail={createdByUser?.user_email ?? null}
          userId={userId}
          width={160}
        />
      );
    },
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    meta: { title: "更新时间" },
    header: ({ column }) => <DataTableSortHeader column={column} title="更新时间" variant="header-cycle" />,
    size: 120,
    enableSorting: true,
    cell: (info) => <DateCell value={info.getValue() as string | null} precision="date" fallback="从不" />,
  },
  {
    id: "last_active",
    accessorKey: "last_active",
    meta: { title: "最近活动" },
    header: () => (
      <InfoHeader
        label="最近活动"
        tooltip="这是一个新字段，不会回填历史数据。只有新的密钥使用记录会更新此值。"
      />
    ),
    size: 130,
    enableSorting: false,
    cell: (info) => <DateCell value={info.getValue() as string | null} precision="date" fallback="未知" />,
  },
  {
    id: "expires",
    accessorKey: "expires",
    meta: { title: "过期时间" },
    header: "过期时间",
    size: 120,
    enableSorting: false,
    cell: (info) => <DateCell value={info.getValue() as string | null} precision="date" fallback="从不" />,
  },
  {
    id: "spend",
    accessorKey: "spend",
    meta: { title: "花费 / 预算", skeleton: "meter" },
    header: ({ table }) => <DataTableMultiSortHeader table={table} fields={SPEND_BUDGET_SORT_FIELDS} />,
    size: 180,
    enableSorting: true,
    cell: ({ row }) => {
      const team = allTeams.find((t) => t.team_id === row.original.team_id);
      const orgId = row.original.organization_id || row.original.org_id || team?.organization_id;
      const organization = organizations.find((o) => o.organization_id === orgId);
      return (
        <SpendBudgetCell
          spend={row.original.spend}
          maxBudget={row.original.max_budget}
          inheritedGates={row.original.max_budget == null ? inheritedBudgetGates(team, organization) : []}
        />
      );
    },
  },
  {
    id: "budget_reset_at",
    accessorKey: "budget_reset_at",
    meta: { title: "预算重置" },
    header: "预算重置",
    size: 130,
    enableSorting: false,
    cell: (info) => <DateCell value={info.getValue() as string | null} fallback="从不" />,
  },
  {
    id: "models",
    accessorKey: "models",
    meta: { title: "模型", skeleton: "chips" },
    header: "模型",
    size: 220,
    enableSorting: false,
    cell: (info) => (
      <ModelsCell
        models={info.getValue() as string[] | null | undefined}
        allowedRoutes={info.row.original.allowed_routes}
        keyType={info.row.original.key_type}
      />
    ),
  },
  {
    id: "rate_limits",
    meta: { title: "速率限制" },
    header: "速率限制",
    size: 140,
    enableSorting: false,
    cell: ({ row }) => {
      const key = row.original;
      return (
        <div className="text-xs">
          <div>TPM: {key.tpm_limit !== null ? key.tpm_limit : "无限制"}</div>
          <div>RPM: {key.rpm_limit !== null ? key.rpm_limit : "无限制"}</div>
        </div>
      );
    },
  },
];

export const KEY_TABLE_HIDDEN_COLUMNS: Record<string, boolean> = {
  token: false,
  organization_alias: false,
  created_by: false,
  updated_at: false,
  expires: false,
  rate_limits: false,
};
