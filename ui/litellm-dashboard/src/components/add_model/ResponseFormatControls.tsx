import { useTranslation } from "@/i18n/useTranslation";
import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const ResponseFormatControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.return_raw_model_name ?? false}
          onCheckedChange={(returnRawModelName) => onChange({ ...value, return_raw_model_name: returnRawModelName })}
          aria-label={t("models.returnRawModelName")}
        />
        <strong className="font-semibold">{t("models.returnRawModelName")}</strong>
      </div>
      <span className="block text-xs text-muted-foreground">
        {t("models.returnTheResolvedUnderlyingModelNameInResponses")}
      </span>
    </>
  );
};

export default ResponseFormatControls;
