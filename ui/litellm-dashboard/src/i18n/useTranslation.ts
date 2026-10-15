"use client";

import { useContext, useSyncExternalStore } from "react";
import { I18nContext, useTranslation as useReactTranslation } from "react-i18next";
import { createDashboardI18n } from "./config";

const englishInstance = createDashboardI18n();
export const translate = englishInstance.t.bind(englishInstance);

const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useTranslation() {
  const context = useContext(I18nContext);
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const instance = hydrated ? context?.i18n ?? englishInstance : englishInstance;
  return useReactTranslation("translation", { i18n: instance });
}
