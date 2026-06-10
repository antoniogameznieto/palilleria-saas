"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { DrawingOperationalStatusPanel } from "@/components/drawings/drawing-operational-status-panel";
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
}: DrawingDetailWorkspaceProps) {
  const metadataAttention = needsMetadataAttention(progress);
  const defaultTab = useMemo(
    () => resolveDrawingWorkspaceDefaultTab(showBetaProposal, progress),
    [progress, showBetaProposal],
  );
  const [activeTab, setActiveTab] = useState<DrawingWorkspaceTab>(defaultTab);

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
        visible: showBetaProposal && propuestaBeta != null,
        emphasis: showBetaProposal && !metadataAttention,
      },
      { id: "palilleria", label: "Palillería", visible: true },
      { id: "trameado", label: "Trameado", visible: true },
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

      {metadataConfirmation ? null : (
        <DrawingOperationalStatusPanel
          progress={progress}
          showBetaProposal={showBetaProposal}
          takeoffLineCount={takeoffLineCount}
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          onFocusMetadataConfirmation={focusMetadataConfirmation}
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
              {tabPanels[tab.id]}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
