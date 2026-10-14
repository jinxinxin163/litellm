import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { ChevronRight, Info, Plus, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { AffinityControls } from "./AffinityControls";
import TierRowSelect from "./TierRowSelect";
import { ModalityRoutingControls } from "./ModalityRoutingControls";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type CustomTierSet,
  type TierRow,
  MAX_TIER_COUNT,
  MAX_TIER_DEFINITION_CHARS,
  MAX_TIER_NAME_CHARS,
  MIN_TIER_COUNT,
  TIER_ORDER,
  activeTierName,
  activeTierRows,
  getCustomTierRowsError,
  isBuiltInTierName,
  resolveComplexityDefaultModel,
} from "./tier_rows";
import React from "react";
import { ModelGroup } from "@/components/llm_calls/fetch_models";
import AdaptiveRoutingConfig from "./AdaptiveRoutingConfig";
import ClassificationMethodConfig from "./ClassificationMethodConfig";
import ContextWindowEscalationConfig from "./ContextWindowEscalationConfig";
import ResponseFormatControls from "./ResponseFormatControls";
import StallEscalationConfig from "./StallEscalationConfig";
import { Restricted, restrictedBy } from "./TierRestrictions";
import { type TierSetAction, applyTierSetAction, setFallbackTier } from "./tier_set_actions";
import {
  ReasoningEffort,
  TierModelParamsByTier,
  classifierEffortOptionsForModels,
  setTierModelReasoningEffort,
  tierEffortOptionsForModels,
  tierRowLabel,
} from "./complexity_router_tiers";
import TierModelEffortRows from "./TierModelEffortRows";
import EscalationKeywords from "./EscalationKeywords";
import KeywordTierRules, { KeywordTierRule } from "./KeywordTierRules";
import SemanticKeywordMatching from "./SemanticKeywordMatching";
import { type DimensionWeights, type TierBoundaries, type TokenThresholds } from "./heuristic_scoring_knobs";
import CompressionControls from "./CompressionControls";
import { type AutoRouterCompressionState, DEFAULT_AUTO_ROUTER_COMPRESSION } from "./buildAutoRouterCompression";

export type { DimensionWeights, TierBoundaries, TokenThresholds };
export type { CustomTierSet, TierRow } from "./tier_rows";

export const DEFAULT_CLASSIFIER_TIMEOUT_MS = 3000;
export const DEFAULT_TIER_DISTANCE_PENALTY = 0.5;
export const DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE = 3;
export const DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS = 8000;
export const MIN_QUOTED_CONTEXT_TURN_CHARS = 120;
export const DEFAULT_SESSION_AFFINITY = false;
export const DEFAULT_SESSION_AFFINITY_TTL_SECONDS = 3600;
export const DEFAULT_DEPLOYMENT_AFFINITY = true;

export type ClassificationMode = "every_request" | "user_turn";

export const DEFAULT_CLASSIFICATION_MODE: ClassificationMode = "every_request";

/**
 * One operator-facing choice over the two wire fields that share the router's tier-pin machinery:
 * session affinity pins every turn, user_turn pins every turn except a new human ask.
 */
export type ClassificationFrequency = ClassificationMode | "session";

export type ComplexityTiers = {
  SIMPLE: string[];
  MEDIUM: string[];
  COMPLEX: string[];
  REASONING: string[];
};

export type ClassificationRubric = "legacy" | "agentic" | "chat" | "business";

/** What an unset preset means, matching the backend: the rubric as it shipped before calibration. */
export const DEFAULT_CLASSIFICATION_RUBRIC: ClassificationRubric = "legacy";

/**
 * Stamped on a classifier being switched on for the first time. There is no prior tier behaviour to
 * preserve at that moment, so a newly configured classifier gets the calibrated rubric while every
 * router already running an LLM classifier keeps the one it has.
 */
export const NEW_CLASSIFIER_CLASSIFICATION_RUBRIC: ClassificationRubric = "agentic";

export const CLASSIFICATION_RUBRIC_DESCRIPTIONS: Record<ClassificationRubric, { label: string; description: string }> =
  {
    legacy: {
      label: "Legacy（未校准）",
      description:
        "校准示例上线前使用的 rubric，没有任何完整示例。此设置出现前创建的 router 会继续使用它，因此 tier 决策和花费保持不变。" +
        "它会把普通工程任务过度路由到最贵的 tier。",
    },
    agentic: {
      label: "Agentic",
      description:
        "将常规安装、构建、多文件编辑和标准调试锚定在 Medium，避免普通工程任务路由到最贵的 tier。适合 agent、terminal、" +
        "coding-assistant 流量以及混合流量。",
    },
    chat: {
      label: "Chat",
      description:
        "移除工程示例，适用于只服务对话流量、不会遇到这些请求的 router。",
    },
    business: {
      label: "Business",
      description:
        "包含 business 和 sales 示例，以及面向业务的 tier 定义：常规起草和总结保持在 Medium，数据驱动分析为 Complex，" +
        "只有存在冲突权衡的决策才进入 Reasoning。适合 sales、support 和 go-to-market 流量。",
    },
  };

export const CLASSIFICATION_RUBRIC_KEYS = Object.keys(CLASSIFICATION_RUBRIC_DESCRIPTIONS) as ClassificationRubric[];

export interface ClassifierLLMConfig {
  model: string;
  timeout_ms: number;
  circuit_breaker_enabled?: boolean;
  circuit_breaker_cooldown_seconds?: number;
  reasoning_effort?: ReasoningEffort;
  classification_rubric?: ClassificationRubric;
  system_prompt?: string;
}

export type ClassifierType = "heuristic" | "heuristic_v2" | "llm" | "heuristic_first" | "hybrid";

/**
 * Whether this router can call classifier_llm_config.model. Mirrors the backend's
 * ComplexityRouterConfig.uses_llm_classifier, and is the single gate for every classifier-only
 * control and payload key, so a new chaining type cannot strip knobs the operator set.
 */
export const usesLlmClassifier = (classifierType: ClassifierType): boolean =>
  classifierType === "llm" || classifierType === "heuristic_first" || classifierType === "hybrid";

export type ClassifierFallback = "heuristic" | "default_model";

export const DEFAULT_CLASSIFIER_FALLBACK: ClassifierFallback = "heuristic";

export interface AdaptiveRouterWeights {
  quality: number;
  cost: number;
}

export const DEFAULT_ADAPTIVE_WEIGHTS: AdaptiveRouterWeights = { quality: 0.3, cost: 0.7 };

export type HeuristicScoringRole = "decides" | "fallback_only" | "never";

/**
 * Whether the heuristic scorer runs on this router at all, which is what gates its knobs. An LLM
 * classifier still falls back to the scorer unless the fallback is the default model, so the gate cannot be
 * a plain classifier_type check. Under heuristic_first the scorer runs first on every request and
 * decides outright whenever it lands at or below the threshold.
 */
export const heuristicScoringRoleFor = (
  classifierType: ClassifierType,
  classifierFallback: ClassifierFallback | undefined,
): HeuristicScoringRole => {
  if (classifierType === "heuristic_v2") return "never";
  if (classifierType === "heuristic" || classifierType === "heuristic_first" || classifierType === "hybrid")
    return "decides";
  return (classifierFallback ?? DEFAULT_CLASSIFIER_FALLBACK) === "heuristic" ? "fallback_only" : "never";
};

export const heuristicScoringRole = (value: ComplexityRouterConfigValue): HeuristicScoringRole =>
  value.custom_tier_set ? "never" : heuristicScoringRoleFor(value.classifier_type, value.classifier_fallback);

// Derived, never written into the value, so undoing a tier edit reverts the form with nothing left behind.
export const effectiveClassifierType = (
  value: Pick<ComplexityRouterConfigValue, "custom_tier_set" | "classifier_type">,
): ClassifierType => (value.custom_tier_set ? "llm" : value.classifier_type);

const rowOrigin = (row: TierRow, editing: boolean): string => {
  if (!editing) return row.id;
  return isBuiltInTierName(row.name) ? "built-in" : "custom";
};

const defaultModelPlaceholderFor = (derivedDefaultModel: string | undefined, isCustomSet: boolean): string => {
  if (derivedDefaultModel) return `由 tiers 派生：${derivedDefaultModel}`;
  return isCustomSet ? "为 fallback tier 添加模型" : "为 Simple 或 Medium tier 添加模型";
};

const builtInTierInfo = (rowId: string): { label: string; description: string; examples: string } | undefined => {
  const builtIn = TIER_ORDER.find((tier) => tier === rowId);
  return builtIn ? TIER_DESCRIPTIONS[builtIn] : undefined;
};

const tierConfigIntroText = (value: ComplexityRouterConfigValue): string => {
  if (value.classifier_type === "heuristic_v2") {
    return "复杂度 router 使用已校准的本地四 tier 模型对每个请求分类（无 API 调用）。配置每个 tier 由哪些模型处理。";
  }
  if (heuristicScoringRole(value) === "never") {
    return "复杂度 router 使用你的分类器模型对每个请求分类，并路由到对应 tier。配置每个 tier 由哪些模型处理。";
  }
  return "复杂度 router 使用基于规则的评分自动按复杂度分类请求（无 API 调用，延迟 <1ms）。配置每个 tier 由哪些模型处理。";
};

const TierConfigIntro: React.FC<{ value: ComplexityRouterConfigValue }> = ({ value }) => (
  <>
    <span className="block mb-6 text-muted-foreground">{tierConfigIntroText(value)}</span>

    <span className="block mb-4 text-xs text-muted-foreground">
      {restrictedBy(value, "displayNames")?.reason ??
        "重命名 tier 可在 dashboard 和 spend logs 中使用你自己的术语。重命名不会改变请求分类方式，调用方也不会看到这些名称。"}
      {!value.custom_tier_set &&
        usesLlmClassifier(value.classifier_type) &&
        " 你的分类器模型会读取这些名称，因此更清晰的名称能提升选择效果。"}
    </span>
  </>
);

const TierSetToolbar: React.FC<{
  editing: boolean;
  isCustomSet: boolean;
  rowCount: number;
  rowsError: string | null;
  keywordRulesError: string | null | undefined;
  onEditingChange: ((editing: boolean) => void) | undefined;
  onAdd: () => void;
  onRestore: () => void;
}> = ({ editing, isCustomSet, rowCount, rowsError, keywordRulesError, onEditingChange, onAdd, onRestore }) => (
  <>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {editing ? (
        <>
          <Button variant="outline" onClick={onAdd} disabled={rowCount >= MAX_TIER_COUNT}>
            <Plus />
            添加 tier
          </Button>
          <SimpleTooltip content={rowsError || undefined}>
            <Button variant="outline" disabled={Boolean(rowsError)} onClick={() => onEditingChange?.(false)}>
              完成
            </Button>
          </SimpleTooltip>
          {isCustomSet && (
            <Button variant="outline" size="sm" onClick={onRestore}>
              恢复默认值
            </Button>
          )}
        </>
      ) : (
        onEditingChange && (
          <Button variant="outline" onClick={() => onEditingChange(true)}>
            编辑 tiers
          </Button>
        )
      )}
    </div>
    {editing && (
      <span className="block mt-1 text-xs text-muted-foreground">
        添加或移除 tiers 以定义自己的集合。每个自定义 tier 都需要供 LLM 分类器路由使用的定义，编辑后的集合需要使用 LLM 分类方法
      </span>
    )}
    {editing && keywordRulesError && (
      <span className="block mt-1 text-xs text-destructive">
        {keywordRulesError}。请在高级：关键词/Semantic 匹配下编辑规则，或恢复该 tier
      </span>
    )}
  </>
);

const FallbackTierField: React.FC<{
  rows: readonly TierRow[];
  fallbackTierId: string;
  onValueChange: (rowId: string) => void;
}> = ({ rows, fallbackTierId, onValueChange }) => (
  <div className="mt-4">
    <div className="flex items-center gap-2 mb-2">
      <strong className="text-base font-semibold">Fallback Tier</strong>
      <SimpleTooltip content="当 LLM 分类器报错、超时或返回无法解析的回复时，请求会路由到这里。编辑 tier 集合时必填：heuristic scorer 无法生成你的自定义 tiers。">
        <Info className="size-4 text-muted-foreground" />
      </SimpleTooltip>
    </div>
    <TierRowSelect
      label="Fallback tier"
      options={rows.filter((row) => activeTierName(row)).map((row) => ({ value: row.id, label: activeTierName(row) }))}
      value={fallbackTierId || null}
      onValueChange={onValueChange}
      placeholder="选择分类器失败时路由到的 tier"
    />
  </div>
);

const TierRowHeader: React.FC<{
  row: TierRow;
  index: number;
  rowCount: number;
  label: string;
  description: string | undefined;
  editing: boolean;
  isCustomSet: boolean;
  onRemove: () => void;
}> = ({ row, index, rowCount, label, description, editing, isCustomSet, onRemove }) => (
  <div className="flex items-center gap-2 mb-2">
    <strong className="text-base font-semibold">{label} Tier</strong>
    <SimpleTooltip
      content={
        row.definition.trim() ||
        description ||
        "你定义的 tier。分类器会将匹配其定义的请求路由到这里。"
      }
    >
      <Info className="size-4 text-muted-foreground" />
    </SimpleTooltip>
    <span className="text-xs text-muted-foreground">
      第 {index + 1} 个 tier，共 {rowCount} 个 &middot; {rowOrigin(row, isCustomSet)}
    </span>
    {editing && (
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive/80"
        aria-label={`移除 ${activeTierName(row) || `tier ${index + 1}`} tier`}
        disabled={rowCount <= MIN_TIER_COUNT}
        onClick={onRemove}
      >
        <Trash2 />
        移除
      </Button>
    )}
  </div>
);

const TierRowEditFields: React.FC<{
  row: TierRow;
  index: number;
  definitionMissing: boolean;
  onPatch: (patch: Partial<Omit<TierRow, "id">>) => void;
}> = ({ row, index, definitionMissing, onPatch }) => (
  <>
    <Input
      value={row.name}
      onChange={(event) => onPatch({ name: event.target.value })}
      placeholder="Tier 名称，例如 SECURITY_REVIEW"
      aria-label={`第 ${index + 1} 个 tier 的名称`}
      maxLength={MAX_TIER_NAME_CHARS}
      className="mb-2"
    />
    <Textarea
      value={row.definition}
      onChange={(event) => onPatch({ definition: event.target.value.replace(/[\r\n]+/g, " ") })}
      placeholder={
        isBuiltInTierName(row.name)
          ? "留空以保留内置定义"
          : "哪些内容属于此 tier，例如请求安全审计"
      }
      aria-label={`第 ${index + 1} 个 tier 的定义`}
      maxLength={MAX_TIER_DEFINITION_CHARS}
      rows={2}
      className={definitionMissing ? "mb-2 border-destructive" : "mb-2"}
    />
    {definitionMissing && (
      <span className="mb-2 block text-xs text-destructive">
        定义必填：分类器会根据它将请求路由到此 tier
      </span>
    )}
  </>
);

export type AdaptiveEligible = "all" | "classified_tier";

export type ComplexityTierLabels = Partial<Record<keyof ComplexityTiers, string>>;

export interface ComplexityRouterConfigValue {
  tiers: ComplexityTiers;
  custom_tier_set?: CustomTierSet;
  tier_labels?: ComplexityTierLabels;
  /** An explicit pin. Unset means the default tracks the tiers - see resolveComplexityDefaultModel. */
  default_model?: string;
  classifier_type: ClassifierType;
  classifier_llm_config?: ClassifierLLMConfig;
  classifier_context_window_size?: number;
  classifier_context_budget_chars?: number;
  classifier_context_per_turn_chars?: number;
  classifier_context_include_assistant_turns?: boolean;
  classifier_fallback?: ClassifierFallback;
  /** Classification instructions only; the router appends derived tier bullets after them. */
  classification_prompt?: string;
  /** Calibration examples only; the router places them after the derived tier bullets. */
  classification_examples?: string;
  /** Highest tier the scorer may decide alone under heuristic_first. Required by that type, rejected by the others. */
  heuristic_first_max_tier?: string;
  /** How near a tier boundary a score may land before hybrid defers to the classifier. Required by that type, rejected by the others. */
  hybrid_boundary_margin?: number;
  classification_mode?: ClassificationMode;
  session_affinity?: boolean;
  session_affinity_ttl_seconds?: number;
  modality_routing?: boolean;
  modality_pin_override?: boolean;
  deployment_affinity?: boolean;
  /** Plan-mode floor as a tier ROW ID, unset meaning off. The wire carries the row's name. */
  plan_mode_min_tier?: string;
  /**
   * Mid-task stall escalation. Undefined means off, which keeps all three keys out of the payload:
   * the backend rejects them alongside session pinning, user-turn classification and a custom tier
   * set, so an off router must stay silent about them rather than send an explicit false.
   */
  stall_escalation_enabled?: boolean;
  stall_escalation_window?: number;
  stall_escalation_repeat_threshold?: number;
  adaptive?: boolean;
  adaptive_weights?: AdaptiveRouterWeights;
  tier_distance_penalty?: number;
  adaptive_eligible?: AdaptiveEligible;
  return_raw_model_name?: boolean;
  /**
   * Context-window escalation gate. Undefined means untouched, which keeps both keys out of the
   * payload so the router tracks the backend defaults (enabled, 0.95 buffer); an explicit false
   * is a real opt-out and must survive the edit round-trip.
   */
  enable_context_window_escalation?: boolean;
  context_window_escalation_buffer?: number;
  /**
   * Heuristic scorer knobs. Undefined means the operator never touched them, which keeps the key out of the
   * payload so the router tracks the backend defaults rather than freezing today's numbers.
   */
  tier_boundaries?: TierBoundaries;
  token_thresholds?: TokenThresholds;
  dimension_weights?: DimensionWeights;
  /**
   * Score floor the reasoning-marker override must clear. Undefined keeps the key out of the payload, so the
   * floor tracks tier_boundaries.simple_medium; an explicit 0 is a real floor that promotes on the markers alone.
   */
  reasoning_override_min_score?: number;
  /**
   * Per-(tier, model) litellm_params, serialized to the sibling tier_model_configs key. The full
   * params object is held, not just reasoning_effort, so keys authored in config.yaml survive an
   * edit round-trip.
   */
  tier_model_params?: TierModelParamsByTier;
}

/** Session affinity wins where a hand-authored config sets both, matching the backend's own `or`. */
export const classificationFrequency = (value: ComplexityRouterConfigValue): ClassificationFrequency => {
  if (!value.custom_tier_set && (value.session_affinity ?? DEFAULT_SESSION_AFFINITY)) return "session";
  return value.classification_mode === "user_turn" ? "user_turn" : "every_request";
};

export const withClassificationFrequency = (
  value: ComplexityRouterConfigValue,
  frequency: ClassificationFrequency,
): ComplexityRouterConfigValue => ({
  ...value,
  classification_mode: frequency === "user_turn" ? "user_turn" : "every_request",
  session_affinity: frequency === "session",
});

interface ComplexityRouterConfigProps {
  modelInfo: ModelGroup[];
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  /** Parent-owned: this component unmounts when its section collapses. */
  editingTiers?: boolean;
  onEditingTiersChange?: (editing: boolean) => void;
  customTechnicalKeywords?: string[];
  onCustomTechnicalKeywordsChange?: (keywords: string[]) => void;
  // Optional: the edit-auto-router modal doesn't yet support editing keyword tier
  // rules or semantic matching, so it renders this component without them.
  keywordTierRules?: KeywordTierRule[];
  onKeywordTierRulesChange?: (rules: KeywordTierRule[]) => void;
  /** getKeywordTierRulesError's verdict, owned by the caller: importing it here would be an import cycle. */
  keywordRulesError?: string | null;
  semanticMatchingEnabled?: boolean;
  onSemanticMatchingEnabledChange?: (enabled: boolean) => void;
  embeddingModel?: string;
  onEmbeddingModelChange?: (model: string) => void;
  matchThreshold?: number;
  onMatchThresholdChange?: (threshold: number) => void;
  escalationKeywords?: string[];
  onEscalationKeywordsChange?: (keywords: string[]) => void;
  // Optional: not part of complexity_router_config, since it applies to every
  // pre-routing strategy, not just the complexity router.
  autoRouterCompression?: AutoRouterCompressionState;
  onAutoRouterCompressionChange?: (state: AutoRouterCompressionState) => void;
  showValidationErrors?: boolean;
}

export const TIER_DESCRIPTIONS: Record<
  keyof ComplexityTiers,
  { label: string; description: string; examples: string }
> = {
  SIMPLE: {
    label: "Simple",
    description: "基础问题、问候语、简单事实查询",
    examples: '"Hello!", "What is Python?", "Thanks!"',
  },
  MEDIUM: {
    label: "Medium",
    description: "需要一些推理或解释的标准查询",
    examples: '"Explain how REST APIs work", "Debug this error"',
  },
  COMPLEX: {
    label: "Complex",
    description: "需要深入知识的技术性、多部分请求",
    examples: '"Design a microservices architecture", "Implement a rate limiter"',
  },
  REASONING: {
    label: "Reasoning",
    description: "链式思考、分析、明确要求推理的请求",
    examples: '"Think step by step...", "Analyze the pros and cons..."',
  },
};

export const TIER_KEYS = Object.keys(TIER_DESCRIPTIONS) as Array<keyof ComplexityTiers>;

export const effectiveTierLabel = (tier: keyof ComplexityTiers, tierLabels: ComplexityTierLabels | undefined): string =>
  tierLabels?.[tier]?.trim() || TIER_DESCRIPTIONS[tier].label;

export const DEFAULT_HEURISTIC_FIRST_MAX_TIER = "SIMPLE";

/** What the Hybrid radio starts at. Required by that type, so the form always has a value to send. */
export const DEFAULT_HYBRID_BOUNDARY_MARGIN = 0.03;

/**
 * Tiers the heuristic_first threshold may name. The top tier is excluded because it would short
 * circuit every request and leave the classifier unreachable, which the backend rejects.
 */
export const HEURISTIC_FIRST_MAX_TIER_KEYS = TIER_KEYS.slice(0, -1);

const PlanModeOverrideControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  planModeTierOptions: { value: string; label: string }[];
}> = ({ value, onChange, planModeTierOptions }) => (
  <>
    <div className="flex items-center gap-2 mb-2">
      <Switch
        checked={value.plan_mode_min_tier !== undefined}
        disabled={planModeTierOptions.length === 0}
        onCheckedChange={(enabled) =>
          onChange({
            ...value,
            plan_mode_min_tier: enabled ? planModeTierOptions.at(-1)?.value : undefined,
          })
        }
        aria-label="将 plan-mode 请求路由到最低 tier"
      />
      <strong className="font-semibold">将 plan-mode 请求路由到最低 tier</strong>
    </div>
    <span className="block text-xs mb-3 text-muted-foreground">
      来自 plan mode 中 coding agents（Claude Code、GitHub Copilot）的请求至少路由到此 tier。当分类器选择更高 tier 时仍以分类器为准，且该覆盖仅在 plan mode 激活期间生效。
      {planModeTierOptions.length === 0 && " 向某个 tier 添加模型后即可启用。"}
    </span>
    {value.plan_mode_min_tier !== undefined && (
      <div style={{ maxWidth: 320 }}>
        <TierRowSelect
          label="Plan-mode 最低 tier"
          options={planModeTierOptions}
          value={value.plan_mode_min_tier ?? null}
          onValueChange={(tier) => onChange({ ...value, plan_mode_min_tier: tier })}
        />
      </div>
    )}
  </>
);

const ComplexityRouterConfig: React.FC<ComplexityRouterConfigProps> = ({
  modelInfo,
  value,
  onChange,
  editingTiers = false,
  onEditingTiersChange,
  customTechnicalKeywords,
  onCustomTechnicalKeywordsChange,
  keywordTierRules = [],
  onKeywordTierRulesChange,
  keywordRulesError,
  semanticMatchingEnabled = false,
  onSemanticMatchingEnabledChange,
  embeddingModel,
  onEmbeddingModelChange = () => {},
  matchThreshold = 0.5,
  onMatchThresholdChange = () => {},
  escalationKeywords = [],
  onEscalationKeywordsChange,
  autoRouterCompression = DEFAULT_AUTO_ROUTER_COMPRESSION,
  onAutoRouterCompressionChange,
  showValidationErrors = false,
}) => {
  const customTierSet = value.custom_tier_set;
  const tierRows = activeTierRows(value);
  const tierRowsError = customTierSet ? getCustomTierRowsError(customTierSet) : null;

  const planModeRows = tierRows.filter((row) => row.models.length > 0);
  const planModeTierOptions = planModeRows.map((row) => ({
    value: row.id,
    label: tierRowLabel(row, value.tier_labels),
  }));
  const derivedDefaultModel = resolveComplexityDefaultModel(value);
  const defaultModelPlaceholder = defaultModelPlaceholderFor(derivedDefaultModel, Boolean(customTierSet));
  const defaultModel = resolveComplexityDefaultModel(value, value.default_model);

  const dispatch = (action: TierSetAction) => {
    const next = applyTierSetAction(value, keywordTierRules, action);
    if (next.keywordTierRules !== keywordTierRules) onKeywordTierRulesChange?.([...next.keywordTierRules]);
    onChange(next.value);
  };

  const setRowModels = (row: TierRow, models: string[]) => dispatch({ kind: "models", id: row.id, models });
  const updateTierRow = (id: string, patch: Partial<Omit<TierRow, "id">>) => dispatch({ kind: "patch", id, patch });
  const addCustomTier = () => dispatch({ kind: "add" });
  const removeTierRow = (id: string) => dispatch({ kind: "remove", id });
  const exitToBuiltInTiers = () => dispatch({ kind: "restore" });

  const tierEffortOptionsByModel = tierEffortOptionsForModels(modelInfo);
  const classifierEffortOptionsByModel = classifierEffortOptionsForModels(modelInfo);

  // Embedding models can't serve a chat-completion role, so they're excluded here.
  const modelOptions = modelInfo
    .filter((model) => model.mode !== "embedding")
    .map((model) => ({
      value: model.model_group,
      label: model.model_group,
    }));

  const handleTierModelEffortChange = (tier: string, model: string, effort: ReasoningEffort | undefined) => {
    onChange({
      ...value,
      tier_model_params: setTierModelReasoningEffort(value.tier_model_params, tier, model, effort),
    });
  };

  // Clearing the select drops the key entirely rather than storing "", so an emptied pin reads as
  // "track the tiers" everywhere downstream instead of as a blank model name.
  const handleDefaultModelChange = (model: string | undefined) => {
    onChange({ ...value, default_model: model || undefined });
  };

  const handleTierLabelChange = (tier: keyof ComplexityTiers, label: string) => {
    onChange({
      ...value,
      tier_labels: { ...value.tier_labels, [tier]: label },
    });
  };

  return (
    <div className="w-full max-w-none">
      <div className="inline-flex items-center gap-2 mb-4">
        <h4 className="m-0 text-xl font-semibold text-foreground">复杂度 Tier 配置</h4>
        <SimpleTooltip content="将每个复杂度 tier 映射到一个或多个模型。简单查询使用更便宜/更快的模型，复杂查询使用能力更强的模型。">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>

      <TierConfigIntro value={value} />

      <Card>
        <CardContent>
          {tierRows.map((row, index) => {
            const tierInfo = builtInTierInfo(row.id);
            const label = tierRowLabel(row, value.tier_labels);
            const tierMissing = showValidationErrors && row.models.length === 0;
            const needsDefinition = Boolean(customTierSet) && !row.definition.trim() && !isBuiltInTierName(row.name);
            const definitionMissing = showValidationErrors && needsDefinition;
            const showsDisplayName = !customTierSet && !editingTiers;
            return (
              <div key={row.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="mb-4">
                  <TierRowHeader
                    row={row}
                    index={index}
                    rowCount={tierRows.length}
                    label={label}
                    description={tierInfo?.description}
                    editing={editingTiers}
                    isCustomSet={Boolean(customTierSet)}
                    onRemove={() => removeTierRow(row.id)}
                  />
                  {tierInfo && !customTierSet && (
                    <span className="block mb-2 text-xs text-muted-foreground">示例：{tierInfo.examples}</span>
                  )}
                  {editingTiers && (
                    <TierRowEditFields
                      row={row}
                      index={index}
                      definitionMissing={definitionMissing}
                      onPatch={(patch) => updateTierRow(row.id, patch)}
                    />
                  )}
                  {showsDisplayName && tierInfo && (
                    <InputGroup className="mb-2">
                      <InputGroupInput
                        value={value.tier_labels?.[row.id as keyof ComplexityTiers] ?? ""}
                        onChange={(event) => handleTierLabelChange(row.id as keyof ComplexityTiers, event.target.value)}
                        placeholder={`显示名称（默认：${tierInfo.label}）`}
                        aria-label={`${tierInfo.label} tier 的显示名称`}
                      />
                      {value.tier_labels?.[row.id as keyof ComplexityTiers] && (
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            aria-label={`清除 ${tierInfo.label} tier 的显示名称`}
                            onClick={() => handleTierLabelChange(row.id as keyof ComplexityTiers, "")}
                          >
                            <X />
                          </InputGroupButton>
                        </InputGroupAddon>
                      )}
                    </InputGroup>
                  )}
                  <MultiSelect
                    options={modelOptions}
                    value={row.models}
                    onValueChange={(models: string[]) => setRowModels(row, models)}
                    placeholder={`为 ${label.toLowerCase()} 查询选择模型`}
                    emptyText="未找到模型"
                    className={tierMissing ? "w-full border-destructive" : "w-full"}
                  />
                  <TierModelEffortRows
                    tierLabel={label}
                    models={row.models}
                    effortOptionsByModel={tierEffortOptionsByModel}
                    paramsByModel={row.params}
                    onEffortChange={(model, effort) => handleTierModelEffortChange(row.id, model, effort)}
                  />
                  {row.models.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      已选择多个模型：router 会为每个请求从中随机选择（启用自适应路由时，会在池内进行 Thompson sampling）。
                    </span>
                  )}
                  {tierMissing && <span className="text-xs text-destructive">{label} tier 必填</span>}
                </div>
              </div>
            );
          })}

          <TierSetToolbar
            editing={editingTiers}
            isCustomSet={Boolean(customTierSet)}
            rowCount={tierRows.length}
            rowsError={tierRowsError}
            keywordRulesError={keywordRulesError}
            onEditingChange={onEditingTiersChange}
            onAdd={addCustomTier}
            onRestore={exitToBuiltInTiers}
          />

          {customTierSet && (
            <FallbackTierField
              rows={tierRows}
              fallbackTierId={customTierSet.fallback_tier_id}
              onValueChange={(fallbackTierId) => onChange(setFallbackTier(value, fallbackTierId))}
            />
          )}

          <Separator className="my-4" />

          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <strong className="text-base font-semibold">默认模型</strong>
              <SimpleTooltip content="留空表示跟随 tiers。这里选择的模型会被 pin：无论 tiers 如何变化，它都会保持为默认值。">
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            <SearchSelect
              options={modelOptions}
              value={value.default_model ?? ""}
              onValueChange={handleDefaultModelChange}
              placeholder={defaultModelPlaceholder}
              emptyText="未找到模型"
              aria-label="默认模型"
            />
            <span className="block mt-1 text-xs text-muted-foreground">
              当请求落到的 tier 没有模型时使用；也会在分类器失败且选择了“路由到默认模型”时使用。
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <div className="rounded-lg border border-border bg-muted">
        {[
          {
            key: "classifier",
            label: <strong className="text-foreground font-semibold">高级：分类方法</strong>,
            children: (
              <ClassificationMethodConfig
                value={value}
                onChange={onChange}
                modelOptions={modelOptions}
                effortOptionsByModel={classifierEffortOptionsByModel}
                customTechnicalKeywords={customTechnicalKeywords}
                onCustomTechnicalKeywordsChange={onCustomTechnicalKeywordsChange}
                showValidationErrors={showValidationErrors}
                defaultModel={defaultModel}
              />
            ),
          },
          {
            key: "adaptive",
            label: <strong className="text-foreground font-semibold">高级：自适应路由</strong>,
            children: (
              <Restricted by={restrictedBy(value, "adaptive")}>
                <AdaptiveRoutingConfig value={value} onChange={onChange} />
              </Restricted>
            ),
          },
          {
            key: "affinity",
            label: <strong className="text-foreground font-semibold">高级：Affinity</strong>,
            children: <AffinityControls value={value} onChange={onChange} />,
          },
          {
            key: "modality",
            label: <strong className="text-foreground font-semibold">高级：模态路由</strong>,
            children: <ModalityRoutingControls value={value} onChange={onChange} />,
          },
          {
            key: "plan-mode",
            label: <strong className="text-foreground font-semibold">高级：Plan-Mode 覆盖</strong>,
            children: (
              <PlanModeOverrideControls value={value} onChange={onChange} planModeTierOptions={planModeTierOptions} />
            ),
          },
          {
            key: "context-window",
            label: <strong className="text-foreground font-semibold">高级：上下文窗口升级</strong>,
            children: <ContextWindowEscalationConfig value={value} onChange={onChange} />,
          },
          {
            key: "stall-escalation",
            label: <strong className="text-foreground font-semibold">高级：停滞任务升级</strong>,
            children: (
              <Restricted by={restrictedBy(value, "stallEscalation")}>
                <StallEscalationConfig value={value} onChange={onChange} />
              </Restricted>
            ),
          },
          {
            key: "response",
            label: <strong className="text-foreground font-semibold">高级：响应格式</strong>,
            children: <ResponseFormatControls value={value} onChange={onChange} />,
          },
          ...(onEscalationKeywordsChange
            ? [
                {
                  key: "escalation",
                  label: <strong className="text-foreground font-semibold">高级：升级关键词</strong>,
                  children: (
                    <Restricted by={restrictedBy(value, "escalation")}>
                      <EscalationKeywords keywords={escalationKeywords} onChange={onEscalationKeywordsChange} />
                    </Restricted>
                  ),
                },
              ]
            : []),
          ...(onAutoRouterCompressionChange
            ? [
                {
                  key: "compression",
                  label: <strong className="text-foreground font-semibold">高级：压缩</strong>,
                  children: (
                    <CompressionControls value={autoRouterCompression} onChange={onAutoRouterCompressionChange} />
                  ),
                },
              ]
            : []),
          ...(onKeywordTierRulesChange || onSemanticMatchingEnabledChange
            ? [
                {
                  key: "keyword-semantic",
                  label: <strong className="text-foreground font-semibold">高级：关键词/Semantic 匹配</strong>,
                  children: (
                    <>
                      {onKeywordTierRulesChange && (
                        <KeywordTierRules
                          rules={keywordTierRules}
                          onChange={onKeywordTierRulesChange}
                          tierLabels={value.tier_labels}
                          tierNames={customTierSet && tierRows.map(activeTierName).filter(Boolean)}
                        />
                      )}
                      {onKeywordTierRulesChange && onSemanticMatchingEnabledChange && <Separator className="my-4" />}
                      {onSemanticMatchingEnabledChange && (
                        <SemanticKeywordMatching
                          enabled={semanticMatchingEnabled}
                          onEnabledChange={onSemanticMatchingEnabledChange}
                          embeddingModel={embeddingModel}
                          onEmbeddingModelChange={onEmbeddingModelChange}
                          matchThreshold={matchThreshold}
                          onMatchThresholdChange={onMatchThresholdChange}
                          modelInfo={modelInfo}
                          showValidationErrors={showValidationErrors}
                        />
                      )}
                    </>
                  ),
                },
              ]
            : []),
        ].map(({ key, label, children }) => (
          <Collapsible key={key} className="border-b border-border last:border-b-0">
            <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
              {label}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default ComplexityRouterConfig;
