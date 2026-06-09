/**
 * Verificación pura del parser y comparador experimental de auto-takeoff (14B/14C).
 */

import path from "node:path";

import {
  compareSuggestedTakeoffWithExisting,
  normalizeTakeoffDescription,
  normalizeTakeoffUnit,
  quantitiesApproximatelyEqual,
} from "../lib/drawings/experimental-auto-takeoff-compare";
import {
  EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS,
  EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX,
  buildExperimentalSuggestionKey,
  normalizeSelectedSuggestionKeys,
  resolveSelectedSuggestionsForImport,
  toImportableTakeoffRow,
} from "../lib/drawings/experimental-auto-takeoff-import";
import { canAccessExperimentalAutoTakeoff } from "../lib/drawings/experimental-auto-takeoff-config";
import {
  BETA_NO_IMPORTABLE_PROPOSAL_NOTE,
  buildBetaProposalSummary,
  buildExperimentalAssistantDiscoveryCopy,
  buildExperimentalAssistantMetrics,
  buildExperimentalBusinessMetrics,
  buildExperimentalImportPreviewSummary,
  filterExperimentalSuggestions,
  formatExperimentalImportConfirmMessage,
  getAllReadyProposalKeys,
  getBulkSelectableMissingKeys,
  getVisibleImportableMissingKeys,
  groupBetaProposalItems,
  hasBetaImportableProposal,
  isBetaExcludedProposalItem,
  isBetaReadyProposalItem,
  isBetaReviewProposalItem,
  isExperimentalAssistantStepComplete,
  isExperimentalSuggestionBulkSelectable,
  isExperimentalSuggestionImportable,
  mergeSelectionWithAllReady,
  mergeSelectionWithVisibleMissing,
  resolveExperimentalAssistantActiveStep,
  resolveExperimentalAssistantStatus,
} from "../lib/drawings/experimental-auto-takeoff-ui";
import {
  aggregateAutoTakeoffBenchmarkResults,
  bucketConfidence,
  dedupePdfPathsByBasename,
  matchesPdfNameFilter,
} from "../lib/drawings/auto-takeoff-benchmark";
import { runAutoTakeoffGoldenValidation } from "../lib/drawings/auto-takeoff-golden-run";
import {
  applyBusinessRulesToSuggestion,
  applyBusinessRulesToSuggestionInput,
} from "../lib/drawings/auto-takeoff-business-rules";
import {
  classifyExtractedRows,
  matchBusinessExpectedRows,
  suggestionMatchesBusinessExpectedRow,
} from "../lib/drawings/auto-takeoff-business-validate";
import {
  matchGoldenExpectedRows,
  suggestionMatchesGoldenExpectedRow,
} from "../lib/drawings/auto-takeoff-golden-validate";
import {
  findBomSections,
  parseTakeoffRowsFromEmbeddedText,
} from "../lib/drawings/experimental-auto-takeoff-parse";
import {
  analyzeOutOfBomEmbeddedText,
  assessOutOfBomLineParseability,
  resolveOutOfBomTextRegion,
} from "../lib/drawings/out-of-bom-research";

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

async function main(): Promise<void> {
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

  const dmsRowsWithSupport = parseTakeoffRowsFromEmbeddedText(DMS_703_SAMPLE, {
    includeSupportRows: true,
  });
  assert(
    dmsRowsWithSupport.candidateRows.length === 5,
    "DMS-703 con soporte opt-in parsea 5 filas",
  );
  const dmsSupportRow = dmsRowsWithSupport.candidateRows.find(
    (row) => row.reference === "SUP-001",
  );
  assert(dmsSupportRow != null, "DMS-703 extrae SUP-001");
  assert(
    dmsSupportRow?.description?.includes("STD-PS-050") === true,
    "DMS-703 soporte con STD-PS en descripción",
  );
  assert(dmsSupportRow?.unit === "ud", "DMS-703 soporte unidad ud");
  assert(
    dmsSupportRow?.confidence === 0.8,
    "DMS-703 soporte confianza media",
  );

  const noSupportSample = `
RELACION DE MATERIALES
1 TUBERIA EXT\t1000937596\t1.0 M
NOTAS : NO NECESITA SOPORTES
`;
  const noSupportRows = parseTakeoffRowsFromEmbeddedText(noSupportSample, {
    includeSupportRows: true,
  });
  assert(
    !noSupportRows.candidateRows.some((row) => row.reference?.startsWith("SUP-")),
    "NO NECESITA SOPORTES no genera fila de soporte",
  );

  const looseSupportSample = `
RELACION DE MATERIALES
1 TUBERIA AC EXT\t1000027194\t2.0 M
SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)
`;
  const looseSupportRows = parseTakeoffRowsFromEmbeddedText(looseSupportSample, {
    includeSupportRows: true,
  });
  assert(
    !looseSupportRows.candidateRows.some((row) => row.reference === "SUP-001"),
    "Mención suelta de soporte no genera fila automática",
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

  const key = buildExperimentalSuggestionKey({
    item: 1,
    reference: "1000937601",
    description: '1.1/2" TUBERIA',
    quantity: "0.2",
    unit: "M",
  });
  assert(key.includes("1000937601"), "Suggestion key incluye referencia");

  const verifiedMissingBase = {
    item: 1,
    reference: "1000937601",
    description: '1.1/2" TUBERIA',
    quantity: "0.2",
    unit: "M",
    confidence: 1,
    comparisonStatus: "missing" as const,
    suggestionKey: key,
  };
  const verifiedMissing = [
    {
      ...verifiedMissingBase,
      ...applyBusinessRulesToSuggestionInput(verifiedMissingBase),
    },
  ];

  const importOk = resolveSelectedSuggestionsForImport({
    verifiedItems: verifiedMissing,
    selectedSuggestionKeys: [key],
  });
  assert(importOk.ok, "Importación resuelve sugerencia missing verificada");
  assert(
    importOk.ok && importOk.rows[0]?.reference === "1000937601",
    "Fila importable conserva referencia",
  );

  const importRejected = resolveSelectedSuggestionsForImport({
    verifiedItems: verifiedMissing,
    selectedSuggestionKeys: ["clave-inventada"],
  });
  assert(!importRejected.ok, "Clave inventada rechazada");

  const importMatchedRejected = resolveSelectedSuggestionsForImport({
    verifiedItems: [
      {
        ...verifiedMissing[0],
        comparisonStatus: "matched",
      },
    ],
    selectedSuggestionKeys: [key],
  });
  assert(!importMatchedRejected.ok, "No importa sugerencias matched");
  assert(
    !importMatchedRejected.ok &&
      importMatchedRejected.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidKeys,
    "Matched devuelve error invalidKeys",
  );

  const importDifferentQuantityRejected = resolveSelectedSuggestionsForImport({
    verifiedItems: [
      {
        ...verifiedMissing[0],
        comparisonStatus: "differentQuantity",
      },
    ],
    selectedSuggestionKeys: [key],
  });
  assert(
    !importDifferentQuantityRejected.ok &&
      importDifferentQuantityRejected.error ===
        EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidKeys,
    "DifferentQuantity devuelve invalidKeys",
  );

  const importUncertainRejected = resolveSelectedSuggestionsForImport({
    verifiedItems: [
      {
        ...verifiedMissing[0],
        comparisonStatus: "uncertain",
      },
    ],
    selectedSuggestionKeys: [key],
  });
  assert(
    !importUncertainRejected.ok &&
      importUncertainRejected.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidKeys,
    "Uncertain devuelve invalidKeys",
  );

  const emptySelection = normalizeSelectedSuggestionKeys([]);
  assert(
    !emptySelection.ok &&
      emptySelection.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.emptySelection,
    "Selección vacía rechazada",
  );

  const duplicateKeys = normalizeSelectedSuggestionKeys([key, key]);
  assert(
    !duplicateKeys.ok &&
      duplicateKeys.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.duplicateKeys,
    "Claves duplicadas rechazadas",
  );

  const maxKeys = Array.from(
    { length: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX + 1 },
    (_, index) => `key-${index}`,
  );
  const overMax = normalizeSelectedSuggestionKeys(maxKeys);
  assert(
    !overMax.ok &&
      overMax.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.maxExceeded,
    "Límite máximo protegido",
  );

  assert(
    toImportableTakeoffRow({
      item: 1,
      reference: "1000937601",
      description: "",
      quantity: "1",
      unit: "ud",
    }) === null,
    "Descripción vacía no importable",
  );

  assert(
    toImportableTakeoffRow({
      item: 1,
      reference: "1000937601",
      description: "Material válido con descripción",
      quantity: "no-es-numero",
      unit: "ud",
    }) === null,
    "Cantidad inválida no importable",
  );

  const invalidRowImport = resolveSelectedSuggestionsForImport({
    verifiedItems: [
      {
        ...verifiedMissing[0],
        quantity: "no-es-numero",
        suggestionKey: buildExperimentalSuggestionKey({
          ...verifiedMissing[0],
          quantity: "no-es-numero",
        }),
      },
    ],
    selectedSuggestionKeys: [
      buildExperimentalSuggestionKey({
        ...verifiedMissing[0],
        quantity: "no-es-numero",
      }),
    ],
  });
  assert(
    !invalidRowImport.ok &&
      invalidRowImport.error === EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidRow,
    "Fila inválida devuelve invalidRow",
  );

  const importExcludeRejected = resolveSelectedSuggestionsForImport({
    verifiedItems: [
      {
        ...verifiedMissing[0],
        businessAction: "exclude",
        businessCategory: "exclusion",
        businessReason: "Excluida por prueba",
        businessConfidence: "high",
      },
    ],
    selectedSuggestionKeys: [key],
  });
  assert(
    !importExcludeRejected.ok &&
      importExcludeRejected.error ===
        EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.excludeNotImportable,
    "Exclude no importable en servidor",
  );

  function withBusinessRuleFields<
    T extends {
      item: number | null;
      reference: string | null;
      description: string | null;
      quantity: string | null;
      unit: string | null;
      confidence: number;
      comparisonStatus: "matched" | "missing" | "differentQuantity" | "uncertain";
      suggestionKey: string;
    },
  >(item: T) {
    return {
      ...item,
      ...applyBusinessRulesToSuggestionInput(item),
    };
  }

  const uiItems = [
    withBusinessRuleFields({
      item: 1,
      reference: "1000937601",
      description: '1.1/2" TUBERIA',
      quantity: "0.2",
      unit: "M",
      confidence: 1,
      comparisonStatus: "matched" as const,
      suggestionKey: "k-matched",
    }),
    withBusinessRuleFields({
      item: 2,
      reference: "1000937596",
      description: '3/4" TUBERIA',
      quantity: "2.4",
      unit: "M",
      confidence: 1,
      comparisonStatus: "missing" as const,
      suggestionKey: "k-missing",
    }),
    withBusinessRuleFields({
      item: 3,
      reference: null,
      description: "texto corto",
      quantity: "1",
      unit: null,
      confidence: 0.4,
      comparisonStatus: "uncertain" as const,
      suggestionKey: "k-uncertain",
    }),
    withBusinessRuleFields({
      item: 14,
      reference: null,
      description: "DISCO CIEGO TALADRADO",
      quantity: "1",
      unit: "ud",
      confidence: 0.9,
      comparisonStatus: "missing" as const,
      suggestionKey: "k-review",
    }),
    withBusinessRuleFields({
      item: 15,
      reference: "1000196324",
      description: '3/4" FIGURA 8 1500# RF',
      quantity: "1",
      unit: "ud",
      confidence: 0.95,
      comparisonStatus: "missing" as const,
      suggestionKey: "k-exclude",
    }),
  ];

  const missingOnly = filterExperimentalSuggestions(uiItems, {
    statusFilter: "missing",
    searchQuery: "",
  });
  assert(missingOnly.length === 3, "Filtro Faltan devuelve missing (include, review, exclude)");

  const searchRef = filterExperimentalSuggestions(uiItems, {
    statusFilter: "all",
    searchQuery: "1000937596",
  });
  assert(searchRef.length === 1, "Búsqueda por referencia");

  const excludeOnly = filterExperimentalSuggestions(uiItems, {
    statusFilter: "all",
    actionFilter: "exclude",
    searchQuery: "",
  });
  assert(
    excludeOnly.length === 1 && excludeOnly[0]?.businessAction === "exclude",
    "Filtro acción Excluir",
  );

  const includeOnly = filterExperimentalSuggestions(uiItems, {
    statusFilter: "missing",
    actionFilter: "include",
    searchQuery: "",
  });
  assert(includeOnly.length === 1, "Filtro acción Incluir en missing");

  const reviewOnly = filterExperimentalSuggestions(uiItems, {
    statusFilter: "missing",
    actionFilter: "review",
    searchQuery: "",
  });
  assert(reviewOnly.length === 1, "Filtro acción Revisar en missing");

  const visibleMissing = getVisibleImportableMissingKeys(missingOnly);
  assert(
    visibleMissing.length === 1 && visibleMissing[0] === "k-missing",
    "Visible missing keys solo include",
  );

  const bulkSelectable = getBulkSelectableMissingKeys(missingOnly);
  assert(
    bulkSelectable.length === 1 && bulkSelectable[0] === "k-missing",
    "Bulk selectable solo include missing",
  );

  assert(
    !isExperimentalSuggestionImportable(
      uiItems.find((item) => item.suggestionKey === "k-exclude")!,
    ),
    "Exclude no importable en UI",
  );
  assert(
    isExperimentalSuggestionImportable(
      uiItems.find((item) => item.suggestionKey === "k-review")!,
    ),
    "Review missing importable manualmente",
  );
  assert(
    isExperimentalSuggestionBulkSelectable(
      uiItems.find((item) => item.suggestionKey === "k-review")!,
    ) === false,
    "Review no seleccionable en masa",
  );

  const merged = mergeSelectionWithVisibleMissing(new Set(["k-matched"]), visibleMissing);
  assert(
    merged.size === 2 && merged.has("k-missing") && !merged.has("k-review"),
    "Selección masiva añade solo include missing visibles",
  );

  const businessMetrics = buildExperimentalBusinessMetrics(uiItems);
  assert(businessMetrics.include >= 2, "Métricas negocio include");
  assert(businessMetrics.review === 2, "Métricas negocio review (disco ciego + desconocido)");
  assert(businessMetrics.exclude === 1, "Métricas negocio exclude");

  const betaGroups = groupBetaProposalItems(uiItems);
  assert(betaGroups.ready.length === 1, "Grupo ready = include + missing");
  assert(betaGroups.review.length === 1, "Grupo review = review + missing");
  assert(betaGroups.excluded.length === 1, "Grupo excluded = exclude");
  assert(
    isBetaReadyProposalItem(uiItems.find((item) => item.suggestionKey === "k-missing")!),
    "Ready item include missing",
  );
  assert(
    !isBetaReadyProposalItem(uiItems.find((item) => item.suggestionKey === "k-matched")!),
    "Matched no entra en ready",
  );
  assert(
    isBetaReviewProposalItem(uiItems.find((item) => item.suggestionKey === "k-review")!),
    "Review group item",
  );
  assert(
    isBetaExcludedProposalItem(uiItems.find((item) => item.suggestionKey === "k-exclude")!),
    "Excluded group item",
  );

  const betaSummary = buildBetaProposalSummary(uiItems, {
    matchedCount: 1,
    missingCount: 3,
    differentQuantityCount: 0,
    uncertainCount: 1,
  });
  assert(betaSummary.readyCount === 1, "Resumen beta ready");
  assert(betaSummary.reviewCount === 1, "Resumen beta review");
  assert(betaSummary.excludedCount === 1, "Resumen beta excluded");
  assert(betaSummary.alreadyExistingCount === 1, "Resumen beta ya existen");

  const allReady = getAllReadyProposalKeys(uiItems);
  assert(allReady.length === 1 && allReady[0] === "k-missing", "Todas las listas para incluir");

  const allReadyMerged = mergeSelectionWithAllReady(
    new Set(["k-review"]),
    allReady,
  );
  assert(
    allReadyMerged.size === 2 &&
      allReadyMerged.has("k-missing") &&
      allReadyMerged.has("k-review") &&
      !allReadyMerged.has("k-exclude"),
    "Select all ready no incluye review/exclude/matched",
  );

  const zeroReadyItems = [
    withBusinessRuleFields({
      item: 1,
      reference: "1000937601",
      description: '1.1/2" TUBERIA',
      quantity: "0.2",
      unit: "M",
      confidence: 1,
      comparisonStatus: "matched" as const,
      suggestionKey: "k-only-matched",
    }),
    withBusinessRuleFields({
      item: 14,
      reference: null,
      description: "DISCO CIEGO TALADRADO",
      quantity: "1",
      unit: "ud",
      confidence: 0.9,
      comparisonStatus: "missing" as const,
      suggestionKey: "k-only-review",
    }),
    withBusinessRuleFields({
      item: 15,
      reference: "1000196324",
      description: '3/4" FIGURA 8 1500# RF',
      quantity: "1",
      unit: "ud",
      confidence: 0.95,
      comparisonStatus: "missing" as const,
      suggestionKey: "k-only-exclude",
    }),
  ];
  const zeroReadySummary = buildBetaProposalSummary(zeroReadyItems, {
    matchedCount: 1,
    missingCount: 2,
    differentQuantityCount: 0,
    uncertainCount: 0,
  });
  assert(zeroReadySummary.readyCount === 0, "Resumen beta 0 ready");
  assert(zeroReadySummary.reviewCount === 1, "Resumen beta solo review");
  assert(zeroReadySummary.excludedCount === 1, "Resumen beta solo exclude");
  assert(getAllReadyProposalKeys(zeroReadyItems).length === 0, "All-ready vacío");
  assert(
    mergeSelectionWithAllReady(new Set(), []).size === 0,
    "Select all ready con lista vacía no añade claves",
  );
  assert(
    !isExperimentalSuggestionImportable(
      zeroReadyItems.find((item) => item.suggestionKey === "k-only-matched")!,
    ),
    "Matched no importable en UI",
  );
  assert(
    !isExperimentalSuggestionImportable(
      zeroReadyItems.find((item) => item.suggestionKey === "k-only-exclude")!,
    ),
    "Exclude no importable en UI",
  );
  assert(
    !isExperimentalSuggestionBulkSelectable(
      zeroReadyItems.find((item) => item.suggestionKey === "k-only-exclude")!,
    ),
    "Exclude nunca bulk selectable",
  );
  assert(
    hasBetaImportableProposal(zeroReadyItems),
    "Review missing mantiene propuesta importable",
  );
  assert(
    !hasBetaImportableProposal([zeroReadyItems[0]!, zeroReadyItems[2]!]),
    "Solo matched+exclude no es importable",
  );
  assert(
    BETA_NO_IMPORTABLE_PROPOSAL_NOTE.includes("No hay líneas nuevas importables"),
    "Copy sin propuesta importable",
  );

  const previewReview = buildExperimentalImportPreviewSummary(
    uiItems,
    new Set(["k-review"]),
  );
  assert(
    previewReview?.hasReviewSelected === true &&
      previewReview.reviewWarningMessage != null,
    "Preview avisa si hay review seleccionadas",
  );

  assert(!canAccessExperimentalAutoTakeoff("viewer"), "Viewer sin acceso beta");
  assert(canAccessExperimentalAutoTakeoff("engineer"), "Engineer con acceso beta");
  assert(canAccessExperimentalAutoTakeoff("owner"), "Owner con acceso beta");
  assert(canAccessExperimentalAutoTakeoff("admin"), "Admin con acceso beta");

  const preview = buildExperimentalImportPreviewSummary(
    uiItems,
    new Set(["k-missing"]),
  );

  if (!preview || preview.lineCount !== 1) {
    throw new Error("Resumen previo cuenta líneas");
  }

  assert(
    preview.quantityByUnit.some((entry) => entry.unit === "m" && entry.total === 2.4),
    "Resumen previo suma por unidad",
  );
  assert(
    formatExperimentalImportConfirmMessage(preview).includes(
      "Se crearán 1 línea(s) reales",
    ),
    "Mensaje de confirmación incluye conteo",
  );

  const assistantAnalyzed = resolveExperimentalAssistantStatus({
    hasAnalysisResult: true,
    hasSuggestions: true,
    selectedCount: 0,
    importSuccess: false,
    takeoffReviewInvalidated: false,
  });
  assert(assistantAnalyzed === "analyzed", "Estado asistente analizado");

  const assistantSelection = resolveExperimentalAssistantStatus({
    hasAnalysisResult: true,
    hasSuggestions: true,
    selectedCount: 2,
    importSuccess: false,
    takeoffReviewInvalidated: false,
  });
  assert(
    assistantSelection === "with_selection",
    "Estado asistente con selección",
  );
  assert(
    resolveExperimentalAssistantActiveStep(assistantSelection) === "import",
    "Paso activo import con selección",
  );

  const discovery = buildExperimentalAssistantDiscoveryCopy({
    suggestedCount: 21,
    comparisonSummary: {
      matchedCount: 1,
      missingCount: 20,
      differentQuantityCount: 0,
      uncertainCount: 0,
    },
  });

  if (!discovery) {
    throw new Error("Copy descubrimiento esperado");
  }

  assert(
    discovery.headline.includes("21 posible"),
    "Copy descubrimiento con total",
  );
  assert(
    discovery.businessRulesNote.includes("requiere revisión humana"),
    "Copy beta supervisada",
  );
  assert(
    discovery.safetyNote.includes("No se importa nada automáticamente"),
    "Copy aviso no autoimportación",
  );

  const assistantMetrics = buildExperimentalAssistantMetrics({
    suggestedCount: 21,
    comparisonSummary: {
      matchedCount: 1,
      missingCount: 20,
      differentQuantityCount: 0,
      uncertainCount: 0,
    },
    selectedCount: 3,
  });
  assert(assistantMetrics.selected === 3, "Métricas incluyen seleccionadas");
  assert(
    isExperimentalAssistantStepComplete("analyze", "with_selection"),
    "Paso analizar completado con selección",
  );

  assert(
    matchesPdfNameFilter("DMS-703.pdf", "DMS-70"),
    "Filtro match substring",
  );
  assert(
    !matchesPdfNameFilter("HL-1289.pdf", "^DMS"),
    "Filtro match regex excluye",
  );

  const deduped = dedupePdfPathsByBasename([
    "/a/DMS-703.pdf",
    "/b/dms-703.pdf",
    "/c/HL-1289.pdf",
  ]);
  assert(deduped.length === 2, "Dedupe por basename");
  assert(deduped[0] === "/a/DMS-703.pdf", "Conserva primera ruta en dedupe");

  assert(bucketConfidence(0.95) === "high", "Bucket alta confianza");
  assert(bucketConfidence(0.6) === "medium", "Bucket media confianza");
  assert(bucketConfidence(0.2) === "low", "Bucket baja confianza");

  const aggregated = aggregateAutoTakeoffBenchmarkResults([
    {
      path: "/a/DMS-703.pdf",
      fileName: "DMS-703.pdf",
      relativePath: "a/DMS-703.pdf",
      fileSizeBytes: 1000,
      pageCount: 1,
      embeddedTextLength: 5000,
      hasUsefulEmbeddedText: true,
      sectionsFound: ["RELACION_DE_MATERIALES"],
      trackedSectionsFound: ["RELACION_DE_MATERIALES"],
      suggestedRowCount: 21,
      averageConfidence: 0.92,
      rowsWithReference: 18,
      rowsWithoutReference: 3,
      unitsDetected: ["m", "ud"],
      warnings: [],
      confidenceBuckets: { high: 20, medium: 1, low: 0 },
      error: null,
      errorType: null,
    },
    {
      path: "/b/scan.pdf",
      fileName: "scan.pdf",
      relativePath: "b/scan.pdf",
      fileSizeBytes: 2000,
      pageCount: 1,
      embeddedTextLength: 12,
      hasUsefulEmbeddedText: false,
      sectionsFound: [],
      trackedSectionsFound: [],
      suggestedRowCount: 0,
      averageConfidence: null,
      rowsWithReference: 0,
      rowsWithoutReference: 0,
      unitsDetected: [],
      warnings: [],
      confidenceBuckets: { high: 0, medium: 0, low: 0 },
      error: null,
      errorType: null,
    },
  ]);

  assert(aggregated.pdfsAnalyzed === 2, "Agregado cuenta PDFs");
  assert(aggregated.pdfsWithBomDetected === 1, "Agregado BOM detectada");
  assert(aggregated.totalSuggestedRows === 21, "Agregado total filas");
  assert(
    aggregated.averageRowsPerPdfWithBom === 21,
    "Agregado media filas con BOM",
  );

  const goldenSuggestion = {
    item: 1,
    reference: "1000937601",
    description: '1.1/2" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11',
    quantity: "0.2",
    unit: "M",
    confidence: 1,
    warnings: [],
    rawLine: "",
    lineNumber: 1,
  };

  assert(
    suggestionMatchesGoldenExpectedRow(goldenSuggestion, {
      reference: "1000937601",
      quantity: "0.2",
      unit: "m",
      descriptionContains: "TUBERIA EXT",
    }),
    "Golden match por ref/cantidad/desc",
  );

  const goldenMatches = matchGoldenExpectedRows({
    expectedRows: [
      {
        reference: "1000937601",
        quantity: "0.2",
        unit: "m",
        descriptionContains: "TUBERIA EXT",
      },
      {
        reference: "1000937596",
        quantity: "2.4",
        descriptionContains: "3/4",
      },
    ],
    suggestions: [
      goldenSuggestion,
      {
        item: 2,
        reference: "1000937596",
        description: '3/4" SCH 160 TUBERIA',
        quantity: "2.4",
        unit: "M",
        confidence: 1,
        warnings: [],
        rawLine: "",
        lineNumber: 2,
      },
    ],
  });

  assert(goldenMatches.every((match) => match.matched), "Golden match greedy 1:1");

  assert(
    suggestionMatchesBusinessExpectedRow(goldenSuggestion, {
      reference: "1000937601",
      quantity: "0.2",
      unit: "m",
      descriptionContains: "TUBERIA EXT",
      category: "pipe",
      businessRequired: true,
    }),
    "Business match por ref/cantidad/desc",
  );

  const businessMatches = matchBusinessExpectedRows({
    expectedRows: [
      {
        reference: "1000937601",
        quantity: "0.2",
        unit: "m",
        descriptionContains: "TUBERIA EXT",
        category: "pipe",
        businessRequired: true,
      },
      {
        reference: "1000196324",
        quantity: "1",
        descriptionContains: "FIGURA 8",
        category: "blind",
        businessRequired: false,
      },
    ],
    suggestions: [
      goldenSuggestion,
      {
        item: 6,
        reference: "1000196324",
        description: '3/4" FIGURA 8 1500# RF',
        quantity: "1",
        unit: null,
        confidence: 1,
        warnings: [],
        rawLine: "",
        lineNumber: 6,
      },
    ],
  });

  assert(businessMatches[0]?.matched, "Business required match");
  const businessClassifications = classifyExtractedRows({
    suggestions: [
      goldenSuggestion,
      {
        item: 6,
        reference: "1000196324",
        description: '3/4" FIGURA 8 1500# RF',
        quantity: "1",
        unit: null,
        confidence: 1,
        warnings: [],
        rawLine: "",
        lineNumber: 6,
      },
    ],
    rowMatches: businessMatches,
  });
  assert(businessClassifications[0]?.usefulForTakeoff, "Fila útil para takeoff");
  assert(
    businessClassifications[1]?.bomCorrectNotUseful,
    "FIGURA 8 correcta pero no requerida",
  );

  const rowFixture = (
    description: string,
    reference: string | null = "1000000001",
  ) => ({
    item: 1,
    reference,
    description,
    quantity: "1",
    unit: "M",
    confidence: 1,
    warnings: [] as string[],
    rawLine: "",
    lineNumber: 1,
  });

  const figura8Rule = applyBusinessRulesToSuggestion(
    rowFixture('3/4" FIGURA 8 1500# RF AA'),
  );
  assert(figura8Rule.businessCategory === "exclusion", "FIGURA 8 exclusion");
  assert(figura8Rule.businessAction === "exclude", "FIGURA 8 exclude");

  const pipeRule = applyBusinessRulesToSuggestion(
    rowFixture('1.1/2" SCH 160 TUBERIA EXT. PLANOS'),
  );
  assert(pipeRule.businessCategory === "pipe", "Tubería pipe");
  assert(pipeRule.businessAction === "include", "Tubería include");

  const valveRule = applyBusinessRulesToSuggestion(
    rowFixture('3/4" VALVULA COMPUERTA FORJADA C-238'),
  );
  assert(valveRule.businessCategory === "valve", "Válvula valve");
  assert(valveRule.businessAction === "include", "Válvula include");

  const flangeRule = applyBusinessRulesToSuggestion(
    rowFixture('3/4" SCH 160 BRIDA SW RF 1500#'),
  );
  assert(flangeRule.businessCategory === "flange", "Brida flange");
  assert(flangeRule.businessAction === "include", "Brida include");

  const gasketRule = applyBusinessRulesToSuggestion(
    rowFixture('3/4" JUNTA ESPIROM. 1500# RF'),
  );
  assert(gasketRule.businessCategory === "gasket", "Junta gasket");
  assert(gasketRule.businessAction === "include", "Junta include");

  const boltRule = applyBusinessRulesToSuggestion(
    rowFixture('3/4"x120mm ESPARRAGO+2 TUERCAS'),
  );
  assert(boltRule.businessCategory === "bolt", "Espárrago bolt");
  assert(boltRule.businessAction === "include", "Espárrago include");

  const supportRule = applyBusinessRulesToSuggestion(
    rowFixture("STD-PS-050 (PSL) SOPORTE"),
  );
  assert(supportRule.businessCategory === "support", "Soporte support");
  assert(supportRule.businessAction === "review", "Soporte review");

  const unknownRule = applyBusinessRulesToSuggestion(
    rowFixture("ELEMENTO AUXILIAR SIN CLASIFICAR XYZ-99"),
  );
  assert(unknownRule.businessCategory === "unknown", "Desconocido unknown");
  assert(unknownRule.businessAction === "review", "Desconocido review");

  const outOfBomDms = analyzeOutOfBomEmbeddedText({
    text: DMS_703_SAMPLE,
    fileName: "dms-703-sample.txt",
    path: "sample",
    pageCount: 1,
  });
  assert(outOfBomDms.hasSoportesBlock, "DMS sample tiene bloque SOPORTES");
  assert(
    outOfBomDms.supportCandidates.some(
      (candidate) => candidate.parseability === "tab_row_support",
    ),
    "DMS sample soporte tabular post-SOPORTES",
  );
  assert(
    outOfBomDms.supportCandidates.some((candidate) => candidate.patternId === "std_ps"),
    "DMS sample detecta STD-PS",
  );
  assert(
    outOfBomDms.bomParsedRowCount === 4,
    "DMS sample BOM parseado sin filas de soporte",
  );

  assert(
    assessOutOfBomLineParseability("22 STD-PS-050 (PSL)\tSUP-001\t1") ===
      "tab_row_support",
    "Línea soporte tabular parseable",
  );
  assert(
    resolveOutOfBomTextRegion({
      lineNumber: 10,
      bomStartLine: 2,
      soportesLine: 8,
    }) === "post_soportes",
    "Región post_soportes",
  );

  const dwLooseSample = `
RELACION DE MATERIALES
1 TUBERIA EXT\t1000026994\t8.4 M
2 CODO 90 SW\t1000030543\t5
NOTAS DW-701
BRIDA WN RF 150 2 UD
VALVULA COMPUERTA 1 UD
SOPORTE TIPO A 1 UD
`;
  const outOfBomDw = analyzeOutOfBomEmbeddedText({
    text: dwLooseSample,
    fileName: "dw-701-sample.txt",
    path: "sample",
    pageCount: 1,
  });
  assert(
    outOfBomDw.outOfBomCandidates.length >= 2,
    "DW sample detecta partidas manuales sueltas",
  );
  assert(
    outOfBomDw.outOfBomCandidates.every(
      (candidate) => candidate.parseability === "loose_text",
    ),
    "DW manual es texto suelto",
  );

  const tabularSupportRule = applyBusinessRulesToSuggestion({
    item: 22,
    reference: "SUP-001",
    description: "STD-PS-050 (PSL)",
    quantity: "1",
    unit: "ud",
    confidence: 0.8,
    warnings: [],
    rawLine: "",
    lineNumber: 1,
  });
  assert(
    tabularSupportRule.businessCategory === "support",
    "Soporte tabular → support",
  );
  assert(tabularSupportRule.businessAction === "review", "Soporte tabular → review");
  assert(
    tabularSupportRule.businessConfidence === "medium",
    "Soporte tabular confianza media",
  );

  const supportCompare = compareSuggestedTakeoffWithExisting(
    [
      {
        item: 22,
        reference: "SUP-001",
        description: "STD-PS-050 (PSL)",
        quantity: "1",
        unit: "ud",
        confidence: 0.8,
      },
    ],
    [
      {
        reference: "SUP-001",
        description: "Soporte tipo STD-PS-050",
        quantity: "1",
        unit: "ud",
      },
    ],
  );
  assert(
    supportCompare.items[0]?.comparisonStatus === "matched",
    "Soporte matched por referencia SUP-xxx",
  );

  const supportUiItem = withBusinessRuleFields({
    item: 22,
    reference: "SUP-001",
    description: "STD-PS-050 (PSL)",
    quantity: "1",
    unit: "ud",
    confidence: 0.8,
    comparisonStatus: "missing" as const,
    suggestionKey: "k-support",
  });
  assert(
    !isBetaReadyProposalItem(supportUiItem),
    "Soporte no entra en listas para incluir",
  );
  assert(
    isBetaReviewProposalItem(supportUiItem),
    "Soporte entra en requieren revisión",
  );
  assert(
    !getAllReadyProposalKeys([supportUiItem, ...uiItems]).includes("k-support"),
    "Bulk ready no incluye soporte",
  );

  const goldenReport = await runAutoTakeoffGoldenValidation({
    goldenSetDir: path.join(
      import.meta.dirname,
      "../tests/fixtures/auto-takeoff-golden",
    ),
  });

  assert(goldenReport.summary.passed, "Golden set versionado cumple umbrales");

  console.log("verify-auto-takeoff-parse: all checks passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
