import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { drawingMetadataPendingPath, E2E_USERS, login } from "./fixtures";

function resetMetadataSuggestionDrawing() {
  execSync("npx tsx scripts/reset-e2e-metadata-suggestions.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

test.describe("beta proposal review flow", () => {
  test.beforeEach(() => {
    resetMetadataSuggestionDrawing();
  });

  test("tras analizar materiales enfoca revisar propuesta con un único CTA principal", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingMetadataPendingPath());

    await page.getByTestId("drawing-metadata-confirm-submit").click();
    await expect(page.getByTestId("drawing-metadata-confirmation-card")).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.getByTestId("materials-analysis-primary-cta").click();
    await expect(page.getByTestId("beta-review-prompt-card")).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "analyzed",
    );

    await expect(page.getByTestId("drawing-materials-analysis-prompt")).toHaveCount(0);
    await expect(page.getByTestId("drawing-operational-status")).toHaveCount(0);
    await expect(page.getByTestId("beta-review-prompt-card")).toBeVisible();
    await expect(page.getByText("Revisa la propuesta beta")).toBeVisible();
    await expect(page.getByTestId("beta-review-summary")).toBeVisible();
    await expect(page.getByTestId("beta-proposal-details-section")).toBeVisible();
    await expect(page.getByTestId("auto-takeoff-select-all-ready")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Importar propuesta revisada" }),
    ).toBeHidden();

    const readyCount = Number(
      await page.getByTestId("beta-review-ready-count").innerText(),
    );
    test.skip(readyCount === 0, "El PDF E2E no devolvió recomendadas para importar.");

    await expect(page.getByTestId("beta-review-select-recommended")).toBeVisible();
    await page.getByTestId("beta-review-select-recommended").click();

    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "with_selection",
    );
    await expect(page.getByTestId("beta-review-import-proposal")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Importar propuesta revisada" }),
    ).toHaveCount(1);
  });
});
