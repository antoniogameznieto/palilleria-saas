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
  await page.locator("#trameado-line-identifier").fill("HL-E2E-ANN-01");
  await page.getByTestId("trameado-create-sheet-submit").click();
  await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
    "HL-E2E-ANN-01",
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

test.describe("trameado pdf annotations", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer marca tramo en plano y puede borrar marca", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await createSheetWithSegment(page);

    await page
      .getByTestId("trameado-segments-table")
      .getByTestId("trameado-mark-on-drawing")
      .click();

    await expect(page.getByTestId("trameado-iso-marking-hint")).toContainText(
      "Haz clic en el isométrico para marcar el tramo Nº 1",
    );

    const overlay = page.getByTestId("trameado-pdf-annotation-overlay");
    await expect(overlay).toHaveAttribute("data-marking-active", "true");

    await overlay.click({
      position: { x: 120, y: 120 },
    });

    await expect(page.getByTestId("trameado-pdf-annotation-label")).toContainText(
      "Nº 1",
    );
    await expect(page.getByTestId("trameado-iso-marking-summary")).toContainText(
      "Tramos marcados: 1/1",
    );

    await page
      .getByTestId("trameado-iso-marking-panel")
      .getByTestId("trameado-delete-annotation")
      .click();

    await expect(page.getByTestId("trameado-pdf-annotation")).toHaveCount(0);
    await expect(page.getByTestId("trameado-iso-marking-summary")).toContainText(
      "Tramos marcados: 0/1",
    );
  });

  test("viewer no puede marcar tramos en plano", async ({ browser }) => {
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

    await expect(page.getByTestId("trameado-iso-marking-panel")).toBeVisible();
    await expect(
      page.getByTestId("trameado-segments-table").getByTestId("trameado-mark-on-drawing"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("trameado-iso-marking-panel").getByTestId("trameado-mark-on-drawing"),
    ).toHaveCount(0);

    await viewerContext.close();
  });
});
