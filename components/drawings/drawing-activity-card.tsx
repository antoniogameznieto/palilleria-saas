import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDrawingActivityActorLabel } from "@/lib/drawings/activity";

type DrawingActivityItem = {
  id: string;
  message: string;
  createdAt: Date;
  actor: {
    name: string | null;
    email: string;
  } | null;
};

type DrawingActivityCardProps = {
  activities: DrawingActivityItem[];
};

export function DrawingActivityCard({ activities }: DrawingActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>
          Historial de subida, detección, metadatos y cambios de estado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay actividad registrada para este plano.
          </p>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <p className="text-sm">{activity.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.createdAt.toLocaleString("es-ES")} ·{" "}
                  {formatDrawingActivityActorLabel(activity.actor)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
