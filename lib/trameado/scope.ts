export function parseDrawingScopeFormData(formData: FormData):
  | { error: string }
  | { companyId: string; jobId: string; drawingId: string } {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." };
  }

  return { companyId, jobId, drawingId };
}

export function parseTrameadoSheetScopeFormData(formData: FormData):
  | { error: string }
  | {
      companyId: string;
      jobId: string;
      drawingId: string;
      sheetId: string;
    } {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return scope;
  }

  const sheetId = formData.get("sheetId");

  if (typeof sheetId !== "string" || sheetId.length === 0) {
    return { error: "Hoja de trameado no válida." };
  }

  return { ...scope, sheetId };
}

export function parseTrameadoSegmentScopeFormData(formData: FormData):
  | { error: string }
  | {
      companyId: string;
      jobId: string;
      drawingId: string;
      segmentId: string;
    } {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return scope;
  }

  const segmentId = formData.get("segmentId");

  if (typeof segmentId !== "string" || segmentId.length === 0) {
    return { error: "Tramo de trameado no válido." };
  }

  return { ...scope, segmentId };
}
