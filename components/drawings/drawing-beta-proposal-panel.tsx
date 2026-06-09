import { DrawingExperimentalAutoTakeoff } from "@/components/drawings/drawing-experimental-auto-takeoff";

type DrawingBetaProposalPanelProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  existingTakeoffLineCount: number;
};

export function DrawingBetaProposalPanel({
  companyId,
  jobId,
  drawingId,
  existingTakeoffLineCount,
}: DrawingBetaProposalPanelProps) {
  return (
    <div className="space-y-4" id="propuesta-beta">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Propuesta beta supervisada</h3>
        <p className="text-sm text-muted-foreground">
          Analiza la relación de materiales del PDF, revisa la propuesta
          clasificada e importa solo las líneas que confirmes. No es palillería
          final automática.
        </p>
      </div>

      <DrawingExperimentalAutoTakeoff
        companyId={companyId}
        jobId={jobId}
        drawingId={drawingId}
        existingTakeoffLineCount={existingTakeoffLineCount}
      />
    </div>
  );
}
