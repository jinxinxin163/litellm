import React from "react";

import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

export const ModalityRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const modalityRouting = value.modality_routing ?? false;
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={modalityRouting}
          onCheckedChange={(nextModalityRouting) => onChange({ ...value, modality_routing: nextModalityRouting })}
          aria-label="将图片请求路由到支持视觉的模型"
        />
        <strong className="font-semibold">将图片请求路由到支持视觉的模型</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        当路由到的模型不能接收图片输入时，改用最近的更高 tier 中支持视觉的模型，再回退到默认模型，避免 provider 400。只有明确声明
        supports_vision false 的模型会被替换；除非开启下面的覆盖项，否则已有 session pin 仍优先。
      </span>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.modality_pin_override ?? false}
          onCheckedChange={(modalityPinOverride) => onChange({ ...value, modality_pin_override: modalityPinOverride })}
          disabled={!modalityRouting}
          aria-label="为图片请求覆盖 session pin"
        />
        <strong className="font-semibold">为图片请求覆盖 session pin</strong>
      </div>
      <span className="block text-xs text-muted-foreground">
        即使 session 被 pin 到不支持图片的模型，也会把图片轮次路由到可用模型。pin 会保留，所以下一个文本轮次会回到原模型。需要先开启图片路由。
      </span>
    </>
  );
};
