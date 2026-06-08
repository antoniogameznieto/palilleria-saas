import { archiveJobAction } from "@/lib/actions/job";
import { Button } from "@/components/ui/button";

type ArchiveJobButtonProps = {
  companyId: string;
  jobId: string;
  disabled?: boolean;
};

export function ArchiveJobButton({
  companyId,
  jobId,
  disabled,
}: ArchiveJobButtonProps) {
  return (
    <form action={archiveJobAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" variant="outline" disabled={disabled}>
        Archivar trabajo
      </Button>
    </form>
  );
}
