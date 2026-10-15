"use client";

import { useContext } from "react";
import { I18nContext, useTranslation as useReactTranslation } from "react-i18next";
import { createDashboardI18n } from "./config";

const englishInstance = createDashboardI18n();
export const translate = englishInstance.t.bind(englishInstance);

export function useTranslation() {
  const context = useContext(I18nContext);
  return useReactTranslation("translation", { i18n: context?.i18n ?? englishInstance });
}
