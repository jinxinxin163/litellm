import React from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { pricingIssueUrl, totalUnits, type UsageUnits } from "./usageUnits";

export function UnpricedNote({ unpriced, provider }: { unpriced: UsageUnits; provider?: string }) {
  const { t } = useTranslation();
  const total = totalUnits(unpriced);
  if (total === 0) return null;
  return (
    <p className="text-xs text-warning">
      {t("guardrailsMonitor.shared.unpricedExcluded", { count: total, total: total.toLocaleString() })}{" "}
      <a
        href={pricingIssueUrl(unpriced, provider)}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {t("guardrailsMonitor.shared.requestPricing")}
      </a>
    </p>
  );
}
