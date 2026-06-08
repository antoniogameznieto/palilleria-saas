import type { ReactNode } from "react";

import { FileSize } from "@/components/drawings/file-size";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DrawingMetadataReadonlyProps = {
  fileSize: bigint | null;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  createdByLabel: string;
};

export function DrawingMetadataReadonly({
  fileSize,
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
          <MetadataItem
            label="Tamaño"
            value={<FileSize bytes={fileSize} />}
          />
          <MetadataItem label="Subido por" value={createdByLabel} />
          <MetadataItem label="Número de plano" value={drawingNumber} />
          <MetadataItem label="Número de línea" value={lineNumber} />
          <MetadataItem label="Revisión" value={revision} />
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
