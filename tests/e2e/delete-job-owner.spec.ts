import { expect, test } from "@playwright/test";

import { E2E_USERS, jobPath, login } from "./fixtures";

test.describe("delete job owner", () => {
  test("owner ve y puede eliminar un trabajo de prueba", async ({ page }) => {
    await login(page, E2E_USERS.owner);
    await page.goto(`${jobPath().replace(/\/jobs\/[^/]+$/, "/jobs/new")}`);
    const jobName = `E2E Delete ${Date.now()}`;
    await page.locator("#name").fill(jobName);
    await page.getByRole("button", { name: "Crear trabajo" }).click();
    await page.waitForURL(/\/jobs\/[^/]+$/);

    await expect(page.getByTestId("job-delete-button")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("job-delete-button").click();
    await page.waitForURL(/\/jobs$/);

    await expect(page.getByRole("link", { name: jobName })).toHaveCount(0);
  });

  test("engineer no ve el botón eliminar trabajo", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(jobPath());
    await expect(page.getByTestId("job-delete-button")).toHaveCount(0);
  });

  test("viewer no ve el botón eliminar trabajo", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(jobPath());
    await expect(page.getByTestId("job-delete-button")).toHaveCount(0);
  });
});
