import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { ModelGroup } from "@/components/llm_calls/fetch_models";

const DEFAULT_MATCH_THRESHOLD = 0.5;

interface SemanticKeywordMatchingProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  embeddingModel: string | undefined;
  onEmbeddingModelChange: (model: string) => void;
  matchThreshold: number;
  onMatchThresholdChange: (threshold: number) => void;
  modelInfo: ModelGroup[];
  showValidationErrors?: boolean;
}

const SemanticKeywordMatching: React.FC<SemanticKeywordMatchingProps> = ({
  enabled,
  onEnabledChange,
  embeddingModel,
  onEmbeddingModelChange,
  matchThreshold,
  onMatchThresholdChange,
  modelInfo,
  showValidationErrors = false,
}) => {
  const embeddingModels = modelInfo.filter((model) => model.mode === "embedding");
  const modelOptions = Array.from(new Set(embeddingModels.map((model) => model.model_group))).map((model_group) => ({
    value: model_group,
    label: model_group,
  }));
  const embeddingModelMissing = showValidationErrors && !embeddingModel;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Semantic 关键词匹配</span>
            <SimpleTooltip content="通过比较 embeddings 而不是纯文本，识别精确关键词之外的相关表达。会覆盖直接关键词匹配。">
              <Info className="size-4 text-muted-foreground" />
            </SimpleTooltip>
          </div>
          <span className="text-muted-foreground text-sm">
            使用上方相同的关键词-tier 对，并覆盖直接关键词匹配。会增加 embedding 模型网络请求带来的延迟。
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label="Semantic 关键词匹配" />
      </div>

      {enabled && (
        <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t border-border">
          <div>
            <span className="mb-1 block text-sm font-medium">Embedding 模型</span>
            <SearchSelect
              options={modelOptions}
              value={embeddingModel ?? ""}
              onValueChange={onEmbeddingModelChange}
              placeholder="选择 embedding 模型"
              emptyText="未找到 embedding 模型"
              aria-label="Embedding 模型"
              allowClear={false}
              className={embeddingModelMissing ? "border-destructive" : undefined}
            />
            {embeddingModelMissing && <span className="text-xs text-destructive">Embedding 模型必填</span>}
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">最低匹配分数</span>
            <Input
              type="number"
              value={matchThreshold}
              onChange={(event) =>
                onMatchThresholdChange(event.target.value === "" ? DEFAULT_MATCH_THRESHOLD : event.target.valueAsNumber)
              }
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              仅匹配达到或高于此相似度分数的内容。
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticKeywordMatching;
export { DEFAULT_MATCH_THRESHOLD };
