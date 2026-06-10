"use client";

import { Button } from "@/components/ui/button";

type DrawingMaterialsAnalysisPromptCardProps = {
  jobHasOtherMetadataPending?: boolean;
};

function runMaterialsAnalysis(): void {
  document
    .querySelector<HTMLButtonElement>(
      '[data-testid="experimental-auto-takeoff-run"]',
    )
    ?.click();
}

export function DrawingMaterialsAnalysisPromptCard({
  jobHasOtherMetadataPending = false,
}: DrawingMaterialsAnalysisPromptCardProps) {
  return (
    <section
      className="rounded-xl border-2 border-sky-500/25 bg-sky-500/5 p-4 shadow-sm"
      data-testid="drawing-materials-analysis-prompt"
    >
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-200">
          Paso actual del trabajo
        </p>
        <h2 className="text-lg font-semibold leading-tight">
          Analiza la relación de materiales
        </h2>
        <p className="text-sm text-muted-foreground">
          Los metadatos del plano ya están confirmados. Ahora revisa los
          materiales detectados en el PDF para preparar la propuesta de
          palillería.
        </p>
        {jobHasOtherMetadataPending ? (
          <p
            className="text-xs text-muted-foreground"
            data-testid="drawing-job-other-metadata-note"
          >
            Este plano ya tiene metadatos completos. Puedes analizar sus
            materiales. El trabajo todavía puede tener otros planos pendientes.
          </p>
        ) : null}
      </header>

      <Button
        type="button"
        className="mt-4"
        onClick={runMaterialsAnalysis}
        data-testid="drawing-materials-analysis-prompt-run"
      >
        Analizar relación de materiales
      </Button>
    </section>
  );
}
