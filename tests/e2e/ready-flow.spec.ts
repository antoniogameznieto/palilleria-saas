import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, jobPath, login } from "./fixtures";

test.describe("flujo Listo", () => {
  test("marcar palillería revisada y comprobar progreso", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await expect(page.getByText("Revisar palillería")).toBeVisible();
    await page.getByTestId("confirm-takeoff-review").click();
    await expect(page.getByText("Palillería revisada")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Listo", { exact: true })).toBeVisible();

    await page.goto(jobPath());
    const readyKpi = page
      .locator("section")
      .filter({ hasText: "Resumen del trabajo" })
      .getByText("Planos listos")
      .locator("..")
      .locator("p.text-xl");
    await expect(readyKpi).toHaveText("1");

    await page.locator("#job-takeoff-consolidated-scope").selectOption("ready_only");
    await expect(page.getByText("E2E-A1")).toBeVisible();
    await expect(page.getByText("E2E-A2")).toBeVisible();
  });
});
