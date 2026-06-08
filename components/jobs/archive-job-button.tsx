import { archiveJobAction } from "@/lib/actions/job";
import { Button } from "@/components/ui/button";

type ArchiveJobButtonProps = {
  companyId: string;
  jobId: string;
  disabled?: boolean;
  size?: "default" | "sm";
};

export function ArchiveJobButton({
  companyId,
  jobId,
  disabled,
  size = "default",
}: ArchiveJobButtonProps) {
  return (
    <form action={archiveJobAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" variant="outline" size={size} disabled={disabled}>
        Archivar trabajo
      </Button>
    </form>
  );
}
