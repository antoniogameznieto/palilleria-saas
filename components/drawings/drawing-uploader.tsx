"use client";

import { FileText, Upload, X } from "lucide-react";
import { useActionState, useCallback, useRef, useState } from "react";

import type { AuthActionState } from "@/lib/actions/auth";
import { uploadDrawingsAction } from "@/lib/actions/drawing";
import { formatFileSize } from "@/lib/drawings/format";
import { isPdfFile } from "@/lib/drawings/pdf-validation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DrawingUploaderProps = {
  companyId: string;
  jobId: string;
  maxUploadSizeMb: number;
};

const initialState: AuthActionState = {};

function setInputFiles(input: HTMLInputElement, files: File[]) {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
}

export function DrawingUploader({
  companyId,
  jobId,
  maxUploadSizeMb,
}: DrawingUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    uploadDrawingsAction,
    initialState,
  );

  const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;

  const syncInputFiles = useCallback((files: File[]) => {
    if (inputRef.current) {
      setInputFiles(inputRef.current, files);
    }
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const nextFiles = [...selectedFiles];
      const errors: string[] = [];

      for (const file of Array.from(incoming)) {
        if (!isPdfFile(file)) {
          errors.push(
            `"${file.name}" no es un PDF válido. Solo se aceptan archivos .pdf.`,
          );
          continue;
        }

        if (file.size === 0) {
          errors.push(`"${file.name}" está vacío.`);
          continue;
        }

        if (file.size > maxUploadSizeBytes) {
          errors.push(
            `"${file.name}" supera el tamaño máximo permitido de ${maxUploadSizeMb} MB.`,
          );
          continue;
        }

        const alreadyAdded = nextFiles.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size,
        );

        if (!alreadyAdded) {
          nextFiles.push(file);
        }
      }

      setSelectedFiles(nextFiles);
      syncInputFiles(nextFiles);
      setClientError(errors.length > 0 ? errors.join(" ") : null);
    },
    [maxUploadSizeBytes, maxUploadSizeMb, selectedFiles, syncInputFiles],
  );

  const removeFile = (index: number) => {
    const nextFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(nextFiles);
    syncInputFiles(nextFiles);
    setClientError(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addFiles(event.target.files);
    }
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const errorMessage = state.error ?? clientError;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />

      <input
        ref={inputRef}
        id="files"
        name="files"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <div className="mb-3 rounded-full bg-background p-3 ring-1 ring-foreground/10">
          <Upload className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">
          Arrastra PDFs aquí o haz clic para seleccionar
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Varios archivos permitidos. Máximo {maxUploadSizeMb} MB por archivo.
        </p>
      </div>

      {selectedFiles.length > 0 ? (
        <ul className="space-y-2 rounded-lg border bg-card p-3">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(index);
                }}
                aria-label={`Quitar ${file.name}`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button type="submit" disabled={isPending || selectedFiles.length === 0}>
        {isPending ? "Subiendo..." : "Subir planos"}
      </Button>
    </form>
  );
}
