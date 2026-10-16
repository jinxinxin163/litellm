"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";

export default function LanguageSwitcher({ iconOnly = false }: { iconOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const isChinese = i18n.resolvedLanguage === "zh-CN";
  const label = t(isChinese ? "language.switchToEnglish" : "language.switchToChinese");

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon-sm" : "sm"}
      aria-label={label}
      title={label}
      className="gap-1.5 text-muted-foreground"
      onClick={() => void i18n.changeLanguage(isChinese ? "en" : "zh-CN")}
    >
      <Languages className="size-4" aria-hidden />
      {!iconOnly && <span lang={isChinese ? "en" : "zh-CN"}>{isChinese ? "EN" : "中文"}</span>}
    </Button>
  );
}
