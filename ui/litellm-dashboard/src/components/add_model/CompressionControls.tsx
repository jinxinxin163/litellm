import { useTranslation } from "@/i18n/useTranslation";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { SearchSelect, SearchSelectOption } from "@/components/shared/SearchSelect";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info } from "lucide-react";
import React from "react";
import { useGuardrails } from "@/app/(dashboard)/hooks/guardrails/useGuardrails";
import {
  AutoRouterCompressionState,
  isCompressionGuardrailProvider,
  NO_COMPRESSION,
} from "./buildAutoRouterCompression";

interface CompressionControlsProps {
  value: AutoRouterCompressionState;
  onChange: (state: AutoRouterCompressionState) => void;
}

const NONE_OPTION: SearchSelectOption = { label: "None (no compression)", value: NO_COMPRESSION };

const CompressionControls: React.FC<CompressionControlsProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const { routing, sameAsRouting, model } = value;
  const onRoutingChange = (newRouting: string | undefined) =>
    onChange({ ...value, routing: newRouting, sameAsRouting: newRouting === undefined ? true : sameAsRouting });
  const onSameAsRoutingChange = (newSameAsRouting: boolean) => onChange({ ...value, sameAsRouting: newSameAsRouting });
  const onModelChange = (newModel: string | undefined) => onChange({ ...value, model: newModel });

  const { data } = useGuardrails();
  const compressionOptions: SearchSelectOption[] = (data?.guardrails ?? [])
    .filter((g) => isCompressionGuardrailProvider(g.litellm_params?.guardrail))
    .map((g) => ({ label: g.guardrail_name, value: g.guardrail_name }));
  const options: SearchSelectOption[] = [NONE_OPTION, ...compressionOptions];

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium">{t("models.routingDecision")}</span>
          <SimpleTooltip content={t("models.compressionAppliedToTheClassifierSOwnCall")}>
            <Info className="size-4 text-muted-foreground" />
          </SimpleTooltip>
        </div>
        <SearchSelect
          options={options}
          value={routing ?? ""}
          onValueChange={(value) => onRoutingChange(value === "" ? undefined : value)}
          placeholder={t("models.inheritFromTheRequestSOwnCompressionGuardrails")}
          emptyText={t("models.noCompressionGuardrailsFound")}
          aria-label={t("models.routingDecisionCompression")}
        />
      </div>

      {routing !== undefined && (
        <div>
          <span className="mb-2 block text-sm font-medium">{t("models.modelCall")}</span>
          <RadioGroup
            value={sameAsRouting ? "same" : "different"}
            onValueChange={(value: unknown) => onSameAsRoutingChange(value === "same")}
            className="w-full"
          >
            <div className="flex w-full flex-col items-start gap-2">
              <Label className="items-start font-normal leading-normal">
                <RadioGroupItem value="same" className="mt-0.5" />
                <span>{t("models.sameAsTheRoutingDecision")}</span>
              </Label>
              <Label className="items-start font-normal leading-normal">
                <RadioGroupItem value="different" className="mt-0.5" />
                <span>{t("models.useADifferentCompression")}</span>
              </Label>
            </div>
          </RadioGroup>

          {!sameAsRouting && (
            <div className="mt-3">
              <SearchSelect
                options={options}
                value={model ?? ""}
                onValueChange={(value) => onModelChange(value === "" ? undefined : value)}
                placeholder={t("models.noneNoCompression")}
                emptyText={t("models.noCompressionGuardrailsFound")}
                aria-label={t("models.modelCallCompression")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompressionControls;
