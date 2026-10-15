import { useTranslation } from "@/i18n/useTranslation";
/**
 * Allow proxy admin to add other people to view global spend
 * Use this to avoid sharing master key with others
 */
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, TriangleAlert } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useBaseUrl } from "@/components/constants";
import { toast } from "@/lib/toast";
import { addAllowedIP, deleteAllowedIP, getAllowedIPs, getSSOSettings } from "@/components/networking";
import SCIMConfig from "@/components/SCIM";
import LoggingSettings from "@/components/Settings/AdminSettings/LoggingSettings/LoggingSettings";
import SSOSettings from "@/components/Settings/AdminSettings/SSOSettings/SSOSettings";
import UISettings from "@/components/Settings/AdminSettings/UISettings/UISettings";
import UserBannerSettings from "@/components/Settings/AdminSettings/UserBannerSettings/UserBannerSettings";
import CyberArk from "@/components/Settings/AdminSettings/CyberArk/CyberArk";
import HashicorpVault from "@/components/Settings/AdminSettings/HashicorpVault/HashicorpVault";
import PluginSettings from "@/components/Settings/AdminSettings/PluginSettings/PluginSettings";
import SSOModals from "@/components/SSOModals";
import {
  emptySSOSettingsFormValues,
  useSSOSettingsForm,
  type SSOSettingsFormValues,
} from "@/components/Settings/AdminSettings/SSOSettings/Modals/BaseSSOSettingsForm";
import UIAccessControlForm from "@/components/UIAccessControlForm";
import { z } from "zod/v4";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/lib/forms/useZodForm";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const allowedIPSchema = z.object({
  ip: z.string().min(1, "Please enter an IP address"),
});

type AllowedIPFormValues = z.infer<typeof allowedIPSchema>;

const AddAllowedIPForm = ({ onSubmit }: { onSubmit: (values: AllowedIPFormValues) => Promise<void> }) => {
  const { t } = useTranslation();
  const form = useZodForm(allowedIPSchema, { defaultValues: { ip: "" } });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <FormField control={form.control} name="ip">
          {({ ref, ...field }) => <Input ref={ref} placeholder={t("admin.enterIpAddress")} {...field} />}
        </FormField>
        <div>
          <Button type="submit">{t("admin.addIpAddress")}</Button>
        </div>
      </FieldGroup>
    </form>
  );
};

interface AdminPanelProps {
  proxySettings?: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ proxySettings }) => {
  const { t } = useTranslation();
  const { premiumUser, accessToken, userId: userID } = useAuthorized();
  const form = useSSOSettingsForm("admin-panel");
  const [isAddSSOModalVisible, setIsAddSSOModalVisible] = useState(false);
  const [isInstructionsModalVisible, setIsInstructionsModalVisible] = useState(false);
  const [isAllowedIPModalVisible, setIsAllowedIPModalVisible] = useState(false);
  const [isAddIPModalVisible, setIsAddIPModalVisible] = useState(false);
  const [isDeleteIPModalVisible, setIsDeleteIPModalVisible] = useState(false);
  const [isUIAccessControlModalVisible, setIsUIAccessControlModalVisible] = useState(false);
  const [allowedIPs, setAllowedIPs] = useState<string[]>([]);
  const [ipToDelete, setIPToDelete] = useState<string | null>(null);
  const [ssoConfigured, setSsoConfigured] = useState<boolean>(false);

  const baseUrl = useBaseUrl();
  const all_ip_address_allowed = "All IP Addresses Allowed";

  let nonSssoUrl = baseUrl;
  nonSssoUrl += "/fallback/login";

  const checkSSOConfiguration = async () => {
    if (accessToken) {
      try {
        const ssoData = await getSSOSettings(accessToken);

        if (ssoData && ssoData.values) {
          const hasGoogleSSO = ssoData.values.google_client_id && ssoData.values.google_client_secret;
          const hasMicrosoftSSO = ssoData.values.microsoft_client_id && ssoData.values.microsoft_client_secret;
          const hasGenericSSO = ssoData.values.generic_client_id && ssoData.values.generic_client_secret;

          setSsoConfigured(hasGoogleSSO || hasMicrosoftSSO || hasGenericSSO);
        } else {
          setSsoConfigured(false);
        }
      } catch (error) {
        console.error("Error checking SSO configuration:", error);
        setSsoConfigured(false);
      }
    }
  };

  const handleShowAllowedIPs = async () => {
    try {
      if (premiumUser !== true) {
        toast.fromError(t("admin.thisFeatureIsOnlyAvailableForPremiumUsersPlease"));
        return;
      }
      if (accessToken) {
        const data = await getAllowedIPs(accessToken);
        setAllowedIPs(data && data.length > 0 ? data : [all_ip_address_allowed]);
      } else {
        setAllowedIPs([all_ip_address_allowed]);
      }
    } catch (error) {
      console.error("Error fetching allowed IPs:", error);
      toast.fromError(`Failed to fetch allowed IPs ${error}`);
      setAllowedIPs([all_ip_address_allowed]);
    } finally {
      if (premiumUser === true) {
        setIsAllowedIPModalVisible(true);
      }
    }
  };

  const handleAddIP = async (values: { ip: string }) => {
    try {
      if (accessToken) {
        await addAllowedIP(accessToken, values.ip);
        // Fetch the updated list of IPs
        const updatedIPs = await getAllowedIPs(accessToken);
        setAllowedIPs(updatedIPs);
        toast.success(t("admin.ipAddressAddedSuccessfully"));
      }
    } catch (error) {
      console.error("Error adding IP:", error);
      toast.fromError(`Failed to add IP address ${error}`);
    } finally {
      setIsAddIPModalVisible(false);
    }
  };

  const handleDeleteIP = async (ip: string) => {
    setIPToDelete(ip);
    setIsDeleteIPModalVisible(true);
  };

  const confirmDeleteIP = async () => {
    if (ipToDelete && accessToken) {
      try {
        await deleteAllowedIP(accessToken, ipToDelete);
        // Fetch the updated list of IPs
        const updatedIPs = await getAllowedIPs(accessToken);
        setAllowedIPs(updatedIPs.length > 0 ? updatedIPs : [all_ip_address_allowed]);
        toast.success(t("admin.ipAddressDeletedSuccessfully"));
      } catch (error) {
        console.error("Error deleting IP:", error);
        toast.fromError(`Failed to delete IP address ${error}`);
      } finally {
        setIsDeleteIPModalVisible(false);
        setIPToDelete(null);
      }
    }
  };

  const handleAddSSOOk = () => {
    setIsAddSSOModalVisible(false);
    form.reset(emptySSOSettingsFormValues);
    if (accessToken && premiumUser) {
      checkSSOConfiguration();
    }
  };

  const handleAddSSOCancel = () => {
    setIsAddSSOModalVisible(false);
    form.reset(emptySSOSettingsFormValues);
  };

  const handleShowInstructions = (formValues: SSOSettingsFormValues) => {
    setIsAddSSOModalVisible(false);
    setIsInstructionsModalVisible(true);
  };

  const handleInstructionsOk = () => {
    setIsInstructionsModalVisible(false);
    if (accessToken && premiumUser) {
      checkSSOConfiguration();
    }
  };

  const handleInstructionsCancel = () => {
    setIsInstructionsModalVisible(false);
    if (accessToken && premiumUser) {
      checkSSOConfiguration();
    }
  };

  useEffect(() => {
    checkSSOConfiguration();
  }, [accessToken, premiumUser, checkSSOConfiguration]);

  const handleUIAccessControlOk = () => {
    setIsUIAccessControlModalVisible(false);
  };

  const handleUIAccessControlCancel = () => {
    setIsUIAccessControlModalVisible(false);
  };

  const tabItems = [
    {
      key: "ui-settings",
      label: t("admin.uiSettings"),
      children: (
        <div className="flex flex-col gap-4">
          <UISettings />
          <UserBannerSettings />
        </div>
      ),
    },
    {
      key: "sso-settings",
      label: t("admin.ssoSettings"),
      children: <SSOSettings />,
    },
    {
      key: "logging-settings",
      label: t("admin.loggingSettings"),
      children: <LoggingSettings />,
    },
  ];

  return (
    <div className="w-full m-2 mt-2 p-8">
      <h2 className="mb-2 text-base font-semibold text-foreground">{t("admin.adminAccess")}</h2>
      <p className="mb-4 text-sm text-foreground">{t("admin.goToInternalUsersPageToAddOtherAdmins")}</p>
      <Tabs defaultValue={tabItems[0].key}>
        <TabsList variant="line" className="mb-4 h-auto flex-wrap">
          {tabItems.map((item) => (
            <TabsTrigger key={item.key} value={item.key} className="flex-none">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabItems.map((item) => (
          <TabsContent key={item.key} value={item.key}>
            {item.children}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminPanel;
