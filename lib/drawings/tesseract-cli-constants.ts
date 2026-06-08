/** Relative path from repo root; referenced in warnings and UI. */
export const TESSERACT_SETUP_DOC = "docs/tesseract-ocr-setup.md";

export const TESSERACT_RECOMMENDED_LANGUAGES = ["eng", "spa"] as const;

export function getMissingRecommendedTesseractLanguages(
  languages: string[],
): string[] {
  return TESSERACT_RECOMMENDED_LANGUAGES.filter(
    (language) => !languages.includes(language),
  );
}

export function buildTesseractMissingWarnings(): string[] {
  return [
    "Tesseract CLI no está instalado o no está en PATH. Se completó el render y el recorte del cajetín, pero no se ejecutó OCR.",
    `Consulta ${TESSERACT_SETUP_DOC} para instalarlo (macOS, Linux o Docker).`,
    "En local puedes comprobar el estado con: npm run check:tesseract",
  ];
}

export function buildTesseractMissingLanguageWarning(missingLanguages: string[]): string {
  return `Tesseract está instalado, pero faltan idiomas recomendados: ${missingLanguages.join(", ")}. Instala los paquetes de idioma (ver ${TESSERACT_SETUP_DOC}).`;
}
