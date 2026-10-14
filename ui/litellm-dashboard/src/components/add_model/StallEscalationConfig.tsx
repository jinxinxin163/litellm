import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { type ComplexityRouterConfigValue, classificationFrequency } from "./ComplexityRouterConfig";

export const DEFAULT_STALL_ESCALATION_WINDOW = 6;
export const DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD = 3;

/**
 * Why the toggle is unavailable, or null when it can be turned on. Both blockers replay a held
 * routing decision instead of classifying most turns, so detection would never see the tool
 * calls it reads.
 */
export const stallEscalationBlockedReason = (value: ComplexityRouterConfigValue): string | null => {
  const frequency = classificationFrequency(value);
  if (frequency === "session")
    return '若要使用此功能，请在高级：分类方法下将“分类频率”设为每个请求。每个 session 只评分一次会复用该模型而不是重新分类，因此停滞不会到达分类器。';
  if (frequency === "user_turn")
    return '若要使用此功能，请在高级：分类方法下将“分类频率”设为每个请求。只为新用户消息评分会跳过停滞出现的 tool-call 轮次。';
  return null;
};

const clampedInt = (raw: string, min: number, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.trunc(parsed));
};

const StallEscalationConfig: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.stall_escalation_enabled ?? false;
  const blockedReason = stallEscalationBlockedReason(value);
  const window = value.stall_escalation_window ?? DEFAULT_STALL_ESCALATION_WINDOW;
  const threshold = value.stall_escalation_repeat_threshold ?? DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD;
  // A threshold above the window can never be reached, and the backend rejects the pair, so the
  // window rises with the threshold rather than letting the form save something inert.
  const commitThreshold = (raw: string) => {
    const nextThreshold = clampedInt(raw, 2, DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD);
    onChange({
      ...value,
      stall_escalation_repeat_threshold: nextThreshold,
      stall_escalation_window: Math.max(window, nextThreshold),
    });
  };
  const commitWindow = (raw: string) => {
    const nextWindow = clampedInt(raw, 1, DEFAULT_STALL_ESCALATION_WINDOW);
    onChange({
      ...value,
      stall_escalation_window: Math.max(nextWindow, threshold),
    });
  };
  const toggle = (next: boolean) => {
    const enabledValue: ComplexityRouterConfigValue = {
      ...value,
      stall_escalation_enabled: next || undefined,
      stall_escalation_window: next ? window : undefined,
      stall_escalation_repeat_threshold: next ? threshold : undefined,
    };
    onChange(enabledValue);
  };
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={enabled}
          // Blocked only prevents turning it on: an already-on router that just became
          // blocked (e.g. session pinning turned on afterward) still needs a way to turn
          // this back off, since the backend rejects saving both together.
          disabled={blockedReason !== null && !enabled}
          onCheckedChange={toggle}
          aria-label="将停滞任务升级到更强模型"
        />
        <strong className="font-semibold">将停滞任务升级到更强模型</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        当模型持续重复同一个 tool call，或同一个调用持续报错时，只要它看起来卡住了，就将请求提升一个 tier。这是升级关键词的自动版本：不需要有人发现循环并手动要求升级。关闭后，卡住的任务会继续使用其分类到的模型。
        {blockedReason !== null && ` ${blockedReason}`}
      </span>
      {enabled && blockedReason === null && (
        <div className="flex flex-wrap gap-4">
          <div style={{ maxWidth: 240 }}>
            <label className="block text-sm font-medium mb-1" htmlFor="stall-escalation-repeat-threshold">
              升级前重复次数
            </label>
            <Input
              id="stall-escalation-repeat-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => commitThreshold(event.target.value)}
            />
            <span className="block text-xs mt-1 text-muted-foreground">
              多少次相同或失败调用算作卡住。至少 2；数值越低反应越快，也越容易误触发。
            </span>
          </div>
          <div style={{ maxWidth: 240 }}>
            <label className="block text-sm font-medium mb-1" htmlFor="stall-escalation-window">
              检查的最近调用数
            </label>
            <Input
              id="stall-escalation-window"
              inputMode="numeric"
              value={window}
              onChange={(event) => commitWindow(event.target.value)}
            />
            <span className="block text-xs mt-1 text-muted-foreground">
              按 tool calls 计要向前检查多远。不能低于重复次数，否则永远无法达到阈值。
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default StallEscalationConfig;
