import { formatNumberWithCommas } from "@/utils/dataUtils";

export interface SummaryTile {
  title: string;
  value: string;
  className?: string;
  tooltip?: string;
  expandable?: boolean;
}

interface SpendSummaryMetadata {
  total_spend: number;
  total_flat_cost?: number;
  total_api_requests: number;
  total_successful_requests: number;
  total_failed_requests: number;
  total_tokens: number;
}

export const TOTAL_COST_TOOLTIP =
  "请求成本加上预留容量的固定成本。选择此卡片可查看明细。";

export const REQUEST_COST_TOOLTIP =
  "所选时间段内该实体发送请求产生的按用量计费成本，按 token 计价。";

export const FLAT_COST_TOOLTIP =
  "预留的 provisioned throughput，无论是否发送请求都会按小时计费。此处仅用于展示，不计入团队、key、用户或组织预算。";

export const hasFlatCost = (metadata: SpendSummaryMetadata): boolean => (metadata.total_flat_cost ?? 0) > 0;

export const buildSummaryTiles = (metadata: SpendSummaryMetadata, showFlatCost: boolean): SummaryTile[] => {
  const flatCost = metadata.total_flat_cost ?? 0;
  return [
    showFlatCost
      ? {
          title: "总成本",
          value: `$${formatNumberWithCommas(metadata.total_spend + flatCost, 2)}`,
          tooltip: TOTAL_COST_TOOLTIP,
          expandable: true,
        }
      : { title: "总花费", value: `$${formatNumberWithCommas(metadata.total_spend, 2)}` },
    { title: "总请求数", value: metadata.total_api_requests.toLocaleString() },
    {
      title: "成功请求",
      value: metadata.total_successful_requests.toLocaleString(),
      className: "text-success",
    },
    { title: "失败请求", value: metadata.total_failed_requests.toLocaleString(), className: "text-destructive" },
    { title: "总 Tokens", value: metadata.total_tokens.toLocaleString() },
  ];
};

export const buildCostBreakdownTiles = (metadata: SpendSummaryMetadata): SummaryTile[] => [
  {
    title: "请求成本",
    value: `$${formatNumberWithCommas(metadata.total_spend, 2)}`,
    className: "text-info",
    tooltip: REQUEST_COST_TOOLTIP,
  },
  {
    title: "固定成本",
    value: `$${formatNumberWithCommas(metadata.total_flat_cost ?? 0, 2)}`,
    className: "text-violet-600",
    tooltip: FLAT_COST_TOOLTIP,
  },
];
