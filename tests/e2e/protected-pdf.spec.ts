import { expect, test } from "@playwright/test";

import { E2E_IDS, E2E_USERS, login } from "./fixtures";

const pdfApiPath = `/api/files/drawings/${E2E_IDS.drawingPending}`;

test.describe("PDF protegido", () => {
  test("sin sesión devuelve 401", async ({ request }) => {
    const response = await request.get(pdfApiPath);
    expect(response.status()).toBe(401);
  });

  test("con sesión devuelve 200 application/pdf", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    const response = await page.request.get(pdfApiPath);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  test("cross-tenant devuelve 403", async ({ page }) => {
    await login(page, E2E_USERS.other);
    const response = await page.request.get(pdfApiPath);
    expect(response.status()).toBe(403);
  });
});
