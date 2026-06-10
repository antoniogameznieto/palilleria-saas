"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DrawingOperationalStatusPanel } from "@/components/drawings/drawing-operational-status-panel";
import {
  useBetaAssistantNotAnalyzed,
  useBetaAssistantStatus,
} from "@/components/drawings/use-beta-assistant-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import {
  needsMetadataAttention,
  resolveDrawingWorkspaceDefaultTab,
  type DrawingWorkspaceTab,
} from "@/lib/drawings/drawing-workspace-default-tab";
import { cn } from "@/lib/utils";

export type { DrawingWorkspaceTab as DrawingDetailTab };

type TabOption = {
  id: DrawingWorkspaceTab;
  label: string;
  subtitle?: string;
  visible: boolean;
  emphasis?: boolean;
};

type DrawingDetailWorkspaceProps = {
  pdf: ReactNode;
  palilleria: ReactNode;
  trameado: ReactNode;
  propuestaBeta: ReactNode | null;
  metadatos: ReactNode;
  actividad: ReactNode;
  progress: DrawingProgressState;
  showBetaProposal: boolean;
  takeoffLineCount: number;
  metadataConfirmation?: ReactNode;
  jobHasOtherMetadataPending?: boolean;
  showMaterialsAnalysisPrompt?: boolean;
};

export function DrawingDetailWorkspace({
  pdf,
  palilleria,
  trameado,
  propuestaBeta,
  metadatos,
  actividad,
  progress,
  showBetaProposal,
  takeoffLineCount,
  metadataConfirmation,
  jobHasOtherMetadataPending = false,
  showMaterialsAnalysisPrompt = false,
}: DrawingDetailWorkspaceProps) {
  const metadataAttention = needsMetadataAttention(progress);
  const betaNotAnalyzed = useBetaAssistantNotAnalyzed();
  const betaAssistantStatus = useBetaAssistantStatus();
  const defaultTab = useMemo(
    () => resolveDrawingWorkspaceDefaultTab(showBetaProposal, progress),
    [progress, showBetaProposal],
  );
  const [activeTab, setActiveTab] = useState<DrawingWorkspaceTab>(defaultTab);
  const hideOperationalBannerForBetaFocus =
    showMaterialsAnalysisPrompt &&
    activeTab === "propuesta-beta" &&
    (betaNotAnalyzed ||
      betaAssistantStatus === "analyzed" ||
      betaAssistantStatus === "with_selection");
  const previousProgressRef = useRef(progress);

  useEffect(() => {
    const previousProgress = previousProgressRef.current;
    let nextTab: DrawingWorkspaceTab | null = null;

    if (
      needsMetadataAttention(previousProgress) &&
      !needsMetadataAttention(progress) &&
      progress === "takeoff_missing" &&
      showBetaProposal
    ) {
      nextTab = "propuesta-beta";
    } else if (needsMetadataAttention(progress)) {
      nextTab = "metadatos";
    }

    previousProgressRef.current = progress;

    if (nextTab) {
      queueMicrotask(() => {
        setActiveTab(nextTab);
      });
    }
  }, [progress, showBetaProposal]);

  const focusMetadataConfirmation = useCallback(() => {
    document
      .getElementById("drawing-metadata-confirmation")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab("metadatos");
  }, []);

  const tabOptions = useMemo<TabOption[]>(
    () => [
      {
        id: "propuesta-beta",
        label: "Propuesta beta",
        subtitle:
          "Propuesta previa para generar la palillería. Nada se importa hasta que confirmes.",
        visible: showBetaProposal && propuestaBeta != null,
        emphasis: showBetaProposal && !metadataAttention,
      },
      {
        id: "palilleria",
        label: "Palillería",
        subtitle: "Lista de tramos que se van a cortar o preparar.",
        visible: true,
      },
      {
        id: "trameado",
        label: "Trameado",
        subtitle:
          "Marcado del plano para localizar cada tramo de la palillería.",
        visible: true,
      },
      { id: "pdf", label: "Plano PDF", visible: true },
      {
        id: "metadatos",
        label: "Metadatos",
        visible: true,
        emphasis: metadataAttention,
      },
      { id: "actividad", label: "Actividad", visible: true },
    ],
    [metadataAttention, propuestaBeta, showBetaProposal],
  );

  const visibleTabs = tabOptions.filter((tab) => tab.visible);

  const tabPanels: Record<DrawingWorkspaceTab, ReactNode> = {
    "propuesta-beta": propuestaBeta,
    palilleria,
    trameado,
    pdf,
    metadatos,
    actividad,
  };

  return (
    <div className="space-y-4">
      {metadataConfirmation}

      {metadataConfirmation || hideOperationalBannerForBetaFocus ? null : (
        <DrawingOperationalStatusPanel
          progress={progress}
          showBetaProposal={showBetaProposal}
          takeoffLineCount={takeoffLineCount}
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          onFocusMetadataConfirmation={focusMetadataConfirmation}
          jobHasOtherMetadataPending={jobHasOtherMetadataPending}
        />
      )}

      <Card
        className={cn(
          "min-w-0 overflow-hidden",
          metadataAttention && "border-primary/20",
        )}
      >
        <div className="border-b bg-muted/20 px-3 py-3 sm:px-4">
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Workspace del plano"
          >
            {visibleTabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={activeTab === tab.id ? "default" : "outline"}
                className={cn(
                  "shrink-0",
                  tab.emphasis &&
                    activeTab !== tab.id &&
                    "border-primary/50 text-primary",
                  tab.id === "propuesta-beta" &&
                    tab.emphasis &&
                    activeTab !== tab.id &&
                    "border-sky-500/50 text-sky-900 dark:text-sky-100",
                )}
                aria-pressed={activeTab === tab.id}
                data-testid={`drawing-workspace-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>

        <CardContent className="p-4 sm:p-5">
          {visibleTabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "min-w-0",
                activeTab === tab.id ? "block" : "hidden",
              )}
              aria-hidden={activeTab !== tab.id}
            >
              {tab.subtitle ? (
                <p
                  className="mb-4 text-sm text-muted-foreground"
                  data-testid={`drawing-workspace-tab-subtitle-${tab.id}`}
                >
                  {tab.subtitle}
                </p>
              ) : null}
              {tabPanels[tab.id]}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
