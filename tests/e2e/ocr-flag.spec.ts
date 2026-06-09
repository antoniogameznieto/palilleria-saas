import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, login } from "./fixtures";

test.describe("OCR experimental (flag off)", () => {
  test("no muestra bloque OCR; detección productiva visible", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Metadatos", exact: true }).click();

    await expect(page.getByTestId("ocr-experimental-section")).toHaveCount(0);
    await expect(page.getByText("Herramientas experimentales")).toHaveCount(0);
    await expect(page.getByTestId("detect-metadata")).toBeVisible();
  });
});
