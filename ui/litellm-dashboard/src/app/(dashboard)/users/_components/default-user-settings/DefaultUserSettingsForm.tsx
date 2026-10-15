"use client";
import { useTranslation } from "@/i18n/useTranslation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useFieldArray, type Control } from "react-hook-form";

import { useInfiniteTeams } from "@/app/(dashboard)/hooks/teams/useTeams";
import { ModelSelect, MODEL_SENTINEL_OPTIONS } from "@/components/ModelSelect/ModelSelect";
import { toast } from "@/lib/toast";
import { PaginatedSearchSelect } from "@/components/shared/PaginatedSearchSelect";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import type { SearchSelectOption } from "@/components/shared/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useZodForm } from "@/lib/forms/useZodForm";
import { fetchClient } from "@/lib/http/api";

import { buildBody, settingsToForm, type DefaultInternalUserParams, type InternalUserSettings } from "./mapper";
import { buildDefaultUserSettingsSchema, EMPTY_TEAM_ROW, type DefaultUserSettingsFormValues } from "./schema";

const NO_RESET = "never";

const getBudgetDurationOptions = (t: (key: string) => string) =>
  [
    { value: NO_RESET, label: t("people.noReset") },
    { value: "1h", label: t("people.hourly") },
    { value: "24h", label: t("people.daily") },
    { value: "7d", label: t("people.weekly") },
    { value: "30d", label: t("people.monthly") },
  ] as const;

const getTeamRoleOptions = (t: (key: string) => string) =>
  [
    { value: "user", label: t("people.user") },
    { value: "admin", label: t("people.admin") },
  ] as const;

const MODEL_SENTINEL_LABELS: ReadonlyMap<string, string> = new Map(
  MODEL_SENTINEL_OPTIONS.map(({ value, label }) => [value, label]),
);

const TEAMS_PAGE_SIZE = 50;

const SETTINGS_QUERY_KEY = ["internalUserSettings"] as const;

const defaultFetchSettings = async (): Promise<InternalUserSettings> => {
  const { data } = await fetchClient.GET("/get/internal_user_settings");
  if (data === undefined) {
    throw new Error("Failed to load default user settings");
  }
  return data;
};

const defaultUpdateSettings = async (body: DefaultInternalUserParams): Promise<void> => {
  await fetchClient.PATCH("/update/internal_user_settings", { body });
};

interface RoleOption {
  value: string;
  label: string;
  description: string;
}

type SettingsControl = Control<DefaultUserSettingsFormValues, unknown, DefaultUserSettingsFormValues>;

const TeamPickerField = ({ control, index }: { control: SettingsControl; index: number }) => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteTeams(
    TEAMS_PAGE_SIZE,
    search === "" ? undefined : search,
  );

  const options = React.useMemo<SearchSelectOption[]>(
    () =>
      (data?.pages ?? []).flatMap((page) =>
        page.teams.map((team) => ({
          label: team.team_alias || team.team_id,
          value: team.team_id,
          sublabel: team.team_id,
        })),
      ),
    [data],
  );

  return (
    <FormField control={control} name={`teams.${index}.team_id`} label={t("people.team")}>
      {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
        <PaginatedSearchSelect
          options={options}
          value={value}
          onValueChange={onChange}
          onSearchChange={setSearch}
          onLoadMore={() => void fetchNextPage()}
          hasNextPage={hasNextPage}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          placeholder={t("people.searchATeam")}
          emptyText={t("people.noTeamsFound")}
          inputId={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      )}
    </FormField>
  );
};

const TeamsField = ({ control }: { control: SettingsControl }) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: "teams" });

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <p className="text-sm font-medium">{t("people.defaultTeams")}</p>
        <p className="text-sm text-muted-foreground">{t("people.newUsersAreAddedToTheseTeamsOnlyTeams")}</p>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("people.team")}
              {index + 1}
            </p>
            <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
              {t("people.remove")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TeamPickerField control={control} index={index} />

            <FormField
              control={control}
              name={`teams.${index}.max_budget_in_team`}
              label={t("people.maxBudgetInTeamUsd")}
            >
              {({ ref, ...budgetField }) => (
                <Input {...budgetField} ref={ref} type="number" step="any" min={0} placeholder={t("people.optional")} />
              )}
            </FormField>

            <FormField control={control} name={`teams.${index}.user_role`} label={t("people.teamRole")}>
              {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                <Select
                  items={getTeamRoleOptions(t)}
                  value={value}
                  onValueChange={(selected) => onChange(selected ?? "user")}
                >
                  <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={ariaInvalid}
                    aria-describedby={ariaDescribedBy}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getTeamRoleOptions(t).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => append(EMPTY_TEAM_ROW)}>
        {t("people.addTeam")}
      </Button>
    </div>
  );
};

const ViewRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium">{label}</p>
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

interface SettingsViewProps {
  values: DefaultUserSettingsFormValues;
  roleOptions: readonly RoleOption[];
}

const SettingsView = ({ values, roleOptions }: SettingsViewProps) => {
  const { t } = useTranslation();
  const roleLabel = roleOptions.find((option) => option.value === values.user_role)?.label ?? values.user_role;
  const durationValue = values.budget_duration === "" ? NO_RESET : values.budget_duration;
  const durationLabel =
    getBudgetDurationOptions(t).find((option) => option.value === durationValue)?.label ?? values.budget_duration;

  return (
    <div className="flex flex-col gap-4">
      <ViewRow label={t("people.defaultRole")}>{roleLabel === "" ? t("people.notSet") : roleLabel}</ViewRow>
      <ViewRow label={t("people.maxBudgetUsd")}>
        {values.max_budget === "" ? t("people.notSet") : values.max_budget}
      </ViewRow>
      <ViewRow label={t("people.resetBudget")}>{durationLabel}</ViewRow>
      <ViewRow label={t("people.defaultModels")}>
        {values.models.length === 0
          ? t("people.notSet")
          : values.models.map((model) => MODEL_SENTINEL_LABELS.get(model) ?? model).join(", ")}
      </ViewRow>
      <div>
        <p className="text-sm font-medium">{t("people.defaultTeams")}</p>
        {values.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("people.none")}</p>
        ) : (
          values.teams.map((team) => (
            <p key={team.team_id} className="text-sm text-muted-foreground">
              {team.team_id}
              {team.max_budget_in_team !== "" && (
                <>
                  {" "}
                  · ${team.max_budget_in_team} {t("people.maxBudget2")}
                </>
              )}
              <> · {team.user_role}</>
            </p>
          ))
        )}
      </div>
    </div>
  );
};

interface SettingsFormProps {
  initialValues: DefaultUserSettingsFormValues;
  roleOptions: readonly RoleOption[];
  updateSettings: (body: DefaultInternalUserParams) => Promise<void>;
  onCancel: () => void;
  onSaved: () => void;
}

const SettingsForm = ({ initialValues, roleOptions, updateSettings, onCancel, onSaved }: SettingsFormProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const form = useZodForm(
    React.useMemo(() => buildDefaultUserSettingsSchema(t), [t]),
    { defaultValues: initialValues },
  );
  const { isDirty } = form.formState;

  const mutation = useMutation({
    mutationFn: (values: DefaultUserSettingsFormValues) => updateSettings(buildBody(values)),
    onSuccess: (_result, values) => {
      toast.success(t("people.defaultUserSettingsUpdatedSuccessfully"));
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      form.reset(values);
      onSaved();
    },
    onError: (error: unknown) =>
      toast.fromError(error instanceof Error ? error.message : "Failed to update default user settings"),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormField
          control={form.control}
          name="user_role"
          label={t("people.defaultRole")}
          description={t("people.roleAssignedToNewUsers")}
        >
          {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
            <Select
              items={roleOptions}
              value={value === "" ? null : value}
              onValueChange={(selected) => onChange(selected ?? "")}
            >
              <SelectTrigger id={id} className="w-full" aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
                <SelectValue placeholder={t("people.notSet")} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span>{option.label}</span>
                    {option.description !== "" && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField
          control={form.control}
          name="max_budget"
          label={t("people.maxBudgetUsd")}
          description={t("people.defaultMaximumBudgetForNewUsers")}
        >
          {({ ref, ...field }) => <Input {...field} ref={ref} type="number" step="any" min={0} />}
        </FormField>

        <FormField
          control={form.control}
          name="budget_duration"
          label={t("people.resetBudget")}
          description={t("people.howOftenTheDefaultBudgetResets")}
        >
          {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
            <Select
              items={getBudgetDurationOptions(t)}
              value={value === "" ? NO_RESET : value}
              onValueChange={(selected) => onChange(selected === null || selected === NO_RESET ? "" : selected)}
            >
              <SelectTrigger id={id} className="w-full" aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getBudgetDurationOptions(t).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField
          control={form.control}
          name="models"
          label={t("people.defaultModels")}
          description={t("people.modelsNewUsersCanAccess")}
        >
          {(field) => (
            <ModelSelect
              value={field.value}
              onChange={field.onChange}
              context="global"
              options={{ includeSpecialOptions: true }}
            />
          )}
        </FormField>

        <TeamsField control={form.control} />
      </FieldGroup>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset(initialValues);
            onCancel();
          }}
          disabled={mutation.isPending}
        >
          {t("people.cancel")}
        </Button>
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? t("people.saving") : t("people.saveChanges")}
        </Button>
      </div>
    </form>
  );
};

const SettingsCard = ({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle>Default User Settings</CardTitle>
      <CardDescription>
        Applied to every new internal user created through SSO or the user management APIs.
      </CardDescription>
      {action !== undefined && <CardAction>{action}</CardAction>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export interface DefaultUserSettingsFormProps {
  possibleUIRoles?: Record<string, Record<string, string>> | null;
  fetchSettings?: () => Promise<InternalUserSettings>;
  updateSettings?: (body: DefaultInternalUserParams) => Promise<void>;
}

export const DefaultUserSettingsForm = ({
  possibleUIRoles,
  fetchSettings = defaultFetchSettings,
  updateSettings = defaultUpdateSettings,
}: DefaultUserSettingsFormProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = React.useState(false);
  const { data, isPending, isError } = useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: fetchSettings });

  const roleOptions = React.useMemo<RoleOption[]>(
    () =>
      Object.entries(possibleUIRoles ?? {})
        .filter(([role]) => role.includes("internal_user"))
        .map(([role, meta]) => ({ value: role, label: meta.ui_label || role, description: meta.description ?? "" })),
    [possibleUIRoles],
  );

  const initialValues = React.useMemo(() => (data === undefined ? undefined : settingsToForm(data.values)), [data]);

  if (isPending) {
    return (
      <SettingsCard>
        <Skeleton className="h-64 w-full" />
      </SettingsCard>
    );
  }

  if (isError || initialValues === undefined) {
    return (
      <SettingsCard>
        <p role="alert">{t("people.couldNotLoadTheDefaultUserSettings")}</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      action={
        isEditing ? undefined : (
          <Button type="button" onClick={() => setIsEditing(true)}>
            {t("people.editSettings")}
          </Button>
        )
      }
    >
      {isEditing ? (
        <SettingsForm
          initialValues={initialValues}
          roleOptions={roleOptions}
          updateSettings={updateSettings}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      ) : (
        <SettingsView values={initialValues} roleOptions={roleOptions} />
      )}
    </SettingsCard>
  );
};
