import { Badge } from "@/components/ui/badge";
import {
  isBetaProposalImportNote,
  summarizeTakeoffNotes,
} from "@/lib/drawings/takeoff-notes-display";

type TakeoffItemNotesCellProps = {
  notes: string | null;
};

function formatTooltip(notes: string | null): string | undefined {
  if (notes == null || notes.trim() === "") {
    return undefined;
  }

  return notes.trim();
}

export function TakeoffItemNotesCell({ notes }: TakeoffItemNotesCellProps) {
  const tooltip = formatTooltip(notes);

  if (isBetaProposalImportNote(notes)) {
    return (
      <Badge
        variant="outline"
        className="border-sky-500/40 bg-sky-500/5 text-sky-900 dark:text-sky-100"
        title={tooltip}
        data-testid="takeoff-notes-beta-badge"
      >
        Propuesta beta
      </Badge>
    );
  }

  const summary = summarizeTakeoffNotes(notes);

  return (
    <span className="text-xs text-muted-foreground" title={tooltip}>
      {summary}
    </span>
  );
}
