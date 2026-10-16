"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { getBreadcrumb } from "@/components/leftnav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SidebarAccountMenu from "@/components/SidebarAccountMenu/SidebarAccountMenu";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useLogout } from "@/app/(dashboard)/hooks/useLogout";
import { useTranslation } from "@/i18n/useTranslation";
import { useWorker } from "@/hooks/useWorker";
import { useDisableShowPrompts } from "@/app/(dashboard)/hooks/useDisableShowPrompts";
import { clearTokenCookies } from "@/utils/cookieUtils";
import { clearStoredReturnUrl, getLoginUrl } from "@/utils/returnUrlUtils";

interface DashboardHeaderProps {
  page: string;
}

// Top bar for the dashboard shell. Sits only over the content column (the brand
// lives in the sidebar header); mirrors the design's breadcrumb-left / tools-right layout.
export function DashboardHeader({ page }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const { title } = getBreadcrumb(page);
  const { accessToken } = useAuthorized();
  const logout = useLogout(accessToken);
  const { isControlPlane, selectedWorker } = useWorker();
  const showWorkerSwitch = isControlPlane && selectedWorker !== null;
  const hideCommunityLinks = useDisableShowPrompts();

  const handleWorkerSwitch = (workerId: string) => {
    clearTokenCookies();
    clearStoredReturnUrl();
    localStorage.removeItem("litellm_selected_worker_id");
    localStorage.removeItem("litellm_worker_url");
    window.location.href = `${getLoginUrl()}?worker=${encodeURIComponent(workerId)}`;
  };

  return (
    <header className="flex h-14 flex-none items-center justify-between gap-4 border-b border-border bg-card px-6">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">
              {t(`navigation.pages.${page}`, { defaultValue: title })}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-none items-center gap-1">
        <LanguageSwitcher iconOnly />
        <SidebarAccountMenu onLogout={logout} placement="header" />
      </div>
    </header>
  );
}

export default DashboardHeader;
