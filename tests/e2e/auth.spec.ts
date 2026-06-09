import { expect, test } from "@playwright/test";

import { E2E_USERS, jobPath, login } from "./fixtures";

test.describe("auth y acceso", () => {
  test("sin sesión /dashboard redirige a /login en el mismo host", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toMatch(new URL("/login", baseURL!).origin);
  });

  test("login con owner E2E y acceso a dashboard y trabajo", async ({
    page,
  }) => {
    await login(page, E2E_USERS.owner);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(jobPath());
    await expect(page.getByRole("heading", { name: "Trabajo E2E" })).toBeVisible();
    await expect(page.getByText("Consolidado de palillería")).toBeVisible();
  });
});
