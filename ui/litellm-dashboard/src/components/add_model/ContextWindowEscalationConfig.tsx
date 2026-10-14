import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const ContextWindowEscalationConfig: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.enable_context_window_escalation ?? true;
  // A number input renders Number("0.") as "0", so a decimal cannot be typed without a local draft.
  const [bufferDraft, setBufferDraft] = React.useState<string | null>(null);
  const commitBuffer = (raw: string) => {
    setBufferDraft(null);
    if (raw.trim() === "") {
      onChange({ ...value, context_window_escalation_buffer: undefined });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange({ ...value, context_window_escalation_buffer: Math.min(1, Math.max(0.01, parsed)) });
  };
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={enabled}
          onCheckedChange={(next) => onChange({ ...value, enable_context_window_escalation: next })}
          aria-label="将超大 prompts 升级到可容纳的 tier"
        />
        <strong className="font-semibold">将超大 prompts 升级到可容纳的 tier</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        当 prompt 明确无法放入已决策 tier 的上下文窗口时，将它路由到能够容纳它的最低 tier，而不是让 provider 拒绝。关闭后，请求只按复杂度分发。
      </span>
      {enabled && (
        <div style={{ maxWidth: 320 }}>
          <label className="block text-sm font-medium mb-1" htmlFor="context-window-escalation-buffer">
            窗口适配缓冲
          </label>
          <Input
            id="context-window-escalation-buffer"
            inputMode="decimal"
            value={bufferDraft ?? value.context_window_escalation_buffer ?? ""}
            placeholder="0.95"
            onChange={(event) => setBufferDraft(event.target.value)}
            onBlur={(event) => commitBuffer(event.target.value)}
          />
          <span className="block text-xs mt-1 text-muted-foreground">
            计数后的 prompt 必须适配的模型窗口比例，范围为大于 0 且不超过 1。留空时使用后端默认值 0.95。
          </span>
        </div>
      )}
    </>
  );
};

export default ContextWindowEscalationConfig;
