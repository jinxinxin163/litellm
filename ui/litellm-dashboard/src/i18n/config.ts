import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const LANGUAGE_STORAGE_KEY = "litellm_ui_language";
export type Language = "en" | "zh-CN";

export function createDashboardI18n() {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN"],
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
    },
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnEmptyString: false,
  });
  return instance;
}
