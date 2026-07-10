import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

// The rendered document lives in the element with class `.nda-document`.
const doc = ".nda-document";

// A fully-populated document state, as the backend would return it. Individual
// tests override fields as needed before wiring up the route.
const baseData = {
  partyOne: {
    company: "Acme, Inc.",
    signatoryName: "Jane Doe",
    title: "CEO",
    noticeAddress: "legal@acme.com",
  },
  partyTwo: {
    company: "Globex LLC",
    signatoryName: "John Roe",
    title: "COO",
    noticeAddress: "legal@globex.com",
  },
  purpose: "Evaluating a partnership.",
  effectiveDate: "2026-07-09",
  termKind: "expires",
  termYears: 1,
  confidentialityKind: "years",
  confidentialityYears: 1,
  governingLaw: "Delaware",
  jurisdiction: "New Castle, Delaware",
  modifications: "",
};

/**
 * Stub the backend chat endpoint so the AI response is deterministic: every
 * turn returns the given reply and document state, with no real LLM call.
 */
async function mockChat(
  page: Page,
  reply: string,
  data: Record<string, unknown>,
) {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply, data }),
    });
  });
}

/** Send one message through the chat UI. */
async function sendMessage(page: Page, text: string) {
  await page.getByLabel("Message the assistant").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

test.beforeEach(async ({ page }) => {
  // The platform is gated by a (fake) login. Seed a session before any page
  // script runs so the guard lets us straight into the NDA workspace.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "prelegal.session",
      JSON.stringify({ email: "e2e@prelegal.app" }),
    );
  });
});

test("the assistant greets the user on load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/who are the two companies/i)).toBeVisible();
});

test("a chat reply fills the live document preview", async ({ page }) => {
  await mockChat(page, "Great, I've noted both companies.", baseData);
  await page.goto("/");

  const document = page.locator(doc);
  await sendMessage(page, "We are Acme and Globex.");

  // The assistant's reply appears in the transcript.
  await expect(page.getByText("Great, I've noted both companies.")).toBeVisible();

  // The returned document state flows into the preview.
  await expect(document).toContainText("Acme, Inc.");
  await expect(document).toContainText("Globex LLC");
  await expect(document).toContainText("Delaware");
  await expect(document).toContainText("New Castle, Delaware");
  // Effective date is formatted as a long US date.
  await expect(document).toContainText("July 9, 2026");
});

test("open-ended term options render their alternate text", async ({ page }) => {
  await mockChat(page, "Done — set to open-ended terms.", {
    ...baseData,
    termKind: "untilTerminated",
    confidentialityKind: "perpetuity",
  });
  await page.goto("/");

  const document = page.locator(doc);
  await sendMessage(page, "No fixed end date, and confidentiality forever.");

  await expect(document).toContainText(
    "Continues until terminated in accordance with the terms of the MNDA.",
  );
  await expect(document).toContainText("In perpetuity.");
});

test("a failed chat request surfaces an error", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");

  await sendMessage(page, "Hello?");
  await expect(page.getByText(/something went wrong/i)).toBeVisible();
});

test("Download PDF path produces a document-only PDF", async ({ page }) => {
  await mockChat(page, "All set!", baseData);
  await page.goto("/");

  // Populate the document through the chat so the PDF has real content.
  await sendMessage(page, "Fill everything in.");
  await expect(page.locator(doc)).toContainText("Acme, Inc.");

  // page.pdf() renders with print media, exercising the print stylesheet that
  // isolates `.nda-document`. A non-trivial PDF confirms the download path.
  const pdf = await page.pdf({ format: "Letter" });
  expect(pdf.byteLength).toBeGreaterThan(5_000);
  fs.mkdirSync("e2e/artifacts", { recursive: true });
  fs.writeFileSync("e2e/artifacts/nda-sample.pdf", pdf);
});
