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

test.describe("drawing metadata suggestions", () => {
  test.beforeEach(() => {
    resetMetadataSuggestionDrawing();
  });

  test("propone metadatos desde el nombre del archivo y permite confirmar", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingMetadataPendingPath());

    await expect(page.getByTestId("drawing-metadata-confirmation-card")).toBeVisible();
    await expect(page.getByText("Confirma los metadatos del plano")).toBeVisible();
    await expect(
      page.getByTestId("drawing-metadata-suggestion-drawing-number"),
    ).toHaveValue("2301GB47G-C1-L-HL-1289-01");
    await expect(page.getByTestId("drawing-metadata-suggestion-line-number")).toHaveValue(
      "HL-1289",
    );
    await expect(page.getByTestId("drawing-metadata-suggestion-revision")).toHaveValue("01");
    await expect(page.getByTestId("drawing-metadata-confirm-submit")).toHaveCount(1);
    await expect(page.getByTestId("drawing-operational-analyze-materials")).toHaveCount(0);
    await expect(page.getByTestId("drawing-operational-confirm-metadata")).toHaveCount(0);
    await expect(page.getByTestId("drawing-operational-status")).toHaveCount(0);
    await expect(page.getByTestId("drawing-metadata-advanced-options")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Opciones avanzadas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar ajuste manual" }),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: "Actualizar estado" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Extraer texto del PDF" }),
    ).toBeHidden();

    await page.getByTestId("drawing-metadata-confirm-submit").click();
    await expect(page.getByTestId("drawing-metadata-confirmation-card")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("drawing-workspace-tab-propuesta-beta")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("drawing-materials-analysis-prompt")).toBeVisible();
    await expect(page.getByTestId("materials-analysis-primary-cta")).toBeVisible();
    await expect(page.getByTestId("drawing-operational-status")).toHaveCount(0);
    await expect(page.getByTestId("drawing-operational-analyze-materials")).toHaveCount(0);
    await expect(page.getByTestId("beta-review-prompt-card")).toHaveCount(0);
    await expect(page.getByTestId("beta-assistant-secondary-section")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-run")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Analizar relación de materiales" }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Detectar metadatos" })).toBeHidden();
    await page.getByRole("button", { name: "Metadatos", exact: true }).click();
    await expect(page.getByTestId("drawing-metadata-advanced-tools")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar ajuste manual" }),
    ).toBeHidden();
  });
});
