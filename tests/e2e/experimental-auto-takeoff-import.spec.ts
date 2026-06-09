import { expect, test } from "@playwright/test";

import { drawingBomPath, E2E_USERS, login } from "./fixtures";

test.describe("importación experimental auto-takeoff", () => {
  test("engineer analiza, importa 1 missing e invalida revisión", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingBomPath());

    await expect(page.getByText("Listo", { exact: true })).toBeVisible();
    await expect(page.locator("#palilleria").getByText("1000937601")).toBeVisible();

    await page.getByRole("button", { name: "Automatización" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toBeVisible();

    await page.getByTestId("experimental-auto-takeoff-run").click();
    await expect(page.getByTestId("experimental-auto-takeoff-results")).toBeVisible({
      timeout: 30_000,
    });

    const comparison = page.getByTestId("experimental-auto-takeoff-comparison-summary");
    await expect(comparison).toContainText("1 ya existen");
    await expect(comparison).toContainText("20 faltan");

    await page.getByRole("button", { name: "Deseleccionar todo" }).click();
    await page.getByTestId("experimental-auto-takeoff-select-row").first().check();
    await expect(page.getByTestId("experimental-auto-takeoff-selected-count")).toContainText(
      "1 sugerencia",
    );

    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("Se crearán 1 línea");
      void dialog.accept();
    });

    await page.getByTestId("experimental-auto-takeoff-import").click();
    await expect(page.getByTestId("experimental-auto-takeoff-import-success")).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page.getByText("Revisar palillería")).toBeVisible();
    await expect(page.getByText("Listo", { exact: true })).toHaveCount(0);
    await expect(page.locator("#palilleria").getByText("1000937596")).toBeVisible();

    await page.getByRole("button", { name: "Automatización" }).click();
    await page.getByTestId("experimental-auto-takeoff-run").click();
    await expect(comparison).toBeVisible({ timeout: 30_000 });
    await expect(comparison).toContainText("2 ya existen");
    await expect(comparison).toContainText("19 faltan");
  });

  test("viewer no ve bloque experimental", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingBomPath());
    await page.getByRole("button", { name: "Automatización" }).click();
    await expect(page.getByTestId("experimental-auto-takeoff-section")).toHaveCount(0);
  });
});
