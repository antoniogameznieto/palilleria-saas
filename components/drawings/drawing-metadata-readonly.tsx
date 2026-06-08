import type { ReactNode } from "react";
import type { DrawingStatus } from "@prisma/client";

import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { FileSize } from "@/components/drawings/file-size";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DrawingMetadataReadonlyProps = {
  originalFileName: string;
  status: DrawingStatus;
  fileSize: bigint | null;
  createdAt: Date;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  createdByLabel: string;
};

export function DrawingMetadataReadonly({
  originalFileName,
  status,
  fileSize,
  createdAt,
  drawingNumber,
  lineNumber,
  revision,
  createdByLabel,
}: DrawingMetadataReadonlyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metadatos del plano</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <MetadataItem label="Archivo" value={originalFileName} />
          <MetadataItem
            label="Estado"
            value={<DrawingStatusBadge status={status} />}
          />
          <MetadataItem
            label="Tamaño"
            value={<FileSize bytes={fileSize} />}
          />
          <MetadataItem
            label="Fecha de subida"
            value={createdAt.toLocaleString("es-ES")}
          />
          <MetadataItem label="Número de plano" value={drawingNumber} />
          <MetadataItem label="Número de línea" value={lineNumber} />
          <MetadataItem label="Revisión" value={revision} />
          <MetadataItem label="Subido por" value={createdByLabel} />
        </dl>
      </CardContent>
    </Card>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : value;

  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{displayValue}</dd>
    </div>
  );
}
