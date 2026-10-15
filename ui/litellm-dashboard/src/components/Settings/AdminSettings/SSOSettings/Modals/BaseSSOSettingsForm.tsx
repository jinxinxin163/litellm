"use client";
import { translate, useTranslation } from "@/i18n/useTranslation";

import React from "react";
import { FormProvider, useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod/v4";
import { ssoProviderLogoMap, ssoProviderDisplayNames } from "../constants";
import { Logo } from "@/components/molecules/logo/Logo";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/lib/forms/useZodForm";

export interface SSOSettingsFormValues {
  sso_provider?: string;
  google_client_id?: string;
  google_client_secret?: string;
  microsoft_client_id?: string;
  microsoft_client_secret?: string;
  microsoft_tenant?: string;
  generic_client_id?: string;
  generic_client_secret?: string;
  generic_authorization_endpoint?: string;
  generic_token_endpoint?: string;
  generic_userinfo_endpoint?: string;
  generic_scope?: string;
  saml_idp_metadata_url?: string;
  saml_idp_metadata_xml?: string;
  saml_sp_entity_id?: string;
  saml_allow_unsolicited?: boolean;
  user_email?: string;
  proxy_base_url?: string;
  use_role_mappings?: boolean;
  group_claim?: string;
  default_role?: string;
  proxy_admin_teams?: string;
  admin_viewer_teams?: string;
  internal_user_teams?: string;
  internal_viewer_teams?: string;
  use_team_mappings?: boolean;
  team_ids_jwt_field?: string;
}

export interface BaseSSOSettingsFormProps {
  form: UseFormReturn<SSOSettingsFormValues>;
  onFormSubmit: (formValues: SSOSettingsFormValues) => Promise<void>;
}

export interface SSOProviderConfig {
  envVarMap: Record<string, string>;
  fields: Array<{
    label: string;
    name: keyof SSOSettingsFormValues;
    placeholder?: string;
    required?: boolean;
    type?: "password" | "textarea" | "checkbox";
  }>;
}

export const ssoProviderConfigs: Record<string, SSOProviderConfig> = {
  google: {
    envVarMap: {
      google_client_id: "GOOGLE_CLIENT_ID",
      google_client_secret: "GOOGLE_CLIENT_SECRET",
    },
    fields: [
      { label: "Google Client ID", name: "google_client_id" },
      { label: "Google Client Secret", name: "google_client_secret" },
    ],
  },
  microsoft: {
    envVarMap: {
      microsoft_client_id: "MICROSOFT_CLIENT_ID",
      microsoft_client_secret: "MICROSOFT_CLIENT_SECRET",
      microsoft_tenant: "MICROSOFT_TENANT",
    },
    fields: [
      { label: "Microsoft Client ID", name: "microsoft_client_id" },
      { label: "Microsoft Client Secret", name: "microsoft_client_secret" },
      { label: "Microsoft Tenant", name: "microsoft_tenant" },
    ],
  },
  okta: {
    envVarMap: {
      generic_client_id: "GENERIC_CLIENT_ID",
      generic_client_secret: "GENERIC_CLIENT_SECRET",
      generic_authorization_endpoint: "GENERIC_AUTHORIZATION_ENDPOINT",
      generic_token_endpoint: "GENERIC_TOKEN_ENDPOINT",
      generic_userinfo_endpoint: "GENERIC_USERINFO_ENDPOINT",
      generic_scope: "GENERIC_SCOPE",
    },
    fields: [
      { label: "Generic Client ID", name: "generic_client_id" },
      { label: "Generic Client Secret", name: "generic_client_secret" },
      {
        label: "Authorization Endpoint",
        name: "generic_authorization_endpoint",
        placeholder: "https://your-domain/authorize",
      },
      { label: "Token Endpoint", name: "generic_token_endpoint", placeholder: "https://your-domain/token" },
      {
        label: "Userinfo Endpoint",
        name: "generic_userinfo_endpoint",
        placeholder: "https://your-domain/userinfo",
      },
      { label: "Scopes", name: "generic_scope", placeholder: "openid email profile", required: false },
    ],
  },
  generic: {
    envVarMap: {
      generic_client_id: "GENERIC_CLIENT_ID",
      generic_client_secret: "GENERIC_CLIENT_SECRET",
      generic_authorization_endpoint: "GENERIC_AUTHORIZATION_ENDPOINT",
      generic_token_endpoint: "GENERIC_TOKEN_ENDPOINT",
      generic_userinfo_endpoint: "GENERIC_USERINFO_ENDPOINT",
      generic_scope: "GENERIC_SCOPE",
    },
    fields: [
      { label: "Generic Client ID", name: "generic_client_id" },
      { label: "Generic Client Secret", name: "generic_client_secret" },
      { label: "Authorization Endpoint", name: "generic_authorization_endpoint" },
      { label: "Token Endpoint", name: "generic_token_endpoint" },
      { label: "Userinfo Endpoint", name: "generic_userinfo_endpoint" },
      { label: "Scopes", name: "generic_scope", placeholder: "openid email profile", required: false },
    ],
  },
  saml: {
    envVarMap: {
      saml_idp_metadata_url: "SAML_IDP_METADATA_URL",
      saml_idp_metadata_xml: "SAML_IDP_METADATA_XML",
      saml_sp_entity_id: "SAML_SP_ENTITY_ID",
      saml_allow_unsolicited: "SAML_ALLOW_UNSOLICITED",
    },
    fields: [
      {
        label: "IdP Metadata URL",
        name: "saml_idp_metadata_url",
        required: false,
        placeholder: "https://idp.example.com/metadata (use this or the metadata XML below)",
      },
      {
        label: "IdP Metadata XML",
        name: "saml_idp_metadata_xml",
        required: false,
        type: "textarea",
        placeholder: "Paste the IdP metadata XML here if you do not have a metadata URL",
      },
      {
        label: "SP Entity ID",
        name: "saml_sp_entity_id",
        required: false,
        placeholder: "Defaults to <proxy base url>/sso/saml/metadata",
      },
      {
        label: "Allow IdP-initiated (unsolicited) responses",
        name: "saml_allow_unsolicited",
        required: false,
        type: "checkbox",
      },
    ],
  },
};

const ROLE_MAPPING_TEAM_FIELDS = [
  "proxy_admin_teams",
  "admin_viewer_teams",
  "internal_user_teams",
  "internal_viewer_teams",
] as const;

const supportsMappings = (provider: string | undefined): boolean => provider === "okta" || provider === "generic";

const providerFieldNames = (provider: string | undefined): readonly string[] =>
  provider ? ssoProviderConfigs[provider]?.fields.map((field) => field.name) ?? [] : [];

export type SSOFormVariant = "sso-settings" | "admin-panel";

export const mountedSSOFieldNames = (values: SSOSettingsFormValues, variant: SSOFormVariant): readonly string[] => {
  const provider = values.sso_provider;
  const showMappingToggles = supportsMappings(provider);
  const roleFieldsVisible =
    variant === "sso-settings"
      ? Boolean(values.use_role_mappings) && showMappingToggles
      : Boolean(values.use_role_mappings);
  const teamFieldsVisible = variant === "sso-settings" && Boolean(values.use_team_mappings) && showMappingToggles;

  return [
    "sso_provider",
    ...providerFieldNames(provider),
    "user_email",
    "proxy_base_url",
    ...(showMappingToggles ? ["use_role_mappings"] : []),
    ...(roleFieldsVisible ? ["group_claim", "default_role", ...ROLE_MAPPING_TEAM_FIELDS] : []),
    ...(variant === "sso-settings" && showMappingToggles ? ["use_team_mappings"] : []),
    ...(teamFieldsVisible ? ["team_ids_jwt_field"] : []),
  ];
};

export const pickMountedSSOValues = (values: SSOSettingsFormValues, variant: SSOFormVariant): SSOSettingsFormValues =>
  Object.fromEntries(
    mountedSSOFieldNames(values, variant).map((name) => [name, values[name as keyof SSOSettingsFormValues]]),
  );

export const submitMountedSSOValues =
  (
    form: UseFormReturn<SSOSettingsFormValues>,
    variant: SSOFormVariant,
    onFormSubmit: (formValues: SSOSettingsFormValues) => Promise<void> | void,
  ) =>
  () =>
    void form.handleSubmit((values) => onFormSubmit(pickMountedSSOValues(values, variant)))();

const requiredMessages = (t: (key: string) => string): Record<string, string> => ({
  sso_provider: t("admin.selectProvider"),
  user_email: t("admin.adminEmailRequired"),
  proxy_base_url: t("admin.baseUrlRequired"),
  group_claim: t("admin.groupClaimRequired"),
  team_ids_jwt_field: t("admin.jwtFieldRequired"),
});

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "";

export const buildSSOSettingsSchema = (variant: SSOFormVariant, t: typeof translate = translate) =>
  z.custom<SSOSettingsFormValues>().superRefine((values, ctx) => {
    const mounted = new Set(mountedSSOFieldNames(values, variant));

    const requireField = (name: string) => {
      if (mounted.has(name) && isBlank(values[name as keyof SSOSettingsFormValues])) {
        ctx.addIssue({ code: "custom", path: [name], message: requiredMessages(t)[name] });
      }
    };

    requireField("sso_provider");
    requireField("user_email");
    requireField("group_claim");
    requireField("team_ids_jwt_field");

    const providerConfig = values.sso_provider ? ssoProviderConfigs[values.sso_provider] : undefined;
    providerConfig?.fields.forEach((field) => {
      if (field.required === false) return;
      if (!isBlank(values[field.name])) return;
      ctx.addIssue({
        code: "custom",
        path: [field.name],
        message: t("admin.fieldRequired", {
          field: t(`admin.ssoFieldLabels.${field.name}`, { defaultValue: field.label }).toLowerCase(),
        }),
      });
    });

    const proxyBaseUrl = values.proxy_base_url;
    if (isBlank(proxyBaseUrl)) {
      ctx.addIssue({ code: "custom", path: ["proxy_base_url"], message: requiredMessages(t).proxy_base_url });
      return;
    }
    if (!/^https?:\/\/.+/.test(proxyBaseUrl as string)) {
      ctx.addIssue({
        code: "custom",
        path: ["proxy_base_url"],
        message: t("admin.urlProtocol"),
      });
      return;
    }
    if ((proxyBaseUrl as string).endsWith("/")) {
      ctx.addIssue({
        code: "custom",
        path: ["proxy_base_url"],
        message: t("admin.urlTrailingSlash"),
      });
    }
  });

export const emptySSOSettingsFormValues: SSOSettingsFormValues = {
  sso_provider: "",
  google_client_id: "",
  google_client_secret: "",
  microsoft_client_id: "",
  microsoft_client_secret: "",
  microsoft_tenant: "",
  generic_client_id: "",
  generic_client_secret: "",
  generic_authorization_endpoint: "",
  generic_token_endpoint: "",
  generic_userinfo_endpoint: "",
  user_email: "",
  proxy_base_url: "",
  default_role: "internal_user",
};

export const useSSOSettingsForm = (
  variant: SSOFormVariant,
  values?: SSOSettingsFormValues,
): UseFormReturn<SSOSettingsFormValues> => {
  const { t } = useTranslation();
  return useZodForm(buildSSOSettingsSchema(variant, t), {
    mode: "onChange",
    defaultValues: emptySSOSettingsFormValues,
    ...(values ? { values } : {}),
  });
};

const SSOProviderField = ({ field }: { field: SSOProviderConfig["fields"][number] }) => {
  const { t } = useTranslation();
  const label = t(`admin.ssoFieldLabels.${field.name}`, { defaultValue: field.label });
  const { control } = useFormContext<SSOSettingsFormValues>();

  if (field.type === "checkbox") {
    return (
      <FormField control={control} name={field.name} label={label} orientation="horizontal">
        {({ value, onChange, onBlur, id, ...rest }) => (
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            onBlur={onBlur}
            aria-invalid={rest["aria-invalid"]}
            aria-describedby={rest["aria-describedby"]}
          />
        )}
      </FormField>
    );
  }

  return (
    <FormField control={control} name={field.name} label={label}>
      {({ ref, value, ...rest }) => {
        const shared = { placeholder: field.placeholder, value: (value as string) ?? "", ...rest };
        if (field.type === "textarea") return <Textarea ref={ref} rows={4} {...shared} />;
        if (field.type === "password" || field.name.includes("client")) return <PasswordInput ref={ref} {...shared} />;
        return <Input ref={ref} {...shared} />;
      }}
    </FormField>
  );
};

export const renderProviderFields = (provider: string) => {
  const config = ssoProviderConfigs[provider];
  if (!config) return null;

  return config.fields.map((field) => <SSOProviderField key={field.name} field={field} />);
};

export const SSOProviderSelectField = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name="sso_provider" label={t("admin.ssoProvider")}>
      {({ value, onChange, onBlur, id, ...rest }) => (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            onBlur={onBlur}
            aria-invalid={rest["aria-invalid"]}
            aria-describedby={rest["aria-describedby"]}
            className="w-full"
          >
            <SelectValue>{(provider: string) => (provider ? providerOptionLabel(provider) : "")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ssoProviderLogoMap).map(([optionValue, logo]) => (
              <SelectItem key={optionValue} value={optionValue}>
                <span className="flex items-center py-1">
                  {logo && (
                    <Logo
                      src={logo}
                      label={ssoProviderDisplayNames[optionValue] || optionValue}
                      className="h-6 w-6 mr-3 object-contain"
                    />
                  )}
                  <span>{providerOptionLabel(optionValue)}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
};

export const ProxyAdminEmailField = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name="user_email" label={t("admin.proxyAdminEmail")}>
      {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
    </FormField>
  );
};

export const ProxyBaseUrlField = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name="proxy_base_url" label={t("admin.proxyBaseUrl")}>
      {({ ref, value, onChange, ...rest }) => (
        <Input
          ref={ref}
          placeholder="https://example.com"
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value.trim())}
          {...rest}
        />
      )}
    </FormField>
  );
};

export const MappingToggleField = ({
  name,
  label,
}: {
  name: "use_role_mappings" | "use_team_mappings";
  label: string;
}) => {
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name={name} label={label} orientation="horizontal">
      {({ value, onChange, onBlur, id, ...rest }) => (
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={onChange}
          onBlur={onBlur}
          aria-invalid={rest["aria-invalid"]}
          aria-describedby={rest["aria-describedby"]}
        />
      )}
    </FormField>
  );
};

export const GroupClaimField = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name="group_claim" label={t("admin.groupClaim")}>
      {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
    </FormField>
  );
};

const DEFAULT_ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "internal_user_viewer", label: "Internal Viewer" },
  { value: "internal_user", label: "Internal User" },
  { value: "proxy_admin_viewer", label: "Admin Viewer" },
  { value: "proxy_admin", label: "Proxy Admin" },
];

const providerOptionLabel = (value: string) =>
  ssoProviderDisplayNames[value] || value.charAt(0).toUpperCase() + value.slice(1) + " SSO";

export const RoleMappingTeamFields = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <>
      <FormField control={control} name="default_role" label={t("admin.defaultRole")}>
        {({ value, onChange, onBlur, id, ...rest }) => (
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger
              id={id}
              onBlur={onBlur}
              aria-invalid={rest["aria-invalid"]}
              aria-describedby={rest["aria-describedby"]}
              className="w-full"
            >
              <SelectValue>
                {(role: string) => DEFAULT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField control={control} name="proxy_admin_teams" label={t("admin.proxyAdminTeams")}>
        {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
      </FormField>

      <FormField control={control} name="admin_viewer_teams" label={t("admin.adminViewerTeams")}>
        {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
      </FormField>

      <FormField control={control} name="internal_user_teams" label={t("admin.internalUserTeams")}>
        {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
      </FormField>

      <FormField control={control} name="internal_viewer_teams" label={t("admin.internalViewerTeams")}>
        {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
      </FormField>
    </>
  );
};

export const TeamIdsJwtFieldField = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<SSOSettingsFormValues>();

  return (
    <FormField control={control} name="team_ids_jwt_field" label={t("admin.teamIdsJwtField")}>
      {({ ref, value, ...rest }) => <Input ref={ref} value={(value as string) ?? ""} {...rest} />}
    </FormField>
  );
};

const BaseSSOSettingsForm: React.FC<BaseSSOSettingsFormProps> = ({ form, onFormSubmit }) => {
  const { t } = useTranslation();
  const provider = useWatch({ control: form.control, name: "sso_provider" });
  const useRoleMappings = useWatch({ control: form.control, name: "use_role_mappings" });
  const useTeamMappings = useWatch({ control: form.control, name: "use_team_mappings" });
  const showMappingToggles = supportsMappings(provider);

  return (
    <div>
      <FormProvider {...form}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitMountedSSOValues(form, "sso-settings", onFormSubmit)();
          }}
        >
          <FieldGroup>
            <SSOProviderSelectField />
            {provider ? renderProviderFields(provider) : null}
            <ProxyAdminEmailField />
            <ProxyBaseUrlField />
            {showMappingToggles && <MappingToggleField name="use_role_mappings" label={t("admin.useRoleMappings")} />}
            {useRoleMappings && showMappingToggles && (
              <>
                <GroupClaimField />
                <RoleMappingTeamFields />
              </>
            )}
            {showMappingToggles && <MappingToggleField name="use_team_mappings" label={t("admin.useTeamMappings")} />}
            {useTeamMappings && showMappingToggles && <TeamIdsJwtFieldField />}
          </FieldGroup>
        </form>
      </FormProvider>
    </div>
  );
};

export default BaseSSOSettingsForm;
