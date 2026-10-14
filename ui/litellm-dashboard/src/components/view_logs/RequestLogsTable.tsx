"use client";

import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { ScrollText } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { DataTable, DataTableFilterDrawer, DataTableToolbar } from "@/components/shared/DataTable";

import type { Team } from "../key_team_helpers/key_list";
import type { LogEntry } from "./columns";
import { LOG_FILTER_LABELS, type LogsWindow } from "./log_filter_logic";
import { RequestLogsFilters } from "./RequestLogsFilters";
import { getRequestLogsTableColumns } from "./RequestLogsTableColumns";

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
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <ScrollText className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{filtered ? "没有匹配的请求" : "暂无请求"}</div>
      <div className="max-w-xs text-center text-sm text-muted-foreground">
        {filtered
          ? "此时间范围内没有请求匹配当前筛选条件。"
          : "通过 LiteLLM 代理的请求会显示在这里。"}
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const columns = useMemo(() => {
    const deps = { onKeyHashClick, onSessionClick };
    return getRequestLogsTableColumns(deps);
  }, [onKeyHashClick, onSessionClick]);

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
      loadingMessage="正在加载请求日志…"
      noDataMessage={<RequestLogsEmptyState filtered={isFiltered} />}
      size="compact"
      onRowClick={onRowClick}
      toolbar={(table) => (
        <>
          <DataTableToolbar
            table={table}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder="按 ID 搜索日志…"
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onOpenFilters={() => setFiltersOpen(true)}
            filterLabels={LOG_FILTER_LABELS}
            showViewOptions={false}
          >
            {toolbarChildren}
          </DataTableToolbar>
          <DataTableFilterDrawer
            table={table}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            title="筛选"
            description="缩小请求日志范围"
          >
            {({ get, set }) => <RequestLogsFilters get={get} set={set} teams={teams} logsWindow={logsWindow} />}
          </DataTableFilterDrawer>
        </>
      )}
    />
  );
}
