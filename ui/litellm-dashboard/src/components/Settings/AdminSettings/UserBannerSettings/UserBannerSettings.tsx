"use client";
import { useTranslation } from "@/i18n/useTranslation";

import React, { useState } from "react";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useUpdateUserBanner } from "@/app/(dashboard)/hooks/userBanner/useUpdateUserBanner";
import { useUserBanner } from "@/app/(dashboard)/hooks/userBanner/useUserBanner";
import { toast } from "@/lib/toast";
import { UserBanner, UserBannerSeverity, UserBannerUpdate } from "@/components/networking";
import { Alert, AlertDescription } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SEVERITY_ICONS, UserBannerMarkdown } from "@/components/UserBanner";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITY_LABELS: Record<UserBannerSeverity, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
};

const SEVERITY_ITEMS = (Object.keys(SEVERITY_LABELS) as UserBannerSeverity[]).map((severity) => ({
  value: severity,
  label: SEVERITY_LABELS[severity],
}));

const EMPTY_BANNER: UserBanner = { enabled: false, message: "", severity: "info", revision: "" };

export default function UserBannerSettings() {
  const { accessToken } = useAuthorized();
  const { data: banner, isLoading } = useUserBanner(accessToken);
  const { mutate: saveBanner, isPending } = useUpdateUserBanner(accessToken);
  const persisted = banner ?? EMPTY_BANNER;

  return (
    <UserBannerSettingsForm
      key={JSON.stringify(persisted)}
      persisted={persisted}
      isLoading={isLoading}
      isPending={isPending}
      saveBanner={saveBanner}
    />
  );
}

interface UserBannerSettingsFormProps {
  persisted: UserBanner;
  isLoading: boolean;
  isPending: boolean;
  saveBanner: ReturnType<typeof useUpdateUserBanner>["mutate"];
}

function UserBannerSettingsForm({ persisted, isLoading, isPending, saveBanner }: UserBannerSettingsFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<UserBannerUpdate>({
    enabled: persisted.enabled,
    message: persisted.message,
    severity: persisted.severity,
  });

  const messageMissing = draft.enabled && draft.message.trim() === "";

  const handleSave = () => {
    saveBanner(draft, {
      onSuccess: () => {
        toast.success(t("admin.userBannerUpdatedSuccessfully"));
      },
      onError: (error) => {
        toast.fromError(error);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.userBanner")}</CardTitle>
        <CardDescription>{t("admin.publishAnAnnouncementToAllDashboardUsersMarkdownIs")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={draft.enabled}
                onCheckedChange={(checked: boolean) => setDraft({ ...draft, enabled: checked })}
                aria-label={t("admin.publishUserBanner")}
              />
              <Label>{t("admin.publishUserBanner")}</Label>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="user-banner-message">{t("admin.message")}</Label>
              <Textarea
                id="user-banner-message"
                value={draft.message}
                maxLength={4000}
                rows={3}
                placeholder="**Scheduled maintenance** tonight at 10 PM UTC. See [status page](https://example.com)."
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDraft({ ...draft, message: event.target.value })
                }
              />
              {messageMissing && <p className="text-sm text-destructive">{t("admin.addAMessageBeforePublishing")}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("admin.severity")}</Label>
              <Select
                items={SEVERITY_ITEMS}
                value={draft.severity}
                onValueChange={(value: string | null) =>
                  setDraft({ ...draft, severity: (value ?? "info") as UserBannerSeverity })
                }
              >
                <SelectTrigger className="w-48" aria-label={t("admin.bannerSeverity")}>
                  <SelectValue placeholder={t("admin.severity")} />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.message.trim() !== "" && (
              <div className="flex flex-col gap-2">
                <Label>{t("admin.preview")}</Label>
                <Alert variant={draft.severity}>
                  {SEVERITY_ICONS[draft.severity]}
                  <AlertDescription>
                    <UserBannerMarkdown message={draft.message} />
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div>
              <Button onClick={handleSave} disabled={isPending || messageMissing}>
                {isPending ? t("admin.saving") : t("admin.saveBanner")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
