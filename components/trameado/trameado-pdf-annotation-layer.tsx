"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  createPointAnnotation,
  createRectAnnotation,
  type TrameadoPdfAnnotation,
  type TrameadoPdfAnnotationSegmentSource,
} from "@/lib/trameado/pdf-annotations";
import { cn } from "@/lib/utils";

type TrameadoPdfAnnotationLayerProps = {
  annotations: TrameadoPdfAnnotation[];
  markingSegment: TrameadoPdfAnnotationSegmentSource | null;
  canManage: boolean;
  onAnnotationCreated: (annotation: TrameadoPdfAnnotation) => void;
  onAnnotationDelete: (annotationId: string) => void;
};

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

function relativePosition(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

function AnnotationMarker({
  annotation,
  canManage,
  onDelete,
}: {
  annotation: TrameadoPdfAnnotation;
  canManage: boolean;
  onDelete: (annotationId: string) => void;
}) {
  const label = `Nº ${annotation.segmentLabel}`;

  if (annotation.type === "rect" && annotation.width && annotation.height) {
    return (
      <div
        className="absolute border-2 border-primary/80 bg-primary/10"
        style={{
          left: `${annotation.x * 100}%`,
          top: `${annotation.y * 100}%`,
          width: `${annotation.width * 100}%`,
          height: `${annotation.height * 100}%`,
        }}
        data-testid="trameado-pdf-annotation"
        data-annotation-id={annotation.id}
        data-segment-id={annotation.segmentId}
      >
        <span className="absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          {label}
        </span>
        {canManage ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute -right-1 -top-1 h-5 px-1 text-[10px]"
            data-testid="trameado-pdf-annotation-delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(annotation.id);
            }}
          >
            ×
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      data-testid="trameado-pdf-annotation"
      data-annotation-id={annotation.id}
      data-segment-id={annotation.segmentId}
    >
      <span className="block size-3 rounded-full border-2 border-primary bg-primary/30 shadow-sm" />
      <span
        className="mt-1 block rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm"
        data-testid="trameado-pdf-annotation-label"
      >
        {label}
      </span>
      {canManage ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-1 h-5 px-1 text-[10px]"
          data-testid="trameado-pdf-annotation-delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(annotation.id);
          }}
        >
          Borrar
        </Button>
      ) : null}
    </div>
  );
}

export function TrameadoPdfAnnotationLayer({
  annotations,
  markingSegment,
  canManage,
  onAnnotationCreated,
  onAnnotationDelete,
}: TrameadoPdfAnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [previewRect, setPreviewRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isMarking = Boolean(markingSegment && canManage);

  const clearDrag = useCallback(() => {
    dragStateRef.current = null;
    setPreviewRect(null);
  }, []);

  const handlePointerDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isMarking || !markingSegment || !containerRef.current) {
        return;
      }

      const { x, y } = relativePosition(
        containerRef.current,
        event.clientX,
        event.clientY,
      );

      dragStateRef.current = {
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      };
      setPreviewRect(null);
    },
    [isMarking, markingSegment],
  );

  const handlePointerMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;

      if (!dragState || !containerRef.current) {
        return;
      }

      const { x, y } = relativePosition(
        containerRef.current,
        event.clientX,
        event.clientY,
      );

      dragStateRef.current = {
        ...dragState,
        currentX: x,
        currentY: y,
      };

      const width = Math.abs(x - dragState.startX);
      const height = Math.abs(y - dragState.startY);

      if (width >= 0.01 || height >= 0.01) {
        setPreviewRect({
          left: Math.min(dragState.startX, x) * 100,
          top: Math.min(dragState.startY, y) * 100,
          width: width * 100,
          height: height * 100,
        });
      }
    },
    [],
  );

  const finalizeMark = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isMarking || !markingSegment || !containerRef.current) {
        clearDrag();
        return;
      }

      const { x, y } = relativePosition(
        containerRef.current,
        event.clientX,
        event.clientY,
      );
      const dragState = dragStateRef.current;

      if (dragState) {
        const width = Math.abs(x - dragState.startX);
        const height = Math.abs(y - dragState.startY);
        const minX = Math.min(dragState.startX, x);
        const minY = Math.min(dragState.startY, y);

        if (width >= 0.01 && height >= 0.01) {
          const rect = createRectAnnotation({
            segment: markingSegment,
            x: minX,
            y: minY,
            width,
            height,
          });

          if (rect) {
            onAnnotationCreated(rect);
            clearDrag();
            return;
          }
        }
      }

      onAnnotationCreated(
        createPointAnnotation({
          segment: markingSegment,
          x,
          y,
        }),
      );
      clearDrag();
    },
    [clearDrag, isMarking, markingSegment, onAnnotationCreated],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0",
        isMarking ? "cursor-crosshair" : "pointer-events-none",
      )}
      data-testid="trameado-pdf-annotation-overlay"
      data-marking-active={isMarking ? "true" : "false"}
      onMouseDown={isMarking ? handlePointerDown : undefined}
      onMouseMove={isMarking ? handlePointerMove : undefined}
      onMouseUp={isMarking ? finalizeMark : undefined}
    >
      {annotations.map((annotation) => (
        <div key={annotation.id} className="pointer-events-auto">
          <AnnotationMarker
            annotation={annotation}
            canManage={canManage}
            onDelete={onAnnotationDelete}
          />
        </div>
      ))}

      {previewRect ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-primary/70 bg-primary/5"
          style={{
            left: `${previewRect.left}%`,
            top: `${previewRect.top}%`,
            width: `${previewRect.width}%`,
            height: `${previewRect.height}%`,
          }}
          data-testid="trameado-pdf-annotation-preview"
        />
      ) : null}
    </div>
  );
}
