"use client";

import { translate as translateEnglish, useTranslation } from "@/i18n/useTranslation";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";

import { DataTableSortHeader } from "@/components/shared/DataTable";
import { DateCell, IdCell, StatusBadge } from "@/components/shared/table_cells";
import { PolicyAttachment } from "@/components/policies/types";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cva.config";
import { copyToClipboard } from "@/utils/dataUtils";

import ImpactPopover from "./impact_popover";

type PolicyTranslator = ReturnType<typeof useTranslation>["t"];

function ChipList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.slice(0, 2).map((value) => (
        <StatusBadge key={value} tone="neutral" label={value} />
      ))}
      {values.length > 2 && (
        <StatusBadge tone="neutral" label={`+${values.length - 2}`} tooltip={values.slice(2).join(", ")} />
      )}
    </div>
  );
}

interface AttachmentRowActionsProps {
  attachment: PolicyAttachment;
  isAdmin: boolean;
  onDeleteClick: (attachmentId: string) => void;
}

const getConfigHint = (t: PolicyTranslator) => t("policiesPage.configAttachmentsAreDefinedInTheConfig");

function AttachmentRowActions({ attachment, isAdmin, onDeleteClick }: AttachmentRowActionsProps) {
  const { t } = useTranslation();
  const isConfigAttachment = attachment.definition_location === "config";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("policiesPage.openAttachmentActions")}
        data-testid={`attachment-actions-${attachment.attachment_id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          data-testid="attachment-action-copy-id"
          onClick={() => void copyToClipboard(attachment.attachment_id, t("policiesPage.attachmentIDCopied"))}
        >
          <Copy />
          {t("policiesPage.copyAttachmentID")}{" "}
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              data-testid="attachment-action-delete"
              disabled={isConfigAttachment}
              title={isConfigAttachment ? getConfigHint(t) : undefined}
              onClick={() => onDeleteClick(attachment.attachment_id)}
            >
              <Trash2 />
              {t("policiesPage.deleteAttachment")}{" "}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AttachmentTableColumnsDeps {
  t?: PolicyTranslator;
  isAdmin: boolean;
  accessToken: string | null;
  onDeleteClick: (attachmentId: string) => void;
}

export const getAttachmentTableColumns = ({
  t = translateEnglish,
  isAdmin,
  accessToken,
  onDeleteClick,
}: AttachmentTableColumnsDeps): ColumnDef<PolicyAttachment>[] => [
  {
    id: "attachment_id",
    accessorKey: "attachment_id",
    meta: { title: t("policiesPage.attachmentID") },
    header: t("policiesPage.attachmentID"),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <IdCell value={row.original.attachment_id} variant="plain" />,
  },
  {
    id: "policy_name",
    accessorKey: "policy_name",
    meta: { title: t("policiesPage.policy"), skeleton: "badge" },
    header: ({ column }) => <DataTableSortHeader column={column} title={t("policiesPage.policy")} />,
    size: 180,
    enableSorting: true,
    cell: ({ row }) => <StatusBadge tone="info" label={row.original.policy_name} />,
  },
  {
    id: "scope",
    accessorFn: (row) => row.scope ?? "",
    meta: { title: t("policiesPage.scope"), skeleton: "badge" },
    header: t("policiesPage.scope"),
    size: 120,
    enableSorting: false,
    cell: ({ row }) => {
      const scope = row.original.scope;
      if (!scope) {
        return <span className="text-muted-foreground">-</span>;
      }
      if (scope === "*") {
        return <StatusBadge tone="warning" label={t("policiesPage.global")} />;
      }
      return (
        <span className="block max-w-40 truncate text-xs" title={scope}>
          {scope}
        </span>
      );
    },
  },
  {
    id: "teams",
    meta: { title: t("policiesPage.teams"), skeleton: "chips" },
    header: t("policiesPage.teams"),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.teams ?? []} />,
  },
  {
    id: "keys",
    meta: { title: t("policiesPage.keys"), skeleton: "chips" },
    header: t("policiesPage.keys"),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.keys ?? []} />,
  },
  {
    id: "models",
    meta: { title: t("policiesPage.models"), skeleton: "chips" },
    header: t("policiesPage.models"),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.models ?? []} />,
  },
  {
    id: "tags",
    meta: { title: t("policiesPage.tags"), skeleton: "chips" },
    header: t("policiesPage.tags"),
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.tags ?? []} />,
  },
  {
    id: "created_at",
    accessorFn: (row) => row.created_at ?? "",
    meta: { title: t("policiesPage.createdAt") },
    header: ({ column }) => <DataTableSortHeader column={column} title={t("policiesPage.createdAt")} />,
    size: 150,
    enableSorting: true,
    cell: ({ row }) => <DateCell value={row.original.created_at} />,
  },
  {
    id: "actions",
    meta: { className: "text-right", headerClassName: "text-right" },
    header: () => <span className="sr-only">{t("policiesPage.actions")}</span>,
    size: 88,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <ImpactPopover attachment={row.original} accessToken={accessToken} />
        <AttachmentRowActions attachment={row.original} isAdmin={isAdmin} onDeleteClick={onDeleteClick} />
      </div>
    ),
  },
];
