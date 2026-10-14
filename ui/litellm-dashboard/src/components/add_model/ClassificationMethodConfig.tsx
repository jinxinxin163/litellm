import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import React from "react";
import ClassifierPromptEditor from "./ClassifierPromptEditor";
import OpeningPromptEditor, { type OpeningPromptSelection } from "./OpeningPromptEditor";
import { RestrictedSection, restrictedBy } from "./TierRestrictions";
import HeuristicScoringConfig from "./HeuristicScoringConfig";
import ClassifierReasoningEffortSelect from "./ClassifierReasoningEffortSelect";
import ClassifierCircuitBreakerConfig from "./ClassifierCircuitBreakerConfig";
import ClassifierVisionConfig from "./ClassifierVisionConfig";
import type { ReasoningEffort } from "./complexity_router_tiers";
import { useComplexityScorerDefaults } from "@/app/(dashboard)/hooks/autoRouter/useComplexityScorerDefaults";
import {
  ClassificationFrequency,
  ClassifierFallback,
  ClassifierLLMConfig,
  ClassifierType,
  ComplexityRouterConfigValue,
  classificationFrequency,
  withClassificationFrequency,
  DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS,
  MIN_QUOTED_CONTEXT_TURN_CHARS,
  DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE,
  DEFAULT_CLASSIFIER_FALLBACK,
  DEFAULT_CLASSIFIER_TIMEOUT_MS,
  DEFAULT_CLASSIFICATION_RUBRIC,
  NEW_CLASSIFIER_CLASSIFICATION_RUBRIC,
  ClassificationRubric,
  effectiveTierLabel,
  heuristicScoringRole,
  usesLlmClassifier,
  DEFAULT_HEURISTIC_FIRST_MAX_TIER,
  DEFAULT_HYBRID_BOUNDARY_MARGIN,
  HEURISTIC_FIRST_MAX_TIER_KEYS,
  effectiveClassifierType,
} from "./ComplexityRouterConfig";

const DEFAULT_SCORING_EXPLANATION =
  "router 会从 7 个维度为每个请求评分：token 数量、是否包含代码、推理标记、技术术语、简单指标、多步骤模式和问题复杂度。" +
  "加权分数决定 tier：";

const HEURISTIC_V2_EXPLANATION =
  "router 使用内置校准模型估算四个 tier 的成功概率，然后选择第一个达到训练阈值的 tier。它在本地运行，不会调用分类器 API。";

const CLASSIFIER_TIMEOUT_ID = "classifier-timeout-ms";
const CLASSIFIER_CONTEXT_WINDOW_SIZE_ID = "classifier-context-window-size";
const CLASSIFIER_CONTEXT_BUDGET_CHARS_ID = "classifier-context-budget-chars";
const HYBRID_BOUNDARY_MARGIN_ID = "hybrid-boundary-margin";

const CUSTOM_PROMPT_WITH_HEURISTIC_FALLBACK =
  "此 router 使用你的 prompt 分类，因此 tier 取决于 prompt 中声明的 rubric。四个 tier 名称保持固定。下面的评分是 heuristic，" +
  "现在只会在分类器调用失败时运行：";

const CUSTOM_PROMPT_WITH_DEFAULT_MODEL_FALLBACK =
  "此 router 使用你的 prompt 分类，因此 tier 取决于 prompt 中声明的 rubric。四个 tier 名称保持固定。下面的评分不再运行，" +
  "因为分类器失败会改为路由到默认模型：";

/**
 * What the scoring breakdown below it actually describes. A custom prompt means the score no longer
 * decides the tier, and pairing one with the default-model fallback means the heuristic never runs
 * at all, so the panel must not keep implying a score is involved on either router.
 */
const scoringExplanation = (value: ComplexityRouterConfigValue): string => {
  if (value.classifier_type === "heuristic_v2") return HEURISTIC_V2_EXPLANATION;
  const usesCustomPrompt =
    usesLlmClassifier(value.classifier_type) && Boolean(value.classifier_llm_config?.system_prompt?.trim());
  if (!usesCustomPrompt) return DEFAULT_SCORING_EXPLANATION;
  return value.classifier_fallback === "default_model"
    ? CUSTOM_PROMPT_WITH_DEFAULT_MODEL_FALLBACK
    : CUSTOM_PROMPT_WITH_HEURISTIC_FALLBACK;
};

/**
 * The three boundaries this card states, as displayed strings, or null until the proxy's shipped defaults
 * have arrived. Kept out of the component so the card cannot state a range the router stopped using, and
 * so the derivation does not add branches to an already dense render.
 */
const boundaryRanges = (
  shipped: Record<string, number> | undefined,
  overrides: Record<string, number> | undefined,
  reasoningOverrideMinScore: number | undefined,
): {
  simpleMedium: string;
  mediumComplex: string;
  complexReasoning: string;
  reasoningOverrideFloor: string;
} | null => {
  const effective: Record<string, number> = { ...shipped, ...overrides };
  const [low, mid, high] = [effective.simple_medium, effective.medium_complex, effective.complex_reasoning];
  if (low === undefined || mid === undefined || high === undefined) return null;
  return {
    simpleMedium: low.toFixed(2),
    mediumComplex: mid.toFixed(2),
    complexReasoning: high.toFixed(2),
    reasoningOverrideFloor: (reasoningOverrideMinScore ?? low).toFixed(2),
  };
};

const HowClassificationWorks: React.FC<{ value: ComplexityRouterConfigValue }> = ({ value }) => {
  // The shipped boundaries come from the proxy, so this card cannot state ranges the router stopped using.
  const { data: scorerDefaults, isError } = useComplexityScorerDefaults();
  const scorerRuns = heuristicScoringRole(value) !== "never";
  const ranges = boundaryRanges(
    scorerDefaults?.tier_boundaries,
    value.tier_boundaries,
    value.reasoning_override_min_score,
  );

  if (value.custom_tier_set) return null;

  return (
    <Card className="bg-muted mt-4">
      <CardContent>
        <strong className="block mb-2 font-semibold">分类如何工作</strong>
        <span className="text-[13px] text-muted-foreground">{scoringExplanation(value)}</span>
        {scorerRuns && ranges && (
          <ul className="mt-2 pl-5 text-[13px] text-muted-foreground">
            <li>
              <strong>{effectiveTierLabel("SIMPLE", value.tier_labels)}</strong>: 分数 &lt; {ranges.simpleMedium}
            </li>
            <li>
              <strong>{effectiveTierLabel("MEDIUM", value.tier_labels)}</strong>: 分数 {ranges.simpleMedium} -{" "}
              {ranges.mediumComplex}
            </li>
            <li>
              <strong>{effectiveTierLabel("COMPLEX", value.tier_labels)}</strong>: 分数 {ranges.mediumComplex} -{" "}
              {ranges.complexReasoning}
            </li>
            <li>
              <strong>{effectiveTierLabel("REASONING", value.tier_labels)}</strong>: 分数 &gt;{" "}
              {ranges.complexReasoning}（或 2+ reasoning markers 且分数至少为 {ranges.reasoningOverrideFloor}）
            </li>
          </ul>
        )}
        {!ranges && isError && (
          <span className="text-[13px] block mt-2 text-muted-foreground">
            无法从 proxy 加载 tier 分数范围。
          </span>
        )}
      </CardContent>
    </Card>
  );
};

interface ClassificationMethodConfigProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
  effortOptionsByModel: Record<string, string[] | null | undefined>;
  customTechnicalKeywords?: string[];
  onCustomTechnicalKeywordsChange?: (keywords: string[]) => void;
  showValidationErrors?: boolean;
  /** The resolved default model - see resolveComplexityDefaultModel. Names and gates the radio. */
  defaultModel?: string;
}

const ClassifierTypeRadios: React.FC<{
  value: ComplexityRouterConfigValue;
  classifierType: ClassifierType;
  onTypeChange: (classifierType: ClassifierType) => void;
}> = ({ value, classifierType, onTypeChange }) => {
  const scorerLocked = Boolean(value.custom_tier_set);
  const scorerLockedReason = restrictedBy(value, "heuristicClassifier")?.reason;
  return (
    <RadioGroup
      value={classifierType}
      onValueChange={(classifierType: unknown) => onTypeChange(classifierType as ClassifierType)}
      className="w-full"
    >
      <div className="flex w-full flex-col items-start gap-2">
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">Heuristic</strong>{" "}
              <span className="text-muted-foreground">
                （默认），基于规则评分，无 API 调用，延迟 &lt;1ms
              </span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_v2" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">Heuristic v2</strong>{" "}
              <span className="text-muted-foreground">
                使用内置校准的四 tier 概率，无 API 调用
              </span>
            </span>
          </Label>
        </SimpleTooltip>
        <Label className="items-start font-normal leading-normal">
          <RadioGroupItem value="llm" className="mt-0.5" />
          <span>
            <strong className="font-semibold">LLM 分类器</strong>{" "}
            <span className="text-muted-foreground">调用模型来决定 tier（例如小型/快速模型）</span>
          </span>
        </Label>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_first" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">Heuristic first</strong>{" "}
              <span className="text-muted-foreground">
                先在本地评分；只有分数无法可靠落到低价 tier 时，才付费调用分类器
              </span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="hybrid" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">Hybrid</strong>{" "}
              <span className="text-muted-foreground">
                在任意 tier 保留本地分数；只有分数接近 tier 边界时，才付费调用分类器
              </span>
            </span>
          </Label>
        </SimpleTooltip>
      </div>
    </RadioGroup>
  );
};

const ClassificationMethodConfig: React.FC<ClassificationMethodConfigProps> = ({
  value,
  onChange,
  modelOptions,
  effortOptionsByModel,
  customTechnicalKeywords,
  onCustomTechnicalKeywordsChange,
  showValidationErrors = false,
  defaultModel,
}) => {
  const [draft, setDraft] = React.useState<{ id: string; raw: string } | null>(null);
  const hasDefaultModel = Boolean(defaultModel);
  const classifierType = effectiveClassifierType(value);
  const sessionFrequencyRestriction = restrictedBy(value, "sessionAffinity");
  const classifierModelMissing =
    showValidationErrors && usesLlmClassifier(classifierType) && !value.classifier_llm_config?.model;
  const usesCustomPrompt = Boolean(value.classifier_llm_config?.system_prompt?.trim());
  const contextBudget = value.classifier_context_budget_chars ?? DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS;
  const contextBudgetQuotesNothing = contextBudget > 0 && contextBudget < MIN_QUOTED_CONTEXT_TURN_CHARS;
  const classificationRubric = value.classifier_llm_config?.classification_rubric ?? DEFAULT_CLASSIFICATION_RUBRIC;
  const classifierModel = value.classifier_llm_config?.model ?? "";
  const classifierReasoningEffort = value.classifier_llm_config?.reasoning_effort;
  const explicitlySupportedClassifierEfforts = effortOptionsByModel[classifierModel];

  const handleClassifierTypeChange = (classifierType: ClassifierType) => {
    const nextValue: ComplexityRouterConfigValue = {
      ...value,
      classifier_type: classifierType,
      classifier_llm_config: usesLlmClassifier(classifierType)
        ? value.classifier_llm_config ?? {
            model: "",
            timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS,
            classification_rubric: NEW_CLASSIFIER_CLASSIFICATION_RUBRIC,
          }
        : undefined,
      classifier_context_window_size: usesLlmClassifier(classifierType)
        ? value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE
        : undefined,
      classifier_context_budget_chars: usesLlmClassifier(classifierType)
        ? value.classifier_context_budget_chars ?? DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS
        : undefined,
      classifier_context_include_assistant_turns: usesLlmClassifier(classifierType)
        ? value.classifier_context_include_assistant_turns
        : undefined,
      classifier_fallback: usesLlmClassifier(classifierType) ? value.classifier_fallback : undefined,
      heuristic_first_max_tier:
        classifierType === "heuristic_first"
          ? value.heuristic_first_max_tier ?? DEFAULT_HEURISTIC_FIRST_MAX_TIER
          : undefined,
      hybrid_boundary_margin:
        classifierType === "hybrid" ? value.hybrid_boundary_margin ?? DEFAULT_HYBRID_BOUNDARY_MARGIN : undefined,
    };
    onChange(nextValue);
  };

  const handleHeuristicFirstMaxTierChange = (tier: string) => {
    onChange({ ...value, heuristic_first_max_tier: tier });
  };

  const handleHybridBoundaryMarginChange = (raw: string) => {
    setDraft({ id: HYBRID_BOUNDARY_MARGIN_ID, raw });
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange({ ...value, hybrid_boundary_margin: Math.min(1, Math.max(0, parsed)) });
  };

  // One write for everything the prompt dialog owns. The rubric arrives here rather than through the
  // rubric handler because two onChange calls in one tick would both spread this render's `value`,
  // so whichever landed second would drop the other's edit.
  const handleClassificationPromptChange = ({
    classificationPrompt,
    classificationExamples,
    classificationRubric: selectedRubric,
  }: OpeningPromptSelection) => {
    const rubricConfig: ClassifierLLMConfig = {
      ...value.classifier_llm_config,
      model: value.classifier_llm_config?.model ?? "",
      timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
      classification_rubric: selectedRubric,
    };
    const nextValue: ComplexityRouterConfigValue = {
      ...value,
      ...(selectedRubric && { classifier_llm_config: rubricConfig }),
      classification_prompt: classificationPrompt,
      classification_examples: classificationExamples,
    };
    onChange(nextValue);
  };

  const handleClassifierModelChange = (model: string) => {
    if (model === value.classifier_llm_config?.model) return;
    const { reasoning_effort: _reasoningEffort, ...classifierLlmConfig } = value.classifier_llm_config ?? {
      model: "",
      timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS,
    };
    onChange({
      ...value,
      classifier_llm_config: {
        ...classifierLlmConfig,
        model,
        timeout_ms: classifierLlmConfig.timeout_ms,
      },
    });
  };

  const handleClassifierReasoningEffortChange = (reasoningEffort: ReasoningEffort | undefined) => {
    if (!value.classifier_llm_config) return;
    const { reasoning_effort: _reasoningEffort, ...classifierLlmConfig } = value.classifier_llm_config;
    onChange({
      ...value,
      classifier_llm_config:
        reasoningEffort === undefined
          ? classifierLlmConfig
          : { ...classifierLlmConfig, reasoning_effort: reasoningEffort },
    });
  };

  const handleClassifierTimeoutChange = (timeoutMs: number) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: timeoutMs,
      },
    });
  };

  const handleClassificationRubricChange = (classificationRubric: ClassificationRubric) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
        classification_rubric: classificationRubric,
      },
    });
  };

  const handleClassifierSystemPromptChange = (systemPrompt: string | undefined) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
        system_prompt: systemPrompt,
      },
    });
  };

  const handleClassifierFallbackChange = (fallback: ClassifierFallback) => {
    onChange({ ...value, classifier_fallback: fallback });
  };

  const handleClassificationFrequencyChange = (frequency: ClassificationFrequency) => {
    onChange(withClassificationFrequency(value, frequency));
  };

  const handleClassifierContextWindowSizeChange = (windowSize: number) => {
    onChange({
      ...value,
      classifier_context_window_size: windowSize,
    });
  };

  const handleClassifierContextBudgetCharsChange = (budgetChars: number) => {
    onChange({
      ...value,
      classifier_context_budget_chars: budgetChars,
    });
  };

  const handleClassifierIntegerChange = (
    id: string,
    raw: string,
    minimum: number,
    onCommit: (value: number) => void,
  ) => {
    setDraft({ id, raw });
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onCommit(Math.max(minimum, Math.round(parsed)));
  };

  const handleClassifierContextIncludeAssistantTurnsChange = (includeAssistantTurns: boolean) => {
    onChange({
      ...value,
      classifier_context_include_assistant_turns: includeAssistantTurns,
    });
  };

  return (
    <>
      <ClassifierTypeRadios value={value} classifierType={classifierType} onTypeChange={handleClassifierTypeChange} />

      {classifierType === "heuristic_first" && (
        <div className="mt-4 space-y-2">
          <strong className="block font-semibold">本地决策最高到</strong>
          <Select
            value={value.heuristic_first_max_tier}
            onValueChange={(tier: unknown) => handleHeuristicFirstMaxTierChange(tier as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEURISTIC_FIRST_MAX_TIER_KEYS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {effectiveTierLabel(tier, value.tier_labels)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            scorer 放在此 tier 或更低 tier 的请求会直接路由过去，不调用分类器。scorer 放到更高 tier 的请求，以及完全找不到信号的请求，会改交给分类器。
          </p>
        </div>
      )}

      {classifierType === "hybrid" && (
        <div className="mt-4 space-y-2">
          <strong className="block font-semibold">边界裕量</strong>
          <Input
            id={HYBRID_BOUNDARY_MARGIN_ID}
            type="text"
            inputMode="decimal"
            value={
              draft?.id === HYBRID_BOUNDARY_MARGIN_ID
                ? draft.raw
                : String(value.hybrid_boundary_margin ?? DEFAULT_HYBRID_BOUNDARY_MARGIN)
            }
            onChange={(event) => handleHybridBoundaryMarginChange(event.target.value)}
            onBlur={() => setDraft(null)}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            如果分数距离每个 tier 边界都超过此值，则按 scorer 自己的 tier 路由，无论该 tier 成本多高。更接近边界的分数，以及 scorer 完全找不到信号的请求，会交给分类器裁决。
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <strong className="block font-semibold">分类频率</strong>
        <RadioGroup
          value={classificationFrequency(value)}
          onValueChange={(frequency: unknown) =>
            handleClassificationFrequencyChange(frequency as ClassificationFrequency)
          }
        >
          <div className="inline-flex flex-col gap-2">
            <Label className="items-start font-normal leading-normal">
              <RadioGroupItem value="every_request" className="mt-0.5" />
              <span>
                <span>每个请求</span>{" "}
                <span className="text-muted-foreground">：每一轮都评分，包括 tool-result 后续轮次</span>
              </span>
            </Label>
            <Label className="items-start font-normal leading-normal">
              <RadioGroupItem value="user_turn" className="mt-0.5" />
              <span>
                <span>每条新用户消息</span>{" "}
                <span className="text-muted-foreground">
                  ：每个新的人工提问评分一次，然后为其后的 tool calls 保持该 tier
                </span>
              </span>
            </Label>
            <Label className="items-start font-normal leading-normal">
              <RadioGroupItem value="session" className="mt-0.5" disabled={Boolean(sessionFrequencyRestriction)} />
              <span>
                <span>每个 session 一次</span>{" "}
                <span className="text-muted-foreground">
                  {sessionFrequencyRestriction?.reason ??
                    "：只为第一轮评分，然后在整个 session 中保持该 tier 及其 deployment"}
                </span>
              </span>
            </Label>
          </div>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          保持 tier 可以让 agent 在整个 tool loop 中停留在同一个模型上，并降低评分成本。router 无法匹配到已保持决策的轮次（例如没有 session id 或已过期）会重新评分。
        </p>
      </div>

      {usesLlmClassifier(classifierType) && (
        <div className="mt-4 space-y-3">
          <div>
            <strong className="block mb-1 font-semibold">分类器模型</strong>
            <SearchSelect
              options={modelOptions}
              value={value.classifier_llm_config?.model ?? ""}
              onValueChange={handleClassifierModelChange}
              placeholder="选择用于分类请求复杂度的模型"
              emptyText="未找到模型"
              allowClear={false}
              className={classifierModelMissing ? "border-destructive" : undefined}
              aria-label="分类器模型"
            />
            {classifierModelMissing && <span className="text-xs text-destructive">分类器模型必填</span>}
          </div>
          <ClassifierReasoningEffortSelect
            model={classifierModel}
            value={classifierReasoningEffort}
            explicitlySupported={explicitlySupportedClassifierEfforts}
            onChange={handleClassifierReasoningEffortChange}
          />
          <div>
            <Label htmlFor={CLASSIFIER_TIMEOUT_ID} className="block mb-1 font-semibold">
              超时（ms）
            </Label>
            <Input
              id={CLASSIFIER_TIMEOUT_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_TIMEOUT_ID
                  ? draft.raw
                  : String(value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_TIMEOUT_ID,
                  event.target.value,
                  1,
                  handleClassifierTimeoutChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">
              分类器调用在失败并交由下方 fallback 处理前可等待的时间。
            </span>
          </div>
          <ClassifierCircuitBreakerConfig
            value={value.classifier_llm_config ?? { model: "", timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS }}
            onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
          />
          <ClassifierVisionConfig
            value={value.classifier_llm_config ?? { model: "", timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS }}
            onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <strong className="font-semibold">分类器 Prompt</strong>
              <SimpleTooltip content="每个 rubric 都使用相同的四个 tiers。差异在于用于提示分类器 tier 边界的 worked examples，Business rubric 还会为业务流量重写 tier 定义。选择 rubric，并在 prompt 编辑器中编写自己的开场说明和校准示例。">
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            {!value.custom_tier_set && usesCustomPrompt ? (
              <ClassifierPromptEditor
                systemPrompt={value.classifier_llm_config?.system_prompt}
                onChange={handleClassifierSystemPromptChange}
                contextWindowSize={value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE}
                tierLabels={value.tier_labels}
                classificationRubric={classificationRubric}
              />
            ) : (
              <OpeningPromptEditor
                classificationPrompt={value.classification_prompt}
                classificationExamples={value.classification_examples}
                onChange={handleClassificationPromptChange}
                tierSource={
                  value.custom_tier_set
                    ? { kind: "custom", tierRows: value.custom_tier_set.tiers }
                    : {
                        kind: "builtIn",
                        tierLabels: value.tier_labels,
                        classificationRubric,
                        rubricRestriction: restrictedBy(value, "classificationRubric")?.reason,
                      }
                }
                contextWindowSize={value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE}
              />
            )}
          </div>
          <RestrictedSection heading="分类器失败时" by={restrictedBy(value, "classifierFallback")}>
            <RadioGroup
              value={value.classifier_fallback ?? DEFAULT_CLASSIFIER_FALLBACK}
              onValueChange={(fallback: unknown) => handleClassifierFallbackChange(fallback as ClassifierFallback)}
            >
              <div className="inline-flex flex-col gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="heuristic" className="mt-0.5" />
                  <span>
                    <span>使用 heuristic 评分</span>{" "}
                    <span className="text-muted-foreground">- 在分类器评估复杂度时同步进行</span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
                  <RadioGroupItem value="default_model" disabled={!hasDefaultModel} className="mt-0.5" />
                  <SimpleTooltip
                    content={
                      hasDefaultModel
                        ? "请在默认模型选择器中修改。"
                        : "为此 router 设置默认模型后即可使用此选项"
                    }
                  >
                    <span>
                      <span>路由到默认模型{defaultModel ? ` (${defaultModel})` : ""}</span>{" "}
                      <span className="text-muted-foreground">
                        - 当你的 prompt 评估的不是复杂度时使用
                      </span>
                    </span>
                  </SimpleTooltip>
                </Label>
              </div>
            </RadioGroup>
            <span className="block text-xs text-muted-foreground">
              适用于分类器调用报错、超时或返回无法解析的响应时。
            </span>
          </RestrictedSection>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_WINDOW_SIZE_ID} className="block mb-1 font-semibold">
              上下文窗口大小
            </Label>
            <Input
              id={CLASSIFIER_CONTEXT_WINDOW_SIZE_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_CONTEXT_WINDOW_SIZE_ID
                  ? draft.raw
                  : String(value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_CONTEXT_WINDOW_SIZE_ID,
                  event.target.value,
                  0,
                  handleClassifierContextWindowSizeChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">
              作为上下文发送给分类器的历史用户轮次数（不包括 tool output 和 harness reminders），因此类似 &quot;now do the same for the streaming path&quot;
              的引用式后续请求会基于其引用内容分类。设为 0 则只发送当前消息。
            </span>
          </div>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_BUDGET_CHARS_ID} className="block mb-1 font-semibold">
              上下文字符预算
            </Label>
            <Input
              id={CLASSIFIER_CONTEXT_BUDGET_CHARS_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_CONTEXT_BUDGET_CHARS_ID
                  ? draft.raw
                  : String(value.classifier_context_budget_chars ?? DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_CONTEXT_BUDGET_CHARS_ID,
                  event.target.value,
                  0,
                  handleClassifierContextBudgetCharsChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">
              发送给分类器的历史对话总字符数。轮次会从最新开始取，并在可容纳时整段引用，因此短对话不会被截断。
            </span>
            {contextBudgetQuotesNothing && (
              <span className="block text-xs text-destructive">
                低于 {MIN_QUOTED_CONTEXT_TURN_CHARS} 个字符时，没有空间引用一段无法完整容纳的轮次，因此长对话到达分类器时可能完全没有上下文。将上下文窗口大小设为 0 可明确关闭上下文。
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Switch
                checked={value.classifier_context_include_assistant_turns ?? false}
                onCheckedChange={handleClassifierContextIncludeAssistantTurnsChange}
                size="sm"
                aria-label="包含 Assistant 轮次"
              />
              <strong className="font-semibold">包含 Assistant 轮次</strong>
              <SimpleTooltip content="默认关闭。为现有 router 启用它会改变 tier 决策以及花费，并会把 assistant 文本发送给分类器模型；分类器模型的 provider 可能不同于被路由模型。">
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            <span className="text-xs text-muted-foreground">
              允许分类器读取 assistant 回复，让模型自己陈述的难度也可见，而不仅是用户内容。例如 assistant 称某个 plan 很复杂，用户用 &quot;yes&quot; 批准后，
              会按被批准的工作分类。此时上下文窗口大小会统计两个角色的最近 N 轮，而不是最近 N 个用户轮次。
            </span>
          </div>
        </div>
      )}

      {heuristicScoringRole(value) !== "never" && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <strong className="font-semibold">自定义技术关键词</strong>
            <SimpleTooltip content="追加到内置技术关键词列表中的领域术语。包含这些术语的 prompts 会在技术维度上获得更高分，并路由到能力更强的模型。">
              <Info className="size-4 text-muted-foreground" />
            </SimpleTooltip>
          </div>
          <span className="block mb-2 text-xs text-muted-foreground">
            可选：向内置列表添加术语，以提升技术维度上的分类准确性。
            (e.g., udp, kafka, terraform).
          </span>
          <MultiSelect
            options={(customTechnicalKeywords ?? []).map((keyword) => ({ label: keyword, value: keyword }))}
            value={customTechnicalKeywords ?? []}
            onValueChange={(keywords: string[]) =>
              onCustomTechnicalKeywordsChange?.(
                Array.from(
                  new Set(keywords.flatMap((keyword) => keyword.split(",").map((part) => part.trim())).filter(Boolean)),
                ),
              )
            }
            placeholder="输入关键词并按 Enter"
            emptyText="输入以添加关键词"
            allowCustomValues
            className="w-full"
          />
        </div>
      )}

      <HeuristicScoringConfig value={value} onChange={onChange} />

      <HowClassificationWorks value={value} />
    </>
  );
};

export default ClassificationMethodConfig;
