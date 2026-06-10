import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import {
  drawingBomPath,
  drawingMetadataPendingPath,
  drawingPath,
  E2E_USERS,
  jobPath,
  login,
} from "./fixtures";

function resetJobWorkflowE2EData() {
  execSync("npx tsx scripts/reset-e2e-job-workflow.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

function resetMetadataSuggestionDrawing() {
  execSync("npx tsx scripts/reset-e2e-metadata-suggestions.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

async function markPalilleriaReviewedOnDrawing(
  page: import("@playwright/test").Page,
  path: string,
) {
  await page.goto(path);
  await page.getByRole("button", { name: "Palillería", exact: true }).click();
  await page.locator("#palilleria").getByTestId("confirm-takeoff-review").click();
  await expect(page.getByText("Palillería revisada")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("job workflow guide", () => {
  test.beforeEach(() => {
    resetJobWorkflowE2EData();
  });

  test("trabajo nuevo sin planos muestra CTA Subir plano", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(`${jobPath().replace(/\/jobs\/[^/]+$/, "/jobs/new")}`);
    await page.locator("#name").fill(`E2E Flujo ${Date.now()}`);
    await page.getByRole("button", { name: "Crear trabajo" }).click();
    await page.waitForURL(/\/jobs\/[^/]+$/);

    const guide = page.getByTestId("job-workflow-guide");
    await expect(guide).toBeVisible();
    await expect(page.getByTestId("job-workflow-title")).toHaveText(
      "Flujo del trabajo",
    );
    await expect(guide).toHaveAttribute("data-current-step", "upload_drawings");
    await expect(page.getByTestId("job-workflow-current-step-heading")).toContainText(
      "Paso 2 de 8",
    );
    await expect(page.getByTestId("job-workflow-upload-drawing")).toBeVisible();
    await expect(
      page.getByTestId("job-takeoff-consolidated-section-wrapper"),
    ).not.toHaveAttribute("open");
    await expect(page.getByTestId("job-workflow-check-upload_drawings")).toContainText(
      "En curso",
    );
  });

  test("trabajo con planos muestra guía y pasos principales", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(jobPath());

    const guide = page.getByTestId("job-workflow-guide");
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("Paso");
    await expect(guide).toContainText("de 8");
    await expect(page.getByTestId("workflow-concepts-toggle")).toBeVisible();
    await page.getByTestId("workflow-concepts-toggle").click();
    await expect(page.getByTestId("workflow-concept-palilleria")).toBeVisible();
    await expect(page.getByTestId("workflow-concept-trameado")).toBeVisible();
    await expect(page.getByTestId("workflow-concept-paquete")).toBeVisible();
    await expect(page.getByTestId("job-workflow-checklist")).toBeVisible();
    await expect(page.getByTestId("job-workflow-check-job_created")).toContainText(
      "Completo",
    );
    await expect(page.getByTestId("job-workflow-check-upload_drawings")).toContainText(
      "Completo",
    );
    await page.getByTestId("job-workflow-step-details").locator("summary").click();
    await expect(page.getByTestId("job-workflow-step-1")).toBeVisible();
    await expect(page.getByTestId("job-workflow-check-export_delivery")).toBeVisible();
  });

  test("muestra CTA Ir a Trameado cuando hay tramos confirmados", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);

    await markPalilleriaReviewedOnDrawing(page, drawingPath());
    await markPalilleriaReviewedOnDrawing(page, drawingBomPath());

    await page.goto(jobPath());
    await expect(page.getByTestId("job-workflow-open-trameado")).toBeVisible();
    await page.getByTestId("job-workflow-open-trameado").click();
    await page.waitForURL(/\/drawings\//);
    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await page.getByTestId("trameado-wizard-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-FLOW-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await page.getByTestId("trameado-add-segment").click();
    await page.getByTestId("trameado-segment-form").getByLabel("Nº tramo").fill("<1>");
    await page.getByTestId("trameado-segment-form").getByLabel("Ø").fill('4"');
    await page.getByTestId("trameado-segment-form").getByLabel("SCH.").fill("40");
    await page
      .getByTestId("trameado-segment-form")
      .getByLabel(/PALILLO/)
      .fill("100");
    await page.getByTestId("trameado-add-segment-submit").click();

    await page.goto(jobPath());
    await expect(page.getByTestId("job-workflow-check-trameado")).toContainText(
      /Completo|En curso|Revisar|tramo/,
    );
    await expect(
      page
        .getByTestId("job-workflow-open-trameado")
        .or(page.getByTestId("job-workflow-open-export")),
    ).toBeVisible();
  });

  test("con plano sin metadatos recomienda confirmar antes de materiales", async ({
    page,
  }) => {
    resetMetadataSuggestionDrawing();
    await login(page, E2E_USERS.engineer);
    await page.goto(jobPath());

    const guide = page.getByTestId("job-workflow-guide");
    await expect(guide).toHaveAttribute("data-current-step", "complete_metadata");
    await expect(page.getByTestId("job-workflow-review-metadata")).toBeVisible();
    await expect(
      page.getByTestId("job-takeoff-consolidated-section-wrapper"),
    ).not.toHaveAttribute("open");
    await expect(page.getByTestId("job-workflow-check-analyze_materials")).toContainText(
      "Bloqueado",
    );
    await expect(page.getByTestId("job-workflow-recommended-step")).toContainText(
      "Paso 3 de 8",
    );
    await expect(
      page.getByTestId("job-workflow-recommended-description"),
    ).toContainText("Confirma nº plano, línea y revisión");
  });

  test("tras confirmar el último plano pendiente marca metadatos como completos", async ({
    page,
  }) => {
    resetMetadataSuggestionDrawing();
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingMetadataPendingPath());
    await page.getByTestId("drawing-metadata-confirm-submit").click();
    await expect(page.getByTestId("drawing-metadata-confirmation-card")).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.goto(jobPath());
    await expect(page.getByTestId("job-workflow-check-complete_metadata")).toContainText(
      "Completo",
    );
  });

  test("viewer ve la guía sin CTAs de edición en pasos bloqueados", async ({
    page,
  }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(jobPath());

    await expect(page.getByTestId("job-workflow-guide")).toBeVisible();
    await expect(page.getByTestId("job-workflow-viewer-note")).toBeVisible();
    await expect(page.getByTestId("job-workflow-upload-drawing")).toHaveCount(0);
    await expect(page.getByTestId("job-workflow-review-metadata")).toHaveCount(0);
  });
});
