import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { Dayjs } from "dayjs";
import { ChevronDown, Info } from "lucide-react";
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
  CACHE_CONTROL_TOOLTIP,
  NEW_CACHE_CONTROL_POINT,
} from "./cache_control_settings";
import VectorStoreSelector from "../vector_store_management/VectorStoreSelector";
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
  { value: "per_token", label: "每百万 tokens" },
  { value: "per_second", label: "每秒" },
] as const;

const validateNumber = (_: unknown, value: unknown) => {
  if (!value) {
    return Promise.resolve();
  }
  if (isNaN(Number(value)) || Number(value) < 0) {
    return Promise.reject("请输入有效的正数");
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
          <b>高级设置</b>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          <div className="rounded-lg">
            <MountedFormField name="custom_pricing" label="自定义价格" className="mb-4">
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

            <MountedFormField
              name="vector_store_ids"
              label={
                <span>
                  关联知识库 (RAG){" "}
                  <SimpleTooltip content="用于 RAG 的 vector stores。对此模型的每次请求都会自动从这些知识库检索上下文。">
                    <a
                      href="https://docs.litellm.ai/docs/completion/knowledgebase"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="ml-1 inline size-3.5 align-text-bottom" />
                    </a>
                  </SimpleTooltip>
                </span>
              }
              className="mt-4"
              help="选择要关联的 vector stores。对此模型的请求会自动使用它们进行 RAG。可在工具 > Vector Stores 中配置。"
            >
              {(control) => (
                <VectorStoreSelector
                  onChange={control.onChange}
                  value={control.value as string[] | undefined}
                  accessToken={accessToken}
                  placeholder="选择知识库（可选）"
                />
              )}
            </MountedFormField>

            <MountedFormField
              name="guardrails"
              label={
                <span>
                  Guardrails{" "}
                  <SimpleTooltip content="将安全 guardrails 应用于此 key，以过滤内容或强制执行策略">
                    <a
                      href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                    >
                      <Info className="ml-1 inline size-3.5 align-text-bottom" />
                    </a>
                  </SimpleTooltip>
                </span>
              }
              className="mt-4"
              help="选择已有 guardrails。可前往 Guardrails 标签页创建新的 guardrails。"
            >
              {(control) => (
                <MultiSelect
                  id={control.id}
                  placeholder="选择或输入 guardrails"
                  emptyText="输入以添加 guardrail"
                  value={(control.value as string[] | undefined) ?? []}
                  onValueChange={control.onChange}
                  options={guardrailsList.map((name) => ({ value: name, label: name }))}
                  allowCustomValues
                />
              )}
            </MountedFormField>

            <MountedFormField name="tags" label="Tags" className="mb-4">
              {(control) => (
                <MultiSelect
                  id={control.id}
                  placeholder="选择或输入 tags"
                  emptyText="输入以添加 tag"
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
                    "PTU 数量",
                    "此部署的 provisioned throughput units。与每 PTU / 小时成本和团队一起设置，用于归属每日固定成本。",
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
                      placeholder="e.g. 15"
                    />
                  )}
                </MountedFormField>

                <MountedFormField
                  name={PTU_RATE_FIELD}
                  label={labelWithHint(
                    "计算后的每 PTU / 小时成本 (USD)",
                    "固定成本 = PTU 数量 * 此费率 * 活跃小时数，并归属到部署所属团队。",
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
                      placeholder="e.g. 2.00"
                    />
                  )}
                </MountedFormField>

                <MountedFormField
                  name={PTU_START_FIELD}
                  label={labelWithHint(
                    "PTU 生效开始时间 (UTC)",
                    "PTU 窗口的开始时间。设置 PTU 数量时必填。固定成本在窗口内按小时累计；窗口在 23:00 开始时，当天计费一小时。",
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
                    "PTU 生效结束时间 (UTC)",
                    "PTU 窗口的可选结束时间（不包含）。留空表示无结束时间。",
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
                <MountedFormField name="pricing_model" label="计价模型" className="mb-4">
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
                      label="输入成本（每 1M tokens）"
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
                      label="输出成本（每 1M tokens）"
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
                      label={labelWithHint("Cache 读取成本（每 1M tokens）", "留空时默认使用输入成本。")}
                      rules={usageCostRules}
                      className="mb-4"
                    >
                      {(control) => (
                        <Input
                          id={control.id}
                          value={(control.value as string | undefined) ?? ""}
                          onChange={control.onChange}
                          onBlur={control.onBlur}
                          placeholder="留空时默认使用输入成本"
                        />
                      )}
                    </MountedFormField>
                    <MountedFormField
                      name="cache_creation_input_token_cost"
                      label={labelWithHint(
                        "Cache 写入成本（每 1M tokens）",
                        "留空时默认使用输入成本（未设置 cache-write rate 时，后端会回退到 input_cost_per_token）。",
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
                          placeholder="留空时默认使用输入成本"
                        />
                      )}
                    </MountedFormField>
                  </>
                ) : (
                  <MountedFormField
                    name="input_cost_per_second"
                    label="每秒成本"
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
                "用于 pass through routes",
                <span>
                  允许在 pass through routes 中使用这些凭据。{" "}
                  <a
                    href="https://docs.litellm.ai/docs/pass_through/vertex_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    了解更多
                  </a>
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
              label={labelWithHint(CACHE_CONTROL_LABEL, CACHE_CONTROL_TOOLTIP)}
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
                "LiteLLM Params",
                "用于发起 litellm.completion() 调用的可选 litellm params。",
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
                传入 litellm 支持的 params JSON{" "}
                <a
                  href="https://docs.litellm.ai/docs/completion/input"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  litellm.completion() call
                </a>
              </p>
            </div>
            <MountedFormField
              name="model_info_params"
              label={labelWithHint(
                "模型信息",
                "可选的模型信息 params。调用 `/model/info` endpoint 时会返回。",
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
