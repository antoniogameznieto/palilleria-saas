/**
 * Captura visual 18O-B — HL-1289-02 con 3 tramos golden añadidos desde sugerencias.
 * Uso: npx tsx scripts/capture-18ob-hl1289-validation.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.CAPTURE_EMAIL ?? "engineer-demo@palilleria.local";
const PASSWORD = process.env.CAPTURE_PASSWORD ?? "demo1234";
const OUTPUT_DIR = path.join(process.cwd(), "docs/screenshots");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "18ob-hl1289-02-validation.png");

const GOLDEN_PALILLO_MM = ["100", "120", "170"] as const;
const LINE_IDENTIFIER = "HL-1289-A010AA-N-02";

async function ensureTakeoffReference(drawingId: string, companyId: string, jobId: string) {
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.drawingTakeoffItem.findFirst({
      where: {
        drawingId,
        description: { contains: "TUBERIA", mode: "insensitive" },
        unit: "M",
      },
    });

    if (existing) {
      return;
    }

    const engineer = await prisma.user.findFirst({
      where: { email: EMAIL },
      select: { id: true },
    });

    if (!engineer) {
      throw new Error(`Usuario ${EMAIL} no encontrado para seed de takeoff.`);
    }

    await prisma.drawingTakeoffItem.create({
      data: {
        companyId,
        jobId,
        drawingId,
        reference: "1000000001",
        description: '1 3/4" TUBERIA A106 Gr.B SCH 80',
        quantity: 0.4,
        unit: "M",
        createdById: engineer.id,
      },
    });

    console.log("Takeoff BOM 0.4 m añadido para captura 18O-B.");
  } finally {
    await prisma.$disconnect();
  }
}

async function resolveDrawingPath(): Promise<{
  path: string;
  drawingId: string;
  companyId: string;
  jobId: string;
}> {
  const prisma = new PrismaClient();

  try {
    const drawing = await prisma.drawing.findFirst({
      where: {
        OR: [
          { originalFileName: { contains: "HL-1289-02", mode: "insensitive" } },
          { drawingNumber: { contains: "HL-1289-02", mode: "insensitive" } },
          { fileName: { contains: "HL-1289-02", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, companyId: true, jobId: true, originalFileName: true },
    });

    if (!drawing) {
      throw new Error(
        "No se encontró el plano HL-1289-02 en BD. Sube el PDF o define CAPTURE_DRAWING_PATH.",
      );
    }

    const path = process.env.CAPTURE_DRAWING_PATH
      ? process.env.CAPTURE_DRAWING_PATH
      : `/companies/${drawing.companyId}/jobs/${drawing.jobId}/drawings/${drawing.id}`;

    return {
      path,
      drawingId: drawing.id,
      companyId: drawing.companyId,
      jobId: drawing.jobId,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function login(page: import("playwright").Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/(dashboard|onboarding\/company|companies)/);
}

async function ensureGoldenSheet(page: import("playwright").Page) {
  const lineIdentifier = page.getByTestId("trameado-sheet-line-identifier");

  if (
    (await lineIdentifier.count()) > 0 &&
    (await lineIdentifier.textContent())?.includes(LINE_IDENTIFIER)
  ) {
    return;
  }

  const nuevaHoja = page.getByRole("button", { name: "Nueva hoja" });

  if ((await nuevaHoja.count()) > 0) {
    await nuevaHoja.click();
  } else {
    await page.getByTestId("trameado-create-sheet").first().click();
  }

  await page.locator("#trameado-line-identifier").fill(LINE_IDENTIFIER);
  await page.locator("#trameado-line-class").fill("A010AA");
  await page.getByTestId("trameado-create-sheet-submit").click();
  await selectGoldenSheet(page);
}

async function selectGoldenSheet(page: import("playwright").Page) {
  const sheetSelect = page.getByTestId("trameado-sheet-select");

  if ((await sheetSelect.count()) > 0) {
    const optionValue = await sheetSelect
      .locator("option", { hasText: LINE_IDENTIFIER })
      .first()
      .getAttribute("value");

    if (optionValue) {
      await sheetSelect.selectOption(optionValue);
    }
  }

  await page
    .getByTestId("trameado-sheet-line-identifier")
    .filter({ hasText: LINE_IDENTIFIER })
    .waitFor({ state: "visible", timeout: 15_000 });
}

async function addGoldenSuggestions(page: import("playwright").Page) {
  const existingRows = await page.getByTestId("trameado-segment-row").count();

  if (existingRows >= GOLDEN_PALILLO_MM.length) {
    return;
  }

  for (const palillo of GOLDEN_PALILLO_MM) {
    const alreadyAdded =
      (await page
        .getByTestId("trameado-segment-row")
        .filter({ hasText: palillo })
        .count()) > 0;

    if (alreadyAdded) {
      continue;
    }

    const item = page
      .getByTestId("trameado-segment-suggestion-item")
      .filter({ hasText: `PALILLO ${palillo} mm` })
      .first();

    await item.waitFor({ state: "visible", timeout: 20_000 });

    const beforeCount = await page.getByTestId("trameado-segment-row").count();
    await item.getByTestId("trameado-segment-suggestion-add").click();

    await page.waitForFunction(
      (expected) =>
        document.querySelectorAll('[data-testid="trameado-segment-row"]').length >
        expected,
      beforeCount,
      { timeout: 20_000 },
    );
  }
}

async function main() {
  const drawing =
    process.env.CAPTURE_DRAWING_PATH != null
      ? {
          path: process.env.CAPTURE_DRAWING_PATH,
          drawingId: "",
          companyId: "",
          jobId: "",
        }
      : await resolveDrawingPath();

  if (drawing.drawingId) {
    await ensureTakeoffReference(
      drawing.drawingId,
      drawing.companyId,
      drawing.jobId,
    );
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await login(page);
  await page.goto(`${BASE_URL}${drawing.path}`);
  await page.waitForLoadState("networkidle");
  const trameadoTab = page.getByRole("button", { name: "Trameado", exact: true });
  await trameadoTab.waitFor({ state: "visible", timeout: 30_000 });
  await trameadoTab.click();
  await page.getByTestId("trameado-section").waitFor({ state: "visible" });

  await ensureGoldenSheet(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Trameado", exact: true }).click();
  await selectGoldenSheet(page);
  await addGoldenSuggestions(page);

  const segmentCount = await page.getByTestId("trameado-segment-row").count();
  const validationPanel = page.getByTestId("trameado-sheet-validation-panel");
  await validationPanel.scrollIntoViewIfNeeded();

  const validationText = {
    status: await page.getByTestId("trameado-sheet-validation-status").innerText(),
    segmentCount: await page
      .getByTestId("trameado-sheet-validation-segment-count")
      .innerText()
      .catch(() => ""),
    totalPalillo: await page
      .getByTestId("trameado-sheet-validation-total-palillo")
      .innerText()
      .catch(() => ""),
    reference: await page
      .getByTestId("trameado-sheet-validation-reference")
      .innerText()
      .catch(() => ""),
    delta: await page
      .getByTestId("trameado-sheet-validation-delta")
      .innerText()
      .catch(() => ""),
  };

  await mkdir(OUTPUT_DIR, { recursive: true });

  const sheetPanel = page.getByTestId("trameado-sheet-panel");
  await sheetPanel.screenshot({ path: OUTPUT_FILE });

  const reportPath = path.join(OUTPUT_DIR, "18ob-hl1289-02-validation.json");
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        drawingPath: drawing.path,
        segmentRows: segmentCount,
        validation: validationText,
        screenshot: OUTPUT_FILE,
      },
      null,
      2,
    ),
  );

  console.log("Captura guardada:", OUTPUT_FILE);
  console.log("Informe:", reportPath);
  console.log("Validación UI:", validationText);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
