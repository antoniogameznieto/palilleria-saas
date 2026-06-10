"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DRAWING_PROGRESS_LABELS,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import type { DrawingWorkspaceTab } from "@/lib/drawings/drawing-workspace-default-tab";
import { needsMetadataAttention } from "@/lib/drawings/drawing-workspace-default-tab";

type DrawingOperationalStatusPanelProps = {
  progress: DrawingProgressState;
  showBetaProposal: boolean;
  takeoffLineCount: number;
  activeTab: DrawingWorkspaceTab;
  onNavigateTab: (tab: DrawingWorkspaceTab) => void;
  onFocusMetadataConfirmation?: () => void;
  jobHasOtherMetadataPending?: boolean;
  className?: string;
};

type OperationalGuidance = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryTarget?: DrawingWorkspaceTab;
  primaryAction?: "focus-metadata-confirmation" | "analyze-beta";
  secondaryLabel?: string;
  secondaryTarget?: DrawingWorkspaceTab;
};

type TabBannerAction = {
  type: "tab";
  label: string;
  target: DrawingWorkspaceTab;
};

type PrimaryBannerAction =
  | TabBannerAction
  | { type: "focus-metadata-confirmation"; label: string }
  | { type: "analyze-beta"; label: string };

type SecondaryBannerAction =
  | TabBannerAction
  | { type: "analyze-beta"; label: string };

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
        description:
          "Confirma la propuesta de metadatos del plano antes de analizar materiales o palillería.",
        primaryLabel: "Confirmar metadatos",
        primaryAction: "focus-metadata-confirmation",
      };
    case "metadata_pending_review":
      return {
        title: "Metadatos pendientes de revisión",
        description:
          "Confirma o corrige la propuesta antes de avanzar con materiales y palillería.",
        primaryLabel: "Confirmar metadatos",
        primaryAction: "focus-metadata-confirmation",
      };
    case "takeoff_missing":
      if (showBetaProposal) {
        return {
          title: "Analizar relación de materiales",
          description:
            "Los metadatos del plano ya están confirmados. Revisa los materiales detectados en el PDF para preparar la propuesta de palillería.",
          primaryLabel: "Analizar relación de materiales",
          primaryTarget: "propuesta-beta",
          primaryAction: "analyze-beta",
          secondaryLabel: "Ir a palillería",
          secondaryTarget: "palilleria",
        };
      }

      return {
        title: "Sin palillería",
        description: "Añade líneas de palillería para este plano.",
        primaryLabel: "Revisar palillería",
        primaryTarget: "palilleria",
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
  metadataAttention: boolean,
  progress: DrawingProgressState,
  showBetaProposal: boolean,
): { primary: PrimaryBannerAction | null; secondary: SecondaryBannerAction | null } {
  let primaryLabel = guidance.primaryLabel;
  let primaryTarget = guidance.primaryTarget;
  let primaryAction = guidance.primaryAction;
  let secondaryLabel = guidance.secondaryLabel;
  let secondaryTarget = guidance.secondaryTarget;

  const onBetaTab = activeTab === "propuesta-beta";
  const materialsStep =
    progress === "takeoff_missing" && showBetaProposal && !metadataAttention;

  if (
    materialsStep &&
    onBetaTab &&
    showAnalyzeBeta &&
    guidance.primaryAction === "analyze-beta"
  ) {
    return {
      primary: {
        type: "analyze-beta",
        label: guidance.primaryLabel,
      },
      secondary:
        guidance.secondaryLabel && guidance.secondaryTarget
          ? {
              type: "tab",
              label: guidance.secondaryLabel,
              target: guidance.secondaryTarget,
            }
          : null,
    };
  }

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
      primaryAction = undefined;
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

  const primary: PrimaryBannerAction | null =
    primaryAction === "analyze-beta" && onBetaTab && showAnalyzeBeta
      ? {
          type: "analyze-beta",
          label: primaryLabel,
        }
      : primaryAction === "focus-metadata-confirmation"
    ? {
        type: "focus-metadata-confirmation",
        label: primaryLabel,
      }
    : primaryLabel && primaryTarget
      ? {
          type: "tab",
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

  if (
    !metadataAttention &&
    onBetaTab &&
    showAnalyzeBeta &&
    !materialsStep &&
    guidance.primaryAction !== "analyze-beta"
  ) {
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
  metadataAttention: boolean,
): boolean {
  return useSyncExternalStore(
    subscribeBetaAssistantStatus,
    () =>
      !metadataAttention &&
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
  onFocusMetadataConfirmation,
  jobHasOtherMetadataPending = false,
  className,
}: DrawingOperationalStatusPanelProps) {
  const metadataAttention = needsMetadataAttention(progress);
  const guidance = getOperationalGuidance(
    progress,
    showBetaProposal,
    takeoffLineCount,
  );
  const betaNotAnalyzed = useBetaNotAnalyzed(
    activeTab,
    showBetaProposal,
    metadataAttention,
  );
  const showAnalyzeBeta = betaNotAnalyzed;
  const { primary, secondary } = resolveBannerActions(
    guidance,
    activeTab,
    showAnalyzeBeta,
    metadataAttention,
    progress,
    showBetaProposal,
  );
  const showMaterialsStepNote =
    progress === "takeoff_missing" && showBetaProposal && !metadataAttention;

  return (
    <section
      className={cn(
        "rounded-lg border px-4 py-3",
        progress === "takeoff_pending_review" &&
          "border-amber-500/40 bg-amber-500/5",
        progress === "ready" && "border-emerald-500/30 bg-emerald-500/5",
        metadataAttention && "border-violet-500/30 bg-violet-500/5",
        showMaterialsStepNote && "border-sky-500/30 bg-sky-500/5",
        className,
      )}
      data-testid="drawing-operational-status"
      data-progress={progress}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{guidance.title}</p>
          <p className="text-sm text-muted-foreground">{guidance.description}</p>
          <p className="text-xs text-muted-foreground">
            Estado: {DRAWING_PROGRESS_LABELS[progress]}
          </p>
          {metadataAttention ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="drawing-metadata-step-note"
            >
              Paso actual del trabajo: confirmar metadatos.
            </p>
          ) : null}
          {showMaterialsStepNote ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="drawing-materials-step-note"
            >
              Paso actual del trabajo: analizar relación de materiales.
            </p>
          ) : null}
          {showMaterialsStepNote && jobHasOtherMetadataPending ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="drawing-job-other-metadata-banner-note"
            >
              Este plano ya tiene metadatos completos. Puedes analizar sus
              materiales. El trabajo todavía puede tener otros planos pendientes.
            </p>
          ) : null}
        </div>

        {primary || secondary ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {primary ? (
              <Button
                type="button"
                size="sm"
                data-testid={
                  primary.type === "focus-metadata-confirmation"
                    ? "drawing-operational-confirm-metadata"
                    : primary.type === "analyze-beta"
                      ? "drawing-operational-analyze-materials"
                      : undefined
                }
                onClick={() => {
                  if (primary.type === "focus-metadata-confirmation") {
                    onFocusMetadataConfirmation?.();
                    return;
                  }

                  if (primary.type === "analyze-beta") {
                    runBetaAnalyzeAction();
                    return;
                  }

                  onNavigateTab(primary.target);
                }}
              >
                {primary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid={
                  secondary.type === "analyze-beta"
                    ? "drawing-operational-analyze-materials"
                    : undefined
                }
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

      {metadataAttention && showBetaProposal ? (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="drawing-materials-after-metadata-note"
        >
          Analizar relación de materiales estará disponible después de confirmar
          metadatos.
        </p>
      ) : null}

      {progress === "takeoff_pending_review" ? (
        <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
          Marca la palillería como revisada solo después de comprobar las líneas
          en la pestaña Palillería.
        </p>
      ) : null}
    </section>
  );
}
