import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const NEVER_RESETS_BUDGET_DURATION = "none";

interface BudgetDurationDropdownProps {
  id?: string;
  value?: string | null;
  onChange?: (value: string | undefined) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  showNeverResets?: boolean;
}

const BudgetDurationDropdown: React.FC<BudgetDurationDropdownProps> = ({
  id,
  value,
  onChange,
  className = "",
  style = {},
  placeholder = "n/a",
  showNeverResets = false,
}) => {
  const { t } = useTranslation();
  const durationLabelKeys: Record<string, string> = {
    none: "keyControls.neverResets",
    "1h": "keyControls.hourlyLower",
    "24h": "keyControls.dailyLower",
    "7d": "keyControls.weeklyLower",
    "30d": "keyControls.monthlyLower",
  };
  const durationLabels = Object.fromEntries(Object.entries(durationLabelKeys).map(([value, key]) => [value, t(key)]));
  return (
    <Select
      items={durationLabels}
      value={value || null}
      onValueChange={(next: string | null) => onChange?.(next ?? undefined)}
    >
      <SelectTrigger id={id} className={`w-full ${className}`} style={style}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>{placeholder}</SelectItem>
        {showNeverResets ? (
          <SelectItem value={NEVER_RESETS_BUDGET_DURATION}>{t("keyControls.neverResets")}</SelectItem>
        ) : null}
        <SelectItem value="1h">{t("keyControls.hourlyLower")}</SelectItem>
        <SelectItem value="24h">{t("keyControls.dailyLower")}</SelectItem>
        <SelectItem value="7d">{t("keyControls.weeklyLower")}</SelectItem>
        <SelectItem value="30d">{t("keyControls.monthlyLower")}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export const getBudgetDurationLabel = (value: string | null | undefined): string => {
  if (!value) return "Not set";

  const budgetDurationMap: Record<string, string> = {
    "1h": "hourly",
    "24h": "daily",
    "7d": "weekly",
    "30d": "monthly",
  };

  return budgetDurationMap[value] || value;
};

export default BudgetDurationDropdown;
