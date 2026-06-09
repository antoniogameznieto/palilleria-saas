import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, jobPath, login } from "./fixtures";

test.describe("permisos engineer", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USERS.engineer);
  });

  test("ve acciones de subida, detección y palillería en el trabajo", async ({
    page,
  }) => {
    await page.goto(jobPath());
    await expect(page.getByTestId("job-upload-drawings")).toBeVisible();

    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Automatización" }).click();
    await expect(page.getByTestId("detect-metadata")).toBeVisible();
    await expect(page.getByTestId("takeoff-add-line")).toBeVisible();
    await expect(page.getByTestId("takeoff-import-csv")).toBeVisible();
    await expect(page.getByTestId("confirm-takeoff-review")).toBeVisible();
  });

  test("no ve eliminar plano (solo admin/owner)", async ({ page }) => {
    await page.goto(drawingPath());
    await expect(page.getByTestId("delete-drawing")).toHaveCount(0);
    await page.goto(jobPath());
    await expect(page.getByTestId("delete-drawing")).toHaveCount(0);
  });
});
