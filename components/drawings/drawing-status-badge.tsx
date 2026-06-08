import type { DrawingStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { DRAWING_STATUS_LABELS } from "@/lib/drawings/labels";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<DrawingStatus, string> = {
  uploaded: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  detected: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  reviewed: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

type DrawingStatusBadgeProps = {
  status: DrawingStatus;
};

export function DrawingStatusBadge({ status }: DrawingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_VARIANTS[status])}
    >
      {DRAWING_STATUS_LABELS[status]}
    </Badge>
  );
}
