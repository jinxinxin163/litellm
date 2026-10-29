"use client";

import { useTranslation } from "@/i18n/useTranslation";

import GuardrailsMonitorView from "./_components/GuardrailsMonitorView";
import { AdminOnlyNotice } from "@/components/shared/AdminOnlyNotice";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useCan from "@/app/(dashboard)/hooks/useCan";

export default function GuardrailsMonitor() {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const canViewGuardrailUsage = useCan("viewGuardrailUsage");

  if (!canViewGuardrailUsage) {
    return <AdminOnlyNotice pageTitle={t("guardrailsMonitor.title")} description={t("guardrailsMonitor.adminOnly")} />;
  }

  return <GuardrailsMonitorView accessToken={accessToken} />;
}
