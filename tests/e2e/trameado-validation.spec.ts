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

test.describe("trameado sheet validation", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer ve validación incompleta y actualiza total PALILLO", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    const validationPanel = page.getByTestId("trameado-sheet-validation-panel");
    await expect(validationPanel).toBeVisible();
    await expect(validationPanel).toContainText("Validación de hoja");
    await expect(
      page.getByTestId("trameado-sheet-validation-status"),
    ).toContainText("Sin hoja");

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-VAL-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-VAL-01",
    );

    await expect(
      page.getByTestId("trameado-sheet-validation-status"),
    ).toContainText("Sin tramos");
    await expect(validationPanel).toContainText(
      "Añade tramos para validar la hoja",
    );

    await page.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(page, {
      segmentNumber: "<1>",
      diameter: '4"',
      schedule: "40",
      palilloLength: "500",
    });
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(1);

    await expect(
      page.getByTestId("trameado-sheet-validation-segment-count"),
    ).toHaveText("1");
    await expect(
      page.getByTestId("trameado-sheet-validation-total-palillo"),
    ).toContainText("500 mm");

    const reference = page.getByTestId("trameado-sheet-validation-reference");
    await expect(reference).toContainText("m");
    await expect(
      page.getByTestId("trameado-sheet-validation-delta"),
    ).toBeVisible();
  });

  test("viewer ve validación en lectura", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await engineerPage.getByTestId("trameado-create-sheet").click();
    await engineerPage.locator("#trameado-line-identifier").fill("HL-E2E-VAL-VIEW");
    await engineerPage.getByTestId("trameado-create-sheet-submit").click();
    await expect(
      engineerPage.getByTestId("trameado-sheet-line-identifier"),
    ).toContainText("HL-E2E-VAL-VIEW");
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-sheet-validation-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-sheet-validation-status")).toContainText(
      "Sin tramos",
    );
    await expect(page.getByTestId("trameado-mark-reviewed")).toHaveCount(0);

    await viewerContext.close();
  });
});
