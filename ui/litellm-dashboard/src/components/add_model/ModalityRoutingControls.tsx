import { useTranslation } from "@/i18n/useTranslation";
import React from "react";

import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

export const ModalityRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const modalityRouting = value.modality_routing ?? false;
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={modalityRouting}
          onCheckedChange={(nextModalityRouting) => onChange({ ...value, modality_routing: nextModalityRouting })}
          aria-label={t("models.routeImageRequestsToVisionCapableModels")}
        />
        <strong className="font-semibold">{t("models.routeImageRequestsToVisionCapableModels")}</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        {t("models.replacesARoutedModelThatCannotTakeImage")}
      </span>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.modality_pin_override ?? false}
          onCheckedChange={(modalityPinOverride) => onChange({ ...value, modality_pin_override: modalityPinOverride })}
          disabled={!modalityRouting}
          aria-label={t("models.overrideSessionPinForImageRequests")}
        />
        <strong className="font-semibold">{t("models.overrideSessionPinForImageRequests")}</strong>
      </div>
      <span className="block text-xs text-muted-foreground">{t("models.routeAnImageTurnToACapableModel")}</span>
    </>
  );
};
