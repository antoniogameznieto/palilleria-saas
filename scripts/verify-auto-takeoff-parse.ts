/**
 * Verificación pura del parser experimental de auto-takeoff (Fase 14B).
 */

import {
  findBomSections,
  parseTakeoffRowsFromEmbeddedText,
} from "../lib/drawings/experimental-auto-takeoff-parse";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const DMS_703_SAMPLE = `
RELACIÓN DE MATERIALES
CANT. DESCRIPCIÓN
1 1.1/2" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11 ESP-1300-3 T>450ºC	1000937601	0.2 M
2 3/4" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11 ESP-1300-3 T>450ºC	1000937596	2.4 M
3 1.1/2" HALF COUPLING SW 6000# A.AL. A-182 F11 ESP-1300-3 T>450ºC	1000938125	1
14 DISCO CIEGO TALADRADO	-	1
SOPORTES
22 STD-PS-050 (PSL)	SUP-001	1
`;

const HL_1289_SAMPLE = `
RELACIÓN DE M ATERIALES
CANT. DESCRIPCIÓN
1 4" SCH 40 TUBERIA AC EXT. BISEL. A-106 B C<=0,25% CE<=0,42%	1000027194	2.0 M
2 3/4" HALF COUPLING AC SW 3000# A-105 C<=0,25% CE<=0,42%	1000039880	1
`;

function main(): void {
  const dmsSections = findBomSections(DMS_703_SAMPLE);
  assert(dmsSections.length > 0, "DMS-703 sample debe detectar sección BOM");

  const dmsRows = parseTakeoffRowsFromEmbeddedText(DMS_703_SAMPLE);
  assert(dmsRows.candidateRows.length === 4, "DMS-703 sample debe parsear 4 filas");
  assert(dmsRows.candidateRows[0]?.item === 1, "Primera fila ítem 1");
  assert(dmsRows.candidateRows[0]?.quantity === "0.2", "Primera fila cantidad 0.2");
  assert(dmsRows.candidateRows[0]?.unit === "M", "Primera fila unidad M");
  assert(
    dmsRows.candidateRows[0]?.reference === "1000937601",
    "Primera fila referencia SAP",
  );
  assert(
    dmsRows.candidateRows[3]?.description === "DISCO CIEGO TALADRADO",
    "Fila sin SAP parseada",
  );
  assert(
    dmsRows.warnings.some((warning) => warning.includes("SOPORTES")),
    "Debe avisar fin en SOPORTES",
  );

  const hlSections = findBomSections(HL_1289_SAMPLE);
  assert(
    hlSections.some((section) => section.id === "RELACION_DE_MATERIALES"),
    "HL-1289 con espacio roto debe normalizar BOM",
  );

  const hlRows = parseTakeoffRowsFromEmbeddedText(HL_1289_SAMPLE);
  assert(hlRows.candidateRows.length === 2, "HL-1289 sample debe parsear 2 filas");

  const empty = parseTakeoffRowsFromEmbeddedText("solo texto sin tabla");
  assert(empty.candidateRows.length === 0, "Texto sin BOM no debe inventar filas");
  assert(empty.warnings.length > 0, "Texto sin BOM debe advertir");

  console.log("verify-auto-takeoff-parse: all checks passed");
}

main();
