import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, login } from "./fixtures";

function resetTrameadoE2EData() {
  execSync("npx tsx scripts/reset-e2e-trameado.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

async function fillSegmentForm(
  page: import("@playwright/test").Page,
  values: {
    segmentNumber: string;
    diameter: string;
    schedule: string;
    palilloLength: string;
  },
) {
  const form = page.getByTestId("trameado-segment-form");
  await form.getByLabel("Nº tramo").fill(values.segmentNumber);
  await form.getByLabel("Ø").fill(values.diameter);
  await form.getByLabel("SCH.").fill(values.schedule);
  await form.getByLabel(/PALILLO/).fill(values.palilloLength);
}

async function createSheetWithSegment(page: import("@playwright/test").Page) {
  await page.getByTestId("trameado-create-sheet").click();
  await page.locator("#trameado-line-identifier").fill("HL-E2E-PDF-01");
  await page.getByTestId("trameado-create-sheet-submit").click();
  await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
    "HL-E2E-PDF-01",
  );

  await page.getByTestId("trameado-add-segment").click();
  await fillSegmentForm(page, {
    segmentNumber: "<1>",
    diameter: '4"',
    schedule: "40",
    palilloLength: "363",
  });
  await page.getByTestId("trameado-add-segment-submit").click();
  await expect(page.getByTestId("trameado-segment-row")).toHaveCount(1);
}

async function markFirstSegmentOnDrawing(page: import("@playwright/test").Page) {
  await page
    .getByTestId("trameado-segments-table")
    .getByTestId("trameado-mark-on-drawing")
    .click();

  const overlay = page.getByTestId("trameado-pdf-annotation-overlay");
  await overlay.click({ position: { x: 120, y: 120 } });

  await expect(page.getByTestId("trameado-iso-marking-panel")).toHaveAttribute(
    "data-saving",
    "false",
  );
}

test.describe("trameado marked pdf export", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer descarga PDF marcado cuando hay marcas", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await createSheetWithSegment(page);
    await markFirstSegmentOnDrawing(page);

    const exportLink = page.getByTestId("trameado-export-marked-pdf");
    await expect(exportLink).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await exportLink.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const path = await download.path();
    expect(path).not.toBeNull();

    const fs = await import("node:fs");
    const stats = fs.statSync(path!);
    expect(stats.size).toBeGreaterThan(0);
  });

  test("sin marcas el botón de PDF marcado está deshabilitado", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await createSheetWithSegment(page);

    await expect(page.getByTestId("trameado-export-marked-pdf-disabled")).toBeVisible();
    await expect(page.getByTestId("trameado-export-marked-pdf")).toHaveCount(0);
    await expect(page.getByTestId("trameado-marked-pdf-hint")).toContainText(
      "Marca al menos un tramo para exportar el PDF marcado.",
    );
  });

  test("viewer puede exportar PDF marcado pero no editar marcas", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await createSheetWithSegment(engineerPage);
    await markFirstSegmentOnDrawing(engineerPage);
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-export-marked-pdf")).toBeVisible();
    await expect(
      page.getByTestId("trameado-segments-table").getByTestId("trameado-mark-on-drawing"),
    ).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("trameado-export-marked-pdf").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    await viewerContext.close();
  });
});
