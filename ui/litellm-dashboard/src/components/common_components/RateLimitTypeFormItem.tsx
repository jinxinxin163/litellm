import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import type { TFunction } from "i18next";
import { CircleHelp } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RateLimitType = "tpm" | "rpm";

interface RateLimitTypeOption {
  value: string;
  label: string;
  description: string;
}

interface RateLimitTypeFormItemProps {
  /** The type of rate limit - either 'tpm' or 'rpm' */
  type: RateLimitType;
  /** The form field name */
  name: string;
  /** Whether to show detailed descriptions (default: true) */
  showDetailedDescriptions?: boolean;
  /** Additional CSS classes */
  className?: string;
  value?: string | null;
  /** Custom onChange handler */
  onChange?: (value: string) => void;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: true | undefined;
  "aria-describedby"?: string | undefined;
}

const rateLimitTypeOptions = (type: RateLimitType, t: TFunction): RateLimitTypeOption[] => {
  const upper = type.toUpperCase();
  const lower = type.toLowerCase();
  return [
    {
      value: "best_effort_throughput",
      label: t("keyControls.default"),
      description: t("keyControls.bestEffortDescription", { limit: lower }),
    },
    {
      value: "guaranteed_throughput",
      label: t("keyControls.guaranteedThroughput"),
      description: t("keyControls.guaranteedDescription", { limit: lower }),
    },
    {
      value: "dynamic",
      label: t("keyControls.dynamic"),
      description: t("keyControls.dynamicDescription", { limit: upper }),
    },
  ];
};

const plainLabels: Record<string, string> = {
  best_effort_throughput: "keyControls.bestEffortThroughput",
  guaranteed_throughput: "keyControls.guaranteedThroughput",
  dynamic: "keyControls.dynamic",
};

export const RateLimitTypeFormItem: React.FC<RateLimitTypeFormItemProps> = ({
  type,
  name,
  showDetailedDescriptions = true,
  className = "",
  value,
  onChange,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}) => {
  const { t } = useTranslation();
  const controlId = id ?? `rate-limit-type-${name}`;
  const options = rateLimitTypeOptions(type, t);
  const label = t("keyControls.rateLimitType", { limit: type.toUpperCase() });
  const tooltip = t("keyControls.rateLimitTypeTooltip", { limit: type.toUpperCase() });
  const selectedLabel = (selected: string | null) => {
    if (selected === null) return t("keyControls.selectRateLimitType");
    const labelKey = plainLabels[selected];
    return labelKey ? t(labelKey) : selected;
  };

  return (
    <div className={className}>
      <TooltipProvider>
        <label htmlFor={controlId} className="mb-2 flex items-center gap-1 text-sm text-foreground">
          {label}
          <Tooltip>
            <TooltipTrigger
              render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />}
              aria-label={tooltip}
            />
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        </label>
      </TooltipProvider>
      <Select
        value={value ?? null}
        onValueChange={(next: string | null) => next !== null && onChange?.(next)}
        disabled={disabled}
      >
        <SelectTrigger id={controlId} className="w-full" aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
          <SelectValue placeholder={t("keyControls.selectRateLimitType")}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) =>
            showDetailedDescriptions ? (
              <SelectItem key={option.value} value={option.value} title={option.label}>
                <span className="flex flex-col py-1">
                  <span className="font-medium">{option.label}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">{option.description}</span>
                </span>
              </SelectItem>
            ) : (
              <SelectItem key={option.value} value={option.value} title={t(plainLabels[option.value])}>
                {t(plainLabels[option.value])}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RateLimitTypeFormItem;
