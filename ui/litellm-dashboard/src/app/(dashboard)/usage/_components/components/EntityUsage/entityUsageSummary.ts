import { translate } from "@/i18n/useTranslation";
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
  "Request cost plus flat cost for reserved capacity. Select this tile to see the breakdown.";

export const REQUEST_COST_TOOLTIP =
  "Usage-based cost of the requests this entity sent during the selected period, priced per token.";

export const FLAT_COST_TOOLTIP =
  "Reserved provisioned throughput, billed per hour whether or not requests are sent. Reported here only; it does not count toward team, key, user, or organization budgets.";

export const hasFlatCost = (metadata: SpendSummaryMetadata): boolean => (metadata.total_flat_cost ?? 0) > 0;

export const buildSummaryTiles = (metadata: SpendSummaryMetadata, showFlatCost: boolean, t: (key: string) => string = translate): SummaryTile[] => {
  const flatCost = metadata.total_flat_cost ?? 0;
  return [
    showFlatCost
      ? {
          title: t("usage.totalCost2"),
          value: `$${formatNumberWithCommas(metadata.total_spend + flatCost, 2)}`,
          tooltip: t("usage.requestCostPlusFlatCostForReservedCapacitySelectThisTileToSeeTheBreakdown"),
          expandable: true,
        }
      : { title: t("usage.totalSpend2"), value: `$${formatNumberWithCommas(metadata.total_spend, 2)}` },
    { title: t("usage.totalRequests"), value: metadata.total_api_requests.toLocaleString() },
    {
      title: t("usage.successfulRequests"),
      value: metadata.total_successful_requests.toLocaleString(),
      className: "text-success",
    },
    { title: t("usage.failedRequests"), value: metadata.total_failed_requests.toLocaleString(), className: "text-destructive" },
    { title: t("usage.totalTokens"), value: metadata.total_tokens.toLocaleString() },
  ];
};

export const buildCostBreakdownTiles = (metadata: SpendSummaryMetadata, t: (key: string) => string = translate): SummaryTile[] => [
  {
    title: t("usage.requestCost2"),
    value: `$${formatNumberWithCommas(metadata.total_spend, 2)}`,
    className: "text-info",
    tooltip: t("usage.usageBasedCostOfTheRequestsThisEntitySentDuringTheSelectedPeriodPricedPerToken"),
  },
  {
    title: t("usage.flatCost2"),
    value: `$${formatNumberWithCommas(metadata.total_flat_cost ?? 0, 2)}`,
    className: "text-violet-600",
    tooltip: t("usage.reservedProvisionedThroughputBilledPerHourWhetherOrNotRequestsAreSentReportedHereOnlyItDoesNotCountTowardTeamK"),
  },
];
