import { useTranslation } from "@/i18n/useTranslation";
import React from "react";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RoutingDecisionCard from "@/components/view_logs/LogDetailsDrawer/RoutingDecisionCard";
import { AutoRouterRoutingTestResult, testAutoRouterRouting } from "../networking";
import { ComplexityRouterConfigPayload } from "./build_complexity_router_config";
import { buildAutoRouterRoutingTestRequest } from "./build_auto_router_routing_test_request";

interface AutoRouterRoutingTestProps {
  accessToken: string;
  config: ComplexityRouterConfigPayload;
  defaultModel: string | undefined;
  routerName: string | undefined;
  teamId: string | undefined;
}

type TestState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: AutoRouterRoutingTestResult }
  | { status: "failed"; error: string };

const AutoRouterRoutingTest: React.FC<AutoRouterRoutingTestProps> = ({
  accessToken,
  config,
  defaultModel,
  routerName,
  teamId,
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = React.useState<string>("");
  const [state, setState] = React.useState<TestState>({ status: "idle" });

  const send = async () => {
    setState({ status: "running" });
    const params = { prompt, config, defaultModel, routerName, teamId };
    const request = buildAutoRouterRoutingTestRequest(params);
    const response = await testAutoRouterRouting(accessToken, request);
    setState(
      response.status === "success"
        ? { status: "done", result: response.result }
        : { status: "failed", error: response.error },
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("models.sendAPromptThroughThisRouterSClassifier")}</p>

      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={t("models.pasteAPromptAnEndUserWouldSend")}
        rows={4}
        data-testid="auto-router-routing-test-prompt"
      />

      <div className="flex justify-end">
        <Button
          onClick={send}
          disabled={prompt.trim().length === 0 || state.status === "running"}
          data-testid="auto-router-routing-test-send"
        >
          {state.status === "running" ? t("models.routing") : t("models.sendTestPrompt")}
        </Button>
      </div>

      {state.status === "failed" && (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          data-testid="auto-router-routing-test-error"
        >
          <p className="font-medium">{t("models.couldNotRouteThisPrompt")}</p>
          <p>{state.error}</p>
        </div>
      )}

      {state.status === "done" && (
        <div data-testid="auto-router-routing-test-result">
          <div className="flex items-center gap-2 py-2 text-sm">
            <span className="text-muted-foreground">{t("models.routedTo")}</span>
            <Badge variant="secondary" data-testid="auto-router-routing-test-routed-model">
              {state.result.routed_model}
            </Badge>
            {!state.result.routed_model_configured && (
              <span
                className="flex items-center gap-1 text-warning"
                data-testid="auto-router-routing-test-unconfigured"
              >
                <TriangleAlert className="size-3.5" />
                {t("models.thisProxyHasNoModelGroupByThat")}
              </span>
            )}
          </div>
          <RoutingDecisionCard decision={state.result.routing_decision} />
        </div>
      )}
    </div>
  );
};

export default AutoRouterRoutingTest;
