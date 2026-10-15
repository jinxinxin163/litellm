import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "@/i18n/useTranslation";
import { CUSTOM_TIER_RESTRICTIONS, CustomTierSet, TierRestriction, MIN_TIER_COUNT, MAX_TIER_COUNT } from "./tier_rows";

export const translateTierRestriction = (reason: string | undefined, t: TFunction): string | undefined => {
  const restriction = Object.entries(CUSTOM_TIER_RESTRICTIONS).find(([, entry]) => entry.reason === reason);
  return restriction ? t(`models.restrictions.${restriction[0]}`) : reason;
};

const TIER_ERROR_KEYS: Record<string, string> = {
  [`A tier set needs ${MIN_TIER_COUNT} to ${MAX_TIER_COUNT} tiers`]: "models.tierErrors.count",
  "Name every tier": "models.tierErrors.nameRequired",
  "Tier names must be unique, ignoring case": "models.tierErrors.uniqueNames",
  "Every custom tier needs a definition: it is the rubric the classifier routes on":
    "models.tierErrors.definitionRequired",
  "Pick a Fallback Tier for classifier failures": "models.tierErrors.fallbackRequired",
};

export const translateTierRowError = (error: string | null, t: TFunction): string | null => {
  const key = error ? TIER_ERROR_KEYS[error] : undefined;
  return key ? t(key, { min: MIN_TIER_COUNT, max: MAX_TIER_COUNT }) : error;
};

export const restrictedBy = (
  value: { custom_tier_set?: CustomTierSet },
  key: keyof typeof CUSTOM_TIER_RESTRICTIONS,
): TierRestriction | undefined => (value.custom_tier_set ? CUSTOM_TIER_RESTRICTIONS[key] : undefined);

export const Restricted: React.FC<{ by: TierRestriction | undefined; children: React.ReactNode }> = ({
  by,
  children,
}) => {
  const { t } = useTranslation();
  return by ? (
    <span className="block text-sm text-muted-foreground">{translateTierRestriction(by.reason, t)}</span>
  ) : (
    <>{children}</>
  );
};

/** A labelled section whose body is replaced by the reason an edited tier set forbids it. */
export const RestrictedSection: React.FC<{
  heading: string;
  by: TierRestriction | undefined;
  children: React.ReactNode;
}> = ({ heading, by, children }) => {
  const { t } = useTranslation();
  return (
    <div>
      <strong className="block mb-1 font-semibold">{heading}</strong>
      {by ? (
        <span className="block text-sm text-muted-foreground">{translateTierRestriction(by.reason, t)}</span>
      ) : (
        children
      )}
    </div>
  );
};
