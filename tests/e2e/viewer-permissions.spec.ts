import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, jobPath, login } from "./fixtures";

test.describe("permisos viewer", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USERS.viewer);
  });

  test("puede ver trabajo, plano, palillería y consolidado", async ({
    page,
  }) => {
    await page.goto(jobPath());
    await expect(page.getByRole("heading", { name: "Trabajo E2E" })).toBeVisible();
    await expect(page.getByText("Consolidado de palillería")).toBeVisible();

    await page.goto(drawingPath());
    await expect(page.locator("#palilleria")).toBeVisible();
    await expect(page.getByText("E2E-A1")).toBeVisible();
  });

  test("no ve acciones de edición pero sí export", async ({ page }) => {
    await page.goto(jobPath());
    await expect(page.getByTestId("job-upload-drawings")).toHaveCount(0);
    await expect(page.getByTestId("export-job-csv").first()).toBeEnabled();
    await expect(page.getByTestId("export-job-excel").first()).toBeEnabled();

    await page.goto(drawingPath());
    await expect(page.getByTestId("detect-metadata")).toHaveCount(0);
    await expect(page.getByTestId("takeoff-add-line")).toHaveCount(0);
    await expect(page.getByTestId("takeoff-import-csv")).toHaveCount(0);
    await expect(page.getByTestId("confirm-takeoff-review")).toHaveCount(0);
    const takeoffSection = page.locator("#palilleria");
    await takeoffSection.scrollIntoViewIfNeeded();
    await expect(takeoffSection.getByTestId("export-drawing-csv")).toBeEnabled();
  });
});
