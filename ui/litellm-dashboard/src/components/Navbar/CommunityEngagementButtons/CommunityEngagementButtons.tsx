"use client";

import { useTranslation } from "@/i18n/useTranslation";
import { useDisableShowPrompts } from "@/app/(dashboard)/hooks/useDisableShowPrompts";
import { buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cva.config";
import { Github, Slack } from "lucide-react";
import React from "react";

const COMMUNITY_LINKS = [
  {
    href: "https://www.litellm.ai/support",
    label: "shell.joinSlack",
    tooltip: "shell.slackCommunity",
    Icon: Slack,
  },
  {
    href: "https://github.com/BerriAI/litellm",
    label: "shell.onGithub",
    tooltip: "shell.onGithub",
    Icon: Github,
  },
] as const;

export const CommunityEngagementButtons: React.FC = () => {
  const { t } = useTranslation();
  const disableShowPrompts = useDisableShowPrompts();

  if (disableShowPrompts) {
    return null;
  }

  return (
    <TooltipProvider>
      <ButtonGroup aria-label={t("shell.communityLinks")}>
        {COMMUNITY_LINKS.map(({ href, label, tooltip, Icon }) => (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(label)}
                  className={cn(buttonVariants({ variant: "outline", size: "icon" }), "text-muted-foreground")}
                />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent>{t(tooltip)}</TooltipContent>
          </Tooltip>
        ))}
      </ButtonGroup>
    </TooltipProvider>
  );
};
