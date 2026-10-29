import { formatNumberWithCommas, getSpendString } from "@/utils/dataUtils";
import type { TFunction } from "i18next";
import { translate } from "@/i18n/useTranslation";

export type UsageUnits = Readonly<Record<string, number>>;

export const formatCost = (cost: number | null | undefined): string => {
  if (cost == null) return "—";
  return cost === 0 ? `$${formatNumberWithCommas(0, 4)}` : getSpendString(cost, 4);
};

export const totalUnits = (units: UsageUnits): number => Object.values(units).reduce((sum, n) => sum + n, 0);

export const counterLabel = (counter: string): string =>
  counter
    .replace(/Units$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

export const unpricedSummary = (untracked: UsageUnits, t: TFunction = translate): string | null => {
  const total = totalUnits(untracked);
  return total > 0
    ? t("guardrailsMonitor.shared.unpricedSummary", { count: total, total: total.toLocaleString() })
    : null;
};

export interface CounterMath {
  readonly counter: string;
  readonly units: number;
  readonly unpriced: number;
  readonly cost: number | null;
}

export const pricedUnits = ({ units, unpriced }: Pick<CounterMath, "units" | "unpriced">): number =>
  Math.max(units - unpriced, 0);

export const unitPrice = (row: CounterMath): number | null => {
  const priced = pricedUnits(row);
  return row.cost != null && priced > 0 ? row.cost / priced : null;
};

export const formatUnitPrice = (price: number): string => {
  const fixed = price.toFixed(6).replace(/\.?0+$/, "");
  return price > 0 && Number(fixed) === 0 ? "< $0.000001" : `$${fixed}`;
};

export interface MathRow {
  readonly label: string;
  readonly parts: readonly string[];
  readonly note: string | null;
}

export const counterMathRow = (row: CounterMath, t: TFunction = translate): MathRow => {
  const label = counterLabel(row.counter);
  const price = unitPrice(row);
  if (price == null) {
    return {
      label,
      parts: [row.units.toLocaleString(), "× —", "= —"],
      note: t("guardrailsMonitor.shared.noKnownPrice"),
    };
  }
  return {
    label,
    parts: [pricedUnits(row).toLocaleString(), `× ${formatUnitPrice(price)}`, `= ${formatCost(row.cost)}`],
    note:
      row.unpriced > 0
        ? t("guardrailsMonitor.shared.unpricedLeftOut", { count: row.unpriced, total: row.unpriced.toLocaleString() })
        : null,
  };
};

export const unitsMathRows = (units: UsageUnits): readonly MathRow[] =>
  Object.entries(units).map(([counter, n]) => ({
    label: counterLabel(counter),
    parts: [n.toLocaleString()],
    note: null,
  }));

export const pricingIssueUrl = (unpriced: UsageUnits, provider?: string): string => {
  const subject = provider ? `${provider} guardrail` : "guardrail";
  const params = new URLSearchParams({
    template: "feature_request.yml",
    title: `[Feature]: add ${subject} pricing to the cost map`,
    "the-feature": `LiteLLM has no price for these ${subject} usage units, so the Guardrails Monitor leaves them out of the cost: ${Object.keys(unpriced).join(", ")}`,
  });
  return `https://github.com/BerriAI/litellm/issues/new?${params.toString()}`;
};
