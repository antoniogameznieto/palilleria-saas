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

test.describe("trameado segment suggestions", () => {
  test.beforeEach(() => {
    resetTrameadoE2EData();
  });

  test("engineer revisa sugerencias, prepara una y confirma tramo", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await expect(
      page.getByTestId("trameado-segment-suggestions-panel"),
    ).toContainText("Crea una hoja para generar sugerencias de tramos");

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-SUG-02");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-SUG-02",
    );

    const suggestionsPanel = page.getByTestId("trameado-segment-suggestions-panel");
    await expect(suggestionsPanel).toBeVisible();

    const suggestionsList = page.getByTestId("trameado-segment-suggestions-list");
    const hasSuggestions = (await suggestionsList.count()) > 0;

    if (!hasSuggestions) {
      const candidateItem = page
        .getByTestId("trameado-candidate-dimension-item")
        .filter({ hasText: "361 mm" });
      await expect(candidateItem).toBeVisible();
      await candidateItem.getByTestId("trameado-candidate-dimension-prepare").click();
    } else {
      const firstSuggestion = page
        .getByTestId("trameado-segment-suggestion-item")
        .first();
      await firstSuggestion
        .getByTestId("trameado-segment-suggestion-prepare")
        .click();
    }

    await expect(page.getByTestId("trameado-segment-form")).toBeVisible();
    await expect(page.getByTestId("trameado-palillo-input")).not.toHaveValue("");

    const diameterValue = await page.getByTestId("trameado-diameter-input").inputValue();
    if (!diameterValue.trim()) {
      await page.getByTestId("trameado-diameter-input").fill('4"');
      await page.getByTestId("trameado-schedule-input").fill("40");
    }

    await page.getByRole("button", { name: "Confirmar tramo" }).click();
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(1);
  });

  test("viewer no puede añadir sugerencias de tramo", async ({ browser }) => {
    const engineerContext = await browser.newContext();
    const engineerPage = await engineerContext.newPage();

    await login(engineerPage, E2E_USERS.engineer);
    await engineerPage.goto(drawingPath());
    await engineerPage.getByRole("button", { name: "Trameado", exact: true }).click();
    await engineerPage.getByTestId("trameado-create-sheet").click();
    await engineerPage.locator("#trameado-line-identifier").fill("HL-E2E-SUG-VIEW");
    await engineerPage.getByTestId("trameado-create-sheet-submit").click();
    await engineerContext.close();

    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-segment-suggestions-panel")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("trameado-segment-suggestion-add")).toHaveCount(0);
    await expect(page.getByTestId("trameado-segment-suggestion-prepare")).toHaveCount(
      0,
    );

    await viewerContext.close();
  });
});
