import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import React from "react";

export const DEFAULT_ESCALATION_KEYWORDS = ["LITELLM ESCALATE"];

interface EscalationKeywordsProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

const EscalationKeywords: React.FC<EscalationKeywordsProps> = ({ keywords, onChange }) => {
  return (
    <div className="w-full max-w-none">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="m-0 text-xl font-semibold text-foreground">升级关键词</h4>
        <SimpleTooltip content="用户可在消息中包含的区分大小写短语；当结果不满意时，可强制提升到下一个更高复杂度 tier。它们可以强制使用更强模型，但不能指定具体模型。">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <span className="mb-2 block text-xs text-muted-foreground">
        可选：当用户消息包含这些短语之一时，请求会比原本路由结果提升一个 tier。匹配区分大小写，因此 &quot;LITELLM ESCALATE&quot;
        只会在完全一致的大写形式下触发。留空则禁用。
      </span>
      <MultiSelect
        options={keywords.map((keyword) => ({ label: keyword, value: keyword }))}
        value={keywords}
        onValueChange={onChange}
        placeholder="e.g., LITELLM ESCALATE"
        emptyText="输入以添加短语"
        allowCustomValues
        className="w-full"
      />
    </div>
  );
};

export default EscalationKeywords;
