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
  { value: "default", label: "完全访问", hint: "可调用所有 routes（AI APIs、管理和只读）" },
  { value: "llm_api", label: "AI APIs", hint: "仅可调用 AI API routes（chat/completions、embeddings 等）" },
  { value: "management", label: "管理", hint: "仅可调用管理 routes（用户/团队/密钥管理）" },
];

export const KeyTypeSelect = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <Select
    items={Object.fromEntries(KEY_TYPE_OPTIONS.map((option) => [option.value, option.label]))}
    value={value}
    onValueChange={(next: string | null) => next != null && onChange(next)}
  >
    <SelectTrigger id={id} className="w-full">
      <SelectValue placeholder="选择密钥类型" />
    </SelectTrigger>
    <SelectContent>
      {KEY_TYPE_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          <div className="py-1">
            <div className="font-medium">{option.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</div>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
