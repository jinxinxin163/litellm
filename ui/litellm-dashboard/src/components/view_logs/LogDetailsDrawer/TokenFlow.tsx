import { useTranslation } from "@/i18n/useTranslation";
interface TokenFlowProps {
  prompt?: number;
  completion?: number;
  total?: number;
}

/**
 * Displays token usage in LiteLLM format: "12 (9 prompt tokens + 3 completion tokens)"
 * Shows total with breakdown of prompt and completion tokens.
 */
export function TokenFlow({ prompt = 0, completion = 0, total = 0 }: TokenFlowProps) {
  const { t } = useTranslation();
  return (
    <span>
      {total.toLocaleString()} ({prompt.toLocaleString()} {t("logs.promptTokens")} {completion.toLocaleString()} {t("logs.completionTokens")}
    </span>
  );
}
