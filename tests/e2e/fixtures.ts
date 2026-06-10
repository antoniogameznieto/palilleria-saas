import {
  E2E_IDS,
  E2E_PASSWORD,
  E2E_USERS,
} from "../../scripts/seed-e2e";

export { E2E_IDS, E2E_PASSWORD, E2E_USERS };

export function jobPath(companyId = E2E_IDS.company, jobId = E2E_IDS.job) {
  return `/companies/${companyId}/jobs/${jobId}`;
}

export function drawingPath(
  drawingId: string = E2E_IDS.drawingPending,
  companyId = E2E_IDS.company,
  jobId = E2E_IDS.job,
) {
  return `${jobPath(companyId, jobId)}/drawings/${drawingId}`;
}

export function drawingBomPath(
  companyId = E2E_IDS.company,
  jobId = E2E_IDS.job,
) {
  return drawingPath(E2E_IDS.drawingBom, companyId, jobId);
}

export function drawingMetadataPendingPath(
  companyId = E2E_IDS.company,
  jobId = E2E_IDS.job,
) {
  return drawingPath(E2E_IDS.drawingMetadataPending, companyId, jobId);
}

export async function login(
  page: import("@playwright/test").Page,
  email: string,
  password = E2E_PASSWORD,
) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/(dashboard|onboarding\/company)/);
}
