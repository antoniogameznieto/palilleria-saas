"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  initialVisibleCount?: number;
  plain?: boolean;
};

export function DrawingActivityCard({
  activities,
  initialVisibleCount = 20,
  plain = false,
}: DrawingActivityCardProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleActivities = showAll
    ? activities
    : activities.slice(0, initialVisibleCount);
  const hasHiddenActivities = activities.length > initialVisibleCount;

  const content = (
    <>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay actividad registrada para este plano.
        </p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-4">
            {visibleActivities.map((activity) => (
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

          {hasHiddenActivities ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll
                ? "Ver menos actividad"
                : `Ver actividad completa (${activities.length})`}
            </Button>
          ) : null}
        </div>
      )}
    </>
  );

  if (plain) {
    return <div className="space-y-3">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>
          Historial de subida, detección, metadatos y cambios de estado.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
