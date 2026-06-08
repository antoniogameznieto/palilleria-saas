import type { JobStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_LABELS } from "@/lib/jobs/labels";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<JobStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  reviewed: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  archived: "bg-secondary text-secondary-foreground",
};

type JobStatusBadgeProps = {
  status: JobStatus;
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_VARIANTS[status])}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}
