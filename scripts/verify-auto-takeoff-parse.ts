/**
 * Verificación pura del parser y comparador experimental de auto-takeoff (14B/14C).
 */

import {
  compareSuggestedTakeoffWithExisting,
  normalizeTakeoffDescription,
  normalizeTakeoffUnit,
  quantitiesApproximatelyEqual,
} from "../lib/drawings/experimental-auto-takeoff-compare";
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

  assert(normalizeTakeoffUnit("M") === "m", "Unidad M normalizada");
  assert(normalizeTakeoffUnit("UD") === "ud", "Unidad UD normalizada");
  assert(
    quantitiesApproximatelyEqual("2,0", "2.0"),
    "Cantidades con coma/punto equivalentes",
  );
  assert(
    !quantitiesApproximatelyEqual("2", "3"),
    "Cantidades distintas no deben coincidir",
  );
  assert(
    normalizeTakeoffDescription('  TUBERÍA  3/4"  ') ===
      normalizeTakeoffDescription('tuberia 3/4"'),
    "Descripción normalizada sin acentos/espacios",
  );

  const referenceMatch = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 1,
        reference: "1000937601",
        description: '1.1/2" TUBERIA',
        quantity: "0.2",
        unit: "M",
        confidence: 1,
      },
    ],
    [
      {
        reference: "1000937601",
        description: "otra descripcion",
        quantity: "0.2",
        unit: "m",
      },
    ],
  );
  assert(
    referenceMatch.summary.matchedCount === 1,
    "Match por referencia SAP con misma cantidad",
  );

  const descriptionMatch = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 1,
        reference: null,
        description:
          '4" SCH 40 TUBERIA AC EXT. BISEL. A-106 B C<=0,25% CE<=0,42%',
        quantity: "2",
        unit: "m",
        confidence: 0.9,
      },
    ],
    [
      {
        reference: null,
        description:
          '4" SCH 40 TUBERIA AC EXT. BISEL. A-106 B C<=0,25% CE<=0,42%',
        quantity: "2",
        unit: "m",
      },
    ],
  );
  assert(
    descriptionMatch.summary.matchedCount === 1,
    "Match por descripción sin referencia",
  );

  const differentQuantity = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 2,
        reference: "1000937596",
        description: '3/4" TUBERIA',
        quantity: "2.4",
        unit: "M",
        confidence: 1,
      },
    ],
    [
      {
        reference: "1000937596",
        description: "cualquiera",
        quantity: "1",
        unit: "M",
      },
    ],
  );
  assert(
    differentQuantity.summary.differentQuantityCount === 1,
    "Misma referencia con cantidad distinta",
  );

  const uncertain = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 3,
        reference: null,
        description: "texto corto",
        quantity: "1",
        unit: null,
        confidence: 0.4,
      },
    ],
    [],
  );
  assert(uncertain.summary.uncertainCount === 1, "Baja confianza → dudoso");

  const missing = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 4,
        reference: "9999999999",
        description: "material inexistente en palilleria",
        quantity: "5",
        unit: "ud",
        confidence: 0.95,
      },
    ],
    [
      {
        reference: "1000937601",
        description: "otro material",
        quantity: "1",
        unit: "ud",
      },
    ],
  );
  assert(missing.summary.missingCount === 1, "Sin match → falta");

  console.log("verify-auto-takeoff-parse: all checks passed");
}

main();
