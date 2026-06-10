"use client";

import Link from "next/link";

import { TrameadoPdfAnnotationLayer } from "@/components/trameado/trameado-pdf-annotation-layer";
import { Button } from "@/components/ui/button";
import type {
  TrameadoPdfAnnotation,
  TrameadoPdfAnnotationSegmentSource,
} from "@/lib/trameado/pdf-annotations";
import { cn } from "@/lib/utils";

type TrameadoPdfPanelProps = {
  drawingId: string;
  fileName: string;
  annotations?: TrameadoPdfAnnotation[];
  markingSegment?: TrameadoPdfAnnotationSegmentSource | null;
  canManage?: boolean;
  onAnnotationCreated?: (annotation: TrameadoPdfAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
};

export function TrameadoPdfPanel({
  drawingId,
  fileName,
  annotations = [],
  markingSegment = null,
  canManage = false,
  onAnnotationCreated,
  onAnnotationDelete,
}: TrameadoPdfPanelProps) {
  const pdfHref = `/api/files/drawings/${drawingId}`;
  const isMarking = Boolean(markingSegment && canManage);

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border bg-card p-4"
      data-testid="trameado-pdf-panel"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Plano / isométrico</h3>
          <p className="text-xs text-muted-foreground">
            Consulta el isométrico mientras introduces los tramos.
            {isMarking ? " Modo marcado activo." : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={pdfHref} target="_blank" rel="noopener noreferrer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="trameado-pdf-open-button"
            >
              Abrir PDF
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <iframe
          src={pdfHref}
          title={`Vista previa de ${fileName}`}
          className={cn(
            "h-[70vh] min-h-[28rem] w-full rounded-lg border bg-muted",
            isMarking && "pointer-events-none",
          )}
          data-testid="trameado-pdf-iframe"
        />
        <TrameadoPdfAnnotationLayer
          annotations={annotations}
          markingSegment={markingSegment ?? null}
          canManage={canManage}
          onAnnotationCreated={(annotation) => onAnnotationCreated?.(annotation)}
          onAnnotationDelete={(annotationId) => onAnnotationDelete?.(annotationId)}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Si tu navegador no puede mostrar el PDF embebido,{" "}
        <Link
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2"
          data-testid="trameado-pdf-open-link"
        >
          ábrelo en una nueva pestaña
        </Link>
        . Las marcas usan coordenadas relativas sobre el visor, no coordenadas
        PDF reales.
      </p>
    </div>
  );
}
