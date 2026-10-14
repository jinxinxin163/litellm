import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReasoningEffort } from "./complexity_router_tiers";

const PROVIDER_DEFAULT = "__classifier_provider_default__";

type EffortStatus = "supported" | "unsupported" | "unverified" | undefined;

const effortStatusFor = (
  effort: string | undefined,
  explicitlySupported: string[] | null | undefined,
): EffortStatus => {
  if (effort === undefined) return undefined;
  if (!Array.isArray(explicitlySupported)) return "unverified";
  return explicitlySupported.includes(effort) ? "supported" : "unsupported";
};

interface ClassifierReasoningEffortSelectProps {
  model: string;
  value: ReasoningEffort | undefined;
  explicitlySupported: string[] | null | undefined;
  onChange: (value: ReasoningEffort | undefined) => void;
}

const ClassifierReasoningEffortSelect = ({
  model,
  value,
  explicitlySupported,
  onChange,
}: ClassifierReasoningEffortSelectProps) => {
  const status = effortStatusFor(value, explicitlySupported);
  const options = Array.from(new Set([...(explicitlySupported ?? []), ...(value ? [value] : [])]));

  if (!model || options.length === 0) return null;

  const optionLabel = (effort: string): string =>
    effort === value && status !== "supported" ? `${effort} (${status})` : effort;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <strong className="font-semibold">Reasoning Effort</strong>
        <SimpleTooltip content="仅发送给分类器调用。默认值会保持分类器 deployment 或 provider 设置不变。">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <Select
        items={[
          { value: PROVIDER_DEFAULT, label: "默认" },
          ...options.map((effort) => ({ value: effort, label: optionLabel(effort) })),
        ]}
        value={value ?? PROVIDER_DEFAULT}
        onValueChange={(effort: string | null) =>
          effort && onChange(effort === PROVIDER_DEFAULT ? undefined : (effort as ReasoningEffort))
        }
      >
        <SelectTrigger aria-label={`分类器模型 ${model} 的 reasoning effort`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PROVIDER_DEFAULT}>默认</SelectItem>
          {options.map((effort) => (
            <SelectItem key={effort} value={effort}>
              {optionLabel(effort)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status === "unverified" && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          无法验证所选模型是否支持已保存的 effort。除非你已确认 provider 支持，否则请选择默认。
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-1 text-xs text-destructive">
          所选 model group 中并非所有 deployment 都支持已保存的 effort。保存前请选择默认或受支持的值。
        </p>
      )}
    </div>
  );
};

export default ClassifierReasoningEffortSelect;
