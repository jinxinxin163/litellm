import { useTranslation } from "@/i18n/useTranslation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import React from "react";
import {
  AdaptiveEligible,
  ComplexityRouterConfigValue,
  DEFAULT_ADAPTIVE_WEIGHTS,
  DEFAULT_TIER_DISTANCE_PENALTY,
} from "./ComplexityRouterConfig";

interface AdaptiveRoutingConfigProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}

const AdaptiveRoutingConfig: React.FC<AdaptiveRoutingConfigProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const adaptiveWeights = value.adaptive_weights ?? DEFAULT_ADAPTIVE_WEIGHTS;
  const adaptiveEligible = value.adaptive_eligible ?? "all";
  const tierDistancePenalty = value.tier_distance_penalty ?? DEFAULT_TIER_DISTANCE_PENALTY;

  const handleAdaptiveToggle = (adaptive: boolean) => {
    const nextValue: ComplexityRouterConfigValue = {
      ...value,
      adaptive,
      adaptive_weights: adaptiveWeights,
      adaptive_eligible: adaptiveEligible,
      tier_distance_penalty: tierDistancePenalty,
    };
    onChange(nextValue);
  };

  const handleQualityWeightChange = (qualityPercent: number) => {
    const quality = qualityPercent / 100;
    onChange({ ...value, adaptive_weights: { quality, cost: Math.round((1 - quality) * 100) / 100 } });
  };

  const handleAdaptiveEligibleChange = (eligible: AdaptiveEligible) => {
    onChange({ ...value, adaptive_eligible: eligible });
  };

  const handleTierDistancePenaltyChange = (penalty: number | null) => {
    onChange({ ...value, tier_distance_penalty: penalty ?? DEFAULT_TIER_DISTANCE_PENALTY });
  };

  return (
    <>
      <Label className="mb-2">
        <Switch checked={value.adaptive ?? false} onCheckedChange={handleAdaptiveToggle} />
        <strong className="font-semibold">{t("models.enableAdaptiveBanditSelection")}</strong>
      </Label>
      <span className="block text-xs text-muted-foreground">
        {t("models.whenDisabledEachRequestAlwaysUsesTheModel")}
      </span>

      <Card className="bg-muted mt-4">
        <CardContent>
          <strong className="mb-2 block font-semibold">{t("models.howAdaptiveRoutingWorks")}</strong>
          <span className="text-[13px] text-muted-foreground">
            {t("models.itLearnsFromHowEachConversationActuallyGoes")}
          </span>
        </CardContent>
      </Card>

      {value.adaptive && (
        <div className="mt-4 space-y-4">
          <div>
            <strong className="mb-1 block font-semibold">
              {t("models.qualityVsCost")}
              {Math.round(adaptiveWeights.quality * 100)}
              {t("models.quality")} {Math.round(adaptiveWeights.cost * 100)}
              {t("models.cost")}
            </strong>
            <Slider
              aria-label={t("models.qualityVsCost2")}
              min={0}
              max={100}
              value={[Math.round(adaptiveWeights.quality * 100)]}
              onValueChange={(next) => handleQualityWeightChange(Array.isArray(next) ? next[0] : next)}
            />
            <span className="text-xs text-muted-foreground">
              {t("models.higherQualityWeightFavorsMoreCapablePricierModels")}
            </span>
          </div>

          <div>
            <strong className="mb-1 block font-semibold">{t("models.eligibleModelPool")}</strong>
            <RadioGroup
              value={adaptiveEligible}
              onValueChange={(eligible: unknown) => handleAdaptiveEligibleChange(eligible as AdaptiveEligible)}
              className="w-full"
            >
              <div className="flex w-full flex-col items-start gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="all" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">{t("models.allTiersSoftFloor")}</strong>{" "}
                    <span className="text-muted-foreground">{t("models.routerCanPickAcrossTiersDependingOnThe")}</span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="classified_tier" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">{t("models.classifiedTierOnly")}</strong>{" "}
                    <span className="text-muted-foreground">{t("models.routerCanOnlyPickModelsWithinTier")}</span>
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {adaptiveEligible === "all" && (
            <div>
              <strong className="mb-1 block font-semibold">{t("models.tierDistancePenalty")}</strong>
              <Input
                type="number"
                value={tierDistancePenalty}
                onChange={(event) =>
                  handleTierDistancePenaltyChange(event.target.value === "" ? null : event.target.valueAsNumber)
                }
                min={0}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">
                {t("models.scorePenaltyAppliedPerTierStepAwayFrom")}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdaptiveRoutingConfig;
