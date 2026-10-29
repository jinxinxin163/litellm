import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";

interface ImpactResult {
  affected_keys_count: number;
  affected_teams_count: number;
  sample_keys: string[];
  sample_teams: string[];
}

interface ImpactPreviewAlertProps {
  impactResult: ImpactResult;
}

interface SampleListProps {
  label: string;
  samples: string[];
  totalCount: number;
}

const SampleList: React.FC<SampleListProps> = ({ label, samples, totalCount }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}: </span>
      {samples.slice(0, 5).map((sample) => (
        <Badge key={sample} variant="outline">
          {sample}
        </Badge>
      ))}
      {totalCount > 5 && (
        <span className="text-xs text-muted-foreground">
          {t("policiesPage.and")} {totalCount - 5} {t("policiesPage.more6")}
        </span>
      )}
    </div>
  );
};

const ImpactPreviewAlert: React.FC<ImpactPreviewAlertProps> = ({ impactResult }) => {
  const { t } = useTranslation();
  const isGlobal = impactResult.affected_keys_count === -1;

  return (
    <Alert className="mb-4">
      {isGlobal ? <AlertTriangle /> : <Info />}
      <AlertTitle>{t("policiesPage.impactPreview")}</AlertTitle>
      <AlertDescription>
        {isGlobal ? (
          <span>
            {t("policiesPage.globalScopeThisWillAffect")} <strong>{t("policiesPage.allKeysAndTeams")}</strong>.
          </span>
        ) : (
          <div>
            <span>
              {t("policiesPage.thisAttachmentWouldAffect")}{" "}
              <strong>
                {impactResult.affected_keys_count}{" "}
                {t("policiesPage.keyPlural", { count: impactResult.affected_keys_count })}
              </strong>{" "}
              {t("policiesPage.and")}{" "}
              <strong>
                {impactResult.affected_teams_count}{" "}
                {t("policiesPage.teamPlural", { count: impactResult.affected_teams_count })}
              </strong>
              .
            </span>
            {impactResult.sample_keys.length > 0 && (
              <SampleList
                label={t("policiesPage.keys")}
                samples={impactResult.sample_keys}
                totalCount={impactResult.affected_keys_count}
              />
            )}
            {impactResult.sample_teams.length > 0 && (
              <SampleList
                label={t("policiesPage.teams")}
                samples={impactResult.sample_teams}
                totalCount={impactResult.affected_teams_count}
              />
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ImpactPreviewAlert;
