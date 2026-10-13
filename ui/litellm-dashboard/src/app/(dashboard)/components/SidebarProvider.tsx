"use client";

import Sidebar from "@/components/leftnav";
import { getUISettings } from "@/components/networking";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useEffect, useState } from "react";

interface SidebarProviderProps {
  setPage: (page: string) => void;
  defaultSelectedKey: string;
  sidebarCollapsed: boolean;
  onToggleCollapsed?: () => void;
}

const SidebarProvider = ({
  setPage,
  defaultSelectedKey,
  sidebarCollapsed,
  onToggleCollapsed,
}: SidebarProviderProps) => {
  const { accessToken } = useAuthorized();
  const [enabledPagesInternalUsers, setEnabledPagesInternalUsers] = useState<string[] | null>(null);
  const [enableProjectsUI, setEnableProjectsUI] = useState<boolean>(false);

  useEffect(() => {
    const fetchUISettings = async () => {
      if (!accessToken) {
        return;
      }

      try {
        const settings = await getUISettings(accessToken);

        // API returns 'values' not 'settings'
        if (settings?.values?.enabled_ui_pages_internal_users !== undefined) {
          setEnabledPagesInternalUsers(settings.values.enabled_ui_pages_internal_users);
        } else {
        }

        if (settings?.values?.enable_projects_ui !== undefined) {
          setEnableProjectsUI(Boolean(settings.values.enable_projects_ui));
        }
      } catch (error) {
        console.error("[SidebarProvider] Failed to fetch UI settings:", error);
      }
    };

    fetchUISettings();
  }, [accessToken]);

  return (
    <Sidebar
      setPage={setPage}
      defaultSelectedKey={defaultSelectedKey}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      enabledPagesInternalUsers={enabledPagesInternalUsers}
      enableProjectsUI={enableProjectsUI}
    />
  );
};

export default SidebarProvider;
