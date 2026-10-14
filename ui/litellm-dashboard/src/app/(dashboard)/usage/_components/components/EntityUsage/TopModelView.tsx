import { BarChart } from "@/components/shared/charts";
import { DataTable } from "@/components/shared/DataTable";
import { MoneyCell } from "@/components/shared/table_cells";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { formatNumberWithCommas } from "@/utils/dataUtils";

type TopModel = {
  key: string;
  spend: number;
  successful_requests: number;
  failed_requests: number;
  tokens: number;
};

interface TopModelViewProps {
  topModels: TopModel[];
  topModelsLimit: number;
  setTopModelsLimit: (limit: number) => void;
}

export const TOP_MODEL_LIMITS = [5, 10, 25, 50];

export default function TopModelView({ topModels, topModelsLimit, setTopModelsLimit }: TopModelViewProps) {
  const [modelViewMode, setModelViewMode] = useState<"chart" | "table">("table");

  const columns = [
    {
      header: "模型",
      accessorKey: "key",
      cell: (info: any) => info.getValue() || "-",
    },
    {
      header: "花费 (USD)",
      accessorKey: "spend",
      meta: { numeric: true },
      cell: (info: any) => <MoneyCell value={info.getValue()} decimals={2} />,
    },
    {
      header: "成功",
      accessorKey: "successful_requests",
      meta: { numeric: true },
      cell: (info: any) => <span className="text-success">{info.getValue()?.toLocaleString() || 0}</span>,
    },
    {
      header: "失败",
      accessorKey: "failed_requests",
      meta: { numeric: true },
      cell: (info: any) => <span className="text-destructive">{info.getValue()?.toLocaleString() || 0}</span>,
    },
    {
      header: "Tokens",
      accessorKey: "tokens",
      meta: { numeric: true },
      cell: (info: any) => info.getValue()?.toLocaleString() || 0,
    },
  ];
  const processedTopModels = topModels.slice(0, topModelsLimit);

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <Tabs value={String(topModelsLimit)} onValueChange={(value: string) => setTopModelsLimit(Number(value))}>
          <TabsList aria-label="要显示的模型数量">
            {TOP_MODEL_LIMITS.map((limit) => (
              <TabsTrigger key={limit} value={String(limit)} className="flex-none px-3">
                {limit}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={modelViewMode} onValueChange={(value: string) => setModelViewMode(value as "chart" | "table")}>
          <TabsList aria-label="Top 模型视图模式">
            <TabsTrigger value="table" className="flex-none px-3">
              表格视图
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex-none px-3">
              图表视图
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {modelViewMode === "chart" ? (
        <div className="relative max-h-[600px] overflow-y-auto">
          <BarChart
            className="mt-4 cursor-pointer hover:opacity-90"
            style={{ height: Math.min(processedTopModels.length, topModelsLimit) * 52 }}
            data={processedTopModels}
            index="key"
            categories={["spend"]}
            colors={["cyan"]}
            valueFormatter={(value) => `$${formatNumberWithCommas(value, 2)}`}
            layout="vertical"
            yAxisWidth={200}
            tickGap={5}
            showLegend={false}
          />
        </div>
      ) : (
        <DataTable columns={columns} data={processedTopModels} isLoading={false} maxBodyHeight={600} size="compact" />
      )}
    </>
  );
}
