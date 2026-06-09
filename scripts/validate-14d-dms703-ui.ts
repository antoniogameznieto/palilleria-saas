/**
 * Validación final Fase 14D — DMS-703 vía UI (Playwright) + comprobaciones BD.
 * Uso: npx tsx scripts/validate-14d-dms703-ui.ts
 */
import { chromium } from "@playwright/test";

import { prisma } from "../lib/db/prisma";

const COMPANY_ID = "cmq59yda70001o9qewato82p8";
const JOB_ID = "cmq5a8ic50009o9qegcl9k1a6";
const DRAWING_ID = "cmq5cxqwk000ho9i12qwjz667";
const BASE_URL = process.env.VALIDATE_BASE_URL ?? "http://localhost:3010";
const LOGIN_EMAIL =
  process.env.VALIDATE_LOGIN_EMAIL ?? "engineer-demo@palilleria.local";
const LOGIN_PASSWORD = process.env.VALIDATE_LOGIN_PASSWORD ?? "demo1234";

const drawingPath = `/companies/${COMPANY_ID}/jobs/${JOB_ID}/drawings/${DRAWING_ID}`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getDrawingState() {
  const drawing = await prisma.drawing.findFirst({
    where: { id: DRAWING_ID, companyId: COMPANY_ID, jobId: JOB_ID },
    select: {
      takeoffReviewedAt: true,
      _count: { select: { takeoffItems: true } },
    },
  });

  assert(drawing != null, "Plano DMS-703 no encontrado");

  return drawing;
}

async function getRecentActivities(limit = 10) {
  return prisma.drawingActivity.findMany({
    where: { drawingId: DRAWING_ID },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { type: true, message: true, metadata: true, createdAt: true },
  });
}

async function resolveLoginUser() {
  const membership = await prisma.companyMember.findFirst({
    where: {
      companyId: COMPANY_ID,
      user: { email: LOGIN_EMAIL },
      role: { in: ["owner", "admin", "engineer"] },
    },
    select: { role: true, user: { select: { email: true } } },
  });

  if (membership) {
    return membership.user.email;
  }

  const anyMember = await prisma.companyMember.findFirst({
    where: {
      companyId: COMPANY_ID,
      role: { in: ["owner", "admin", "engineer"] },
    },
    select: { user: { select: { email: true } } },
  });

  assert(anyMember != null, "No hay usuario owner/admin/engineer en la empresa DMS-703");

  return anyMember.user.email;
}

async function main() {
  const loginEmail = await resolveLoginUser();
  console.log(`Login: ${loginEmail}`);

  const before = await getDrawingState();
  console.log("BEFORE", {
    takeoffCount: before._count.takeoffItems,
    takeoffReviewedAt: before.takeoffReviewedAt,
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.locator("#email").waitFor({ state: "visible" });
    await page.locator("#email").fill(loginEmail);
    await page.locator("#password").fill(LOGIN_PASSWORD);
    await page.getByTestId("login-form").getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/(dashboard|onboarding\/company|companies)/, {
      timeout: 15_000,
    });

    await page.goto(`${BASE_URL}${drawingPath}`);
    await page.getByRole("button", { name: "Automatización" }).click();

    const section = page.getByTestId("experimental-auto-takeoff-section");
    await section.waitFor({ state: "visible", timeout: 15_000 });

    await page.getByTestId("experimental-auto-takeoff-run").click();
    await page.getByTestId("experimental-auto-takeoff-results").waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const comparisonSummary = page.getByTestId(
      "experimental-auto-takeoff-comparison-summary",
    );
    await comparisonSummary.waitFor({ state: "visible" });
    const comparisonText = await comparisonSummary.textContent();
    console.log("COMPARISON_AFTER_ANALYZE_1", comparisonText);

    assert(
      comparisonText?.includes("2 ya existen") === true,
      `Se esperaban 2 matched, texto: ${comparisonText}`,
    );
    assert(
      comparisonText?.includes("19 faltan") === true,
      `Se esperaban 19 missing, texto: ${comparisonText}`,
    );

    await page.getByRole("button", { name: "Deseleccionar todo" }).click();
    const missingCheckboxes = page.getByTestId("experimental-auto-takeoff-select-row");
    const checkboxCount = await missingCheckboxes.count();
    assert(checkboxCount >= 1, "Debe haber al menos 1 checkbox importable");

    await missingCheckboxes.first().check();
    const selectedCount = page.getByTestId("experimental-auto-takeoff-selected-count");
    await selectedCount.waitFor({ state: "visible" });
    const selectedText = await selectedCount.textContent();
    assert(
      selectedText?.includes("1 sugerencia") === true,
      `Contador selección: ${selectedText}`,
    );

    page.once("dialog", (dialog) => {
      assert(
        dialog.message().includes("Se crearán 1 línea"),
        `Confirmación inesperada: ${dialog.message()}`,
      );
      void dialog.accept();
    });

    const takeoffBeforeImport = (await getDrawingState())._count.takeoffItems;

    await page.getByTestId("experimental-auto-takeoff-import").click();
    await page.getByTestId("experimental-auto-takeoff-import-success").waitFor({
      state: "visible",
      timeout: 30_000,
    });

    await page.reload();
    await expectProgressRevisarPalilleria(page);

    const afterImport = await getDrawingState();
    console.log("AFTER_IMPORT", {
      takeoffCount: afterImport._count.takeoffItems,
      takeoffReviewedAt: afterImport.takeoffReviewedAt,
    });

    assert(
      afterImport._count.takeoffItems === takeoffBeforeImport + 1,
      `Se esperaba +1 línea (${takeoffBeforeImport} → ${takeoffBeforeImport + 1}), actual: ${afterImport._count.takeoffItems}`,
    );
    assert(
      afterImport.takeoffReviewedAt == null,
      "takeoffReviewedAt debe ser null tras importar",
    );

    const activities = await getRecentActivities(15);
    const reviewReset = activities.find((a) => a.type === "takeoff_review_reset");
    const itemsImported = activities.find(
      (a) =>
        a.type === "takeoff_items_imported" &&
        (a.metadata as { source?: string } | null)?.source ===
          "experimental_auto_takeoff",
    );

    assert(reviewReset != null, "Falta actividad takeoff_review_reset");
    assert(itemsImported != null, "Falta actividad takeoff_items_imported experimental");
    console.log("ACTIVITIES", {
      reviewReset: reviewReset?.message,
      itemsImported: itemsImported?.message,
      itemsMetadata: itemsImported?.metadata,
    });

    await page.getByRole("button", { name: "Automatización" }).click();
    await page.getByTestId("experimental-auto-takeoff-run").click();
    await page.getByTestId("experimental-auto-takeoff-comparison-summary").waitFor({
      state: "visible",
      timeout: 30_000,
    });
    const comparisonText2 = await page
      .getByTestId("experimental-auto-takeoff-comparison-summary")
      .textContent();
    console.log("COMPARISON_AFTER_ANALYZE_2", comparisonText2);

    assert(
      comparisonText2?.includes("3 ya existen") === true,
      `Se esperaban 3 matched, texto: ${comparisonText2}`,
    );
    assert(
      comparisonText2?.includes("18 faltan") === true,
      `Se esperaban 18 missing, texto: ${comparisonText2}`,
    );

    console.log("validate-14d-dms703-ui: ALL CHECKS PASSED");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function expectProgressRevisarPalilleria(
  page: import("@playwright/test").Page,
) {
  await page.getByText("Revisar palillería").first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
