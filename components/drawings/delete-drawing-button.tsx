import { deleteDrawingAction } from "@/lib/actions/drawing";
import { Button } from "@/components/ui/button";

type DeleteDrawingButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
};

export function DeleteDrawingButton({
  companyId,
  jobId,
  drawingId,
}: DeleteDrawingButtonProps) {
  return (
    <form action={deleteDrawingAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <Button type="submit" variant="outline" size="sm">
        Eliminar
      </Button>
    </form>
  );
}
