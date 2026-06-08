"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  importTakeoffItemsAction,
  type TakeoffImportActionState,
} from "@/lib/actions/takeoff";
import { Button } from "@/components/ui/button";
import {
  isAcceptedTakeoffCsvFile,
  TAKEOFF_CSV_IMPORT_MAX_FILE_SIZE_BYTES,
} from "@/lib/drawings/takeoff-csv-import";

type ImportTakeoffCsvButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
};

const initialState: TakeoffImportActionState = {};

export function ImportTakeoffCsvButton({
  companyId,
  jobId,
  drawingId,
}: ImportTakeoffCsvButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [importState, importAction, isImporting] = useActionState(
    importTakeoffItemsAction,
    initialState,
  );

  useEffect(() => {
    if (importState.success) {
      router.refresh();
    }
  }, [importState.success, router]);

  const handlePickFile = () => {
    setClientError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setClientError(null);

    if (!isAcceptedTakeoffCsvFile(file)) {
      setClientError("Selecciona un archivo CSV válido.");
      return;
    }

    if (file.size > TAKEOFF_CSV_IMPORT_MAX_FILE_SIZE_BYTES) {
      setClientError("El archivo CSV supera el tamaño máximo permitido.");
      return;
    }

    const formData = new FormData();
    formData.append("companyId", companyId);
    formData.append("jobId", jobId);
    formData.append("drawingId", drawingId);
    formData.append("csvContent", await file.text());

    startTransition(() => {
      importAction(formData);
    });
  };

  const feedbackError = clientError ?? importState.error;
  const feedbackSuccess = clientError ? undefined : importState.success;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isImporting}
        onClick={handlePickFile}
      >
        {isImporting ? "Importando..." : "Importar CSV"}
      </Button>

      {feedbackError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{feedbackError}</p>
          {importState.importErrors?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {importState.importErrors.map((entry) => (
                <li key={`${entry.row}-${entry.message}`}>
                  Fila {entry.row}: {entry.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {feedbackSuccess ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {feedbackSuccess}
        </p>
      ) : null}
    </div>
  );
}
