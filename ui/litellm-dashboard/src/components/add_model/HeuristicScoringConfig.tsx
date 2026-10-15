import { useTranslation } from "@/i18n/useTranslation";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { useComplexityScorerDefaults } from "@/app/(dashboard)/hooks/autoRouter/useComplexityScorerDefaults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { type ComplexityRouterConfigValue, heuristicScoringRole } from "./ComplexityRouterConfig";
import { dimensionLabel, weightTotal } from "./heuristic_scoring_knobs";

export type KnobGroup = "tier_boundaries" | "token_thresholds" | "dimension_weights";

interface GroupSpec {
  group: KnobGroup;
  title: string;
  blurb: string;
  min: number;
  max?: number;
  step: number;
  withSlider: boolean;
  labels: Record<string, string>;
}

const DIMENSION_TRANSLATION_KEYS: Record<string, string> = {
  codePresence: "models.dimensions.codePresence",
  reasoningMarkers: "models.dimensions.reasoningMarkers",
  technicalTerms: "models.dimensions.technicalTerms",
  tokenCount: "models.dimensions.tokenCount",
  simpleIndicators: "models.dimensions.simpleIndicators",
  multiStepPatterns: "models.dimensions.multiStepPatterns",
  questionComplexity: "models.dimensions.questionComplexity",
};

const OVERRIDE_FLOOR_ID = "reasoning-override-min-score";

const GROUPS: GroupSpec[] = [
  {
    group: "tier_boundaries",
    title: "models.tierBoundaries",
    blurb: "models.tierBoundariesHelp",
    min: -1,
    max: 1,
    step: 0.01,
    withSlider: false,
    labels: {
      simple_medium: "models.simpleToMedium",
      medium_complex: "models.mediumToComplex",
      complex_reasoning: "models.complexToReasoning",
    },
  },
  {
    group: "token_thresholds",
    title: "models.tokenThresholds",
    blurb: "models.tokenThresholdHelp",
    min: 0,
    step: 1,
    withSlider: false,
    labels: { simple: "models.shortBelow", complex: "models.longAbove" },
  },
  {
    group: "dimension_weights",
    title: "models.dimensionWeights",
    blurb: "models.dimensionWeightsHelp",
    min: 0,
    max: 1,
    step: 0.01,
    withSlider: true,
    labels: {},
  },
];

/** Why a group is currently misconfigured, or null. Never blocks the save: a router written this way in
 *  config.yaml would otherwise be uneditable here for every unrelated change. */
const warn = (group: KnobGroup, values: Record<string, number>): string | null => {
  if (
    group === "tier_boundaries" &&
    (values.simple_medium > values.medium_complex || values.medium_complex > values.complex_reasoning)
  )
    return "models.decreasingBoundaries";
  if (group === "token_thresholds" && values.simple >= values.complex) return "models.thresholdOrderWarning";
  return null;
};

interface HeuristicScoringConfigProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}

const HeuristicScoringConfig: React.FC<HeuristicScoringConfigProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<{ id: string; raw: string } | null>(null);
  const { data: defaults, isPending, isError, refetch } = useComplexityScorerDefaults();

  // The panel owns its own visibility: the scorer does not run at all when an LLM classifier
  // falls back to the default model, so there is nothing here to configure.
  const scorerRuns = heuristicScoringRole(value) !== "never";

  // What an untouched override floor follows: the boundary in effect, override included, not the shipped one.
  const trackedFloor: number | undefined = { ...defaults?.tier_boundaries, ...value.tier_boundaries }.simple_medium;

  const overrides =
    GROUPS.filter((spec) => value[spec.group] !== undefined).length +
    (value.reasoning_override_min_score !== undefined ? 1 : 0);

  // min/max are inert on a text input, and a plain number input renders Number("0.") as "0" so a decimal
  // cannot be typed. Hence the local draft plus an explicit clamp here.
  const commit = (spec: GroupSpec, effective: Record<string, number>, key: string, raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    const clamped = Math.min(spec.max ?? Infinity, Math.max(spec.min, parsed));
    onChange({
      ...value,
      [spec.group]: { ...effective, [key]: spec.step === 1 ? Math.round(clamped) : clamped },
    });
  };

  const commitOverrideFloor = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange({ ...value, reasoning_override_min_score: Math.min(1, Math.max(-1, parsed)) });
  };

  if (!scorerRuns) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger render={<button type="button" className="flex w-full items-center gap-2 text-left" />}>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        <span className="text-sm font-medium">{t("models.advancedScoring")}</span>
        {overrides > 0 && (
          <Badge variant="secondary" data-testid="advanced-scoring-override-count">
            {overrides} {overrides === 1 ? "override" : "overrides"}
          </Badge>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-6 pl-6">
          <p className="text-xs text-muted-foreground">{t("models.everyKnobBelowIsOptionalLeftUntouchedThe")}</p>

          {isPending ? (
            <p className="text-xs text-muted-foreground">{t("models.loadingTheShippedDefaults")}</p>
          ) : (
            <>
              {isError && (
                <div className="flex items-start gap-2" role="alert">
                  <p className="text-xs font-medium text-destructive">
                    {t("models.couldNotLoadTheShippedDefaultsSoOnly")}
                  </p>
                  <Button type="button" variant="link" size="xs" onClick={() => void refetch()}>
                    {t("models.retry")}
                  </Button>
                </div>
              )}
              {GROUPS.map((spec) => {
                const shipped = defaults?.[spec.group] ?? {};
                const effective: Record<string, number> = { ...shipped, ...value[spec.group] };
                const problem = warn(spec.group, effective);
                return (
                  <section key={spec.group} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t(spec.title)}</span>
                        {/* Only a known dimension set has a meaningful total; summing the overrides
                            alone would state a total that is not the router's. */}
                        {spec.withSlider && defaults !== undefined && (
                          <span className="text-xs text-muted-foreground" data-testid="dimension-weight-total">
                            {t("models.totalWeight", { total: weightTotal(effective).toFixed(2) })}
                          </span>
                        )}
                      </div>
                      {value[spec.group] !== undefined && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => onChange({ ...value, [spec.group]: undefined })}
                        >
                          {t("models.resetToDefaults")}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t(spec.blurb)}</p>

                    {Object.keys(effective).map((key) => {
                      const id = `${spec.group}-${key}`;
                      const labelKey = spec.labels[key] ?? DIMENSION_TRANSLATION_KEYS[key];
                      const label = labelKey ? t(labelKey) : dimensionLabel(key);
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <Label htmlFor={id} className="w-44 text-xs font-normal">
                            {label}
                          </Label>
                          {spec.withSlider && (
                            <Slider
                              min={spec.min}
                              max={spec.max}
                              step={spec.step}
                              value={[effective[key]]}
                              onValueChange={(next) =>
                                commit(spec, effective, key, String(Array.isArray(next) ? next[0] : next))
                              }
                              className="flex-1"
                              aria-label={t("models.dimensionWeightLabel", { label })}
                            />
                          )}
                          <Input
                            id={id}
                            type="text"
                            inputMode="decimal"
                            className={spec.withSlider ? "w-24" : "w-28"}
                            value={draft?.id === id ? draft.raw : String(effective[key])}
                            onChange={(event) => {
                              setDraft({ id, raw: event.target.value });
                              commit(spec, effective, key, event.target.value);
                            }}
                            onBlur={() => setDraft(null)}
                          />
                        </div>
                      );
                    })}

                    {problem && (
                      <p className="text-xs font-medium text-destructive" role="alert">
                        {problem ? t(problem) : problem}
                      </p>
                    )}
                  </section>
                );
              })}

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("models.reasoningOverrideFloor")}</span>
                  {value.reasoning_override_min_score !== undefined && (
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={() => onChange({ ...value, reasoning_override_min_score: undefined })}
                    >
                      {t("models.resetToDefaults")}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("models.twoOrMoreReasoningMarkersPromoteARequest")}{" "}
                  {trackedFloor === undefined
                    ? t("models.leftUntouchedItTracksTheSimpleToMedium")
                    : `Left untouched, it tracks the Simple to Medium boundary, currently ${trackedFloor.toFixed(2)}.`}{" "}
                  {t("models.setItTo0ToPromoteOnThe")}
                </p>
                <div className="flex items-center gap-3">
                  <Label htmlFor={OVERRIDE_FLOOR_ID} className="w-44 text-xs font-normal">
                    {t("models.minimumScore")}
                  </Label>
                  <Input
                    id={OVERRIDE_FLOOR_ID}
                    type="text"
                    inputMode="decimal"
                    className="w-28"
                    placeholder={trackedFloor === undefined ? undefined : trackedFloor.toFixed(2)}
                    value={
                      draft?.id === OVERRIDE_FLOOR_ID ? draft.raw : value.reasoning_override_min_score?.toString() ?? ""
                    }
                    onChange={(event) => {
                      setDraft({ id: OVERRIDE_FLOOR_ID, raw: event.target.value });
                      commitOverrideFloor(event.target.value);
                    }}
                    onBlur={() => setDraft(null)}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default HeuristicScoringConfig;
