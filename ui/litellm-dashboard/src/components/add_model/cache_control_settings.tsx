import { CircleHelp, Minus, Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import NumericalInput from "../shared/numerical_input";

export const CACHE_CONTROL_LABEL = "Cache Control 注入点";

export const CACHE_CONTROL_TOOLTIP =
  "告诉 litellm 在哪里注入 cache control checkpoints。可以按角色指定（应用到该角色的所有消息），也可以按具体消息索引指定。";

export const CACHE_CONTROL_DESCRIPTION =
  "Anthropic、Bedrock API 等 provider 要求用户指定 cache control checkpoints 的注入位置，litellm 可以自动添加这些位置以节省成本。";

export const CACHE_CONTROL_ROLE_HINT = "LiteLLM 会将此角色的所有消息标记为可缓存";

export const CACHE_CONTROL_INDEX_HINT = "（可选）设置后，litellm 会将该索引位置的消息标记为可缓存";

export type CacheControlRole = "user" | "system" | "assistant";

export interface CacheControlInjectionPoint {
  location: "message";
  role?: CacheControlRole;
  index?: string | number;
}

export const NEW_CACHE_CONTROL_POINT: CacheControlInjectionPoint = { location: "message" };

const LOCATION_ITEMS = [{ value: "message", label: "消息" }] as const;

const ROLE_ITEMS = [
  { value: "user", label: "User" },
  { value: "system", label: "System" },
  { value: "assistant", label: "Assistant" },
] as const;

const LabelWithHint: React.FC<{ label: string; hint: string }> = ({ label, hint }) => (
  <div className="flex items-center">
    <Label>{label}</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`${label} 帮助`}
              className="ml-1 inline-flex cursor-help items-center rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          }
        >
          <CircleHelp aria-hidden className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

interface CacheControlInjectionPointsProps {
  value?: CacheControlInjectionPoint[];
  onChange?: (points: CacheControlInjectionPoint[]) => void;
}

/**
 * Editor for `cache_control_injection_points`. It holds no form state of its own so that an antd
 * `Form.Item` and a react-hook-form `FormField` can each host it while their pages migrate
 * independently; both hand a child exactly `value` and `onChange`.
 */
const CacheControlInjectionPoints: React.FC<CacheControlInjectionPointsProps> = ({ value, onChange }) => {
  const points = value ?? [];

  const replaceAt = (index: number, point: CacheControlInjectionPoint) =>
    onChange?.(points.map((existing, position) => (position === index ? point : existing)));

  return (
    <div className="ml-6 border-l-2 border-border pl-4">
      <p className="mb-4 block text-sm text-muted-foreground">{CACHE_CONTROL_DESCRIPTION}</p>

      {points.map((point, index) => (
        <div key={index} className="mb-4 flex items-end gap-4">
          <div className="w-[180px] space-y-1">
            <Label>类型</Label>
            <Select items={LOCATION_ITEMS} value={point.location} disabled>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px] space-y-1">
            <LabelWithHint label="Role" hint={CACHE_CONTROL_ROLE_HINT} />
            <Select
              items={ROLE_ITEMS}
              value={point.role ?? null}
              onValueChange={(selected) =>
                replaceAt(index, { ...point, role: (selected as CacheControlRole | null) ?? undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>无</SelectItem>
                {ROLE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px] space-y-1">
            <LabelWithHint label="Index" hint={CACHE_CONTROL_INDEX_HINT} />
            <NumericalInput
              type="number"
              placeholder="可选"
              step={1}
              value={point.index ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                replaceAt(index, {
                  ...point,
                  index: event.target.value === "" ? undefined : event.target.value,
                })
              }
            />
          </div>

          {points.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`删除注入点 ${index + 1}`}
              className="text-destructive"
              onClick={() => onChange?.(points.filter((_, position) => position !== index))}
            >
              <Minus className="size-4" />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => onChange?.([...points, NEW_CACHE_CONTROL_POINT])}
      >
        <Plus className="mr-2 size-4" />
        添加注入点
      </Button>
    </div>
  );
};

export default CacheControlInjectionPoints;
