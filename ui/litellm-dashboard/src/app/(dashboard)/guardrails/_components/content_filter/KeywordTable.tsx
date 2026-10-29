import { localizeGuardrailText } from "../guardrail_ui_helpers";

import { useTranslation } from "@/i18n/useTranslation";
import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTION_ITEMS } from "./action_options";

interface BlockedWord {
  id: string;
  keyword: string;
  action: "BLOCK" | "MASK";
  description?: string;
}

interface KeywordTableProps {
  keywords: BlockedWord[];
  onActionChange: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}

const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, onActionChange, onRemove }) => {
  const { t } = useTranslation();
  const localizedACTION_ITEMS = ACTION_ITEMS.map((item) => ({ ...item, label: localizeGuardrailText(t, item.label) }));

  const columns: ColumnDef<BlockedWord>[] = [
    {
      header: t("guardrailsPage.text328"),
      accessorKey: "keyword",
    },
    {
      header: t("guardrailsPage.text183"),
      accessorKey: "action",
      size: 150,
      cell: ({ row }) => (
        <Select
          items={localizedACTION_ITEMS}
          value={row.original.action}
          onValueChange={(value: string | null) => value && onActionChange(row.original.id, "action", value)}
        >
          <SelectTrigger size="sm" className="w-[120px]" aria-label={t("guardrailsPage.text183")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {localizedACTION_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      header: t("guardrailsPage.text501"),
      accessorKey: "description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      header: "",
      id: "actions",
      size: 100,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onRemove(row.original.id)}>
          <Trash2 />
          {t("guardrailsPage.text076")}
        </Button>
      ),
    },
  ];

  if (keywords.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">{t("guardrailsPage.text333")}</div>;
  }

  return <DataTable data={keywords} columns={columns} getRowId={(row) => row.id} size="compact" />;
};

export default KeywordTable;
