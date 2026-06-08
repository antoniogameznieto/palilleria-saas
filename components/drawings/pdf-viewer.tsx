type PdfViewerProps = {
  drawingId: string;
  fileName: string;
  variant?: "default" | "hero";
};

export function PdfViewer({
  drawingId,
  fileName,
  variant = "default",
}: PdfViewerProps) {
  const src = `/api/files/drawings/${drawingId}`;
  const isHero = variant === "hero";

  return (
    <section className="space-y-2">
      {isHero ? null : <h3 className="text-lg font-medium">Vista del plano</h3>}
      <iframe
        src={src}
        title={`Vista previa de ${fileName}`}
        className={
          isHero
            ? "h-[min(82vh,900px)] w-full rounded-lg border bg-muted shadow-sm"
            : "h-[70vh] w-full rounded-lg border bg-muted"
        }
      />
      <p className="text-xs text-muted-foreground">
        Si tu navegador no puede mostrar el PDF embebido,{" "}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2"
        >
          ábrelo en una nueva pestaña
        </a>
        .
      </p>
    </section>
  );
}
