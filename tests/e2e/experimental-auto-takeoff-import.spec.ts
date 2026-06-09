import { expect, test } from "@playwright/test";

import { drawingBomPath, E2E_USERS, login } from "./fixtures";

test.describe("importación experimental auto-takeoff", () => {
  test("engineer filtra, selecciona e importa 1 missing sin matched", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingBomPath());

    await expect(page.getByText("Revisar palillería")).toBeVisible();
    await expect(page.locator("#palilleria").getByText("1000937601")).toBeVisible();
    await page.getByTestId("confirm-takeoff-review").click();
    await expect(page.getByText("Listo", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Automatización" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "not_analyzed",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-step-analyze")).toBeVisible();

    await page.getByTestId("experimental-auto-takeoff-run").click();
    await expect(page.getByTestId("experimental-auto-takeoff-results")).toBeVisible({
      timeout: 30_000,
    });

    const comparison = page.getByTestId("experimental-auto-takeoff-comparison-summary");
    await expect(comparison).toContainText("1 ya existen");
    await expect(comparison).toContainText("20 faltan");
    await expect(page.getByTestId("experimental-auto-takeoff-discovery-copy")).toContainText(
      "No se importa nada automáticamente",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-metrics")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-step-review")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "analyzed",
    );

    await page.getByTestId("experimental-auto-takeoff-status-filter").selectOption(
      "missing",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "20",
    );

    await page.getByTestId("experimental-auto-takeoff-select-visible-missing").click();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toContainText(
      "20 sugerencia",
    );

    await page.getByRole("button", { name: "Deseleccionar todo" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toContainText(
      "0 sugerencia",
    );

    await page.getByTestId("experimental-auto-takeoff-search").fill("1000937596");
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "1 de",
    );

    await page.getByTestId("experimental-auto-takeoff-select-row").check();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toContainText(
      "1 sugerencia",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-import-preview")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-import-preview")).toContainText(
      "1000937596",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-import-impact")).toBeVisible();
    await expect(page.getByTestId("experimental-auto-takeoff-assistant-status")).toHaveAttribute(
      "data-status",
      "with_selection",
    );

    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("Se crearán 1 línea(s) reales");
      expect(dialog.message()).toContain("invalidará la revisión");
      void dialog.accept();
    });

    await page.getByTestId("experimental-auto-takeoff-import").click();
    await expect(page.getByTestId("experimental-auto-takeoff-step-final")).toBeVisible({
      timeout: 30_000,
    });
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
    await expect(page.getByText("Revisar palillería")).toBeVisible();
    await expect(page.getByText("Listo", { exact: true })).toHaveCount(0);
    await expect(page.locator("#palilleria").getByText("1000937596")).toBeVisible();
    await expect(page.locator("#palilleria").getByText("1000937601")).toBeVisible();

    await page.getByRole("button", { name: "Automatización" }).click();
    await page.getByTestId("experimental-auto-takeoff-run").click();
    await expect(comparison).toBeVisible({ timeout: 30_000 });
    await expect(comparison).toContainText("2 ya existen");
    await expect(comparison).toContainText("19 faltan");

    await page.getByTestId("experimental-auto-takeoff-status-filter").selectOption(
      "matched",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-filtered-count")).toContainText(
      "2 de",
    );
    await expect(page.getByTestId("experimental-auto-takeoff-select-row")).toHaveCount(0);
  });

  test("viewer no ve bloque experimental", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingBomPath());
    await page.getByRole("button", { name: "Automatización" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toHaveCount(0);
  });
});
