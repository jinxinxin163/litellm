"use client";

import React from "react";

interface AdminOnlyNoticeProps {
  pageTitle: string;
  description?: string;
}

export const AdminOnlyNotice: React.FC<AdminOnlyNoticeProps> = ({ pageTitle, description }) => (
  <div className="p-6 w-full min-w-0 flex-1">
    <h1 className="text-2xl font-semibold text-foreground mb-2">{pageTitle}</h1>
    <p className="text-sm text-muted-foreground">{description ?? `${pageTitle} is only available to admin users.`}</p>
  </div>
);
