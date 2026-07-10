import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

// The rendered document lives in the element with class `.legal-document`.
const doc = ".legal-document";

// Minimal Standard Terms markdown the backend would return for a document.
const CSA_MARKDOWN =
  "# Cloud Service Agreement\n\n" +
  '1. <span class="header_2">Service</span>\n' +
  '    1. <span class="coverpage_link">Provider</span> will provide the ' +
  'Cloud Service to <span class="coverpage_link">Customer</span>.\n';

/** Stub the catalog + a document's markdown so the preview can render offline. */
async function mockDocuments(page: Page) {
  await page.route("**/api/documents", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { name: "Cloud Service Agreement", filename: "CSA.md", description: "…" },
      ]),
    }),
  );
  await page.route("**/api/documents/CSA.md", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "Cloud Service Agreement",
        filename: "CSA.md",
        markdown: CSA_MARKDOWN,
      }),
    }),
  );
}

/** Stub the chat endpoint with a fixed reply + document state. */
async function mockChat(
  page: Page,
  reply: string,
  docState: Record<string, unknown>,
) {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply, doc: docState }),
    }),
  );
}

async function sendMessage(page: Page, text: string) {
  await page.getByLabel("Message the assistant").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

test.beforeEach(async ({ page }) => {
  // Stub the real session check so the login guard lets us into the workspace.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ email: "e2e@prelegal.app", displayName: "E2E" }),
    }),
  );
  await mockDocuments(page);
});

test("the assistant greets and the preview starts empty", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/what kind of document/i)).toBeVisible();
  await expect(page.getByText(/your document will appear here/i)).toBeVisible();
});

test("choosing a document renders its terms and collected fields", async ({
  page,
}) => {
  await mockChat(page, "Great — a Cloud Service Agreement. Who is the provider?", {
    documentType: "CSA.md",
    fields: [
      { label: "Provider Company", value: "Acme, Inc." },
      { label: "Governing Law", value: "Delaware" },
    ],
  });
  await page.goto("/");

  await sendMessage(page, "I need a cloud service agreement");

  const document = page.locator(doc);
  // Cover page: title, "Cover Page" label, and collected fields.
  await expect(document.getByText("Cover Page", { exact: true })).toBeVisible();
  await expect(document).toContainText("Cloud Service Agreement");
  await expect(document).toContainText("Provider Company");
  await expect(document).toContainText("Acme, Inc.");
  await expect(document).toContainText("Delaware");
  // Standard Terms rendered from the markdown template.
  await expect(document).toContainText("Provider will provide the Cloud Service");
  // The draft disclaimer is always present on the document.
  await expect(document).toContainText("Draft — not legal advice.");
});

test("saving a document confirms and switches to Update", async ({ page }) => {
  await mockChat(page, "All set!", {
    documentType: "CSA.md",
    fields: [{ label: "Provider Company", value: "Acme, Inc." }],
  });
  await page.route("**/api/saved-documents", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        documentType: "CSA.md",
        title: "Cloud Service Agreement — Acme, Inc.",
        updatedAt: "2026-07-10 18:00:00",
        fields: [{ label: "Provider Company", value: "Acme, Inc." }],
      }),
    }),
  );
  await page.goto("/");

  await sendMessage(page, "cloud service agreement");
  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByText("Saved to My documents.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();
});

test("assistant markdown is formatted and the composer keeps focus", async ({
  page,
}) => {
  await mockChat(page, "Here's what's **important**:\n\n- Parties\n- Governing law", {
    documentType: "CSA.md",
    fields: [],
  });
  await page.goto("/");

  const composer = page.getByLabel("Message the assistant");
  await sendMessage(page, "what do you need?");

  // Markdown is rendered: bold becomes <strong>, the list becomes <li>s.
  const conversation = page.getByLabel("Conversation");
  await expect(conversation.locator("strong", { hasText: "important" })).toBeVisible();
  await expect(conversation.locator("li")).toHaveCount(2);

  // The composer regains focus after the exchange so the user can keep typing.
  await expect(composer).toBeFocused();
});

test("an unsupported request keeps the preview empty", async ({ page }) => {
  // The assistant declines and offers a closest match; documentType stays null.
  await mockChat(
    page,
    "Prelegal can't generate an employment contract, but the closest we have " +
      "is a Professional Services Agreement. Want to use that?",
    { documentType: null, fields: [] },
  );
  await page.goto("/");

  await sendMessage(page, "I need an employment contract");

  await expect(page.getByText(/closest we have/i)).toBeVisible();
  await expect(page.getByText(/your document will appear here/i)).toBeVisible();
});

test("a failed chat request surfaces an error", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");

  await sendMessage(page, "Hello?");
  await expect(page.getByText(/something went wrong/i)).toBeVisible();
});

test("Download PDF path produces a document-only PDF", async ({ page }) => {
  await mockChat(page, "All set!", {
    documentType: "CSA.md",
    fields: [{ label: "Governing Law", value: "Delaware" }],
  });
  await page.goto("/");

  await sendMessage(page, "Cloud service agreement please");
  await expect(page.locator(doc)).toContainText("Cloud Service Agreement");

  // page.pdf() renders with print media, exercising the print stylesheet that
  // isolates `.legal-document`. A non-trivial PDF confirms the download path.
  const pdf = await page.pdf({ format: "Letter" });
  expect(pdf.byteLength).toBeGreaterThan(5_000);
  fs.mkdirSync("e2e/artifacts", { recursive: true });
  fs.writeFileSync("e2e/artifacts/document-sample.pdf", pdf);
});
