import type { ReactNode } from "react";

type CollapsibleJobSectionProps = {
  title: string;
  description: string;
  testId: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function CollapsibleJobSection({
  title,
  description,
  testId,
  defaultOpen = false,
  children,
}: CollapsibleJobSectionProps) {
  return (
    <details
      className="group rounded-xl border border-border/60 bg-card shadow-sm [&>summary::-webkit-details-marker]:hidden"
      data-testid={testId}
      open={defaultOpen || undefined}
    >
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm font-medium text-primary group-open:hidden">
            Mostrar {title.toLowerCase()}
          </p>
          <p className="hidden text-sm font-medium text-primary group-open:block">
            Ocultar {title.toLowerCase()}
          </p>
        </div>
      </summary>
      <div className="border-t px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

type JobWorkflowSecondarySectionsProps = {
  showTechnicalSummary: boolean;
  technicalSummaryDefaultOpen: boolean;
  technicalSummary: ReactNode;
  showTakeoffConsolidated: boolean;
  takeoffConsolidatedDefaultOpen: boolean;
  takeoffConsolidated: ReactNode;
  showSettings: boolean;
  settingsDefaultOpen: boolean;
  settings: ReactNode;
};

export function JobWorkflowSecondarySections({
  showTechnicalSummary,
  technicalSummaryDefaultOpen,
  technicalSummary,
  showTakeoffConsolidated,
  takeoffConsolidatedDefaultOpen,
  takeoffConsolidated,
  showSettings,
  settingsDefaultOpen,
  settings,
}: JobWorkflowSecondarySectionsProps) {
  return (
    <div className="space-y-4">
      {showTechnicalSummary ? (
        <CollapsibleJobSection
          title="Resumen técnico del trabajo"
          description="KPIs de planos, palillería y progreso. Útil cuando ya hay datos que revisar."
          testId="job-technical-summary-section"
          defaultOpen={technicalSummaryDefaultOpen}
        >
          {technicalSummary}
        </CollapsibleJobSection>
      ) : null}

      {showTakeoffConsolidated ? (
        <CollapsibleJobSection
          title="Consolidado de palillería"
          description="Vista global de líneas importadas en el trabajo."
          testId="job-takeoff-consolidated-section-wrapper"
          defaultOpen={takeoffConsolidatedDefaultOpen}
        >
          {takeoffConsolidated}
        </CollapsibleJobSection>
      ) : null}

      {showSettings ? (
        <CollapsibleJobSection
          title="Configuración avanzada"
          description="Settings de palillería y reglas del trabajo."
          testId="job-settings-section-wrapper"
          defaultOpen={settingsDefaultOpen}
        >
          {settings}
        </CollapsibleJobSection>
      ) : null}
    </div>
  );
}
