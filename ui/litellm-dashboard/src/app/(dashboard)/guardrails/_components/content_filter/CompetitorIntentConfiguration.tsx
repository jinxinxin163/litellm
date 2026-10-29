import { localizeGuardrailText } from "../guardrail_ui_helpers";

import { useTranslation } from "@/i18n/useTranslation";
import React, { useEffect, useId, useState } from "react";

import { getMajorAirlines } from "@/components/networking";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { TagsInput } from "./TagsInput";
import { ThresholdInput } from "./ThresholdInput";

export interface MajorAirline {
  id: string;
  match: string;
  tags: string[];
}

export interface CompetitorIntentConfig {
  competitor_intent_type: "airline" | "generic";
  brand_self: string[];
  locations?: string[];
  competitors?: string[];
  policy?: {
    competitor_comparison?: "refuse" | "reframe";
    possible_competitor_comparison?: "refuse" | "reframe";
  };
  threshold_high?: number;
  threshold_medium?: number;
  threshold_low?: number;
}

interface CompetitorIntentConfigurationProps {
  enabled: boolean;
  config: CompetitorIntentConfig | null;
  onChange: (enabled: boolean, config: CompetitorIntentConfig | null) => void;
  accessToken?: string | null;
}

const DEFAULT_CONFIG: CompetitorIntentConfig = {
  competitor_intent_type: "airline",
  brand_self: [],
  locations: [],
  policy: {
    competitor_comparison: "refuse",
    possible_competitor_comparison: "reframe",
  },
  threshold_high: 0.7,
  threshold_medium: 0.45,
  threshold_low: 0.3,
};

const INTENT_TYPES = [
  { value: "airline", label: "Airline (auto-load competitors from IATA)" },
  { value: "generic", label: "Generic (specify competitors manually)" },
] as const;

const COMPETITOR_COMPARISON_POLICIES = [
  { value: "refuse", label: "Refuse (block request)" },
  { value: "reframe", label: "Reframe (suggest alternative)" },
] as const;

const POSSIBLE_COMPETITOR_COMPARISON_POLICIES = [
  { value: "refuse", label: "Refuse (block request)" },
  { value: "reframe", label: "Reframe (suggest alternative to backend LLM)" },
] as const;

const THRESHOLDS = [
  { field: "threshold_high", label: "High", hint: "e.g. 0.7", fallback: 0.7 },
  { field: "threshold_medium", label: "Medium", hint: "e.g. 0.45", fallback: 0.45 },
  { field: "threshold_low", label: "Low", hint: "e.g. 0.3", fallback: 0.3 },
] as const;

const CompetitorIntentConfiguration: React.FC<CompetitorIntentConfigurationProps> = ({
  enabled,
  config,
  onChange,
  accessToken,
}) => {
  const { t } = useTranslation();
  const localizedINTENT_TYPES = INTENT_TYPES.map((item) => ({ ...item, label: localizeGuardrailText(t, item.label) }));
  const localizedCOMPETITOR_COMPARISON_POLICIES = COMPETITOR_COMPARISON_POLICIES.map((item) => ({
    ...item,
    label: localizeGuardrailText(t, item.label),
  }));
  const localizedPOSSIBLE_COMPETITOR_COMPARISON_POLICIES = POSSIBLE_COMPETITOR_COMPARISON_POLICIES.map((item) => ({
    ...item,
    label: localizeGuardrailText(t, item.label),
  }));

  const effectiveConfig = config ?? DEFAULT_CONFIG;
  const [airlineOptions, setAirlineOptions] = useState<MajorAirline[]>([]);
  const [loadingAirlines, setLoadingAirlines] = useState(false);
  const fieldId = useId();

  useEffect(() => {
    if (effectiveConfig.competitor_intent_type === "airline" && accessToken && airlineOptions.length === 0) {
      setLoadingAirlines(true);
      getMajorAirlines(accessToken)
        .then((res) => setAirlineOptions(res.airlines ?? []))
        .catch(() => setAirlineOptions([]))
        .finally(() => setLoadingAirlines(false));
    }
  }, [effectiveConfig.competitor_intent_type, accessToken, airlineOptions.length]);

  const handleEnabledChange = (checked: boolean) => {
    onChange(checked, checked ? { ...DEFAULT_CONFIG } : null);
  };

  const handleConfigChange = (field: string, value: unknown) => {
    onChange(enabled, { ...effectiveConfig, [field]: value });
  };

  const handlePolicyChange = (key: string, value: string) => {
    onChange(enabled, {
      ...effectiveConfig,
      policy: { ...effectiveConfig.policy, [key]: value },
    });
  };

  const handleNestedArrayChange = (field: "brand_self" | "locations" | "competitors", values: string[]) => {
    onChange(enabled, { ...effectiveConfig, [field]: values.filter(Boolean) });
  };

  const handleBrandSelfChange = (values: string[]) => {
    const filtered = values.filter(Boolean);
    const expanded: string[] = [];
    const seen = new Set<string>();
    for (const v of filtered) {
      const airline = airlineOptions.find((a) => {
        const primary = a.match.split("|")[0]?.trim().toLowerCase();
        return primary === v.toLowerCase();
      });
      if (airline) {
        for (const variant of airline.match
          .split("|")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)) {
          if (!seen.has(variant)) {
            seen.add(variant);
            expanded.push(variant);
          }
        }
      } else if (!seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        expanded.push(v);
      }
    }
    onChange(enabled, { ...effectiveConfig, brand_self: expanded });
  };

  const header = (
    <CardHeader className="gap-0">
      <CardTitle className="text-base">{t("guardrailsPage.text269")}</CardTitle>
      <CardAction>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </CardAction>
    </CardHeader>
  );

  if (!enabled) {
    return (
      <Card>
        {header}
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("guardrailsPage.text270")}</p>
        </CardContent>
      </Card>
    );
  }

  const airlineTags =
    effectiveConfig.competitor_intent_type === "airline" && airlineOptions.length > 0
      ? airlineOptions.map((a) => {
          const primary = a.match.split("|")[0]?.trim() ?? a.id;
          const variants = a.match
            .split("|")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          return {
            value: primary.toLowerCase(),
            label: `${primary}${variants.length > 1 ? ` (${variants.slice(1).join(", ")})` : ""}`,
          };
        })
      : [];

  return (
    <Card>
      {header}
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t("guardrailsPage.text271")}</p>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-type`}>{t("guardrailsPage.text129")} </FieldLabel>
            <Select
              items={localizedINTENT_TYPES}
              value={effectiveConfig.competitor_intent_type}
              onValueChange={(v: string | null) => v !== null && handleConfigChange("competitor_intent_type", v)}
            >
              <SelectTrigger id={`${fieldId}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localizedINTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} title={type.label}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${fieldId}-brand-self`}>{t("guardrailsPage.text272")}</FieldLabel>
            <TagsInput
              id={`${fieldId}-brand-self`}
              value={effectiveConfig.brand_self}
              onValueChange={(v) =>
                effectiveConfig.competitor_intent_type === "airline" && airlineOptions.length > 0
                  ? handleBrandSelfChange(v)
                  : handleNestedArrayChange("brand_self", v)
              }
              options={airlineTags}
              tokenSeparators={[","]}
              loading={loadingAirlines}
              placeholder={
                effectiveConfig.competitor_intent_type === "airline"
                  ? t("guardrailsPage.text273")
                  : t("guardrailsPage.text274")
              }
            />
            <FieldDescription>
              {effectiveConfig.competitor_intent_type === "airline"
                ? t("guardrailsPage.text275")
                : t("guardrailsPage.text276")}
            </FieldDescription>
          </Field>

          {effectiveConfig.competitor_intent_type === "airline" && (
            <Field>
              <FieldLabel htmlFor={`${fieldId}-locations`}>{t("guardrailsPage.text277")}</FieldLabel>
              <TagsInput
                id={`${fieldId}-locations`}
                value={effectiveConfig.locations ?? []}
                onValueChange={(v) => handleNestedArrayChange("locations", v)}
                tokenSeparators={[","]}
                placeholder={t("guardrailsPage.text274")}
              />
              <FieldDescription>{t("guardrailsPage.text278")}</FieldDescription>
            </Field>
          )}

          {effectiveConfig.competitor_intent_type === "generic" && (
            <Field>
              <FieldLabel htmlFor={`${fieldId}-competitors`}> {t("guardrailsPage.text279")}</FieldLabel>
              <TagsInput
                id={`${fieldId}-competitors`}
                value={effectiveConfig.competitors ?? []}
                onValueChange={(v) => handleNestedArrayChange("competitors", v)}
                tokenSeparators={[","]}
                placeholder={t("guardrailsPage.text274")}
              />
              <FieldDescription>{t("guardrailsPage.text280")}</FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor={`${fieldId}-competitor-comparison`}>{t("guardrailsPage.text281")}</FieldLabel>
            <Select
              items={localizedCOMPETITOR_COMPARISON_POLICIES}
              value={effectiveConfig.policy?.competitor_comparison ?? "refuse"}
              onValueChange={(v: string | null) => v !== null && handlePolicyChange("competitor_comparison", v)}
            >
              <SelectTrigger id={`${fieldId}-competitor-comparison`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localizedCOMPETITOR_COMPARISON_POLICIES.map((policy) => (
                  <SelectItem key={policy.value} value={policy.value} title={policy.label}>
                    {policy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${fieldId}-possible-competitor-comparison`}>{t("guardrailsPage.text282")}</FieldLabel>
            <Select
              items={localizedPOSSIBLE_COMPETITOR_COMPARISON_POLICIES}
              value={effectiveConfig.policy?.possible_competitor_comparison ?? "reframe"}
              onValueChange={(v: string | null) =>
                v !== null && handlePolicyChange("possible_competitor_comparison", v)
              }
            >
              <SelectTrigger id={`${fieldId}-possible-competitor-comparison`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localizedPOSSIBLE_COMPETITOR_COMPARISON_POLICIES.map((policy) => (
                  <SelectItem key={policy.value} value={policy.value} title={policy.label}>
                    {policy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel> {t("guardrailsPage.text283")}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {THRESHOLDS.map((threshold) => (
                <Field key={threshold.field} className="w-20">
                  <FieldLabel htmlFor={`${fieldId}-${threshold.field}`}>{localizeGuardrailText(t, threshold.label)}</FieldLabel>
                  <ThresholdInput
                    id={`${fieldId}-${threshold.field}`}
                    value={effectiveConfig[threshold.field] ?? threshold.fallback}
                    onValueChange={(v) => handleConfigChange(threshold.field, v ?? threshold.fallback)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <FieldDescription>{localizeGuardrailText(t, threshold.hint)}</FieldDescription>
                </Field>
              ))}
            </div>
            <FieldDescription>
              {" "}
              {t("guardrailsPage.text284")}
              <ul className="mt-1 mb-0 list-disc pl-5">
                <li>
                  <strong> {t("guardrailsPage.text285")} </strong>
                  {t("guardrailsPage.text286")}
                </li>
                <li>
                  <strong> {t("guardrailsPage.text287")} </strong>
                  {t("guardrailsPage.text288")}
                </li>
                <li>
                  <strong>{t("guardrailsPage.text289")}</strong>
                  {t("guardrailsPage.text290")}
                </li>
              </ul>
              {t("guardrailsPage.text291")}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};

export default CompetitorIntentConfiguration;
