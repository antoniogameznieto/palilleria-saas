import type { JobSettings } from "@prisma/client";

import {
  LENGTH_CRITERIA_LABELS,
  LENGTH_UNIT_LABELS,
} from "@/lib/jobs/labels";

type JobSettingsSummaryProps = {
  settings: JobSettings;
  plain?: boolean;
};

export function JobSettingsSummary({
  settings,
  plain = false,
}: JobSettingsSummaryProps) {
  const booleanLabel = (value: boolean) => (value ? "Sí" : "No");

  return (
    <dl
      className={
        plain
          ? "grid gap-3 text-sm md:grid-cols-2"
          : "grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-2"
      }
    >
      <div>
        <dt className="text-muted-foreground">Criterio de longitud</dt>
        <dd className="mt-1 font-medium">
          {LENGTH_CRITERIA_LABELS[settings.lengthCriteria]}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Unidad</dt>
        <dd className="mt-1 font-medium">
          {LENGTH_UNIT_LABELS[settings.lengthUnit]}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Redondeo</dt>
        <dd className="mt-1 font-medium">{settings.roundingMm ?? "—"} mm</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Revisión antes de exportar</dt>
        <dd className="mt-1 font-medium">
          {booleanLabel(settings.requireReviewBeforeExport)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Separar por diámetro</dt>
        <dd className="mt-1 font-medium">
          {booleanLabel(settings.separateByDiameter)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Separar por schedule</dt>
        <dd className="mt-1 font-medium">
          {booleanLabel(settings.separateBySchedule)}
        </dd>
      </div>
    </dl>
  );
}
