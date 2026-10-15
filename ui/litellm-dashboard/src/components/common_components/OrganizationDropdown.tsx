import React from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Organization } from "../networking";

interface OrganizationDropdownProps {
  organizations?: Organization[] | null;
  value?: string;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
  id?: string;
}

const OrganizationDropdown: React.FC<OrganizationDropdownProps> = ({
  organizations,
  value,
  onChange,
  disabled,
  loading,
  style,
  placeholder,
  id,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ minWidth: 280, ...style }}>
      <SearchSelect
        options={(organizations ?? []).map((org) => ({
          label: org.organization_alias || org.organization_id,
          value: org.organization_id,
          sublabel: org.organization_id,
        }))}
        value={value}
        onValueChange={(organizationId) => onChange?.(organizationId || null)}
        placeholder={placeholder ?? t("formHints.shared.allOrganizations")}
        emptyText={loading ? t("formHints.shared.loadingOrganizations") : t("formHints.shared.noOrganizations")}
        disabled={disabled}
        inputId={id}
      />
    </div>
  );
};

export default OrganizationDropdown;
