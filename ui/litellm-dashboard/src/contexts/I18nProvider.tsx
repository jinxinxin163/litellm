"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createDashboardI18n, LANGUAGE_STORAGE_KEY, resolveBrowserLanguage, type Language } from "@/i18n/config";

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(createDashboardI18n);

  useEffect(() => {
    const resolveLanguage = (savedLanguage: string | null): Language => {
      if (savedLanguage === "en" || savedLanguage === "zh-CN") return savedLanguage;
      const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
      return resolveBrowserLanguage(languages);
    };
    const readLanguage = (): Language => {
      try {
        return resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
      } catch {
        return resolveLanguage(null);
      }
    };
    const applyLanguage = (language: string) => {
      document.documentElement.lang = language;
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Storage may be disabled by the browser; language switching still works.
      }
    };
    instance.on("languageChanged", applyLanguage);
    void instance.changeLanguage(readLanguage());
    const syncLanguage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
      } catch {
        return;
      }
      void instance.changeLanguage(resolveLanguage(event.newValue));
    };
    window.addEventListener("storage", syncLanguage);
    return () => {
      instance.off("languageChanged", applyLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, [instance]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
