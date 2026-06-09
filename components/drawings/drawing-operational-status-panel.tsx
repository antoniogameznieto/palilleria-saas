"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DRAWING_PROGRESS_LABELS,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import type { DrawingWorkspaceTab } from "@/lib/drawings/drawing-workspace-default-tab";

type DrawingOperationalStatusPanelProps = {
  progress: DrawingProgressState;
  showBetaProposal: boolean;
  takeoffLineCount: number;
  activeTab: DrawingWorkspaceTab;
  onNavigateTab: (tab: DrawingWorkspaceTab) => void;
  className?: string;
};

type OperationalGuidance = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryTarget: DrawingWorkspaceTab;
  secondaryLabel?: string;
  secondaryTarget?: DrawingWorkspaceTab;
};

type TabBannerAction = {
  type: "tab";
  label: string;
  target: DrawingWorkspaceTab;
};

type SecondaryBannerAction =
  | TabBannerAction
  | { type: "analyze-beta"; label: string };

const METADATA_WORKSPACE_HINT =
  "Puedes seguir revisando la propuesta beta y la palillería, pero completa los metadatos antes de cerrar el plano.";

function getOperationalGuidance(
  progress: DrawingProgressState,
  showBetaProposal: boolean,
  takeoffLineCount: number,
): OperationalGuidance {
  switch (progress) {
    case "error":
      return {
        title: "Plano con error",
        description:
          "Revisa metadatos y actividad reciente antes de continuar.",
        primaryLabel: "Revisar metadatos",
        primaryTarget: "metadatos",
      };
    case "missing_metadata":
      return {
        title: "Faltan metadatos",
        description: showBetaProposal
          ? METADATA_WORKSPACE_HINT
          : "Completa número de plano, línea y revisión para poder cerrar el plano.",
        primaryLabel: "Completar metadatos",
        primaryTarget: "metadatos",
        secondaryLabel: "Ir a palillería",
        secondaryTarget: "palilleria",
      };
    case "metadata_pending_review":
      return {
        title: "Metadatos pendientes de revisión",
        description: showBetaProposal
          ? METADATA_WORKSPACE_HINT
          : "Confirma o corrige los metadatos detectados.",
        primaryLabel: "Revisar metadatos",
        primaryTarget: "metadatos",
        secondaryLabel: showBetaProposal ? "Ir a palillería" : undefined,
        secondaryTarget: showBetaProposal ? "palilleria" : undefined,
      };
    case "takeoff_missing":
      return {
        title: "Sin palillería",
        description: showBetaProposal
          ? "Empieza con la propuesta beta supervisada o añade líneas manualmente."
          : "Añade líneas de palillería para este plano.",
        primaryLabel: showBetaProposal
          ? "Revisar propuesta beta"
          : "Revisar palillería",
        primaryTarget: showBetaProposal ? "propuesta-beta" : "palilleria",
        secondaryLabel: showBetaProposal ? "Ir a palillería" : undefined,
        secondaryTarget: showBetaProposal ? "palilleria" : undefined,
      };
    case "takeoff_pending_review":
      return {
        title: "Palillería pendiente de revisión",
        description:
          "Revisa las líneas y, si aplica, la propuesta beta antes de marcar como revisada.",
        primaryLabel: showBetaProposal
          ? "Revisar propuesta beta"
          : "Revisar palillería",
        primaryTarget: showBetaProposal ? "propuesta-beta" : "palilleria",
        secondaryLabel: "Ir a palillería",
        secondaryTarget: "palilleria",
      };
    case "ready":
      return {
        title: "Plano listo",
        description:
          takeoffLineCount > 0
            ? "Metadatos y palillería revisados. Puedes exportar o seguir ajustando líneas."
            : "Metadatos confirmados.",
        primaryLabel: "Ir a palillería",
        primaryTarget: "palilleria",
        secondaryLabel: showBetaProposal ? "Ver propuesta beta" : undefined,
        secondaryTarget: showBetaProposal ? "propuesta-beta" : undefined,
      };
  }
}

function isBetaNavigationLabel(label: string): boolean {
  return (
    label === "Revisar propuesta beta" || label === "Ver propuesta beta"
  );
}

function resolveBannerActions(
  guidance: OperationalGuidance,
  activeTab: DrawingWorkspaceTab,
  showAnalyzeBeta: boolean,
): { primary: TabBannerAction | null; secondary: SecondaryBannerAction | null } {
  let primaryLabel = guidance.primaryLabel;
  let primaryTarget = guidance.primaryTarget;
  let secondaryLabel = guidance.secondaryLabel;
  let secondaryTarget = guidance.secondaryTarget;

  const onBetaTab = activeTab === "propuesta-beta";

  if (
    onBetaTab &&
    primaryTarget === "propuesta-beta" &&
    isBetaNavigationLabel(primaryLabel)
  ) {
    if (
      secondaryLabel &&
      secondaryTarget &&
      secondaryTarget !== "propuesta-beta"
    ) {
      primaryLabel = secondaryLabel;
      primaryTarget = secondaryTarget;
      secondaryLabel = undefined;
      secondaryTarget = undefined;
    } else {
      primaryLabel = "";
    }
  }

  if (
    onBetaTab &&
    secondaryTarget === "propuesta-beta" &&
    secondaryLabel &&
    isBetaNavigationLabel(secondaryLabel)
  ) {
    secondaryLabel = undefined;
    secondaryTarget = undefined;
  }

  const primary =
    primaryLabel && primaryTarget
      ? {
          type: "tab" as const,
          label: primaryLabel,
          target: primaryTarget,
        }
      : null;

  let secondary: SecondaryBannerAction | null =
    secondaryLabel && secondaryTarget
      ? {
          type: "tab",
          label: secondaryLabel,
          target: secondaryTarget,
        }
      : null;

  if (onBetaTab && showAnalyzeBeta) {
    secondary = {
      type: "analyze-beta",
      label: "Analizar relación de materiales",
    };
  }

  return { primary, secondary };
}

function readBetaNotAnalyzed(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return (
    document
      .querySelector('[data-testid="experimental-auto-takeoff-assistant-status"]')
      ?.getAttribute("data-status") === "not_analyzed"
  );
}

function subscribeBetaAssistantStatus(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const statusNode = document.querySelector(
    '[data-testid="experimental-auto-takeoff-assistant-status"]',
  );
  if (!statusNode) {
    return () => {};
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(statusNode, {
    attributes: true,
    attributeFilter: ["data-status"],
  });

  return () => observer.disconnect();
}

function useBetaNotAnalyzed(
  activeTab: DrawingWorkspaceTab,
  showBetaProposal: boolean,
): boolean {
  return useSyncExternalStore(
    subscribeBetaAssistantStatus,
    () =>
      showBetaProposal &&
      activeTab === "propuesta-beta" &&
      readBetaNotAnalyzed(),
    () => false,
  );
}

function runBetaAnalyzeAction(): void {
  document
    .querySelector<HTMLButtonElement>(
      '[data-testid="experimental-auto-takeoff-run"]',
    )
    ?.click();
}

export function DrawingOperationalStatusPanel({
  progress,
  showBetaProposal,
  takeoffLineCount,
  activeTab,
  onNavigateTab,
  className,
}: DrawingOperationalStatusPanelProps) {
  const guidance = getOperationalGuidance(
    progress,
    showBetaProposal,
    takeoffLineCount,
  );
  const betaNotAnalyzed = useBetaNotAnalyzed(activeTab, showBetaProposal);
  const showAnalyzeBeta = betaNotAnalyzed;
  const { primary, secondary } = resolveBannerActions(
    guidance,
    activeTab,
    showAnalyzeBeta,
  );

  return (
    <section
      className={cn(
        "rounded-lg border px-4 py-3",
        progress === "takeoff_pending_review" &&
          "border-amber-500/40 bg-amber-500/5",
        progress === "ready" && "border-emerald-500/30 bg-emerald-500/5",
        needsMetadataBanner(progress) &&
          "border-violet-500/30 bg-violet-500/5",
        className,
      )}
      data-testid="drawing-operational-status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{guidance.title}</p>
          <p className="text-sm text-muted-foreground">{guidance.description}</p>
          <p className="text-xs text-muted-foreground">
            Estado: {DRAWING_PROGRESS_LABELS[progress]}
          </p>
        </div>

        {primary || secondary ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {primary ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigateTab(primary.target)}
              >
                {primary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (secondary.type === "analyze-beta") {
                    runBetaAnalyzeAction();
                    return;
                  }

                  onNavigateTab(secondary.target);
                }}
              >
                {secondary.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {progress === "takeoff_pending_review" ? (
        <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
          Marca la palillería como revisada solo después de comprobar las líneas
          en la pestaña Palillería.
        </p>
      ) : null}
    </section>
  );
}

function needsMetadataBanner(progress: DrawingProgressState): boolean {
  return (
    progress === "missing_metadata" || progress === "metadata_pending_review"
  );
}
