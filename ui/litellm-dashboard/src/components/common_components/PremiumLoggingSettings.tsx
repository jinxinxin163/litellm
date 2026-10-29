import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { Badge } from "@/components/ui/badge";
import LoggingSettings from "../team/LoggingSettings";

interface PremiumLoggingSettingsProps {
  value: any[];
  onChange: (settings: any[]) => void;
  premiumUser?: boolean;
  disabledCallbacks?: string[];
  onDisabledCallbacksChange?: (disabledCallbacks: string[]) => void;
}

export function PremiumLoggingSettings({
  value,
  onChange,
  premiumUser = false,
  disabledCallbacks = [],
  onDisabledCallbacksChange,
}: PremiumLoggingSettingsProps) {
  const { t } = useTranslation();
  if (!premiumUser) {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="opacity-50">
            ✨ langfuse-logging
          </Badge>
          <Badge variant="secondary" className="opacity-50">
            ✨ datadog-logging
          </Badge>
        </div>
        <div className="p-3 bg-muted border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            {t("loggingAlerts.premiumLoggingHelp")}{" "}
            <a href="https://www.litellm.ai/#pricing" target="_blank" rel="noopener noreferrer" className="underline">
              {t("loggingAlerts.here")}
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoggingSettings
      value={value}
      onChange={onChange}
      disabledCallbacks={disabledCallbacks}
      onDisabledCallbacksChange={onDisabledCallbacksChange}
    />
  );
}

export default PremiumLoggingSettings;
