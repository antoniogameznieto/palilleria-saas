/** Debe coincidir con `EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_NOTE` en import experimental. */
const BETA_PROPOSAL_IMPORT_NOTE_PREFIX =
  "Importado desde extracción experimental de relación de materiales";

export function isBetaProposalImportNote(notes: string | null): boolean {
  if (notes == null || notes.trim() === "") {
    return false;
  }

  return notes.trim().startsWith(BETA_PROPOSAL_IMPORT_NOTE_PREFIX);
}

export function summarizeTakeoffNotes(notes: string | null, maxLength = 36): string {
  if (notes == null || notes.trim() === "") {
    return "—";
  }

  const trimmed = notes.trim();

  if (isBetaProposalImportNote(trimmed)) {
    return "Propuesta beta";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}
