import {
  TESSERACT_RECOMMENDED_LANGUAGES,
  TESSERACT_SETUP_DOC,
  getMissingRecommendedTesseractLanguages,
} from "../lib/drawings/tesseract-cli-constants";
import { diagnoseTesseractCli } from "../lib/drawings/tesseract-cli-diagnostic";

async function main(): Promise<void> {
  const diagnostic = await diagnoseTesseractCli();

  if (!diagnostic.available) {
    console.warn("⚠ Tesseract CLI: no encontrado en PATH.");
    console.warn(`  Instala Tesseract siguiendo ${TESSERACT_SETUP_DOC}.`);
    console.warn(
      "  El OCR experimental seguirá funcionando sin texto (solo render + recorte).",
    );
    console.warn("  Comandos útiles tras instalar:");
    console.warn("    tesseract --version");
    console.warn("    tesseract --list-langs");
    return;
  }

  console.log("✓ Tesseract CLI: disponible");

  if (diagnostic.version) {
    console.log(`  Versión: ${diagnostic.version}`);
  }

  if (diagnostic.languages.length > 0) {
    console.log(
      `  Idiomas (${diagnostic.languages.length}): ${diagnostic.languages.join(", ")}`,
    );

    const missingLanguages = getMissingRecommendedTesseractLanguages(
      diagnostic.languages,
    );

    if (missingLanguages.length > 0) {
      console.warn(
        `  ⚠ Idiomas recomendados faltantes: ${missingLanguages.join(", ")} (instala paquetes de idioma).`,
      );
      console.warn(`  Ver ${TESSERACT_SETUP_DOC} para eng y spa.`);
    } else {
      console.log(
        `  Idiomas recomendados (${TESSERACT_RECOMMENDED_LANGUAGES.join(", ")}): presentes.`,
      );
    }
  } else {
    console.warn(
      "  ⚠ No se pudieron listar idiomas. Prueba manualmente: tesseract --list-langs",
    );
  }
}

main()
  .catch((error) => {
    console.warn(
      "⚠ No se pudo completar el diagnóstico de Tesseract:",
      error instanceof Error ? error.message : String(error),
    );
  })
  .finally(() => {
    process.exit(0);
  });
