"use client";

import { useTranslation } from "@/i18n/useTranslation";
import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { ScrollText } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { DataTable, DataTableFilterDrawer, DataTableToolbar } from "@/components/shared/DataTable";

import type { Team } from "../key_team_helpers/key_list";
import type { LogEntry } from "./columns";
import { LOG_FILTER_LABELS, type LogsWindow } from "./log_filter_logic";
import { RequestLogsFilters } from "./RequestLogsFilters";
import { getRequestLogsTableColumns } from "./RequestLogsTableColumns";

const filterLabelKeys: Record<string, string> = {
  "Team ID": "logs.teamID",
  "Status": "logs.status",
  "Cache": "logs.cache",
  "Key Alias": "logs.keyAlias2",
  "User ID": "logs.userID",
  "End User": "logs.endUser",
  "Error Code": "logs.errorCode",
  "Error Message": "logs.errorMessage",
  "Key Hash": "logs.keyHash",
  "Session ID": "logs.sessionID",
  "Model": "logs.model",
  "Public model / search tool": "logs.publicModelSearchTool",
  "Search": "logs.search"
};

interface RequestLogsTableProps {
  data: LogEntry[];
  rowCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onRowClick: (log: LogEntry) => void;
  onKeyHashClick: (keyHash: string) => void;
  onSessionClick: (log: LogEntry) => void;
  teams: Team[];
  logsWindow: LogsWindow;
  toolbarChildren?: ReactNode;
}

function RequestLogsEmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <ScrollText className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{filtered ? t("logs.noMatchingRequests") : t("logs.noRequestsYet")}</div>
      <div className="max-w-xs text-center text-sm text-muted-foreground">
        {filtered
          ? t("logs.noRequestsMatchYourFiltersForThisTimeRange")
          : t("logs.requestsProxiedThroughLiteLLMWillAppearHere")}
      </div>
    </div>
  );
}

export function RequestLogsTable({
  data,
  rowCount,
  isLoading,
  isRefreshing,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  searchValue,
  onSearchChange,
  onRefresh,
  onRowClick,
  onKeyHashClick,
  onSessionClick,
  teams,
  logsWindow,
  toolbarChildren,
}: RequestLogsTableProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const columns = useMemo(() => {
    const deps = { onKeyHashClick, onSessionClick, t };
    return getRequestLogsTableColumns(deps);
  }, [onKeyHashClick, onSessionClick, t]);

  const isFiltered = columnFilters.length > 0 || searchValue !== "";

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.request_id}
      fillHeight
      sortingMode="server"
      sorting={sorting}
      onSortingChange={onSortingChange}
      paginationMode="server"
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowCount={rowCount}
      filterMode="server"
      columnFilters={columnFilters}
      onColumnFiltersChange={onColumnFiltersChange}
      isLoading={isLoading}
      loadingMessage={t("logs.loadingRequestLogs")}
      noDataMessage={<RequestLogsEmptyState filtered={isFiltered} />}
      size="compact"
      onRowClick={onRowClick}
      toolbar={(table) => (
        <>
          <DataTableToolbar
            table={table}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={t("logs.searchLogsByID")}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onOpenFilters={() => setFiltersOpen(true)}
            filterLabels={Object.fromEntries(Object.entries(LOG_FILTER_LABELS).map(([id, label]) => [id, t(filterLabelKeys[label] ?? label)]))}
            showViewOptions={false}
          >
            {toolbarChildren}
          </DataTableToolbar>
          <DataTableFilterDrawer
            table={table}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            title={t("logs.filters")}
            description={t("logs.narrowDownRequestLogs")}
          >
            {({ get, set }) => <RequestLogsFilters get={get} set={set} teams={teams} logsWindow={logsWindow} />}
          </DataTableFilterDrawer>
        </>
      )}
    />
  );
}
