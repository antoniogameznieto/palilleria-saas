"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrameadoPdfAnnotationSummary } from "@/lib/trameado/pdf-annotations";
import { formatPalilloLength } from "@/lib/trameado/format";

type TrameadoIsoMarkingPanelProps = {
  summary: TrameadoPdfAnnotationSummary;
  hasActiveSheet: boolean;
  canManage: boolean;
  markingSegmentLabel: string | null;
  annotationError?: string | null;
  isSaving?: boolean;
  onCancelMarking?: () => void;
  onMarkSegment?: (segmentId: string) => void;
  onDeleteAnnotation?: (segmentId: string) => void;
};

export function TrameadoIsoMarkingPanel({
  summary,
  hasActiveSheet,
  canManage,
  markingSegmentLabel,
  annotationError = null,
  isSaving = false,
  onCancelMarking,
  onMarkSegment,
  onDeleteAnnotation,
}: TrameadoIsoMarkingPanelProps) {
  if (!hasActiveSheet) {
    return (
      <section
        className="rounded-lg border bg-card p-4"
        data-testid="trameado-iso-marking-panel"
      >
        <h3 className="text-sm font-semibold">Marcado del isométrico</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea una hoja para marcar tramos en el plano.
        </p>
      </section>
    );
  }

  if (summary.totalCount === 0) {
    return (
      <section
        className="rounded-lg border bg-card p-4"
        data-testid="trameado-iso-marking-panel"
      >
        <h3 className="text-sm font-semibold">Marcado del isométrico</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirma tramos antes de marcarlos en el isométrico.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border bg-card p-4"
      data-testid="trameado-iso-marking-panel"
      data-saving={isSaving ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Marcado del isométrico</h3>
          <p
            className="text-xs text-muted-foreground"
            data-testid="trameado-iso-marking-summary"
          >
            Tramos marcados: {summary.markedCount}/{summary.totalCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Las marcas se guardan con la hoja. Coordenadas relativas al visor.
          </p>
        </div>
        {markingSegmentLabel ? (
          <Badge variant="secondary" data-testid="trameado-iso-marking-active">
            Marcando Nº {markingSegmentLabel}
          </Badge>
        ) : null}
      </div>

      {canManage && markingSegmentLabel ? (
        <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
          <p data-testid="trameado-iso-marking-hint">
            Haz clic en el isométrico para marcar el tramo Nº {markingSegmentLabel}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            data-testid="trameado-iso-marking-cancel"
            onClick={onCancelMarking}
          >
            Cancelar marcado
          </Button>
        </div>
      ) : null}

      {annotationError ? (
        <p
          className="mt-3 text-sm text-destructive"
          data-testid="trameado-iso-marking-error"
        >
          {annotationError}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {summary.items.map((item) => (
          <li
            key={item.segmentId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/10 px-3 py-2 text-sm"
            data-testid="trameado-iso-marking-item"
            data-segment-id={item.segmentId}
            data-marked={item.marked ? "true" : "false"}
          >
            <div className="min-w-0">
              <span className="font-medium">
                Nº {item.segmentLabel} · PALILLO{" "}
                {formatPalilloLength(item.palilloLength, "mm")}
              </span>
              <p className="text-xs text-muted-foreground">
                {item.marked ? "Marcado" : "Pendiente de marcar"}
              </p>
            </div>

            {canManage ? (
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="trameado-mark-on-drawing"
                  disabled={isSaving}
                  onClick={() => onMarkSegment?.(item.segmentId)}
                >
                  {item.marked ? "Volver a marcar" : "Marcar en plano"}
                </Button>
                {item.marked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    data-testid="trameado-delete-annotation"
                    disabled={isSaving}
                    onClick={() => onDeleteAnnotation?.(item.segmentId)}
                  >
                    Borrar marca
                  </Button>
                ) : null}
              </div>
            ) : (
              <Badge variant={item.marked ? "default" : "outline"}>
                {item.marked ? "Marcado" : "Pendiente de marcar"}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
