import { expect, test } from "@playwright/test";

import { drawingPath, E2E_USERS, login } from "./fixtures";

async function fillSegmentForm(
  page: import("@playwright/test").Page,
  values: {
    segmentNumber: string;
    diameter: string;
    schedule: string;
    palilloLength: string;
  },
) {
  const form = page.getByTestId("trameado-segment-form");
  await form.getByLabel("Nº tramo").fill(values.segmentNumber);
  await form.getByLabel("Ø").fill(values.diameter);
  await form.getByLabel("SCH.").fill(values.schedule);
  await form.getByLabel(/PALILLO/).fill(values.palilloLength);
}

test.describe("trameado manual", () => {
  test("engineer crea hoja, añade tramo, edita, borra y marca revisada", async ({
    page,
  }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());

    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await expect(page.getByTestId("trameado-section")).toBeVisible();

    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-A012AA-N-01");
    await page.locator("#trameado-line-class").fill("A012AA");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toHaveText(
      "HL-E2E-A012AA-N-01",
    );

    await page.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(page, {
      segmentNumber: "<1>",
      diameter: '4"',
      schedule: "40",
      palilloLength: "363",
    });
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segments-table")).toBeVisible();
    await expect(page.getByTestId("trameado-segment-row")).toContainText("363");

    await page.getByTestId("trameado-edit-segment").click();
    await page.getByTestId("trameado-segment-form").getByLabel(/PALILLO/).fill("370");
    await page.getByTestId("trameado-update-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-row")).toContainText("370");

    await page.getByTestId("trameado-mark-reviewed").click();
    await expect(page.getByTestId("trameado-sheet-reviewed-status")).toBeVisible({
      timeout: 15_000,
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("trameado-delete-segment").click();
    await expect(page.getByTestId("trameado-segments-empty")).toBeVisible();
    await expect(page.getByTestId("trameado-sheet-reviewed-status")).toHaveCount(
      0,
    );
  });

  test("viewer ve trameado pero no acciones de edición", async ({ page }) => {
    await login(page, E2E_USERS.engineer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();
    await page.getByTestId("trameado-create-sheet").click();
    await page.locator("#trameado-line-identifier").fill("HL-E2E-VIEWER-01");
    await page.getByTestId("trameado-create-sheet-submit").click();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toHaveText(
      "HL-E2E-VIEWER-01",
    );
    await page.getByTestId("trameado-add-segment").click();
    await fillSegmentForm(page, {
      segmentNumber: "<1>",
      diameter: '3/4"',
      schedule: "80",
      palilloLength: "120",
    });
    await page.getByTestId("trameado-add-segment-submit").click();
    await expect(page.getByTestId("trameado-segment-row")).toContainText("120");

    await page.context().clearCookies();
    await login(page, E2E_USERS.viewer);
    await page.goto(drawingPath());
    await page.getByRole("button", { name: "Trameado", exact: true }).click();

    await expect(page.getByTestId("trameado-segments-table")).toBeVisible();
    await expect(page.getByTestId("trameado-sheet-line-identifier")).toHaveText(
      "HL-E2E-VIEWER-01",
    );
    await expect(page.getByTestId("trameado-segment-row")).toContainText("120");
    await expect(page.getByTestId("trameado-create-sheet")).toHaveCount(0);
    await expect(page.getByTestId("trameado-add-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-edit-segment")).toHaveCount(0);
    await expect(page.getByTestId("trameado-mark-reviewed")).toHaveCount(0);
  });
});
