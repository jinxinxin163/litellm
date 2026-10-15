import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

export const labelWithHint = (label: React.ReactNode, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  </>
);

const KEY_TYPE_OPTIONS = [
  { value: "default", label: "keys.fullAccess", hint: "keys.canCallAllRoutesAiApisManagementAndReadOnly" },
  { value: "llm_api", label: "keys.aiApis", hint: "keys.canCallOnlyAiApiRoutesChatCompletionsEmbeddingsEtc" },
  { value: "management", label: "keys.management", hint: "keys.canCallOnlyManagementRoutesUserTeamKeyManagement" },
];

export const KeyTypeSelect = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Select
      items={Object.fromEntries(KEY_TYPE_OPTIONS.map((option) => [option.value, t(option.label)]))}
      value={value}
      onValueChange={(next: string | null) => next != null && onChange(next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("keys.selectKeyType")} />
      </SelectTrigger>
      <SelectContent>
        {KEY_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="py-1">
              <div className="font-medium">{t(option.label)}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{t(option.hint)}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
