import { useTranslation } from "@/i18n/useTranslation";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SSOSettingsEmptyPlaceholderProps {
  onAdd: () => void;
}

export default function SSOSettingsEmptyPlaceholder({ onAdd }: SSOSettingsEmptyPlaceholderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col items-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Shield className="size-6 text-muted-foreground" />
      </div>
      <h4 className="text-base font-semibold text-foreground">{t("admin.noSsoConfigurationFound")}</h4>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {t("admin.configureSingleSignOnSsoToEnableSeamlessAuthentication")}
      </p>
      <Button size="lg" onClick={onAdd} className="mt-4">
        {t("admin.configureSso")}
      </Button>
    </div>
  );
}
