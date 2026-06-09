import { expect, test } from "@playwright/test";

import { drawingBomPath, drawingPath, E2E_USERS, login } from "./fixtures";

async function openBetaDetailPanel(page: import("@playwright/test").Page) {
  await page.getByTestId("experimental-auto-takeoff-detail-toggle").click();
}

async function openManualChecklistPanel(page: import("@playwright/test").Page) {
  const toggle = page.getByTestId("auto-takeoff-manual-checklist-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test.describe("importación experimental auto-takeoff", () => {
  test("engineer filtra, selecciona e importa 1 missing sin matched", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingBomPath());
    await page.getByRole("button", { name: "Palillería", exact: true }).click();

    await expect(
      page.locator("#palilleria").getByTestId("confirm-takeoff-review"),
    ).toBeVisible();
    await expect(page.locator("#palilleria").getByText("1000937601")).toBeVisible();
    await page.getByTestId("confirm-takeoff-review").click();
    await expect(
      page.locator("header").getByText("Listo", { exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole("button", { name: "Propuesta beta", exact: true })
      .click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant")).toBeVisible();
    await expect(page.getByText("Propuesta beta supervisada de palillería")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "not_analyzed",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-step-analyze")).toBeVisible();

    await page.getByTestId("experimental-auto-takeoff-run").click();
    await openBetaDetailPanel(page);
    await expect(page.getByTestId("experimental-auto-takeoff-results")).toBeVisible({
      timeout: 30_000,
    });

    const comparison = page.getByTestId("experimental-auto-takeoff-comparison-summary");
    await expect(comparison).toContainText("1 ya existen");
    await expect(comparison).toContainText("21 faltan");
    await expect(page.getByTestId("experimental-auto-takeoff-discovery-copy")).toContainText(
      "No se importa nada automáticamente",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-discovery-copy")).toContainText(
      "requiere revisión humana",
    );

    await expect(page.getByTestId("auto-takeoff-beta-proposal")).toBeVisible();
    await expect(page.getByTestId("auto-takeoff-beta-ready-count")).toHaveText("18");
    await expect(page.getByTestId("auto-takeoff-beta-review-count")).toHaveText("2");
    await expect(page.getByTestId("auto-takeoff-beta-excluded-count")).toHaveText("1");
    await expect(page.getByTestId("auto-takeoff-manual-checklist")).toBeVisible();
    await expect(page.getByTestId("auto-takeoff-manual-checklist")).toContainText(
      "Revisión manual recomendada",
    );
    await openManualChecklistPanel(page);
    await expect(page.getByTestId("auto-takeoff-manual-checklist")).toContainText(
      "no crean líneas automáticamente",
    );
    await expect(page.getByTestId("auto-takeoff-review-group")).toContainText(
      "necesitan revisión antes de importarlas",
    );
    const supportRow = page
      .getByTestId("experimental-auto-takeoff-result-row")
      .filter({ hasText: "SUP-001" });
    await expect(supportRow).toHaveCount(1);
    await expect(supportRow).toHaveAttribute("data-business-action", "review");
    await expect(
      supportRow.getByTestId("experimental-auto-takeoff-business-category-badge"),
    ).toContainText("Soporte");
    await expect(page.getByTestId("auto-takeoff-excluded-group")).toContainText(
      "no se importan porque las reglas",
    );
    await expect(page.getByTestId("auto-takeoff-excluded-group")).toContainText("FIGURA 8");

    await expect(page.getByTestId("experimental-auto-takeoff-metrics")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-step-review")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "analyzed",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toHaveText(
      "0",
    );

    await page.getByTestId("experimental-auto-takeoff-business-action-filter").selectOption(
      "exclude",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "1 de",
    );
    const figura8Row = page
      .getByTestId("experimental-auto-takeoff-result-row")
      .filter({ hasText: "FIGURA 8" });
    await expect(figura8Row).toHaveCount(1);
    await expect(figura8Row).toHaveAttribute("data-business-action", "exclude");
    await expect(
      figura8Row.getByTestId("experimental-auto-takeoff-business-action-badge"),
    ).toContainText("Excluir");
    await expect(
      figura8Row.getByTestId("experimental-auto-takeoff-row-import-disabled"),
    ).toBeVisible();
    await expect(figura8Row.getByTestId("experimental-auto-takeoff-select-row")).toHaveCount(0);

    await page.getByTestId("experimental-auto-takeoff-business-action-filter").selectOption("all");
    await page.getByTestId("experimental-auto-takeoff-status-filter").selectOption("missing");
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "21",
    );

    await page.getByTestId("auto-takeoff-select-all-ready").click();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toHaveText(
      "18",
    );

    await page.getByRole("button", { name: "Deseleccionar todo" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toHaveText(
      "0",
    );

    await page.getByTestId("experimental-auto-takeoff-search").fill("1000937596");
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "1 de",
    );

    await page.getByTestId("experimental-auto-takeoff-select-row").check();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toHaveText(
      "1",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-import-preview")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-import-preview")).toContainText(
      "1000937596",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-import-preview")).toContainText(
      "1 incluir",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-import-impact")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "with_selection",
    );

    let nativeDialogShown = false;
    page.on("dialog", () => {
      nativeDialogShown = true;
    });

    await page.getByTestId("auto-takeoff-import-reviewed-proposal").click();
    await expect(page.getByTestId("confirm-import-proposal-dialog")).toBeVisible();
    await expect(
      page.getByTestId("confirm-import-proposal-dialog"),
    ).toContainText("Se crearán");
    await expect(
      page.getByTestId("confirm-import-proposal-dialog"),
    ).toContainText("invalidará la revisión");
    await expect(
      page.getByTestId("confirm-import-proposal-dialog"),
    ).toContainText("1000937596");
    await page.getByTestId("confirm-import-proposal-cancel").click();
    await expect(page.getByTestId("confirm-import-proposal-dialog")).toHaveCount(0);
    await expect(page.getByTestId("experimental-auto-takeoff-step-final")).toHaveCount(0);
    expect(nativeDialogShown).toBe(false);

    await page.getByTestId("auto-takeoff-import-reviewed-proposal").click();
    await expect(page.getByTestId("confirm-import-proposal-dialog")).toBeVisible();
    await page.getByTestId("confirm-import-proposal-confirm").click();
    await expect(page.getByTestId("experimental-auto-takeoff-step-final")).toBeVisible({
      timeout: 30_000,
    });
    expect(nativeDialogShown).toBe(false);
    await expect(page.getByTestId("experimental-auto-takeoff-import-success")).toContainText(
      "Importación completada",
    );
    await expect(
      page.getByTestId("experimental-auto-takeoff-import-success-count"),
    ).toContainText("1");
    await expect(
      page.getByTestId("experimental-auto-takeoff-import-review-reset"),
    ).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "requires_review",
    );
    await expect(page.getByRole("link", { name: "Ir a la palillería real" })).toHaveAttribute(
      "href",
      "#palilleria",
    );

    await page.reload();
    await page.getByRole("button", { name: "Palillería", exact: true }).click();
    await expect(
      page.locator("#palilleria").getByTestId("confirm-takeoff-review"),
    ).toBeVisible();
    await expect(
      page.locator("header").getByText("Listo", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("#palilleria").getByText("1000937596")).toBeVisible();
    await expect(page.locator("#palilleria").getByText("1000937601")).toBeVisible();

    await page
      .getByRole("button", { name: "Propuesta beta", exact: true })
      .click();
    await page.getByTestId("experimental-auto-takeoff-run").click();
    await openBetaDetailPanel(page);
    await expect(comparison).toBeVisible({ timeout: 30_000 });
    await expect(comparison).toContainText("2 ya existen");
    await expect(comparison).toContainText("20 faltan");

    await page.getByTestId("experimental-auto-takeoff-status-filter").selectOption("matched");
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "2 de",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-select-row")).toHaveCount(0);
  });

  test("PDF sin BOM útil no muestra propuesta importable", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page
      .getByRole("button", { name: "Propuesta beta", exact: true })
      .click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toBeVisible();
    await page.getByTestId("experimental-auto-takeoff-run").click();
    await expect(page.getByTestId("auto-takeoff-beta-no-embedded-text")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("auto-takeoff-manual-checklist")).toBeVisible();
    await openManualChecklistPanel(page);
    await expect(
      page.getByTestId("auto-takeoff-manual-checklist-item-noUsefulText"),
    ).toBeVisible();
    await expect(page.getByTestId("auto-takeoff-beta-proposal")).toHaveCount(0);
    await expect(page.getByTestId("auto-takeoff-import-reviewed-proposal")).toHaveCount(0);
  });

  test("viewer no ve bloque experimental", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingBomPath());
    await expect(
      page.getByRole("button", { name: "Propuesta beta" }),
    ).toHaveCount(0);
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toHaveCount(0);
  });
});
