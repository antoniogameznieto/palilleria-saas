export type TitleBlockCropPercents = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export const DEFAULT_TITLE_BLOCK_CROP_PERCENTS: TitleBlockCropPercents = {
  xPercent: 65,
  yPercent: 75,
  widthPercent: 35,
  heightPercent: 25,
};

export type TitleBlockCropPreset = {
  id: string;
  label: string;
  params: TitleBlockCropPercents;
  /** Hint for extended title blocks; not the default ROI. */
  recommendedFor?: string;
};

/** Experimental ROI presets for comparing title block layouts. */
export const TITLE_BLOCK_CROP_PRESETS: TitleBlockCropPreset[] = [
  {
    id: "bottom-right",
    label: "Abajo derecha",
    params: DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  },
  {
    id: "bottom-left",
    label: "Abajo izquierda",
    params: { xPercent: 0, yPercent: 75, widthPercent: 35, heightPercent: 25 },
  },
  {
    id: "top-right",
    label: "Arriba derecha",
    params: { xPercent: 65, yPercent: 0, widthPercent: 35, heightPercent: 25 },
  },
  {
    id: "top-left",
    label: "Arriba izquierda",
    params: { xPercent: 0, yPercent: 0, widthPercent: 35, heightPercent: 25 },
  },
  {
    id: "bottom-center",
    label: "Centro inferior",
    params: { xPercent: 32, yPercent: 75, widthPercent: 35, heightPercent: 25 },
  },
  {
    id: "bottom-wide",
    label: "Franja inferior amplia",
    params: { xPercent: 35, yPercent: 60, widthPercent: 65, heightPercent: 40 },
    recommendedFor: "Cajetines extendidos (benchmark 10F)",
  },
];

export function validateTitleBlockCropPercents(
  params: TitleBlockCropPercents,
): string | null {
  if (!Number.isFinite(params.xPercent) || params.xPercent < 0 || params.xPercent > 95) {
    return "X debe estar entre 0 y 95 %.";
  }

  if (!Number.isFinite(params.yPercent) || params.yPercent < 0 || params.yPercent > 95) {
    return "Y debe estar entre 0 y 95 %.";
  }

  if (
    !Number.isFinite(params.widthPercent) ||
    params.widthPercent < 5 ||
    params.widthPercent > 100
  ) {
    return "Ancho debe estar entre 5 y 100 %.";
  }

  if (
    !Number.isFinite(params.heightPercent) ||
    params.heightPercent < 5 ||
    params.heightPercent > 100
  ) {
    return "Alto debe estar entre 5 y 100 %.";
  }

  if (params.xPercent + params.widthPercent > 100) {
    return "X + ancho no puede superar 100 %.";
  }

  if (params.yPercent + params.heightPercent > 100) {
    return "Y + alto no puede superar 100 %.";
  }

  return null;
}

export function formatTitleBlockCropZoneLabel(
  params: TitleBlockCropPercents,
): string {
  return `Zona: X ${params.xPercent}%, Y ${params.yPercent}%, ancho ${params.widthPercent}%, alto ${params.heightPercent}%`;
}

function parsePercentField(
  formData: FormData,
  name: keyof TitleBlockCropPercents,
  defaultValue: number,
): number | "invalid" {
  const raw = formData.get(name);

  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return defaultValue;
  }

  if (typeof raw !== "string") {
    return "invalid";
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return "invalid";
  }

  return Math.round(value);
}

export function parseTitleBlockCropPercentsFromFormData(
  formData: FormData,
): { params: TitleBlockCropPercents } | { error: string } {
  const defaults = DEFAULT_TITLE_BLOCK_CROP_PERCENTS;
  const fields: (keyof TitleBlockCropPercents)[] = [
    "xPercent",
    "yPercent",
    "widthPercent",
    "heightPercent",
  ];
  const params = { ...defaults };

  for (const field of fields) {
    const parsed = parsePercentField(formData, field, defaults[field]);

    if (parsed === "invalid") {
      const label =
        field === "xPercent"
          ? "X"
          : field === "yPercent"
            ? "Y"
            : field === "widthPercent"
              ? "Ancho"
              : "Alto";
      return { error: `Parámetro ${label} no válido.` };
    }

    params[field] = parsed;
  }

  const validationError = validateTitleBlockCropPercents(params);

  if (validationError) {
    return { error: validationError };
  }

  return { params };
}
