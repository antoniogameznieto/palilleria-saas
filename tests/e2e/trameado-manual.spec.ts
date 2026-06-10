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

test.describe("trameado manual", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer usa asistente para precrear hoja sugerida sin segmentos", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await expect(page.getByTestId("trameado-sheet-assistant")).toBeVisible();
    await expect(page.getByTestId("trameado-candidate-dimensions-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-create-suggested-sheets")).toBeVisible();

    const primarySuggestion = page
      .getByTestId("trameado-sheet-suggestion")
      .filter({ hasText: "HL-E2E-A012AA-N-01" });
    await expect(primarySuggestion).toBeVisible();
    await expect(primarySuggestion.getByTestId("trameado-suggestion-diameter")).toContainText(
      '4"',
    );
    await expect(primarySuggestion.getByTestId("trameado-suggestion-schedule")).toContainText(
      "40",
    );

    const pairSuggestion = page
      .getByTestId("trameado-sheet-suggestion")
      .filter({ hasText: "HL-E2E-A012AA-N-02" });
    if (await pairSuggestion.count()) {
      await pairSuggestion
        .getByTestId("trameado-sheet-suggestion-checkbox")
        .uncheck();
    }

    await primarySuggestion.getByTestId("trameado-sheet-suggestion-checkbox").check();
    await expect(page.getByTestId("trameado-create-suggested-sheets")).toBeEnabled();
    await page.getByTestId("trameado-create-suggested-sheets").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-A012AA-N-01",
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "A012AA",
    );
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(0);
    await page.getByTestId("trameado-sheet-assistant-toggle").click();
    await expect(primarySuggestion).toContainText("Ya existe");
  });

  test("engineer crea hoja, añade tramo, edita, borra y marca revisada", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await expect(page.getByTestId("trameado-section")).toBeVisible();
    await expect(page.getByTestId("trameado-workspace")).toBeVisible();
    await expect(page.getByTestId("trameado-pdf-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-pdf-open-button")).toBeVisible();
    await expect(page.getByTestId("trameado-candidate-dimensions-panel")).toBeVisible();

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-MANUAL-01");
    await page.locator("#trameado-line-class").fill("A012AA");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-MANUAL-01",
    );

    await page.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(page, {
      segmentNumber: "<1>",
      diameter: '4"',
      schedule: "40",
      palilloLength: "363",
    });
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segments-table")).toBeVisible();
    await expect(page.getByTestId("trameado-segment-row")).toContainText("363");
    await expect(page.getByTestId("trameado-segment-form")).toBeVisible();
    await expect(page.getByTestId("trameado-segment-number-input")).toHaveValue(
      "<2>",
    );
    await expect(page.getByTestId("trameado-diameter-input")).toHaveValue('4"');
    await expect(page.getByTestId("trameado-schedule-input")).toHaveValue("40");
    await expect(page.getByTestId("trameado-palillo-input")).toHaveValue("");

    await page.getByTestId("trameado-palillo-input").fill("120");
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-summary")).toContainText(
      "2 tramos",
    );
    await expect(page.getByTestId("trameado-segment-summary")).toContainText(
      "483 mm",
    );

    await page.getByTestId("trameado-duplicate-segment").first().click();
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(3);
    await expect(page.getByTestId("trameado-segment-summary")).toContainText(
      "3 tramos",
    );
    await expect(page.getByTestId("trameado-segment-summary")).toContainText(
      "846 mm",
    );

    const exportLink = page.getByTestId("trameado-export-csv");
    await expect(exportLink).toBeVisible();
    const exportHref = await exportLink.getAttribute("href");
    expect(exportHref).toMatch(/\/api\/files\/trameado\/[^/]+\/csv$/);
    const exportResponse = await page.request.get(exportHref!);
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["content-type"]).toContain("text/csv");
    const exportBody = await exportResponse.text();
    expect(exportBody).toContain("ISO,CLASE,Nº,Ø,SCH.,PALILLO,COLADA");
    expect(exportBody).toContain("HL-E2E-MANUAL-01");
    expect(exportBody).toContain("363");

    const xlsxLink = page.getByTestId("trameado-export-xlsx");
    await expect(xlsxLink).toBeVisible();
    const xlsxHref = await xlsxLink.getAttribute("href");
    expect(xlsxHref).toMatch(/\/api\/files\/trameado\/[^/]+\/xlsx$/);
    const xlsxResponse = await page.request.get(xlsxHref!);
    expect(xlsxResponse.status()).toBe(200);
    expect(xlsxResponse.headers()["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const xlsxBody = await xlsxResponse.body();
    expect(xlsxBody.byteLength).toBeGreaterThan(0);

    await page.getByTestId("trameado-edit-segment").first().click();
    await page.getByTestId("trameado-segment-form").getByLabel(/PALILLO/).fill("370");
    await page.getByTestId("trameado-update-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-form")).toHaveCount(0);
    await expect(page.getByTestId("trameado-segment-row").first()).toContainText(
      "370",
    );

    await page.getByTestId("trameado-mark-reviewed").click();
    await expect(page.getByTestId("trameado-sheet-reviewed-status")).toBeVisible({
      timeout: 15_000,
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("trameado-delete-segment").first().click();
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(2);
    await expect(page.getByTestId("trameado-sheet-reviewed-status")).toHaveCount(
      0,
    );
  });

  test("viewer ve trameado pero no acciones de edición", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await engineerPage.getByTestId("trameado-create-sheet").click();
    await engineerPage.locator("#trameado-line-identifier").fill("HL-E2E-VIEWER-01");
    await engineerPage.getByTestId("trameado-create-sheet-submit").click();
    await expect(
      engineerPage.getByTestId("trameado-sheet-line-identifier"),
    ).toHaveText("HL-E2E-VIEWER-01");
    await engineerPage.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(engineerPage, {
      segmentNumber: "<1>",
      diameter: '3/4"',
      schedule: "80",
      palilloLength: "120",
    });
    await engineerPage.getByTestId("trameado-add-segment-submit").click();
    await expect(engineerPage.getByTestId("trameado-segment-row")).toContainText("120");
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-workspace")).toBeVisible();
    await expect(page.getByTestId("trameado-pdf-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-candidate-dimensions-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("trameado-segments-table")).toBeVisible();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-VIEWER-01",
    );
    await expect(page.getByTestId("trameado-segment-row")).toContainText("120");
    await expect(page.getByTestId("trameado-segment-summary")).toContainText(
      "1 tramo",
    );
    await expect(page.getByTestId("trameado-export-csv")).toBeVisible();
    await expect(page.getByTestId("trameado-export-xlsx")).toBeVisible();
    await expect(page.getByTestId("trameado-create-suggested-sheets")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("trameado-sheet-assistant")).toHaveCount(0);
    await expect(page.getByTestId("trameado-create-sheet")).toHaveCount(0);
    await expect(page.getByTestId("trameado-add-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-edit-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-duplicate-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-mark-reviewed")).toHaveCount(0);
    await expect(page.getByTestId("trameado-candidate-dimension-prepare")).toHaveCount(
      0,
    );
    await viewerContext.close();
  });

  test("engineer prepara tramo desde cota candidata y confirma manualmente", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await expect(page.getByTestId("trameado-candidate-dimensions-list")).toBeVisible();

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-CAND-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-CAND-01",
    );

    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(0);

    const candidateItem = page
      .getByTestId("trameado-candidate-dimension-item")
      .filter({ hasText: "361 mm" });
    await expect(candidateItem).toBeVisible();
    await candidateItem.getByTestId("trameado-candidate-dimension-prepare").click();

    await expect(page.getByTestId("trameado-segment-form")).toBeVisible();
    await expect(page.getByTestId("trameado-assisted-segment-notice")).toContainText(
      "361 mm",
    );
    await expect(page.getByTestId("trameado-palillo-input")).toHaveValue("361");
    await expect(page.getByTestId("trameado-segment-number-input")).toHaveValue(
      "<1>",
    );
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(0);

    await page.getByTestId("trameado-diameter-input").fill('4"');
    await page.getByTestId("trameado-schedule-input").fill("40");
    await page.getByRole("button", { name: "Confirmar tramo" }).click();

    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(1);
    await expect(page.getByTestId("trameado-segment-row")).toContainText("361");
    await expect(page.getByTestId("trameado-assisted-segment-notice")).toHaveCount(
      0,
    );
  });
});
