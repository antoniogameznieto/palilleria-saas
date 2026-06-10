"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Minus,
} from "lucide-react";

import { ExportTrameadoPackageButton } from "@/components/trameado/export-trameado-package-button";
import { Button } from "@/components/ui/button";
import { formatTrameadoPalilloTotalMm } from "@/lib/trameado/segment-helpers";
import type { TrameadoSheetSuggestion } from "@/lib/trameado/suggestions";
import type { TrameadoSheetValidationResult } from "@/lib/trameado/sheet-validation";
import type {
  TrameadoWizardPrimaryActionKey,
  TrameadoWizardState,
  TrameadoWizardStepId,
  TrameadoWizardStepStatus,
} from "@/lib/trameado/wizard-state";
import {
  buildTrameadoWizardStepSummaries,
  isTrameadoWizardWorkflowComplete,
  resolveTrameadoWizardPrimaryAction,
} from "@/lib/trameado/wizard-state";
import type { SerializedTrameadoSheet } from "@/lib/trameado/db";
import { cn } from "@/lib/utils";

type TrameadoGuidedWizardProps = {
  canManage: boolean;
  wizardState: TrameadoWizardState;
  selectedSheet: SerializedTrameadoSheet | null;
  primarySheetSuggestion: TrameadoSheetSuggestion | null;
  validation: TrameadoSheetValidationResult;
  onCreateSheet: () => void;
  onFocusSuggestions: () => void;
  onAddSegment: () => void;
  onMarkSegment: (segmentId: string) => void;
};

const STEP_META: Array<{
  id: TrameadoWizardStepId;
  number: number;
  title: string;
  summaryTestId?: string;
}> = [
  {
    id: "prepare_sheet",
    number: 1,
    title: "Prepara la hoja de palilleo",
    summaryTestId: "trameado-wizard-active-sheet",
  },
  { id: "review_suggestions", number: 2, title: "Revisa las sugerencias" },
  {
    id: "confirm_segments",
    number: 3,
    title: "Confirma los tramos",
    summaryTestId: "trameado-wizard-segments-count",
  },
  { id: "mark_isometric", number: 4, title: "Marca el isométrico" },
  { id: "validate_sheet", number: 5, title: "Valida la hoja" },
  { id: "download_package", number: 6, title: "Descarga el paquete" },
];

function primaryActionTestId(
  key: TrameadoWizardPrimaryActionKey,
): string | undefined {
  switch (key) {
    case "create_sheet":
      return "trameado-wizard-create-sheet";
    case "add_segment":
      return "trameado-wizard-add-segment";
    case "mark_segments":
      return "trameado-wizard-mark-segment";
    default:
      return undefined;
  }
}

function checklistIcon(displayStatus: string) {
  switch (displayStatus) {
    case "Completo":
      return <Check className="size-3.5 shrink-0" aria-hidden />;
    case "Revisar":
      return <AlertCircle className="size-3.5 shrink-0 text-amber-600" aria-hidden />;
    case "En curso":
      return <CircleDashed className="size-3.5 shrink-0" aria-hidden />;
    default:
      return <Minus className="size-3.5 shrink-0 opacity-50" aria-hidden />;
  }
}

function stepStatusIcon(status: TrameadoWizardStepStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />;
    case "review":
      return <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />;
    case "in_progress":
    case "pending":
      return <CircleDashed className="size-4 shrink-0 text-primary" aria-hidden />;
    default:
      return <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />;
  }
}

function formatMeters(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function WizardStepShell({
  stepNumber,
  title,
  status,
  isCurrent,
  isCompact,
  summary,
  summaryTestId,
  trailing,
  children,
}: {
  stepNumber: number;
  title: string;
  status: TrameadoWizardStepStatus;
  isCurrent: boolean;
  isCompact: boolean;
  summary: string;
  summaryTestId?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border transition-colors",
        isCurrent
          ? "border-primary bg-primary/5 p-4 shadow-sm"
          : isCompact
            ? "border-transparent bg-muted/30 px-3 py-2"
            : status === "blocked"
              ? "border-transparent bg-transparent px-3 py-1.5 opacity-60"
              : "border-border/60 bg-card/50 px-3 py-2",
      )}
      data-testid={`trameado-wizard-step-${stepNumber}`}
      data-step-status={status}
      data-step-expanded={isCurrent ? "true" : "false"}
    >
      <div className="flex items-start gap-2.5">
        {stepStatusIcon(status)}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h4
                className={cn(
                  "font-semibold",
                  isCurrent ? "text-sm" : "text-xs text-muted-foreground",
                )}
              >
                {stepNumber}. {title}
              </h4>
              {isCompact || !isCurrent ? (
                <span
                  className="text-xs text-muted-foreground"
                  data-testid={summaryTestId}
                >
                  {summary}
                </span>
              ) : null}
            </div>
            {trailing}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function TrameadoGuidedWizard({
  canManage,
  wizardState,
  selectedSheet,
  primarySheetSuggestion,
  validation,
  onCreateSheet,
  onFocusSuggestions,
  onAddSegment,
  onMarkSegment,
}: TrameadoGuidedWizardProps) {
  const { checklist, currentStep, suggestionSummary } = wizardState;
  const summaries = buildTrameadoWizardStepSummaries({
    state: wizardState,
    sheetLineIdentifier: selectedSheet?.lineIdentifier,
  });
  const workflowComplete = isTrameadoWizardWorkflowComplete(wizardState);
  const primaryAction = resolveTrameadoWizardPrimaryAction(wizardState, canManage);
  const showLaterSteps = wizardState.hasSheet;

  const handlePrimaryAction = (key: TrameadoWizardPrimaryActionKey) => {
    switch (key) {
      case "create_sheet":
        onCreateSheet();
        break;
      case "review_suggestions":
        onFocusSuggestions();
        break;
      case "add_segment":
        onAddSegment();
        break;
      case "mark_segments": {
        const firstUnmarked = wizardState.unmarkedSegments[0];
        if (firstUnmarked) {
          onMarkSegment(firstUnmarked.id);
        }
        break;
      }
      case "download_package":
        break;
    }
  };

  const renderPrimaryCtaButton = (emphasized: boolean) => {
    if (!primaryAction) {
      return null;
    }

    if (primaryAction.key === "download_package") {
      if (!selectedSheet) {
        return null;
      }

      return (
        <ExportTrameadoPackageButton
          sheetId={selectedSheet.id}
          segmentCount={wizardState.confirmedSegmentsCount}
          markedCount={wizardState.markedSegmentsCount}
          exportTestId="trameado-wizard-export-package"
          hintTestId="trameado-wizard-package-hint"
          disabledTestId="trameado-wizard-export-package-disabled"
          emphasized={emphasized}
        />
      );
    }

    if (!canManage) {
      return null;
    }

    return (
      <Button
        type="button"
        variant={emphasized ? "default" : "outline"}
        size={emphasized ? "default" : "sm"}
        data-testid={primaryActionTestId(primaryAction.key)}
        onClick={() => handlePrimaryAction(primaryAction.key)}
      >
        {primaryAction.label}
      </Button>
    );
  };

  return (
    <div
      className="space-y-4 rounded-xl border-2 border-primary/25 bg-gradient-to-b from-primary/5 to-card p-4 shadow-sm"
      data-testid="trameado-guided-wizard"
      data-current-step={currentStep}
      data-workflow-complete={workflowComplete ? "true" : "false"}
    >
      <header className="space-y-2 border-b border-primary/10 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Empieza aquí
        </p>
        <h3
          className="text-lg font-semibold leading-tight"
          data-testid="trameado-wizard-title"
        >
          Modo guiado de palilleo
        </h3>
        <p className="text-sm text-muted-foreground">
          Sigue estos pasos para completar la hoja, marcar el isométrico y
          descargar el paquete.
        </p>
        {canManage ? (
          <p className="text-xs text-muted-foreground">
            Empieza aquí si es la primera vez que haces este flujo. Puedes usar
            el modo guiado para avanzar paso a paso; la zona inferior sigue
            disponible para ajustes manuales.
          </p>
        ) : (
          <p
            className="text-xs text-muted-foreground"
            data-testid="trameado-wizard-viewer-note"
          >
            Estás en modo revisión: puedes consultar el estado y descargar el
            paquete, pero no modificar la hoja.
          </p>
        )}
      </header>

      <ol
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Progreso del wizard"
        data-testid="trameado-wizard-checklist"
      >
        {checklist.map((item) => (
          <li key={item.id}>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
                item.displayStatus === "En curso"
                  ? "border-primary/40 bg-primary/10 font-medium"
                  : item.displayStatus === "Completo"
                    ? "border-border bg-muted/40"
                    : item.displayStatus === "Revisar"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-transparent bg-muted/20 text-muted-foreground",
              )}
              data-testid={`trameado-wizard-check-${item.id}`}
              data-status={item.displayStatus}
            >
              {checklistIcon(item.displayStatus)}
              <span className="truncate">
                <span className="font-medium">{item.label}</span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{item.displayStatus}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>

      {workflowComplete ? (
        <div
          className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4"
          data-testid="trameado-wizard-complete-banner"
        >
          <p className="text-sm font-semibold">
            Hoja lista para revisar o entregar
          </p>
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            <li>{summaries.confirm_segments}</li>
            <li>{summaries.mark_isometric}</li>
            <li>Validación: {summaries.validate_sheet}</li>
            <li>{summaries.download_package}</li>
          </ul>
          {selectedSheet ? (
            <div data-testid="trameado-wizard-package-cta">
              {renderPrimaryCtaButton(true)}
            </div>
          ) : null}
        </div>
      ) : primaryAction ? (
        <div className="rounded-lg border border-dashed border-primary/30 bg-background/80 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Siguiente paso recomendado
          </p>
          {renderPrimaryCtaButton(true)}
        </div>
      ) : null}

      <div className="space-y-2">
        {STEP_META.map((step) => {
          if (!showLaterSteps && step.id !== "prepare_sheet") {
            return null;
          }

          const status = wizardState.steps[step.id];
          const isCurrent = currentStep === step.id;
          const isCompact = status === "complete" && !isCurrent;

          const packageTrailing =
            step.id === "download_package" &&
            wizardState.canExportPackage &&
            selectedSheet &&
            !isCurrent ? (
              <div data-testid="trameado-wizard-package-cta">
                <ExportTrameadoPackageButton
                  sheetId={selectedSheet.id}
                  segmentCount={wizardState.confirmedSegmentsCount}
                  markedCount={wizardState.markedSegmentsCount}
                  exportTestId="trameado-wizard-export-package"
                  hintTestId="trameado-wizard-package-hint"
                  disabledTestId="trameado-wizard-export-package-disabled"
                  emphasized={workflowComplete}
                />
              </div>
            ) : null;

          return (
            <WizardStepShell
              key={step.id}
              stepNumber={step.number}
              title={step.title}
              status={status}
              isCurrent={isCurrent}
              isCompact={isCompact}
              summary={summaries[step.id]}
              summaryTestId={
                isCompact || !isCurrent ? step.summaryTestId : undefined
              }
              trailing={packageTrailing}
            >
              {isCompact ? null : (
                <div
                  className={cn(
                    "space-y-2",
                    isCurrent ? "mt-2" : "mt-1",
                    !isCurrent && status === "blocked" ? "text-xs" : "text-sm",
                  )}
                >
                  {step.id === "prepare_sheet" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        Primero necesitamos una hoja donde guardar los tramos
                        de esta línea.
                      </p>
                      {primarySheetSuggestion &&
                      !primarySheetSuggestion.alreadyExists ? (
                        <p className="text-xs text-muted-foreground">
                          Sugerencia desde el plano:{" "}
                          <span className="font-medium text-foreground">
                            {primarySheetSuggestion.lineIdentifier}
                          </span>
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === "prepare_sheet" &&
                  wizardState.hasSheet &&
                  selectedSheet ? (
                    <p
                      className="font-medium"
                      data-testid="trameado-wizard-active-sheet"
                    >
                      {summaries.prepare_sheet}
                    </p>
                  ) : null}

                  {step.id === "review_suggestions" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        La app detecta posibles palillos a partir de cotas del
                        plano. Revisa cada sugerencia antes de añadirla.
                      </p>
                      <p data-testid="trameado-wizard-suggestions-summary">
                        Alta confianza: {suggestionSummary.highConfidenceCount}{" "}
                        · Revisar: {suggestionSummary.reviewCount}
                      </p>
                      {suggestionSummary.mode === "unreliable" ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          En este plano las sugerencias automáticas no son
                          fiables. Añade tramos manualmente desde las cotas.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === "confirm_segments" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        Cada tramo confirmado aparecerá en la hoja y en los
                        exports.
                      </p>
                      <p
                        className="font-medium tabular-nums"
                        data-testid="trameado-wizard-segments-count"
                      >
                        {summaries.confirm_segments}
                      </p>
                      {selectedSheet && selectedSheet.segments.length > 0 ? (
                        <div className="overflow-x-auto rounded-md border text-xs">
                          <table className="w-full min-w-[240px]">
                            <thead className="bg-muted/50 text-left">
                              <tr>
                                <th className="px-2 py-1 font-medium">Nº</th>
                                <th className="px-2 py-1 font-medium">PALILLO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSheet.segments.map((segment) => (
                                <tr key={segment.id} className="border-t">
                                  <td className="px-2 py-1">
                                    {segment.segmentLabel}
                                  </td>
                                  <td className="px-2 py-1 tabular-nums">
                                    {segment.palilloLength} mm
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === "mark_isometric" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        Marca en el plano dónde corresponde cada tramo.
                        Selecciona un tramo y haz clic o arrastra sobre el
                        plano.
                      </p>
                      <p
                        className="font-medium tabular-nums"
                        data-testid="trameado-wizard-marks-count"
                      >
                        Marcados {wizardState.markedSegmentsCount}/
                        {wizardState.totalSegmentsCount}
                      </p>
                      {wizardState.unmarkedSegments.length > 0 ? (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {wizardState.unmarkedSegments.map((segment) => (
                            <li key={segment.id}>
                              Pendiente: Nº {segment.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : null}

                  {step.id === "validate_sheet" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        Comparación orientativa con la referencia disponible. No
                        sustituye la revisión del ingeniero.
                      </p>
                      <p data-testid="trameado-wizard-validation-status">
                        Estado:{" "}
                        <span className="font-medium">
                          {validation.statusLabel}
                        </span>
                      </p>
                      <p className="tabular-nums text-xs">
                        Total PALILLO:{" "}
                        {formatTrameadoPalilloTotalMm(validation.totalPalilloMm)}{" "}
                        mm
                        {validation.hasReferenceLength &&
                        validation.referencePipeLengthM != null
                          ? ` · BOM ${formatMeters(validation.referencePipeLengthM)} m`
                          : ""}
                        {validation.deltaPct != null
                          ? ` · ${formatPercent(validation.deltaPct)} %`
                          : ""}
                      </p>
                    </>
                  ) : null}

                  {step.id === "download_package" && isCurrent ? (
                    <>
                      <p className="text-muted-foreground">
                        Incluye Excel, resumen de validación y PDF marcado si hay
                        marcas.
                      </p>
                      {selectedSheet && wizardState.canExportPackage ? (
                        <div data-testid="trameado-wizard-package-cta">
                          <ExportTrameadoPackageButton
                            sheetId={selectedSheet.id}
                            segmentCount={wizardState.confirmedSegmentsCount}
                            markedCount={wizardState.markedSegmentsCount}
                            exportTestId="trameado-wizard-export-package"
                            hintTestId="trameado-wizard-package-hint"
                            disabledTestId="trameado-wizard-export-package-disabled"
                            emphasized
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Añade al menos un tramo para descargar el paquete.
                        </p>
                      )}
                    </>
                  ) : null}

                  {!isCurrent && status !== "blocked" && !isCompact ? (
                    <p className="text-xs text-muted-foreground">
                      {summaries[step.id]}
                    </p>
                  ) : null}

                  {!isCurrent && status === "blocked" ? (
                    <p className="text-xs text-muted-foreground/70">
                      Completa el paso anterior primero.
                    </p>
                  ) : null}
                </div>
              )}
            </WizardStepShell>
          );
        })}
      </div>
    </div>
  );
}
