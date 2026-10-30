"use client";

import "./login.css";
import loginBackground from "../../../public/assets/mindgate-login-background.png";
import { useTranslation } from "@/i18n/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { TFunction } from "i18next";

import { useLogin } from "@/app/(dashboard)/hooks/login/useLogin";
import { useUIConfig } from "@/app/(dashboard)/hooks/uiConfig/useUIConfig";
import { exchangeLoginCode, getProxyBaseUrl, switchToWorkerUrl } from "@/components/networking";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";
import { clearTokenCookies, getCookieFromDocument } from "@/utils/cookieUtils";
import { isJwtExpired } from "@/utils/jwtUtils";
import { consumeReturnUrl, getReturnUrl, isValidReturnUrl } from "@/utils/returnUrlUtils";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { z } from "zod/v4";
import { useWorker } from "@/hooks/useWorker";

const createLoginSchema = (t: TFunction) =>
  z.object({
    username: z.string().min(1, t("auth.usernameRequired")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });

type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

function LoginPageContent() {
  const { t } = useTranslation();
  const [isResolvingSession, setIsResolvingSession] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { data: uiConfig, isLoading: isConfigLoading } = useUIConfig();
  const isLoginReady = !isConfigLoading && !isResolvingSession && !uiConfig?.admin_ui_disabled;
  const loginMutation = useLogin();
  const router = useRouter();
  const { workers, selectWorker } = useWorker();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const workerFieldId = useId();
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const form = useZodForm(loginSchema, { defaultValues: { username: "", password: "" } });

  useEffect(() => {
    const invalidFields = (["username", "password"] as const).filter((field) => form.getFieldState(field).invalid);
    if (invalidFields.length > 0) void form.trigger(invalidFields);
  }, [form, t]);

  // Pre-select worker from URL param (e.g. /ui/login?worker=team-b)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerParam = params.get("worker");
    if (workerParam) {
      setSelectedWorkerId(workerParam);
    }
  }, []);

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    // Check if admin UI is disabled
    if (uiConfig && uiConfig.admin_ui_disabled) {
      setIsResolvingSession(false);
      return;
    }

    // Cross-origin SSO: worker redirected back with a single-use code.
    // Exchange it for the JWT via the worker's /v3/login/exchange endpoint.
    const params = new URLSearchParams(window.location.search);
    const rawSsoCode = params.get("code");
    // Validate the SSO code is a plausible OAuth authorization code (alphanumeric
    // plus common URL-safe chars) so that arbitrary user input cannot trigger the
    // exchange endpoint.
    const ssoCode = rawSsoCode && /^[a-zA-Z0-9._~+/=-]+$/.test(rawSsoCode) ? rawSsoCode : null;
    if (ssoCode) {
      const rawWorkerUrl = localStorage.getItem("litellm_worker_url");
      // Validate the stored worker URL: only allow http(s) URLs.
      const workerUrl = rawWorkerUrl && /^https?:\/\/.+/.test(rawWorkerUrl) ? rawWorkerUrl : null;
      exchangeLoginCode(ssoCode, workerUrl).then(() => {
        params.delete("code");
        const cleanSearch = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ""));
        router.replace("/ui/?login=success");
      });
      return;
    }

    // If switching workers on a control plane, clear the old token and show login
    const switchingWorker = params.has("worker");
    if (switchingWorker && uiConfig?.is_control_plane) {
      clearTokenCookies();
      setIsResolvingSession(false);
      return;
    }

    const rawToken = getCookieFromDocument("token");
    if (rawToken && !isJwtExpired(rawToken)) {
      // User already logged in - redirect to return URL or default
      const returnUrl = consumeReturnUrl();
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace("/ui");
      }
      return;
    }

    if (uiConfig && uiConfig.auto_redirect_to_sso) {
      // For SSO, pass the return URL to the SSO endpoint
      const returnUrl = getReturnUrl();
      let ssoUrl = `${getProxyBaseUrl()}/sso/key/generate`;
      if (returnUrl && isValidReturnUrl(returnUrl)) {
        ssoUrl += `?redirect_to=${encodeURIComponent(returnUrl)}`;
      }
      router.push(ssoUrl);
      return;
    }

    setIsResolvingSession(false);
  }, [isConfigLoading, router, uiConfig]);

  const handleSubmit = ({ username, password }: LoginFormValues) => {
    if (!isLoginReady || isRedirecting || loginMutation.isPending) return;
    // If a worker is selected, point proxyBaseUrl at it before login
    const selectedWorker = workers.find((w) => w.worker_id === selectedWorkerId);
    if (selectedWorker) {
      switchToWorkerUrl(selectedWorker.url);
    }

    loginMutation.mutate(
      { username, password, useV3: !!selectedWorker },
      {
        onSuccess: (data) => {
          setIsRedirecting(true);
          // Update the worker context with the selected worker
          if (selectedWorker) {
            selectWorker(selectedWorker.worker_id);
            // Stay on the CP's UI — proxyBaseUrl already points at the worker
            window.location.replace("/ui/?login=success");
          } else {
            // Normal (non-control-plane) login — follow the server's redirect
            const returnUrl = consumeReturnUrl();
            if (returnUrl) {
              window.location.replace(returnUrl);
            } else {
              window.location.replace(data.redirect_url);
            }
          }
        },
        onError: () => {
          // Reset proxyBaseUrl on login failure
          if (selectedWorker) {
            switchToWorkerUrl(null);
          }
        },
      },
    );
  };

  const error = loginMutation.error instanceof Error ? loginMutation.error.message : null;
  const isLoginLoading = loginMutation.isPending || isRedirecting;

  // Show disabled message if admin UI is disabled
  if (uiConfig && uiConfig.admin_ui_disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Card className="w-full max-w-lg shadow-md">
          <CardContent>
            <div className="flex w-full flex-col gap-4">
              <div className="text-center">
                <h2 className="text-3xl font-semibold text-foreground"> MindGate</h2>
              </div>

              <Alert variant="warning">
                <TriangleAlert />
                <AlertTitle>{t("auth.disabledTitle")}</AlertTitle>
                <AlertDescription>
                  <p className="text-sm">{t("auth.disabledHint")}</p>
                  <p className="mt-2 text-sm">
                    <code className="bg-muted px-1 py-0.5 rounded-sm text-xs">DISABLE_ADMIN_UI=False</code>
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mindgate-login">
      <div className="mindgate-login-art" style={{ backgroundImage: `url(${loginBackground.src})` }} aria-hidden />
      <div className="mindgate-login-tools">
        <LanguageSwitcher />
      </div>
      <div className="mindgate-login-panel">
        <Card className="mindgate-login-card">
          <CardContent className="mindgate-login-content">
            <div className="flex w-full flex-col gap-4">
              <div className="mindgate-login-brand">
                <h2>MindGate</h2>
              </div>

              {error && (
                <Alert variant="error">
                  <CircleAlert />
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              <form onSubmit={form.handleSubmit(handleSubmit)}>
                <h3 className="mindgate-login-heading">{t("auth.login")} MindGate</h3>
                <FieldGroup className="gap-0">
                  {uiConfig?.is_control_plane && workers.length > 0 && (
                    <Field className="mb-4">
                      <FieldLabel htmlFor={workerFieldId}>{t("shell.worker")}</FieldLabel>
                      <Select
                        items={workers.map((worker) => ({ label: worker.name, value: worker.worker_id }))}
                        value={selectedWorkerId}
                        onValueChange={(value: string | null) => setSelectedWorkerId(value)}
                      >
                        <SelectTrigger id={workerFieldId} className="h-10 w-full">
                          <SelectValue placeholder={t("auth.chooseWorker")} />
                        </SelectTrigger>
                        <SelectContent>
                          {workers.map((worker) => (
                            <SelectItem key={worker.worker_id} value={worker.worker_id}>
                              {worker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}

                  <FormField control={form.control} name="username">
                    {({ ref, ...field }) => (
                      <Input
                        {...field}
                        ref={ref}
                        aria-label={t("auth.username")}
                        placeholder={t("auth.usernamePlaceholder")}
                        autoComplete="username"
                        disabled={isLoginLoading}
                        className="h-10 rounded-md"
                      />
                    )}
                  </FormField>

                  <FormField control={form.control} name="password">
                    {({ ref, ...field }) => (
                      <PasswordInput
                        {...field}
                        ref={ref}
                        aria-label={t("auth.password")}
                        placeholder={t("auth.passwordPlaceholder")}
                        autoComplete="current-password"
                        disabled={isLoginLoading}
                        groupClassName="h-10"
                      />
                    )}
                  </FormField>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoginLoading || !isLoginReady}
                    className="mindgate-login-submit"
                  >
                    {isLoginLoading && (
                      <UiLoadingSpinner className="size-4" role="img" aria-label={t("common.loadingAria")} />
                    )}
                    {isLoginLoading ? t("auth.loggingIn") : t("auth.login")}
                  </Button>
                </FieldGroup>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
      <footer className="mindgate-login-footer">© 1983-2026 MindGate Co., Ltd.</footer>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
