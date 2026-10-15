"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createDashboardI18n, LANGUAGE_STORAGE_KEY } from "@/i18n/config";

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(createDashboardI18n);

  useEffect(() => {
    const applyLanguage = (language: string) => {
      document.documentElement.lang = language;
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Storage may be disabled by the browser; language switching still works.
      }
    };
    let language = "en";
    try {
      language = localStorage.getItem(LANGUAGE_STORAGE_KEY) === "zh-CN" ? "zh-CN" : "en";
    } catch {
      // Use the exported page's language when storage is unavailable.
    }
    instance.on("languageChanged", applyLanguage);
    void instance.changeLanguage(language);
    const syncLanguage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        void instance.changeLanguage(event.newValue === "zh-CN" ? "zh-CN" : "en");
      }
    };
    window.addEventListener("storage", syncLanguage);
    return () => {
      instance.off("languageChanged", applyLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, [instance]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
