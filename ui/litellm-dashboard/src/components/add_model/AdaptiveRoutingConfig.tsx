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
        <strong className="font-semibold">启用自适应 bandit 选择</strong>
      </Label>
      <span className="block text-xs text-muted-foreground">
        关闭后，每个请求始终使用其分类 tier 分配的模型。
      </span>

      <Card className="bg-muted mt-4">
        <CardContent>
          <strong className="mb-2 block font-semibold">自适应路由如何工作</strong>
          <span className="text-[13px] text-muted-foreground">
            它会从每段对话的实际表现中学习：用户是否需要重述或纠正模型，模型是否卡住并重复自身，是否耗尽 tool call，用户看起来是否满意。结合成本后，
            这些实时反馈会把后续路由推向实际效果更好的模型，并随着对话增多而改进。在反馈足够之前，默认使用分类 tier 的模型。
          </span>
        </CardContent>
      </Card>

      {value.adaptive && (
        <div className="mt-4 space-y-4">
          <div>
            <strong className="mb-1 block font-semibold">
              质量 vs. 成本（{Math.round(adaptiveWeights.quality * 100)}% 质量 /{" "}
              {Math.round(adaptiveWeights.cost * 100)}% 成本）
            </strong>
            <Slider
              aria-label="质量 vs. 成本"
              min={0}
              max={100}
              value={[Math.round(adaptiveWeights.quality * 100)]}
              onValueChange={(next) => handleQualityWeightChange(Array.isArray(next) ? next[0] : next)}
            />
            <span className="text-xs text-muted-foreground">
              更高的质量权重会偏向能力更强（更贵）的模型；当 bandit 有可用反馈时，更高的成本权重会偏向更便宜的模型。推荐：30% 质量 / 70% 成本。
            </span>
          </div>

          <div>
            <strong className="mb-1 block font-semibold">可选模型池</strong>
            <RadioGroup
              value={adaptiveEligible}
              onValueChange={(eligible: unknown) => handleAdaptiveEligibleChange(eligible as AdaptiveEligible)}
              className="w-full"
            >
              <div className="flex w-full flex-col items-start gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="all" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">所有 tiers（软下限）</strong>{" "}
                    <span className="text-muted-foreground">
                      - router 可跨 tier 选择，取决于与 prompt 的最佳匹配
                    </span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="classified_tier" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">仅分类 tier</strong>{" "}
                    <span className="text-muted-foreground">- router 只能选择该 tier 内的模型</span>
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {adaptiveEligible === "all" && (
            <div>
              <strong className="mb-1 block font-semibold">Tier 距离惩罚</strong>
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
                每远离分类 tier 一个 tier-step 时应用的分数惩罚。
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdaptiveRoutingConfig;
