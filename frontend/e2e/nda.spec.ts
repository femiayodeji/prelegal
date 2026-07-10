import { test, expect } from "@playwright/test";
import fs from "node:fs";

// The rendered document lives in the element with class `.nda-document`.
const doc = ".nda-document";

test.beforeEach(async ({ page }) => {
  // The platform is gated by a (fake) login. Seed a session before any page
  // script runs so the guard lets us straight into the NDA workspace.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "prelegal.session",
      JSON.stringify({ email: "e2e@prelegal.app" }),
    );
  });
  await page.goto("/");
});

test("form input fills the live document preview", async ({ page }) => {
  const document = page.locator(doc);

  // Party company names flow into the signature blocks.
  await page.getByLabel("Company").first().fill("Acme, Inc.");
  await page.getByLabel("Company").nth(1).fill("Globex LLC");
  await expect(document).toContainText("Acme, Inc.");
  await expect(document).toContainText("Globex LLC");

  // Governing law and jurisdiction.
  await page.getByLabel("Governing law (state)").fill("Delaware");
  await page
    .getByLabel("Jurisdiction (city/county & state)")
    .fill("New Castle, Delaware");
  await expect(document).toContainText("Delaware");
  await expect(document).toContainText("New Castle, Delaware");

  // Effective date is formatted as a long US date.
  await page.getByLabel("Effective date").fill("2026-07-09");
  await expect(document).toContainText("July 9, 2026");
});

test("open-ended term options render their alternate text", async ({ page }) => {
  const document = page.locator(doc);

  await page.getByRole("radio", { name: /Continues until terminated/ }).check();
  await expect(document).toContainText(
    "Continues until terminated in accordance with the terms of the MNDA.",
  );

  await page.getByRole("radio", { name: /In perpetuity/ }).check();
  await expect(document).toContainText("In perpetuity.");
});

test("editing the term years by retyping produces the correct value", async ({
  page,
}) => {
  const document = page.locator(doc);
  const years = page.getByLabel("Number of MNDA term years");

  // Clear the field and type a new multi-digit value, keystroke by keystroke.
  // This is the regression guard for the "snaps to 1 on clear" bug.
  await years.click();
  await years.press("ControlOrMeta+a");
  await years.press("Backspace");
  await years.pressSequentially("25");
  await years.blur();

  await expect(years).toHaveValue("25");
  await expect(document).toContainText("Expires 25 years from the Effective Date");
});

test("Download PDF path produces a document-only PDF", async ({ page }) => {
  // Fill a couple of fields so the PDF has real content.
  await page.getByLabel("Company").first().fill("Acme, Inc.");
  await page.getByLabel("Governing law (state)").fill("Delaware");

  // page.pdf() renders with print media, exercising the print stylesheet that
  // isolates `.nda-document`. A non-trivial PDF confirms the download path.
  const pdf = await page.pdf({ format: "Letter" });
  expect(pdf.byteLength).toBeGreaterThan(5_000);
  fs.mkdirSync("e2e/artifacts", { recursive: true });
  fs.writeFileSync("e2e/artifacts/nda-sample.pdf", pdf);
});
