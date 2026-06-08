export type ParsedDrawingMetadata = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

/**
 * Casos documentados para validación manual:
 *
 * | Entrada                         | drawingNumber | lineNumber | revision |
 * |---------------------------------|---------------|------------|----------|
 * | 1601GB16A-PL1-L-DW-701-01.pdf   | DW-701        | PL1-L      | 01       |
 * | 1601GB16A-PL1-L-DW-702-02-R0.pdf| DW-702       | PL1-L      | R0       |
 * | 1601GB16A-PL1-L-DW-701.pdf      | DW-701        | PL1-L      | null     |
 * | DW-701.pdf                      | DW-701        | null       | null     |
 * | PL1-L-isometric.pdf             | null          | PL1-L      | null     |
 * | ISO-100-02.pdf                  | null          | null       | 02       |
 * | simple-name.pdf                 | null          | null       | null     |
 */
export const PARSE_FILENAME_DOCUMENTED_CASES: Array<{
  input: string;
  expected: ParsedDrawingMetadata;
}> = [
  {
    input: "1601GB16A-PL1-L-DW-701-01.pdf",
    expected: {
      drawingNumber: "DW-701",
      lineNumber: "PL1-L",
      revision: "01",
    },
  },
  {
    input: "1601GB16A-PL1-L-DW-702-02-R0.pdf",
    expected: {
      drawingNumber: "DW-702",
      lineNumber: "PL1-L",
      revision: "R0",
    },
  },
  {
    input: "DW-701.pdf",
    expected: {
      drawingNumber: "DW-701",
      lineNumber: null,
      revision: null,
    },
  },
  {
    input: "PL1-L-isometric.pdf",
    expected: {
      drawingNumber: null,
      lineNumber: "PL1-L",
      revision: null,
    },
  },
  {
    input: "ISO-100-02.pdf",
    expected: {
      drawingNumber: null,
      lineNumber: null,
      revision: "02",
    },
  },
  {
    input: "simple-name.pdf",
    expected: {
      drawingNumber: null,
      lineNumber: null,
      revision: null,
    },
  },
  {
    input: "1601GB16A-PL1-L-DW-701.pdf",
    expected: {
      drawingNumber: "DW-701",
      lineNumber: "PL1-L",
      revision: null,
    },
  },
];

const MAX_FIELD_LENGTH = 200;

function stripExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0) {
    return trimmed;
  }

  const extension = trimmed.slice(lastDot + 1);

  if (/^[a-z0-9]{1,5}$/i.test(extension)) {
    return trimmed.slice(0, lastDot);
  }

  return trimmed;
}

function tokenize(baseName: string): string[] {
  return baseName
    .split(/[-_.\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function extractRevisionFromBaseName(baseName: string): {
  revision: string | null;
  searchableBaseName: string;
} {
  const leadingZeroRevision = baseName.match(/-(0\d)$/);
  if (leadingZeroRevision) {
    return {
      revision: leadingZeroRevision[1],
      searchableBaseName: baseName.slice(0, -leadingZeroRevision[0].length),
    };
  }

  const rNumberRevision = baseName.match(/-R(\d+)$/i);
  if (rNumberRevision) {
    return {
      revision: `R${rNumberRevision[1]}`,
      searchableBaseName: baseName.slice(0, -rNumberRevision[0].length),
    };
  }

  const letterRevision = baseName.match(/-([A-Z])$/i);
  if (letterRevision && baseName.split("-").length >= 3) {
    return {
      revision: letterRevision[1].toUpperCase(),
      searchableBaseName: baseName.slice(0, -letterRevision[0].length),
    };
  }

  return {
    revision: null,
    searchableBaseName: baseName,
  };
}

function normalizeField(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

function parseRevision(tokens: string[]): {
  revision: string | null;
  remainingTokens: string[];
} {
  if (tokens.length === 0) {
    return { revision: null, remainingTokens: tokens };
  }

  const lastToken = tokens[tokens.length - 1];
  const previousToken = tokens[tokens.length - 2];

  if (
    tokens.length >= 3 &&
    /^\d{1,3}$/.test(lastToken) &&
    previousToken?.toUpperCase() !== "DW"
  ) {
    return {
      revision: lastToken,
      remainingTokens: tokens.slice(0, -1),
    };
  }

  if (tokens.length >= 3 && /^[A-Z]$/i.test(lastToken)) {
    return {
      revision: lastToken.toUpperCase(),
      remainingTokens: tokens.slice(0, -1),
    };
  }

  return { revision: null, remainingTokens: tokens };
}

function parseDrawingNumber(tokens: string[]): string | null {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (current.toUpperCase() === "DW" && /^\d+$/.test(next)) {
      return `DW-${next}`;
    }
  }

  return null;
}

function parseLineNumber(tokens: string[]): string | null {
  for (const token of tokens) {
    if (/^PL\d+-[A-Z]$/i.test(token)) {
      const match = token.match(/^(PL\d+)-([A-Z])$/i);

      if (match) {
        return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
      }
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (/^PL\d+$/i.test(current) && /^[A-Z]$/i.test(next)) {
      return `${current.toUpperCase()}-${next.toUpperCase()}`;
    }
  }

  return null;
}

export function parseDrawingMetadataFromFileName(
  fileName: string,
): ParsedDrawingMetadata {
  const baseName = stripExtension(fileName);
  const { revision: revisionFromBaseName, searchableBaseName } =
    extractRevisionFromBaseName(baseName);
  const tokens = tokenize(searchableBaseName);

  if (tokens.length === 0) {
    return {
      drawingNumber: null,
      lineNumber: null,
      revision: normalizeField(revisionFromBaseName),
    };
  }

  const { revision: revisionFromTokens, remainingTokens } = parseRevision(tokens);
  const revision = revisionFromBaseName ?? revisionFromTokens;

  return {
    drawingNumber: normalizeField(parseDrawingNumber(remainingTokens)),
    lineNumber: normalizeField(parseLineNumber(remainingTokens)),
    revision: normalizeField(revision),
  };
}

export function hasDetectedMetadata(metadata: ParsedDrawingMetadata): boolean {
  return Boolean(
    metadata.drawingNumber || metadata.lineNumber || metadata.revision,
  );
}

type ExistingDrawingMetadata = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

function isEmptyMetadataField(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

export function mergeDetectedMetadata(
  existing: ExistingDrawingMetadata,
  detected: ParsedDrawingMetadata,
): {
  metadataUpdate: {
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  };
  appliedFields: string[];
} {
  const metadataUpdate: {
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  } = {};
  const appliedFields: string[] = [];

  if (isEmptyMetadataField(existing.drawingNumber) && detected.drawingNumber) {
    metadataUpdate.drawingNumber = detected.drawingNumber;
    appliedFields.push("número de plano");
  }

  if (isEmptyMetadataField(existing.lineNumber) && detected.lineNumber) {
    metadataUpdate.lineNumber = detected.lineNumber;
    appliedFields.push("número de línea");
  }

  if (
    isEmptyMetadataField(existing.revision) &&
    detected.revision != null &&
    detected.revision !== ""
  ) {
    metadataUpdate.revision = String(detected.revision);
    appliedFields.push("revisión");
  }

  return { metadataUpdate, appliedFields };
}

export function buildDetectionCompletionMessage(appliedFields: string[]): string {
  if (appliedFields.length === 0) {
    return "Detección completada. No se encontraron metadatos claros en el nombre del archivo.";
  }

  return `Detección completada. Metadatos propuestos desde el nombre del archivo: ${appliedFields.join(", ")}.`;
}
