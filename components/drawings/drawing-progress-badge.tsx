import { Badge } from "@/components/ui/badge";
import {
  DRAWING_PROGRESS_LABELS,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import { cn } from "@/lib/utils";

const PROGRESS_VARIANTS: Record<DrawingProgressState, string> = {
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  missing_metadata: "bg-muted text-muted-foreground",
  metadata_pending_review:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  takeoff_missing: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  takeoff_pending_review:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ready: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

type DrawingProgressBadgeProps = {
  progress: DrawingProgressState;
  className?: string;
};

export function DrawingProgressBadge({
  progress,
  className,
}: DrawingProgressBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-normal", PROGRESS_VARIANTS[progress], className)}
    >
      {DRAWING_PROGRESS_LABELS[progress]}
    </Badge>
  );
}
