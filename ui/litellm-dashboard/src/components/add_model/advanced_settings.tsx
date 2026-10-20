import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Dayjs } from "dayjs";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Team } from "../key_team_helpers/key_list";
import { validatorRules } from "../common_components/formRules";
import { labelWithHint } from "@/components/shared/form/LabelWithHint";
import { MountedFormField } from "../common_components/MountedFormField";
import { UtcDateTimeInput } from "@/components/shared/form/UtcDateTimeInput";
import CacheControlInjectionPoints, {
  CACHE_CONTROL_LABEL,
  NEW_CACHE_CONTROL_POINT,
} from "./cache_control_settings";
import { Tag } from "../tag_management/types";
import { formItemValidateJSON } from "../../utils/textUtils";
import {
  PTU_COUNT_FIELD,
  PTU_RATE_FIELD,
  PTU_START_FIELD,
  ptuCountRules,
  ptuNoUsageCostRule,
  ptuPairRule,
  ptuRateRules,
  ptuStartRequiredRule,
  ptuWindowOrderRule,
  PTU_END_FIELD,
} from "../../utils/ptuValidation";
import { usePtuCostAttributionEnabled } from "@/app/(dashboard)/hooks/uiSettings/usePtuCostAttributionEnabled";

interface AdvancedSettingsProps {
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  teams?: Team[] | null;
  guardrailsList: string[];
  tagsList: Record<string, Tag>;
  accessToken: string;
}

const USAGE_COST_FIELDS = [
  "input_cost_per_token",
  "output_cost_per_token",
  "cache_read_input_token_cost",
  "cache_creation_input_token_cost",
  "input_cost_per_second",
];

const REVALIDATED_WHEN_PTU_COUNT_CHANGES = [PTU_RATE_FIELD, PTU_START_FIELD, ...USAGE_COST_FIELDS];

const PRICING_MODEL_ITEMS = [
  { value: "per_token", label: "Per Million Tokens" },
  { value: "per_second", label: "Per Second" },
] as const;

const validateNumber = (_: unknown, value: unknown) => {
  if (!value) {
    return Promise.resolve();
  }
  if (isNaN(Number(value)) || Number(value) < 0) {
    return Promise.reject("Please enter a valid positive number");
  }
  return Promise.resolve();
};

const usageCostRules = {
  deps: [PTU_COUNT_FIELD],
  validate: validatorRules({ validator: validateNumber }, ptuNoUsageCostRule(PTU_COUNT_FIELD)),
};

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  showAdvancedSettings,
  setShowAdvancedSettings,
  teams,
  guardrailsList,
  tagsList,
  accessToken,
}) => {
  const { t } = useTranslation();
  const [customPricing, setCustomPricing] = React.useState(false);
  const [pricingModel, setPricingModel] = React.useState<"per_token" | "per_second">("per_token");
  const [showCacheControl, setShowCacheControl] = React.useState(false);
  const ptuCostAttributionEnabled = usePtuCostAttributionEnabled();

  const handlePricingModelChange =
    (onChange: (value: string) => void) =>
    (value: "per_token" | "per_second" | null): void => {
      if (value === null) return;
      onChange(value);
      setPricingModel(value);
    };

  return (
    <>
      <Collapsible className="mt-2 mb-4 overflow-hidden rounded-lg border">
        <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
          <b>{t("models.advancedSettings")}</b>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          <div className="rounded-lg">
            <MountedFormField name="custom_pricing" label={t("models.customPricing")} className="mb-4">
              {(control) => (
                <Switch
                  id={control.id}
                  checked={control.value === true}
                  onCheckedChange={(checked) => {
                    control.onChange(checked);
                    setCustomPricing(checked);
                  }}
                />
              )}
            </MountedFormField>

            <MountedFormField name="tags" label={t("models.tags")} className="mb-4">
              {(control) => (
                <MultiSelect
                  id={control.id}
                  placeholder={t("models.selectOrEnterTags")}
                  emptyText={t("models.typeToAddATag")}
                  value={(control.value as string[] | undefined) ?? []}
                  onValueChange={control.onChange}
                  options={Object.values(tagsList).map((tag) => ({
                    value: tag.name,
                    label: tag.name,
                    description: tag.description || undefined,
                  }))}
                  allowCustomValues
                />
              )}
            </MountedFormField>

            {ptuCostAttributionEnabled && (
              <>
                <MountedFormField
                  name={PTU_COUNT_FIELD}
                  label={labelWithHint(
                    t("models.ptuCount"),
                    t("models.provisionedThroughputUnitsForThisDeploymentSetTogetherWithCostPer"),
                  )}
                  rules={{
                    deps: REVALIDATED_WHEN_PTU_COUNT_CHANGES,
                    validate: validatorRules(
                      { validator: validateNumber },
                      ...ptuCountRules,
                      ptuPairRule(PTU_RATE_FIELD),
                    ),
                  }}
                  className="mb-4"
                >
                  {(control) => (
                    <Input
                      id={control.id}
                      value={(control.value as string | undefined) ?? ""}
                      onChange={control.onChange}
                      onBlur={control.onBlur}
                      placeholder={t("models.eG15")}
                    />
                  )}
                </MountedFormField>

                <MountedFormField
                  name={PTU_RATE_FIELD}
                  label={labelWithHint(
                    t("models.calculatedCostPerPtuHourUsd"),
                    "Flat cost = PTU count * this rate * active hours, attributed to the deployment's team.",
                  )}
                  rules={{
                    deps: [PTU_COUNT_FIELD],
                    validate: validatorRules(
                      { validator: validateNumber },
                      ...ptuRateRules,
                      ptuPairRule(PTU_COUNT_FIELD),
                    ),
                  }}
                  className="mb-4"
                >
                  {(control) => (
                    <Input
                      id={control.id}
                      value={(control.value as string | undefined) ?? ""}
                      onChange={control.onChange}
                      onBlur={control.onBlur}
                      placeholder={t("models.eG200")}
                    />
                  )}
                </MountedFormField>

                <MountedFormField
                  name={PTU_START_FIELD}
                  label={labelWithHint(
                    t("models.ptuEffectiveFromUtc"),
                    t("models.startOfThePtuWindowRequiredWhenPtuCountIsSet"),
                  )}
                  rules={{
                    deps: [PTU_END_FIELD],
                    validate: validatorRules(
                      ptuStartRequiredRule(PTU_COUNT_FIELD),
                      ptuWindowOrderRule(PTU_END_FIELD, "start"),
                    ),
                  }}
                  className="mb-4"
                >
                  {(control) => (
                    <UtcDateTimeInput
                      id={control.id}
                      value={control.value as Dayjs | null}
                      onChange={control.onChange}
                      onBlur={control.onBlur}
                    />
                  )}
                </MountedFormField>

                <MountedFormField
                  name={PTU_END_FIELD}
                  label={labelWithHint(
                    t("models.ptuEffectiveToUtc"),
                    t("models.optionalEndOfThePtuWindowExclusiveLeaveBlankForOpen"),
                  )}
                  rules={{
                    deps: [PTU_START_FIELD],
                    validate: validatorRules(ptuWindowOrderRule(PTU_START_FIELD, "end")),
                  }}
                  className="mb-4"
                >
                  {(control) => (
                    <UtcDateTimeInput
                      id={control.id}
                      value={control.value as Dayjs | null}
                      onChange={control.onChange}
                      onBlur={control.onBlur}
                    />
                  )}
                </MountedFormField>
              </>
            )}

            {customPricing && (
              <div className="ml-6 pl-4 border-l-2 border-border">
                <MountedFormField name="pricing_model" label={t("models.pricingModel")} className="mb-4">
                  {(control) => (
                    <Select
                      items={PRICING_MODEL_ITEMS}
                      value={(control.value as "per_token" | "per_second" | undefined) ?? "per_token"}
                      onValueChange={handlePricingModelChange(control.onChange)}
                    >
                      <SelectTrigger id={control.id} onBlur={control.onBlur} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICING_MODEL_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </MountedFormField>

                {pricingModel === "per_token" ? (
                  <>
                    <MountedFormField
                      name="input_cost_per_token"
                      label={t("models.inputCostPer1mTokens")}
                      rules={usageCostRules}
                      className="mb-4"
                    >
                      {(control) => (
                        <Input
                          id={control.id}
                          value={(control.value as string | undefined) ?? ""}
                          onChange={control.onChange}
                          onBlur={control.onBlur}
                        />
                      )}
                    </MountedFormField>
                    <MountedFormField
                      name="output_cost_per_token"
                      label={t("models.outputCostPer1mTokens")}
                      rules={usageCostRules}
                      className="mb-4"
                    >
                      {(control) => (
                        <Input
                          id={control.id}
                          value={(control.value as string | undefined) ?? ""}
                          onChange={control.onChange}
                          onBlur={control.onBlur}
                        />
                      )}
                    </MountedFormField>
                    <MountedFormField
                      name="cache_read_input_token_cost"
                      label={labelWithHint(
                        t("models.cacheReadCostPer1mTokens"),
                        t("models.ifLeftBlankDefaultsToInputCost"),
                      )}
                      rules={usageCostRules}
                      className="mb-4"
                    >
                      {(control) => (
                        <Input
                          id={control.id}
                          value={(control.value as string | undefined) ?? ""}
                          onChange={control.onChange}
                          onBlur={control.onBlur}
                          placeholder={t("models.defaultsToInputCostIfBlank")}
                        />
                      )}
                    </MountedFormField>
                    <MountedFormField
                      name="cache_creation_input_token_cost"
                      label={labelWithHint(
                        t("models.cacheWriteCostPer1mTokens"),
                        t("models.ifLeftBlankDefaultsToInputCostTheBackendFallsBack"),
                      )}
                      rules={usageCostRules}
                      className="mb-4"
                    >
                      {(control) => (
                        <Input
                          id={control.id}
                          value={(control.value as string | undefined) ?? ""}
                          onChange={control.onChange}
                          onBlur={control.onBlur}
                          placeholder={t("models.defaultsToInputCostIfBlank")}
                        />
                      )}
                    </MountedFormField>
                  </>
                ) : (
                  <MountedFormField
                    name="input_cost_per_second"
                    label={t("models.costPerSecond")}
                    rules={usageCostRules}
                    className="mb-4"
                  >
                    {(control) => (
                      <Input
                        id={control.id}
                        value={(control.value as string | undefined) ?? ""}
                        onChange={control.onChange}
                        onBlur={control.onBlur}
                      />
                    )}
                  </MountedFormField>
                )}
              </div>
            )}

            <MountedFormField
              name="use_in_pass_through"
              label={labelWithHint(
                t("models.useInPassThroughRoutes"),
                <span>
                  {t("models.allowUsingTheseCredentialsInPassThroughRoutes")}{" "}
                </span>,
              )}
              className="mb-4 mt-4"
            >
              {(control) => (
                <Switch id={control.id} checked={control.value === true} onCheckedChange={control.onChange} />
              )}
            </MountedFormField>

            <MountedFormField
              name="cache_control"
              label={labelWithHint(CACHE_CONTROL_LABEL, t("formHints.models.cacheControlTooltip"))}
              className="mb-4"
            >
              {(control) => (
                <Switch
                  id={control.id}
                  checked={control.value === true}
                  onCheckedChange={(checked) => {
                    control.onChange(checked);
                    setShowCacheControl(checked);
                  }}
                />
              )}
            </MountedFormField>

            {showCacheControl && (
              <MountedFormField name="cache_control_injection_points" defaultValue={[NEW_CACHE_CONTROL_POINT]} bare>
                {(control) => (
                  <CacheControlInjectionPoints
                    value={control.value as React.ComponentProps<typeof CacheControlInjectionPoints>["value"]}
                    onChange={control.onChange}
                  />
                )}
              </MountedFormField>
            )}
            <MountedFormField
              name="litellm_extra_params"
              label={labelWithHint(
                t("models.litellmParams"),
                t("models.optionalLitellmParamsUsedForMakingALitellmCompletionCall"),
              )}
              className="mb-4 mt-4"
              rules={{ validate: validatorRules({ validator: formItemValidateJSON }) }}
            >
              {(control) => (
                <Textarea
                  id={control.id}
                  value={(control.value as string | undefined) ?? ""}
                  onChange={control.onChange}
                  onBlur={control.onBlur}
                  rows={4}
                  placeholder='{
                  "rpm": 100,
                  "timeout": 0,
                  "stream_timeout": 0
                }'
                />
              )}
            </MountedFormField>
            <div className="grid grid-cols-24 mb-4">
              <p className="col-start-11 col-span-10 text-muted-foreground text-sm">
                {t("models.passJsonOfLitellmSupportedParams")}{" "}
              </p>
            </div>
            <MountedFormField
              name="model_info_params"
              label={labelWithHint(
                t("models.modelInfo"),
                t("models.optionalModelInfoParamsReturnedWhenCallingModelInfoEndpoint"),
              )}
              className="mb-0"
              rules={{ validate: validatorRules({ validator: formItemValidateJSON }) }}
            >
              {(control) => (
                <Textarea
                  id={control.id}
                  value={(control.value as string | undefined) ?? ""}
                  onChange={control.onChange}
                  onBlur={control.onBlur}
                  rows={4}
                  placeholder='{
                  "mode": "chat"
                }'
                />
              )}
            </MountedFormField>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
};

export default AdvancedSettings;
