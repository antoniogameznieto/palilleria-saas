import { Badge } from "@/components/ui/badge";

type TakeoffReviewBadgeProps = {
  takeoffLineCount: number;
  takeoffReviewedAt: string | null;
};

export function TakeoffReviewBadge({
  takeoffLineCount,
  takeoffReviewedAt,
}: TakeoffReviewBadgeProps) {
  if (takeoffLineCount === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (takeoffReviewedAt) {
    return (
      <Badge variant="secondary" className="font-normal">
        Revisada
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="font-normal">
      Pendiente
    </Badge>
  );
}
