import { test, expect, Page } from "@playwright/test";

// End-to-end coverage for the "My Documents" library and reopening a saved
// document back into the workspace (PL-7). The backend is stubbed via routes.

const CSA_MARKDOWN =
  "# Cloud Service Agreement\n\n" +
  '1. <span class="coverpage_link">Provider</span> will provide the Cloud Service.\n';

const SAVED = {
  id: 42,
  documentType: "CSA.md",
  title: "Cloud Service Agreement — Acme, Inc.",
  updatedAt: "2026-07-10 18:00:00",
  fields: [{ label: "Provider Company", value: "Acme, Inc." }],
};

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function mockCommon(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill(json({ email: "e2e@prelegal.app", displayName: "E2E" })),
  );
  await page.route("**/api/documents", (route) =>
    route.fulfill(json([{ name: "Cloud Service Agreement", filename: "CSA.md", description: "…" }])),
  );
  await page.route("**/api/documents/CSA.md", (route) =>
    route.fulfill(json({ name: "Cloud Service Agreement", filename: "CSA.md", markdown: CSA_MARKDOWN })),
  );
}

test("the library lists saved documents and can reopen one", async ({ page }) => {
  await mockCommon(page);
  await page.route("**/api/saved-documents", (route) => route.fulfill(json([SAVED])));
  await page.route("**/api/saved-documents/42", (route) => route.fulfill(json(SAVED)));

  await page.goto("/documents");

  // The saved document is listed.
  await expect(
    page.getByText("Cloud Service Agreement — Acme, Inc."),
  ).toBeVisible();

  // Opening it navigates to the workspace with the document loaded.
  await page.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/\?doc=42/);

  const document = page.locator(".legal-document");
  await expect(document).toContainText("Provider Company");
  await expect(document).toContainText("Acme, Inc.");
});

test("the library shows an empty state when there are no documents", async ({
  page,
}) => {
  await mockCommon(page);
  await page.route("**/api/saved-documents", (route) => route.fulfill(json([])));

  await page.goto("/documents");
  await expect(page.getByText(/haven't saved any documents yet/i)).toBeVisible();
});
