import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import {
  drawingMetadataPendingPath,
  drawingPath,
  E2E_USERS,
  login,
} from "./fixtures";

const MINI_TRAIL_STEPS = [
  "job_created",
  "upload_drawings",
  "complete_metadata",
  "analyze_materials",
  "review_beta_proposal",
  "review_palilleria",
  "trameado",
  "export_delivery",
] as const;

function resetMetadataSuggestionDrawing() {
  execSync("npx tsx scripts/reset-e2e-metadata-suggestions.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

test.describe("drawing workflow mini guide", () => {
  test("muestra brújula compacta con pasos y conceptos básicos", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    const miniGuide = page.getByTestId("drawing-workflow-mini-guide");
    await expect(miniGuide).toBeVisible();
    await expect(miniGuide).toContainText("Paso");
    await expect(miniGuide).toContainText("de 8");
    await expect(page.getByTestId("drawing-workflow-mini-trail")).toBeVisible();

    for (const stepId of MINI_TRAIL_STEPS) {
      await expect(
        page.getByTestId(`drawing-workflow-mini-step-${stepId}`),
      ).toBeVisible();
    }

    await expect(page.getByTestId("drawing-workflow-concepts-toggle")).toBeVisible();
    await page.getByTestId("drawing-workflow-concepts-toggle").click();
    await expect(page.getByTestId("workflow-concept-palilleria")).toBeVisible();
    await expect(page.getByTestId("workflow-concept-trameado")).toBeVisible();
    await expect(page.getByTestId("workflow-concept-paquete")).toBeVisible();
  });

  test("con metadatos pendientes marca Metadatos como paso actual", async ({
    page,
  }) => {
    resetMetadataSuggestionDrawing();
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingMetadataPendingPath());

    const miniGuide = page.getByTestId("drawing-workflow-mini-guide");
    await expect(miniGuide).toHaveAttribute(
      "data-current-step",
      "complete_metadata",
    );
    await expect(
      page.getByTestId("drawing-workflow-mini-step-complete_metadata"),
    ).toHaveAttribute("data-state", "current");
    await expect(miniGuide).toContainText("Paso 3 de 8");
  });

  test("tras analizar materiales marca Propuesta como paso actual", async ({
    page,
  }) => {
    resetMetadataSuggestionDrawing();
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

    const miniGuide = page.getByTestId("drawing-workflow-mini-guide");
    await expect(miniGuide).toHaveAttribute(
      "data-current-step",
      "review_beta_proposal",
    );
    await expect(
      page.getByTestId("drawing-workflow-mini-step-review_beta_proposal"),
    ).toHaveAttribute("data-state", "current");
    await expect(miniGuide).toContainText("Paso 5 de 8");
  });
});
