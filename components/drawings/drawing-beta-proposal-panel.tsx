import { DrawingExperimentalAutoTakeoff } from "@/components/drawings/drawing-experimental-auto-takeoff";
import { DrawingMaterialsAnalysisPromptCard } from "@/components/drawings/drawing-materials-analysis-prompt-card";

type DrawingBetaProposalPanelProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  existingTakeoffLineCount: number;
  showMaterialsAnalysisPrompt?: boolean;
  jobHasOtherMetadataPending?: boolean;
};

export function DrawingBetaProposalPanel({
  companyId,
  jobId,
  drawingId,
  existingTakeoffLineCount,
  showMaterialsAnalysisPrompt = false,
  jobHasOtherMetadataPending = false,
}: DrawingBetaProposalPanelProps) {
  return (
    <div className="space-y-4" id="propuesta-beta">
      {showMaterialsAnalysisPrompt ? (
        <DrawingMaterialsAnalysisPromptCard
          jobHasOtherMetadataPending={jobHasOtherMetadataPending}
        />
      ) : (
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Propuesta beta supervisada</h3>
          <p className="text-sm text-muted-foreground">
            Analiza la relación de materiales del PDF, revisa la propuesta
            clasificada e importa solo las líneas que confirmes. No es palillería
            final automática.
          </p>
        </div>
      )}

      <DrawingExperimentalAutoTakeoff
        companyId={companyId}
        jobId={jobId}
        drawingId={drawingId}
        existingTakeoffLineCount={existingTakeoffLineCount}
        deferPrimaryAnalyzeCta={showMaterialsAnalysisPrompt}
        focusReviewFlow={showMaterialsAnalysisPrompt}
      />
    </div>
  );
}
