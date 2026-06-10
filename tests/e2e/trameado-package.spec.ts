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
  await page.locator("#trameado-line-identifier").fill("HL-E2E-PKG-01");
  await page.getByTestId("trameado-create-sheet-submit").click();
  await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
    "HL-E2E-PKG-01",
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

test.describe("trameado delivery package export", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer descarga paquete ZIP cuando hay tramos", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await createSheetWithSegment(page);

    const exportLink = page.getByTestId("trameado-export-package");
    await expect(exportLink).toBeVisible();
    await expect(page.getByTestId("trameado-package-hint")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await exportLink.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
    expect(download.suggestedFilename()).toContain("trameado-paquete");

    const path = await download.path();
    expect(path).not.toBeNull();

    const fs = await import("node:fs");
    const stats = fs.statSync(path!);
    expect(stats.size).toBeGreaterThan(0);
  });

  test("sin tramos el botón de paquete está deshabilitado", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-PKG-EMPTY");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-PKG-EMPTY",
    );

    await expect(page.getByTestId("trameado-export-package-disabled")).toBeVisible();
    await expect(page.getByTestId("trameado-export-package")).toHaveCount(0);
  });

  test("viewer puede descargar paquete pero no editar tramos", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await createSheetWithSegment(engineerPage);
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();

    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-add-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-export-package")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("trameado-export-package").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
    const path = await download.path();
    expect(path).not.toBeNull();

    const fs = await import("node:fs");
    expect(fs.statSync(path!).size).toBeGreaterThan(0);

    await viewerContext.close();
  });
});
