import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TESSERACT_COMMAND_TIMEOUT_MS = 5_000;

export type TesseractCliDiagnostic = {
  available: boolean;
  version: string | null;
  languages: string[];
};

function parseTesseractLanguages(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && !line.toLowerCase().includes("list of available languages"),
    );
}

export async function diagnoseTesseractCli(): Promise<TesseractCliDiagnostic> {
  try {
    const { stdout: versionStdout } = await execFileAsync(
      "tesseract",
      ["--version"],
      { timeout: TESSERACT_COMMAND_TIMEOUT_MS },
    );
    const version =
      versionStdout.split("\n").find((line) => line.trim().length > 0)?.trim() ??
      versionStdout.trim();

    let languages: string[] = [];

    try {
      const { stdout: languagesStdout } = await execFileAsync(
        "tesseract",
        ["--list-langs"],
        { timeout: TESSERACT_COMMAND_TIMEOUT_MS },
      );
      languages = parseTesseractLanguages(languagesStdout);
    } catch {
      // Language listing is optional for diagnostics.
    }

    return { available: true, version, languages };
  } catch {
    return { available: false, version: null, languages: [] };
  }
}

export async function isTesseractCliAvailable(): Promise<boolean> {
  const diagnostic = await diagnoseTesseractCli();
  return diagnostic.available;
}
