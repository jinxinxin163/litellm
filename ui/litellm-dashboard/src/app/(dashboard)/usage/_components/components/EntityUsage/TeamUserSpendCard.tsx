import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import React, { useMemo } from "react";

import { teamSpendByUserCall } from "@/components/networking";
import { DataTable } from "@/components/shared/DataTable";
import { MoneyCell } from "@/components/shared/table_cells";
import { Button } from "@/components/ui/button";
import { Card as ShadcnCard, CardContent } from "@/components/ui/card";

import {
  buildTeamUserSpendCsv,
  downloadCsv,
  sortBySpendDesc,
  teamLabel,
  teamUserSpendCsvFileName,
  teamUserSpendRowId,
  userLabel,
  type TeamUserSpendRow,
} from "./teamUserSpend";

interface TeamUserSpendCardProps {
  accessToken: string | null;
  startTime: Date | null;
  endTime: Date | null;
  teamIds: string[];
}

const columns: ColumnDef<TeamUserSpendRow>[] = [
  { header: "团队", accessorFn: teamLabel, id: "team", cell: ({ row }) => teamLabel(row.original) },
  { header: "用户", accessorFn: userLabel, id: "user", cell: ({ row }) => userLabel(row.original) },
  {
    header: "花费",
    accessorKey: "spend",
    meta: { numeric: true },
    cell: ({ row }) => <MoneyCell value={row.original.spend} decimals={4} />,
  },
  {
    header: "请求数",
    accessorKey: "api_requests",
    meta: { numeric: true },
    cell: ({ row }) => row.original.api_requests.toLocaleString(),
  },
  {
    header: "成功",
    accessorKey: "successful_requests",
    meta: { numeric: true, className: "text-success" },
    cell: ({ row }) => row.original.successful_requests.toLocaleString(),
  },
  {
    header: "失败",
    accessorKey: "failed_requests",
    meta: { numeric: true, className: "text-destructive" },
    cell: ({ row }) => row.original.failed_requests.toLocaleString(),
  },
  {
    header: "Tokens",
    accessorKey: "total_tokens",
    meta: { numeric: true },
    cell: ({ row }) => row.original.total_tokens.toLocaleString(),
  },
];

const TeamUserSpendCard: React.FC<TeamUserSpendCardProps> = ({ accessToken, startTime, endTime, teamIds }) => {
  const hasTeams = teamIds.length > 0;
  const { data, isLoading } = useQuery({
    queryKey: ["teamSpendByUser", startTime?.toISOString(), endTime?.toISOString(), teamIds],
    queryFn: () =>
      accessToken && startTime && endTime ? teamSpendByUserCall(accessToken, startTime, endTime, teamIds) : null,
    enabled: Boolean(accessToken && startTime && endTime) && hasTeams,
  });
  const rows = useMemo(() => sortBySpendDesc(data?.results ?? []), [data]);

  return (
    <ShadcnCard>
      <CardContent className="flex flex-col space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium text-foreground">团队内每用户花费</h3>
            <p className="text-xs text-muted-foreground">
              根据花费日志按请求归属，因此包含不使用 virtual key 的 JWT/SSO 流量
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || rows.length === 0}
            onClick={() => data && downloadCsv(buildTeamUserSpendCsv(data), teamUserSpendCsvFileName(data))}
          >
            <Download />
            下载 CSV
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={teamUserSpendRowId}
          isLoading={isLoading}
          maxBodyHeight={320}
          noDataMessage={teamIds.length === 0 ? "选择团队以查看每用户花费" : "此时间范围内没有用户花费"}
          size="compact"
        />
      </CardContent>
    </ShadcnCard>
  );
};

export default TeamUserSpendCard;
