/**
 * EXPERIMENTAL / DEV ONLY — Fase 10A
 *
 * Inspecciona un PDF local sin tocar la app, la BD ni el storage productivo.
 * No se ejecuta en build ni en producción.
 *
 * Uso:
 *   npm run inspect:pdf -- path/to/plano.pdf
 *   npm run inspect:pdf -- path/to/plano.pdf --preview
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

const PREVIEW_DIR = path.join(import.meta.dirname, ".tmp");
const TEXT_PREVIEW_MAX_CHARS = 400;

type CliOptions = {
  pdfPath: string;
  preview: boolean;
  help: boolean;
};

function printUsage(): void {
  console.log(`inspect-pdf-pages — herramienta experimental (Fase 10A)

Uso:
  npm run inspect:pdf -- <ruta-local.pdf> [--preview]

Opciones:
  --preview   Genera PNG de la primera página en scripts/.tmp/ (gitignored)
  --help      Muestra esta ayuda

Notas:
  - Solo lectura del archivo indicado; no sube ni persiste datos en la app.
  - Usa pdf-parse (misma librería que la extracción de texto embebido actual).
  - La preview requiere @napi-rs/canvas (dependencia transitiva de pdf-parse).
`);
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      return { pdfPath: "", preview: false, help: true };
    }

    if (arg === "--preview") {
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Opción desconocida: ${arg}`);
    }

    positional.push(arg);
  }

  const pdfPath = positional[0];

  if (!pdfPath) {
    throw new Error("Indica la ruta de un PDF local.");
  }

  return {
    pdfPath,
    preview: argv.includes("--preview"),
    help: false,
  };
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function summarizeText(text: string): {
  characterCount: number;
  lineCount: number;
  preview: string;
} {
  const trimmed = text.trim();
  const characterCount = trimmed.length;
  const lineCount = trimmed.length > 0 ? trimmed.split(/\r?\n/).length : 0;
  const preview =
    characterCount > 0 ? trimmed.slice(0, TEXT_PREVIEW_MAX_CHARS) : "";

  return { characterCount, lineCount, preview };
}

async function main(): Promise<void> {
  let options: CliOptions;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    printUsage();
    console.error(
      `\nError: ${error instanceof Error ? error.message : "Argumentos inválidos"}`,
    );
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
  }

  const absolutePath = path.resolve(options.pdfPath);
  const buffer = await readFile(absolutePath);

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece un PDF válido (%PDF).");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();

    console.log("=== inspect-pdf-pages (experimental) ===");
    console.log(`Archivo: ${absolutePath}`);
    console.log(`Tamaño: ${formatBytes(buffer.length)}`);
    console.log(`Páginas: ${info.total}`);

    if (info.info?.Title) {
      console.log(`Título PDF: ${String(info.info.Title)}`);
    }

    if (info.info?.Producer) {
      console.log(`Productor: ${String(info.info.Producer)}`);
    }

    console.log("\n--- Páginas ---");

    for (const page of info.pages) {
      const pageText = textResult.getPageText(page.pageNumber);
      const stats = summarizeText(pageText);

      console.log(
        [
          `Página ${page.pageNumber}`,
          page.pageLabel ? `(etiqueta: ${page.pageLabel})` : null,
          `${Math.round(page.width)}×${Math.round(page.height)} pt`,
          stats.characterCount > 0
            ? `${stats.characterCount} chars embebidos`
            : "sin texto embebido",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    }

    const documentStats = summarizeText(textResult.text);
    console.log("\n--- Texto embebido (documento) ---");
    console.log(`Caracteres totales: ${documentStats.characterCount}`);
    console.log(`Líneas aproximadas: ${documentStats.lineCount}`);
    console.log(
      `Tiene texto embebido: ${documentStats.characterCount > 0 ? "sí" : "no"}`,
    );

    if (documentStats.characterCount === 0) {
      console.log(
        "\nNota: PDF probablemente escaneado o vectorial sin capa de texto.",
        "Candidato a OCR / IA visual en fases posteriores.",
      );
    } else if (documentStats.preview) {
      console.log("\n--- Vista previa (solo consola, no se guarda) ---");
      console.log(documentStats.preview);
      if (documentStats.characterCount > TEXT_PREVIEW_MAX_CHARS) {
        console.log("… (truncado)");
      }
    }

    if (options.preview) {
      console.log("\n--- Preview imagen (página 1) ---");

      try {
        const screenshot = await parser.getScreenshot({
          partial: [1],
          desiredWidth: 1400,
          imageBuffer: true,
          imageDataUrl: false,
        });

        const firstPage = screenshot.pages[0];

        if (!firstPage?.data) {
          console.log("No se pudo generar la imagen de la primera página.");
        } else {
          await mkdir(PREVIEW_DIR, { recursive: true });
          const baseName = path.basename(absolutePath, path.extname(absolutePath));
          const outputPath = path.join(
            PREVIEW_DIR,
            `${baseName}-page1.png`,
          );
          await writeFile(outputPath, firstPage.data);
          console.log(`PNG guardado: ${outputPath}`);
          console.log(
            `Dimensiones: ${firstPage.width}×${firstPage.height} px (escala ${firstPage.scale})`,
          );
        }
      } catch (previewError) {
        console.log(
          "Preview no disponible:",
          previewError instanceof Error
            ? previewError.message
            : "error desconocido",
        );
        console.log(
          "Requiere entorno Node con @napi-rs/canvas (transitivo de pdf-parse).",
        );
      }
    }
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(
    "Error:",
    error instanceof Error ? error.message : "fallo inesperado",
  );
  process.exit(1);
});
