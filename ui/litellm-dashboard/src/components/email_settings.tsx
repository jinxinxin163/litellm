import { useTranslation } from "@/i18n/useTranslation";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { serviceHealthCheck, setCallbacksCall } from "./networking";
import { EmailEventSettings } from "./email_events";

interface EmailSettingsProps {
  accessToken: string | null;
  premiumUser: boolean;
  alerts: any[];
}

const PREMIUM_ONLY_FIELDS = ["EMAIL_LOGO_URL", "EMAIL_SUPPORT_CONTACT"];

const SENSITIVE_FIELD_PATTERN = /(PASSWORD|SECRET|KEY|TOKEN)/i;

const EmailSettings: React.FC<EmailSettingsProps> = ({ accessToken, premiumUser, alerts }) => {
  const { t } = useTranslation();
  const requiredMarker = <span className="text-destructive"> {t("loggingAlerts.required")} </span>;
  const fieldHelp: Record<string, React.ReactNode> = {
    SMTP_HOST: (
      <>
        {t("loggingAlerts.smtpHost")}
        {requiredMarker}
      </>
    ),
    SMTP_PORT: (
      <>
        {t("loggingAlerts.smtpPort")}
        {requiredMarker}
      </>
    ),
    SMTP_USERNAME: (
      <>
        {t("loggingAlerts.smtpUsername")}
        {requiredMarker}
      </>
    ),
    SMTP_SENDER_EMAIL: (
      <>
        {t("loggingAlerts.senderEmail")}
        {requiredMarker}
      </>
    ),
    TEST_EMAIL_ADDRESS: (
      <>
        {t("loggingAlerts.testEmailAddress")}
        {requiredMarker}
      </>
    ),
    SMTP_PASSWORD: requiredMarker,
    EMAIL_LOGO_URL: t("loggingAlerts.emailLogo"),
    EMAIL_SUPPORT_CONTACT: t("loggingAlerts.emailSupport"),
  };
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleFieldVisibility = (key: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveEmailSettings = async () => {
    if (!accessToken) {
      return;
    }

    let updatedVariables: Record<string, string> = {};

    alerts
      .filter((alert) => alert.name === "email")
      .forEach((alert) => {
        Object.entries(alert.variables ?? {}).forEach(([key, value]) => {
          const inputElement = document.querySelector(`input[name="${key}"]`) as HTMLInputElement;
          if (!inputElement || !inputElement.value) {
            return;
          }
          // Only send fields the admin actually edited. Values rendered from the
          // server are masked (SMTP_PASSWORD) or sourced from the process
          // environment, so re-submitting an untouched field would persist a mask
          // or copy env-managed config into the database.
          if (inputElement.value === (value == null ? "" : String(value))) {
            return;
          }
          updatedVariables[key] = inputElement.value;
        });
      });

    //filter out null / undefined values for updatedVariables

    const payload = {
      general_settings: {
        alerting: ["email"],
      },
      environment_variables: updatedVariables,
    };
    try {
      await setCallbacksCall(accessToken, payload);
      toast.success(t("loggingAlerts.emailSaved"));
    } catch (error) {
      toast.fromError(error);
    }
  };

  return (
    <>
      <div className="mt-6 mb-6">
        <EmailEventSettings accessToken={accessToken} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("loggingAlerts.emailServer")}</CardTitle>
        </CardHeader>

        <CardContent>
          {alerts
            .filter((alert) => alert.name === "email")
            .map((alert, index) => (
              <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(alert.variables ?? {}).map(([key, value]) => {
                  if (PREMIUM_ONLY_FIELDS.includes(key)) return null;
                  const isLocked = !premiumUser && PREMIUM_ONLY_FIELDS.includes(key);
                  const isSensitive = SENSITIVE_FIELD_PATTERN.test(key);
                  const isVisible = visibleFields[key] || false;
                  return (
                    <div key={key} className="space-y-1">
                      {isLocked ? (
                        <a
                          href="https://forms.gle/W3U4PZpJGFHWtHyA9"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline underline-offset-4"
                        >
                          ✨ {key}
                        </a>
                      ) : (
                        <p className="text-sm">{key}</p>
                      )}
                      <InputGroup className="max-w-100">
                        <InputGroupInput
                          name={key}
                          defaultValue={value as string}
                          type={isSensitive && !isVisible ? "password" : "text"}
                          disabled={isLocked}
                        />
                        {isSensitive && (
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              size="icon-xs"
                              onClick={() => toggleFieldVisibility(key)}
                              aria-label={
                                isVisible ? t("loggingAlerts.hideCredential") : t("loggingAlerts.showCredential")
                              }
                            >
                              {isVisible ? <EyeOff /> : <Eye />}
                            </InputGroupButton>
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                      <div className="text-xs text-muted-foreground italic">{fieldHelp[key]}</div>
                    </div>
                  );
                })}
              </div>
            ))}

          <div className="mt-6 flex gap-2">
            <Button onClick={() => handleSaveEmailSettings()}>{t("loggingAlerts.saveChanges")}</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!accessToken) return;
                try {
                  await serviceHealthCheck(accessToken, "email");
                  toast.success(t("loggingAlerts.emailTest"));
                } catch (error) {
                  toast.fromError(error);
                }
              }}
            >
              {t("loggingAlerts.testEmail")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default EmailSettings;
