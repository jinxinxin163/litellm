
import { useTranslation } from "@/i18n/useTranslation";
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cva.config";
import AddGuardrailForm from "./add_guardrail_form";
import { Logo } from "@/components/molecules/logo/Logo";
import { GUARDRAIL_PRESETS } from "./guardrail_garden_configs";
import { GuardrailCardInfo } from "./guardrail_garden_data";

interface GuardrailDetailViewProps {
  card: GuardrailCardInfo;
  onBack: () => void;
  accessToken: string | null;
  onGuardrailCreated: () => void;
}

const GuardrailDetailView: React.FC<GuardrailDetailViewProps> = ({ card, onBack, accessToken, onGuardrailCreated }) => {
  const { t } = useTranslation();
  const displayName = t(`guardrailsGarden.cards.${card.id}.name`, { defaultValue: card.name });
  const description = t(`guardrailsGarden.cards.${card.id}.description`, { defaultValue: card.description });
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const detailRows = [
    { property: t("guardrailsPage.text073"), value: card.category === "litellm" ? "LiteLLM Content Filter" : t("guardrailsPage.text123") },
    ...(card.subcategory ? [{ property: t("guardrailsPage.text487"), value: t(`guardrailsGarden.labels.${card.subcategory}`, { defaultValue: card.subcategory }) }] : []),
    ...(card.category === "litellm" ? [{ property: t("guardrailsPage.text488"), value: t("guardrailsPage.text489") }] : []),
    ...(card.category === "litellm" ? [{ property: t("guardrailsPage.text490"), value: t("guardrailsPage.text491") }] : []),
    ...(card.category === "litellm" ? [{ property: t("guardrailsPage.text492"), value: card.eval?.latency || "<1ms" }] : []),
  ];

  const evalRows = card.eval
    ? [
        { metric: t("guardrailsPage.text493"), value: `${card.eval.precision}%` },
        { metric: t("guardrailsPage.text494"), value: `${card.eval.recall}%` },
        { metric: t("guardrailsPage.text495"), value: `${card.eval.f1}%` },
        { metric: t("guardrailsPage.text496"), value: String(card.eval.testCases) },
        { metric: t("guardrailsPage.text497"), value: "0" },
        { metric: t("guardrailsPage.text498"), value: "0" },
        { metric: t("guardrailsPage.text499"), value: card.eval.latency },
      ]
    : [];

  const tabs = [{ key: "overview", label: t("guardrailsPage.text124") }, ...(card.eval ? [{ key: "eval", label: t("guardrailsPage.text125") }] : [])];

  return (
    <div className="mx-auto max-w-[960px]">
      {/* Back link */}
      <div
        onClick={onBack}
        className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-3" />
        <span>{displayName}</span>
      </div>

      {/* ── Header block (Vertex-style) ── */}
      <div className="mb-2 flex items-center gap-4">
        <Logo src={card.logo} label={displayName} className="w-10 h-10 rounded-lg object-contain shrink-0" />
        <h1 className="m-0 text-[28px] font-normal leading-tight text-foreground">{displayName}</h1>
      </div>

      <p className="m-0 mb-5 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {/* Action buttons — outlined style like Vertex */}
      <div className="mb-8 flex gap-2.5">
        <Button variant="outline" className="rounded-full" onClick={() => setIsAddFormVisible(true)}>
          {t("guardrailsPage.text057")}</Button>
      </div>

      {/* ── Tab bar ──────────────────────────────────── */}
      <div className="mb-7 border-b border-border">
        <div className="flex">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px cursor-pointer border-b-[3px] px-5 py-3 text-sm",
                activeTab === tab.key
                  ? "border-info font-medium text-info"
                  : "border-transparent font-normal text-muted-foreground",
              )}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="flex gap-16">
          {/* Left column — overview + details table */}
          <div className="min-w-0 flex-1">
            <h2 className="m-0 mb-3 text-lg font-normal text-foreground">{t("guardrailsPage.text124")}</h2>
            <p className="m-0 mb-8 text-sm leading-[1.7] text-foreground">{description}</p>

            <h2 className="m-0 mb-1 text-lg font-normal text-foreground">{t("guardrailsPage.text126")}</h2>
            <p className="m-0 mb-4 text-[13px] text-muted-foreground">{t("guardrailsPage.text127")}</p>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-50 py-3 text-left font-medium text-muted-foreground">{t("guardrailsPage.text128")}</th>
                  <th className="py-3 text-left font-medium text-muted-foreground">{displayName}</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-3 text-foreground">{row.property}</td>
                    <td className="py-3 text-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column — metadata sidebar like Vertex */}
          <div className="w-60 shrink-0">
            {/* Guardrail ID */}
            <div className="mb-7">
              <div className="mb-1 text-xs text-muted-foreground">{t("guardrailsPage.text077")}</div>
              <div className="break-all text-[13px] text-foreground">litellm/{card.id}</div>
            </div>

            {/* Type */}
            <div className="mb-7">
              <div className="mb-1 text-xs text-muted-foreground">{t("guardrailsPage.text129")}</div>
              <div className="text-[13px] text-foreground">
                {card.category === "litellm" ? t("guardrailsPage.text130") : t("guardrailsPage.text131")}
              </div>
            </div>

            {/* Tags — pill style like Vertex */}
            {card.tags.length > 0 && (
              <div className="mb-7">
                <div className="mb-2 text-xs text-muted-foreground">{t("guardrailsPage.text132")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-2xl border border-border bg-card px-3 py-1 text-xs text-foreground"
                    >
                      {t(`guardrailsGarden.labels.${tag}`, { defaultValue: tag })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "eval" && (
        <div>
          <h2 className="m-0 mb-4 text-lg font-normal text-foreground">{t("guardrailsPage.text125")}</h2>
          <table className="w-full max-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("guardrailsPage.text133")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("guardrailsPage.text134")}</th>
              </tr>
            </thead>
            <tbody>
              {evalRows.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3 text-foreground">{row.metric}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddGuardrailForm
        visible={isAddFormVisible}
        onClose={() => setIsAddFormVisible(false)}
        accessToken={accessToken}
        onSuccess={() => {
          setIsAddFormVisible(false);
          onGuardrailCreated();
        }}
        preset={GUARDRAIL_PRESETS[card.id]}
      />
    </div>
  );
};

export default GuardrailDetailView;
