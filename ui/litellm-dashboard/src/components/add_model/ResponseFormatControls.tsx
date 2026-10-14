import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const ResponseFormatControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => (
  <>
    <div className="flex items-center gap-2 mb-2">
      <Switch
        checked={value.return_raw_model_name ?? false}
        onCheckedChange={(returnRawModelName) => onChange({ ...value, return_raw_model_name: returnRawModelName })}
        aria-label="返回原始模型名"
      />
      <strong className="font-semibold">返回原始模型名</strong>
    </div>
    <span className="block text-xs text-muted-foreground">
      在响应中返回解析后的底层模型名，而不是 autorouter 别名。
    </span>
  </>
);

export default ResponseFormatControls;
