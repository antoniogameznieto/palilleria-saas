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

test.describe("trameado guided wizard", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer ve el wizard y paso 1 sin hoja", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    const wizard = page.getByTestId("trameado-guided-wizard");
    await expect(wizard).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-global-step")).toContainText(
      "Paso 7 de 8",
    );
    await expect(page.getByTestId("trameado-wizard-global-step")).toContainText(
      "Tramear / palillear",
    );
    await expect(
      page.getByTestId("trameado-wizard-global-description"),
    ).toContainText(/palillería/i);
    await expect(page.getByTestId("trameado-wizard-title")).toHaveText(
      "Modo guiado de palilleo",
    );
    await expect(wizard).toHaveAttribute("data-current-step", "prepare_sheet");
    await expect(page.getByTestId("trameado-wizard-create-sheet")).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-check-prepare_sheet")).toContainText(
      "En curso",
    );
  });

  test("con hoja y tramos muestra progreso y paquete disponible", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await page.getByTestId("trameado-wizard-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-WIZ-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-wizard-active-sheet")).toContainText(
      "HL-E2E-WIZ-01",
    );

    await page.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(page, {
      segmentNumber: "<1>",
      diameter: '4"',
      schedule: "40",
      palilloLength: "100",
    });
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-wizard-segments-count")).toContainText(
      "1 tramo confirmado",
    );

    await expect(page.getByTestId("trameado-wizard-package-cta")).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-export-package")).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-check-confirm_segments")).toContainText(
      "Completo",
    );
  });

  test("viewer ve wizard sin acciones de edición", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await engineerPage.getByTestId("trameado-wizard-create-sheet").click();
    await engineerPage.locator("#trameado-line-identifier").fill("HL-E2E-WIZ-VIEW");
    await engineerPage.getByTestId("trameado-create-sheet-submit").click();
    await engineerPage.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(engineerPage, {
      segmentNumber: "<1>",
      diameter: '4"',
      schedule: "40",
      palilloLength: "100",
    });
    await engineerPage.getByTestId("trameado-add-segment-submit").click();
    await expect(engineerPage.getByTestId("trameado-segment-row")).toHaveCount(1);
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();

    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-guided-wizard")).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-viewer-note")).toBeVisible();
    await expect(page.getByTestId("trameado-wizard-create-sheet")).toHaveCount(0);
    await expect(page.getByTestId("trameado-wizard-primary-cta")).toHaveCount(0);
    await expect(page.getByTestId("trameado-wizard-mark-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-wizard-active-sheet")).toContainText(
      "HL-E2E-WIZ-VIEW",
    );
    await expect(page.getByTestId("trameado-wizard-segments-count")).toContainText(
      "1 tramo confirmado",
    );
    await expect(
      page
        .getByTestId("trameado-wizard-package-cta")
        .getByTestId("trameado-wizard-export-package"),
    ).toBeVisible();

    await viewerContext.close();
  });
});
