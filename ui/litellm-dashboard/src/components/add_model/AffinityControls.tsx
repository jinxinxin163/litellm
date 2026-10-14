import React from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { DEFAULT_DEPLOYMENT_AFFINITY, DEFAULT_SESSION_AFFINITY_TTL_SECONDS } from "./ComplexityRouterConfig";

export const AffinityControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const [ttlDraft, setTtlDraft] = React.useState<string | null>(null);
  const commitTtl = (raw: string) => {
    setTtlDraft(null);
    if (raw.trim() === "") {
      onChange({ ...value, session_affinity_ttl_seconds: undefined });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange({ ...value, session_affinity_ttl_seconds: Math.max(1, Math.round(parsed)) });
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.deployment_affinity ?? DEFAULT_DEPLOYMENT_AFFINITY}
          onCheckedChange={(deploymentAffinity) => onChange({ ...value, deployment_affinity: deploymentAffinity })}
          aria-label="将 session pin 到每个 model group 的一个 deployment"
        />
        <strong className="font-semibold">将 session pin 到每个 model group 的一个 deployment</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        让同一个 session 保持在 group 内的同一个 deployment 上，以便 provider prompt cache 保持命中。关闭后每轮都会重新做 load balance。
      </span>
      <div style={{ maxWidth: 320 }}>
        <label className="block text-sm font-medium mb-1" htmlFor="session-affinity-ttl">
          pin 空闲保留时长（秒）
        </label>
        <Input
          id="session-affinity-ttl"
          inputMode="numeric"
          value={ttlDraft ?? value.session_affinity_ttl_seconds ?? ""}
          placeholder={String(DEFAULT_SESSION_AFFINITY_TTL_SECONDS)}
          onChange={(event) => setTtlDraft(event.target.value)}
          onBlur={(event) => commitTtl(event.target.value)}
        />
        <span className="block text-xs mt-1 text-muted-foreground">
          每次复用 pin 的请求后刷新。留空时使用后端默认值 {DEFAULT_SESSION_AFFINITY_TTL_SECONDS} 秒。
        </span>
      </div>
    </>
  );
};
