"use client";

import { AlertCircle, CheckCircle2, Circle, CircleDashed } from "lucide-react";

import { ExportTrameadoPackageButton } from "@/components/trameado/export-trameado-package-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TRAMEADO_PACKAGE_MARKED_PDF_ENTRY,
  TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY,
  TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY,
  TRAMEADO_PACKAGE_XLSX_ENTRY,
} from "@/lib/trameado/export-package";
import { formatTrameadoPalilloTotalMm } from "@/lib/trameado/segment-helpers";
import type { TrameadoSheetSuggestion } from "@/lib/trameado/suggestions";
import type { TrameadoSheetValidationResult } from "@/lib/trameado/sheet-validation";
import type {
  TrameadoWizardState,
  TrameadoWizardStepStatus,
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

function checklistBadgeVariant(
  displayStatus: TrameadoWizardState["checklist"][number]["displayStatus"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (displayStatus) {
    case "Completo":
      return "default";
    case "Revisar":
      return "secondary";
    case "En curso":
      return "secondary";
    default:
      return "outline";
  }
}

function stepStatusIcon(status: TrameadoWizardStepStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="size-4 text-primary" aria-hidden />;
    case "review":
      return <AlertCircle className="size-4 text-amber-600" aria-hidden />;
    case "in_progress":
    case "pending":
      return <CircleDashed className="size-4 text-muted-foreground" aria-hidden />;
    default:
      return <Circle className="size-4 text-muted-foreground/50" aria-hidden />;
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

function WizardStep({
  stepNumber,
  title,
  status,
  isCurrent,
  children,
}: {
  stepNumber: number;
  title: string;
  status: TrameadoWizardStepStatus;
  isCurrent: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        isCurrent ? "border-primary/40 bg-primary/5" : "bg-card",
      )}
      data-testid={`trameado-wizard-step-${stepNumber}`}
      data-step-status={status}
    >
      <div className="flex items-start gap-3">
        {stepStatusIcon(status)}
        <div className="min-w-0 flex-1 space-y-2">
          <h4 className="text-sm font-semibold">
            {stepNumber}. {title}
          </h4>
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

  return (
    <div
      className="space-y-4 rounded-lg border-2 border-primary/15 bg-card p-4"
      data-testid="trameado-guided-wizard"
      data-current-step={currentStep}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Modo guiado</h3>
        <p className="text-sm text-muted-foreground">
          Sigue estos pasos para completar la hoja de palilleo y descargar el
          paquete de entrega.
        </p>
        {!canManage ? (
          <p
            className="text-xs text-muted-foreground"
            data-testid="trameado-wizard-viewer-note"
          >
            Tu rol permite revisar y descargar, pero no editar.
          </p>
        ) : null}
      </div>

      <ol
        className="flex flex-wrap gap-2"
        aria-label="Progreso del wizard"
        data-testid="trameado-wizard-checklist"
      >
        {checklist.map((item) => (
          <li key={item.id}>
            <Badge
              variant={checklistBadgeVariant(item.displayStatus)}
              className="gap-1"
              data-testid={`trameado-wizard-check-${item.id}`}
              data-status={item.displayStatus}
            >
              {item.label}: {item.displayStatus}
            </Badge>
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <WizardStep
          stepNumber={1}
          title="Prepara la hoja de palilleo"
          status={wizardState.steps.prepare_sheet}
          isCurrent={currentStep === "prepare_sheet"}
        >
          <p className="text-sm text-muted-foreground">
            Primero necesitamos una hoja donde guardar los tramos de esta línea.
          </p>
          {wizardState.hasSheet && selectedSheet ? (
            <p
              className="text-sm font-medium"
              data-testid="trameado-wizard-active-sheet"
            >
              Hoja activa: {selectedSheet.lineIdentifier}
              {selectedSheet.lineClass ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · CLASE {selectedSheet.lineClass}
                </span>
              ) : null}
            </p>
          ) : (
            <div className="space-y-2">
              {primarySheetSuggestion && !primarySheetSuggestion.alreadyExists ? (
                <p className="text-xs text-muted-foreground">
                  Sugerencia desde el plano:{" "}
                  <span className="font-medium text-foreground">
                    {primarySheetSuggestion.lineIdentifier}
                  </span>
                  {primarySheetSuggestion.diameter ? (
                    <span>
                      {" "}
                      · {primarySheetSuggestion.diameter} · SCH{" "}
                      {primarySheetSuggestion.schedule}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  data-testid="trameado-wizard-create-sheet"
                  onClick={onCreateSheet}
                >
                  Crear hoja de palilleo
                </Button>
              ) : null}
            </div>
          )}
        </WizardStep>

        <WizardStep
          stepNumber={2}
          title="Revisa las sugerencias"
          status={wizardState.steps.review_suggestions}
          isCurrent={currentStep === "review_suggestions"}
        >
          <p className="text-sm text-muted-foreground">
            La app detecta posibles palillos a partir de cotas del plano. Revisa
            cada sugerencia antes de añadirla.
          </p>
          {wizardState.steps.review_suggestions === "blocked" ? (
            <p className="text-xs text-muted-foreground">
              Crea una hoja para ver sugerencias.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p data-testid="trameado-wizard-suggestions-summary">
                Alta confianza: {suggestionSummary.highConfidenceCount} · Revisar:{" "}
                {suggestionSummary.reviewCount}
                {suggestionSummary.onSheetCount > 0
                  ? ` · En hoja: ${suggestionSummary.onSheetCount}`
                  : ""}
              </p>
              {suggestionSummary.mode === "unreliable" ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  En este plano las sugerencias automáticas no son fiables. Añade
                  tramos manualmente desde las cotas.
                </p>
              ) : null}
              {canManage && suggestionSummary.hasActionableSuggestions ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="trameado-wizard-focus-suggestions"
                  onClick={onFocusSuggestions}
                >
                  Ver sugerencias en el panel
                </Button>
              ) : null}
            </div>
          )}
        </WizardStep>

        <WizardStep
          stepNumber={3}
          title="Confirma los tramos"
          status={wizardState.steps.confirm_segments}
          isCurrent={currentStep === "confirm_segments"}
        >
          <p className="text-sm text-muted-foreground">
            Cada tramo confirmado aparecerá en la hoja de palilleo y en los
            exports.
          </p>
          <p
            className="text-sm font-medium tabular-nums"
            data-testid="trameado-wizard-segments-count"
          >
            {wizardState.confirmedSegmentsCount} tramo
            {wizardState.confirmedSegmentsCount === 1 ? "" : "s"} confirmado
            {wizardState.confirmedSegmentsCount === 1 ? "" : "s"}
          </p>
          {selectedSheet && selectedSheet.segments.length > 0 ? (
            <div className="overflow-x-auto rounded-md border text-xs">
              <table className="w-full min-w-[280px]">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Nº</th>
                    <th className="px-2 py-1.5 font-medium">Ø</th>
                    <th className="px-2 py-1.5 font-medium">SCH</th>
                    <th className="px-2 py-1.5 font-medium">PALILLO</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSheet.segments.map((segment) => (
                    <tr key={segment.id} className="border-t">
                      <td className="px-2 py-1.5">{segment.segmentLabel}</td>
                      <td className="px-2 py-1.5">{segment.diameter}</td>
                      <td className="px-2 py-1.5">{segment.schedule}</td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {segment.palilloLength} mm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {canManage && wizardState.confirmedSegmentsCount === 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="trameado-wizard-add-segment"
              onClick={onAddSegment}
            >
              Añadir tramo
            </Button>
          ) : null}
        </WizardStep>

        <WizardStep
          stepNumber={4}
          title="Marca el isométrico"
          status={wizardState.steps.mark_isometric}
          isCurrent={currentStep === "mark_isometric"}
        >
          <p className="text-sm text-muted-foreground">
            Marca en el plano dónde corresponde cada tramo. Esto se usará para
            generar el PDF marcado. Selecciona un tramo y haz clic o arrastra
            sobre el plano.
          </p>
          <p
            className="text-sm font-medium tabular-nums"
            data-testid="trameado-wizard-marks-count"
          >
            Marcados {wizardState.markedSegmentsCount}/
            {wizardState.totalSegmentsCount}
          </p>
          {wizardState.unmarkedSegments.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {wizardState.unmarkedSegments.map((segment) => (
                <li key={segment.id} className="flex flex-wrap items-center gap-2">
                  <span>Pendiente: Nº {segment.label}</span>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      data-testid="trameado-wizard-mark-segment"
                      onClick={() => onMarkSegment(segment.id)}
                    >
                      Marcar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : wizardState.totalSegmentsCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Todos los tramos están marcados.
            </p>
          ) : null}
        </WizardStep>

        <WizardStep
          stepNumber={5}
          title="Valida la hoja"
          status={wizardState.steps.validate_sheet}
          isCurrent={currentStep === "validate_sheet"}
        >
          <p className="text-sm text-muted-foreground">
            La validación compara el total de palillos con la referencia
            disponible. Es una ayuda, no sustituye la revisión del ingeniero.
          </p>
          {wizardState.confirmedSegmentsCount > 0 ? (
            <div className="space-y-1 text-sm">
              <p data-testid="trameado-wizard-validation-status">
                Estado:{" "}
                <span className="font-medium">{validation.statusLabel}</span>
              </p>
              <p className="tabular-nums">
                Total PALILLO: {formatTrameadoPalilloTotalMm(validation.totalPalilloMm)}{" "}
                mm / {formatMeters(validation.totalPalilloM)} m
              </p>
              {validation.hasReferenceLength &&
              validation.referencePipeLengthM != null ? (
                <p className="tabular-nums">
                  Referencia BOM: {formatMeters(validation.referencePipeLengthM)} m
                  {validation.deltaPct != null
                    ? ` · Diferencia: ${formatPercent(validation.deltaPct)} %`
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sin referencia BOM: revisar manualmente.
                </p>
              )}
            </div>
          ) : null}
        </WizardStep>

        <WizardStep
          stepNumber={6}
          title="Descarga el paquete"
          status={wizardState.steps.download_package}
          isCurrent={currentStep === "download_package"}
        >
          <p className="text-sm text-muted-foreground">
            El paquete contiene la hoja Excel, el PDF marcado si hay marcas, y el
            resumen de validación.
          </p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            <li>{TRAMEADO_PACKAGE_XLSX_ENTRY}</li>
            {wizardState.includesMarkedPdfInPackage ? (
              <li>{TRAMEADO_PACKAGE_MARKED_PDF_ENTRY}</li>
            ) : (
              <li className="text-amber-800 dark:text-amber-200">
                {TRAMEADO_PACKAGE_MARKED_PDF_ENTRY} (solo si hay marcas)
              </li>
            )}
            <li>{TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY}</li>
            <li>{TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY}</li>
          </ul>
          {selectedSheet && wizardState.canExportPackage ? (
            <div data-testid="trameado-wizard-package-cta">
              <ExportTrameadoPackageButton
                sheetId={selectedSheet.id}
                segmentCount={wizardState.confirmedSegmentsCount}
                markedCount={wizardState.markedSegmentsCount}
                exportTestId="trameado-wizard-export-package"
                hintTestId="trameado-wizard-package-hint"
                disabledTestId="trameado-wizard-export-package-disabled"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Añade al menos un tramo para descargar el paquete.
            </p>
          )}
        </WizardStep>
      </div>
    </div>
  );
}
