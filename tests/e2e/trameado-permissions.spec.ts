import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, login } from "./fixtures";

function resetTrameadoE2EData() {
  execSync("npx tsx scripts/reset-e2e-trameado.ts", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

function sheetIdFromExportHref(href: string | null): string {
  const match = href?.match(/\/api\/files\/trameado\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`No se pudo extraer sheetId de href: ${href}`);
  }
  return match[1];
}

const TRAMEADO_EXPORT_ROUTES = ["csv", "xlsx", "marked-pdf", "package"] as const;

test.describe("trameado permissions", () => {
  test.describe.configure({ mode: "serial" });

  let sheetId: string;

  test.beforeAll(async ({ browser }) => {
    resetTrameadoE2EData();

    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-PERM-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toContainText(
      "HL-E2E-PERM-01",
    );

    await page.getByTestId("trameado-add-segment").click();
    const form = page.getByTestId("trameado-segment-form");
    await form.getByLabel("Nº tramo").fill("<1>");
    await form.getByLabel("Ø").fill('4"');
    await form.getByLabel("SCH.").fill("40");
    await form.getByLabel(/PALILLO/).fill("100");
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-row")).toHaveCount(1);

    await page
      .getByTestId("trameado-segments-table")
      .getByTestId("trameado-mark-on-drawing")
      .click();
    await page
      .getByTestId("trameado-pdf-annotation-overlay")
      .click({ position: { x: 120, y: 120 } });
    await expect(page.getByTestId("trameado-iso-marking-panel")).toHaveAttribute(
      "data-saving",
      "false",
    );

    const csvHref = await page.getByTestId("trameado-export-csv").getAttribute("href");
    sheetId = sheetIdFromExportHref(csvHref);

    await context.close();
  });

  for (const route of TRAMEADO_EXPORT_ROUTES) {
    test(`sin sesión ${route} devuelve 401`, async ({ request }) => {
      const response = await request.get(`/api/files/trameado/${sheetId}/${route}`);
      expect(response.status()).toBe(401);
    });
  }

  for (const route of TRAMEADO_EXPORT_ROUTES) {
    test(`cross-tenant ${route} devuelve 403`, async ({ page }) => {
      await login(page, E2E_USERS.other);
      const response = await page.request.get(`/api/files/trameado/${sheetId}/${route}`);
      expect(response.status()).toBe(403);
    });
  }

  test("viewer puede descargar CSV con Content-Type correcto", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    const response = await page.request.get(`/api/files/trameado/${sheetId}/csv`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(/attachment/i);
  });

  test("viewer puede descargar paquete ZIP", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    const response = await page.request.get(`/api/files/trameado/${sheetId}/package`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/zip");
  });

  test("viewer no ve acciones de edición en pestaña Trameado", async ({ page }) => {
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-create-sheet")).toHaveCount(0);
    await expect(page.getByTestId("trameado-add-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-mark-on-drawing")).toHaveCount(0);
    await expect(page.getByTestId("trameado-delete-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-mark-reviewed")).toHaveCount(0);
    await expect(page.getByTestId("trameado-segment-suggestions-panel")).toHaveCount(0);

    await expect(page.getByTestId("trameado-export-csv")).toBeVisible();
    await expect(page.getByTestId("trameado-export-package")).toBeVisible();
    await expect(page.getByTestId("trameado-export-marked-pdf")).toBeVisible();
  });

  test("engineer ve acciones de edición en pestaña Trameado", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-create-sheet")).toBeVisible();
    await expect(page.getByTestId("trameado-add-segment")).toBeVisible();
    await expect(
      page.getByTestId("trameado-segments-table").getByTestId("trameado-mark-on-drawing"),
    ).toBeVisible();
  });
});
