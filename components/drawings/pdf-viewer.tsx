type PdfViewerProps = {
  drawingId: string;
  fileName: string;
  variant?: "default" | "hero" | "panel";
};

export function PdfViewer({
  drawingId,
  fileName,
  variant = "default",
}: PdfViewerProps) {
  const src = `/api/files/drawings/${drawingId}`;
  const isHero = variant === "hero";
  const isPanel = variant === "panel";

  return (
    <section className="space-y-2">
      {isHero || isPanel ? null : (
        <h3 className="text-lg font-medium">Vista del plano</h3>
      )}
      <iframe
        src={src}
        title={`Vista previa de ${fileName}`}
        className={
          isHero
            ? "h-[min(82vh,900px)] w-full rounded-lg border bg-muted shadow-sm"
            : isPanel
              ? "h-[70vh] min-h-[28rem] w-full rounded-lg border bg-muted"
              : "h-[70vh] w-full rounded-lg border bg-muted"
        }
        data-testid={isPanel ? "trameado-pdf-iframe" : undefined}
      />
      <p className="text-xs text-muted-foreground">
        Si tu navegador no puede mostrar el PDF embebido,{" "}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2"
          data-testid={isPanel ? "trameado-pdf-open-link" : undefined}
        >
          ábrelo en una nueva pestaña
        </a>
        .
      </p>
    </section>
  );
}
