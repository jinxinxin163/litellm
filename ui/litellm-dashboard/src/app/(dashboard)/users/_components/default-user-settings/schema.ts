import { translate } from "@/i18n/useTranslation";
import { z } from "zod/v4";

const isBlank = (value: string): boolean => value.trim() === "";

export const buildDefaultUserSettingsSchema = (t: (key: string) => string = translate) => {
  const amountOrEmpty = z
    .string()
    .refine(
      (value) => isBlank(value) || (Number.isFinite(Number(value)) && Number(value) >= 0),
      t("people.nonNegativeNumber"),
    );

  const defaultTeamRowSchema = z.object({
    team_id: z.string().min(1, t("people.teamRequired")),
    max_budget_in_team: amountOrEmpty,
    user_role: z.enum(["user", "admin"]),
  });

  const defaultUserSettingsShape = {
    user_role: z.string(),
    max_budget: amountOrEmpty,
    budget_duration: z.string(),
    models: z.array(z.string()),
    teams: z.array(defaultTeamRowSchema),
  };

  return z.object(defaultUserSettingsShape).superRefine((values, ctx) => {
    const repeatedRows = values.teams.flatMap((team, index) =>
      team.team_id !== "" && values.teams.findIndex((other) => other.team_id === team.team_id) < index ? [index] : [],
    );

    repeatedRows.forEach((index) =>
      ctx.addIssue({
        code: "custom",
        message: t("people.teamAlreadyListed"),
        path: ["teams", index, "team_id"],
      }),
    );
  });
};

export const defaultUserSettingsSchema = buildDefaultUserSettingsSchema();
export type DefaultTeamRowValues = z.output<typeof defaultUserSettingsSchema>["teams"][number];
export const EMPTY_TEAM_ROW: DefaultTeamRowValues = { team_id: "", max_budget_in_team: "", user_role: "user" };

export type DefaultUserSettingsFormValues = z.output<typeof defaultUserSettingsSchema>;
