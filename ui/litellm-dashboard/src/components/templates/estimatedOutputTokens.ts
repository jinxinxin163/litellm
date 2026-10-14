type Metadata = Record<string, unknown> | null | undefined;

type FormValues = Record<string, unknown>;

const ESTIMATE_FIELD = "default_estimated_output_tokens";
const PER_MODEL_FIELD = "default_estimated_output_tokens_per_model";

const INVALID_PER_MODEL_MESSAGE = '请输入正整数 JSON 对象，例如 {"gpt-4": 4096}';

const perModelEstimateToText = (value: unknown): string =>
  value != null && typeof value === "object" ? JSON.stringify(value) : "";

const isPositiveInteger = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const parsePerModelEstimates = (value: string): Record<string, number> | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(([, v]) => isPositiveInteger(v))) return null;
  return Object.fromEntries(entries) as Record<string, number>;
};

export const estimateFields = (metadata: Metadata) => ({
  [ESTIMATE_FIELD]: metadata?.[ESTIMATE_FIELD],
  [PER_MODEL_FIELD]: perModelEstimateToText(metadata?.[PER_MODEL_FIELD]),
});

const ADMIN_ONLY_TOOLTIP =
  "只有 proxy admin 可以修改此项。它设置当请求省略 max_tokens 时，rate limiter 为该请求预留多少输出 tokens，并计入团队和组织的 TPM 窗口。";

export const estimateTooltips = (canEdit: boolean, entity: "key" | "team" = "key") => ({
  estimate: canEdit
    ? `当请求省略 max_tokens 时，为 TPM 限制预留的预期输出 tokens。会覆盖此 ${entity === "key" ? "密钥" : "团队"} 的内置预估值。`
    : ADMIN_ONLY_TOOLTIP,
  perModel: canEdit
    ? `当请求省略 max_tokens 时，按模型预留的预期输出 tokens。优先级高于此 ${entity === "key" ? "密钥" : "团队"} 的全局预估值。`
    : ADMIN_ONLY_TOOLTIP,
});

export const estimateChecks = {
  perModel: {
    isValid: (value: unknown): boolean =>
      typeof value !== "string" || value.trim() === "" ? true : parsePerModelEstimates(value) !== null,
    message: INVALID_PER_MODEL_MESSAGE,
  },
  positive: {
    isValid: (value: unknown): boolean =>
      value === "" || value === null || value === undefined ? true : isPositiveInteger(Number(value)),
    message: "请输入正整数",
  },
};

const asValidatorRule = ({ isValid, message }: { isValid: (value: unknown) => boolean; message: string }) => ({
  validator: (_: unknown, value: unknown) => (isValid(value) ? Promise.resolve() : Promise.reject(new Error(message))),
});

export const estimateRules = {
  perModel: asValidatorRule(estimateChecks.perModel),
  positive: asValidatorRule(estimateChecks.positive),
};

export const withNormalizedEstimates = <T extends FormValues>(values: T): FormValues => {
  const { [ESTIMATE_FIELD]: estimate, [PER_MODEL_FIELD]: perModel, ...rest } = values;

  const normalizedEstimate = estimate === "" || estimate === null || estimate === undefined ? null : Number(estimate);
  const normalizedPerModel = typeof perModel === "string" ? parsePerModelEstimates(perModel) : null;

  return {
    ...rest,
    ...(normalizedEstimate === null ? {} : { [ESTIMATE_FIELD]: normalizedEstimate }),
    ...(normalizedPerModel === null ? {} : { [PER_MODEL_FIELD]: normalizedPerModel }),
  };
};
