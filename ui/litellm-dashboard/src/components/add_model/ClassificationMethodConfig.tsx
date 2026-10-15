import { useTranslation } from "@/i18n/useTranslation";
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
import { RestrictedSection, restrictedBy, translateTierRestriction } from "./TierRestrictions";
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
  "models.defaultScoringExplanation";

const HEURISTIC_V2_EXPLANATION =
  "models.heuristicV2Explanation";

const CLASSIFIER_TIMEOUT_ID = "classifier-timeout-ms";
const CLASSIFIER_CONTEXT_WINDOW_SIZE_ID = "classifier-context-window-size";
const CLASSIFIER_CONTEXT_BUDGET_CHARS_ID = "classifier-context-budget-chars";
const HYBRID_BOUNDARY_MARGIN_ID = "hybrid-boundary-margin";

const CUSTOM_PROMPT_WITH_HEURISTIC_FALLBACK =
  "models.customPromptWithHeuristicFallback";

const CUSTOM_PROMPT_WITH_DEFAULT_MODEL_FALLBACK =
  "models.customPromptWithDefaultModelFallback";

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
  const { t } = useTranslation();
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
        <strong className="block mb-2 font-semibold">{t("models.howClassificationWorks")}</strong>
        <span className="text-[13px] text-muted-foreground">{t(scoringExplanation(value))}</span>
        {scorerRuns && ranges && (
          <ul className="mt-2 pl-5 text-[13px] text-muted-foreground">
            <li>
              <strong>{effectiveTierLabel("SIMPLE", value.tier_labels)}</strong>
              {t("models.score")} {ranges.simpleMedium}
            </li>
            <li>
              <strong>{effectiveTierLabel("MEDIUM", value.tier_labels)}</strong>
              {t("models.score2")} {ranges.simpleMedium} - {ranges.mediumComplex}
            </li>
            <li>
              <strong>{effectiveTierLabel("COMPLEX", value.tier_labels)}</strong>
              {t("models.score2")} {ranges.mediumComplex} - {ranges.complexReasoning}
            </li>
            <li>
              <strong>{effectiveTierLabel("REASONING", value.tier_labels)}</strong>
              {t("models.score3")} {ranges.complexReasoning} {t("models.or2ReasoningMarkersWithAScoreOf")}{" "}
              {ranges.reasoningOverrideFloor})
            </li>
          </ul>
        )}
        {!ranges && isError && (
          <span className="text-[13px] block mt-2 text-muted-foreground">
            {t("models.theTierScoreRangesCouldNotBeLoaded")}
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
  const { t } = useTranslation();
  const scorerLocked = Boolean(value.custom_tier_set);
  const scorerLockedReason = restrictedBy(value, "heuristicClassifier")?.reason;
  return (
    <RadioGroup
      value={classifierType}
      onValueChange={(classifierType: unknown) => onTypeChange(classifierType as ClassifierType)}
      className="w-full"
    >
      <div className="flex w-full flex-col items-start gap-2">
        <SimpleTooltip content={translateTierRestriction(scorerLockedReason, t)}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{t("models.heuristic")}</strong>{" "}
              <span className="text-muted-foreground">{t("models.defaultRuleBasedScoringWithNoApiCalls")}</span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={translateTierRestriction(scorerLockedReason, t)}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_v2" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{t("models.heuristicV2")}</strong>{" "}
              <span className="text-muted-foreground">
                {t("models.usesBundledCalibratedFourTierProbabilitiesWithNo")}
              </span>
            </span>
          </Label>
        </SimpleTooltip>
        <Label className="items-start font-normal leading-normal">
          <RadioGroupItem value="llm" className="mt-0.5" />
          <span>
            <strong className="font-semibold">{t("models.llmClassifier")}</strong>{" "}
            <span className="text-muted-foreground">{t("models.callsAModelToDecideTheTierE")}</span>
          </span>
        </Label>
        <SimpleTooltip content={translateTierRestriction(scorerLockedReason, t)}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_first" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{t("models.heuristicFirst")}</strong>{" "}
              <span className="text-muted-foreground">{t("models.scoresLocallyAndOnlyPaysForTheClassifier")}</span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={translateTierRestriction(scorerLockedReason, t)}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="hybrid" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{t("models.hybrid")}</strong>{" "}
              <span className="text-muted-foreground">{t("models.keepsTheLocalScoreAtAnyTierAnd")}</span>
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
  const { t } = useTranslation();
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
          <strong className="block font-semibold">{t("models.decideLocallyUpTo")}</strong>
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
          <p className="text-sm text-muted-foreground">{t("models.aRequestTheScorerPlacesAtOrBelow")}</p>
        </div>
      )}

      {classifierType === "hybrid" && (
        <div className="mt-4 space-y-2">
          <strong className="block font-semibold">{t("models.boundaryMargin")}</strong>
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
          <p className="text-sm text-muted-foreground">{t("models.aScoreFurtherThanThisFromEveryTier")}</p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <strong className="block font-semibold">{t("models.howOftenToClassify")}</strong>
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
                <span>{t("models.everyRequest")}</span>{" "}
                <span className="text-muted-foreground">
                  {t("models.scoreEveryTurnToolResultContinuationsIncluded")}
                </span>
              </span>
            </Label>
            <Label className="items-start font-normal leading-normal">
              <RadioGroupItem value="user_turn" className="mt-0.5" />
              <span>
                <span>{t("models.everyNewUserMessage")}</span>{" "}
                <span className="text-muted-foreground">{t("models.scoreEachNewHumanAskThenHoldThat")}</span>
              </span>
            </Label>
            <Label className="items-start font-normal leading-normal">
              <RadioGroupItem value="session" className="mt-0.5" disabled={Boolean(sessionFrequencyRestriction)} />
              <span>
                <span>{t("models.oncePerSession")}</span>{" "}
                <span className="text-muted-foreground">
                  {translateTierRestriction(sessionFrequencyRestriction?.reason, t) ?? t("models.scoreTheFirstTurnOnlyThenHoldThat")}
                </span>
              </span>
            </Label>
          </div>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">{t("models.holdingTheTierKeepsAnAgentOnOne")}</p>
      </div>

      {usesLlmClassifier(classifierType) && (
        <div className="mt-4 space-y-3">
          <div>
            <strong className="block mb-1 font-semibold">{t("models.classifierModel")}</strong>
            <SearchSelect
              options={modelOptions}
              value={value.classifier_llm_config?.model ?? ""}
              onValueChange={handleClassifierModelChange}
              placeholder={t("models.selectTheModelThatWillClassifyRequestComplexity")}
              emptyText={t("models.noModelsFound")}
              allowClear={false}
              className={classifierModelMissing ? "border-destructive" : undefined}
              aria-label={t("models.classifierModel")}
            />
            {classifierModelMissing && (
              <span className="text-xs text-destructive">{t("models.aClassifierModelIsRequired")}</span>
            )}
          </div>
          <ClassifierReasoningEffortSelect
            model={classifierModel}
            value={classifierReasoningEffort}
            explicitlySupported={explicitlySupportedClassifierEfforts}
            onChange={handleClassifierReasoningEffortChange}
          />
          <div>
            <Label htmlFor={CLASSIFIER_TIMEOUT_ID} className="block mb-1 font-semibold">
              {t("models.timeoutMs")}
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
            <span className="text-xs text-muted-foreground">{t("models.howLongTheClassifierCallHasBeforeIt")}</span>
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
              <strong className="font-semibold">{t("models.classifierPrompt")}</strong>
              <SimpleTooltip content={t("models.everyRubricUsesTheSameFourTiersThey")}>
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
          <RestrictedSection heading={t("models.ifTheClassifierFails")} by={restrictedBy(value, "classifierFallback")}>
            <RadioGroup
              value={value.classifier_fallback ?? DEFAULT_CLASSIFIER_FALLBACK}
              onValueChange={(fallback: unknown) => handleClassifierFallbackChange(fallback as ClassifierFallback)}
            >
              <div className="inline-flex flex-col gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="heuristic" className="mt-0.5" />
                  <span>
                    <span>{t("models.scoreWithTheHeuristic")}</span>{" "}
                    <span className="text-muted-foreground">
                      {t("models.rightWhenTheClassifierGradesComplexityToo")}
                    </span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
                  <RadioGroupItem value="default_model" disabled={!hasDefaultModel} className="mt-0.5" />
                  <SimpleTooltip
                    content={
                      hasDefaultModel
                        ? t("models.changeItFromTheDefaultModelSelect")
                        : t("models.setADefaultModelOnThisRouterTo")
                    }
                  >
                    <span>
                      <span>
                        {t("models.routeToTheDefaultModel")}
                        {defaultModel ? ` (${defaultModel})` : ""}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {t("models.rightWhenYourPromptGradesSomethingOtherThan")}
                      </span>
                    </span>
                  </SimpleTooltip>
                </Label>
              </div>
            </RadioGroup>
            <span className="block text-xs text-muted-foreground">
              {t("models.appliesWhenTheClassifierCallErrorsTimesOut")}
            </span>
          </RestrictedSection>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_WINDOW_SIZE_ID} className="block mb-1 font-semibold">
              {t("models.contextWindowSize")}
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
            <span className="text-xs text-muted-foreground">{t("models.numberOfPriorUserTurnsToolOutputAnd")}</span>
          </div>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_BUDGET_CHARS_ID} className="block mb-1 font-semibold">
              {t("models.contextCharacterBudget")}
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
              {t("models.totalCharactersOfPriorConversationSentToThe")}
            </span>
            {contextBudgetQuotesNothing && (
              <span className="block text-xs text-destructive">
                {t("models.under")} {MIN_QUOTED_CONTEXT_TURN_CHARS} {t("models.charactersThereIsNoRoomToQuoteA")}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Switch
                checked={value.classifier_context_include_assistant_turns ?? false}
                onCheckedChange={handleClassifierContextIncludeAssistantTurnsChange}
                size="sm"
                aria-label={t("models.includeAssistantTurns")}
              />
              <strong className="font-semibold">{t("models.includeAssistantTurns")}</strong>
              <SimpleTooltip content={t("models.offByDefaultEnablingItChangesTierDecisions")}>
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("models.letTheClassifierReadTheAssistantSReplies")}
            </span>
          </div>
        </div>
      )}

      {heuristicScoringRole(value) !== "never" && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <strong className="font-semibold">{t("models.customTechnicalKeywords")}</strong>
            <SimpleTooltip content={t("models.domainSpecificTermsAppendedToTheBuiltIn")}>
              <Info className="size-4 text-muted-foreground" />
            </SimpleTooltip>
          </div>
          <span className="block mb-2 text-xs text-muted-foreground">
            {t("models.optionalAddTermsToTheBuiltInList")}
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
            placeholder={t("models.typeAKeywordAndPressEnter")}
            emptyText={t("models.typeToAddAKeyword")}
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
