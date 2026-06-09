export const TRAMEADO_SHEET_EXPORT_COLUMNS = [
  { key: "iso", label: "ISO" },
  { key: "lineClass", label: "CLASE" },
  { key: "segmentNumber", label: "Nº" },
  { key: "diameter", label: "Ø" },
  { key: "schedule", label: "SCH." },
  { key: "palilloLength", label: "PALILLO" },
  { key: "heatNumber", label: "COLADA" },
] as const;

export type TrameadoSheetExportColumnKey =
  (typeof TRAMEADO_SHEET_EXPORT_COLUMNS)[number]["key"];
