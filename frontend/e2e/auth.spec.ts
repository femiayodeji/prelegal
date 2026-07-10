import { test, expect, Page } from "@playwright/test";

// End-to-end coverage for real sign up / sign in (PL-7). The backend is stubbed
// via route interception so the flows are deterministic and offline.

const USER = { email: "user@example.com", displayName: "Ada" };

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

/** Stub /api/auth/me with the given status (200 = signed in, 401 = not). */
async function mockSession(page: Page, signedIn: boolean) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill(signedIn ? json(USER) : json({ detail: "Not authenticated." }, 401)),
  );
  // The workspace loads the catalog once inside the shell.
  await page.route("**/api/documents", (route) => route.fulfill(json([])));
}

test("visiting the platform without a session redirects to login", async ({
  page,
}) => {
  await mockSession(page, false);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("signing up brings the user into the platform", async ({ page }) => {
  await mockSession(page, true);
  await page.route("**/api/auth/signup", (route) => route.fulfill(json(USER)));

  await page.goto("/signup");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Legal Document Creator" }),
  ).toBeVisible();
});

test("signing in brings the user into the platform", async ({ page }) => {
  await mockSession(page, true);
  await page.route("**/api/auth/login", (route) => route.fulfill(json(USER)));

  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("bad credentials show an error", async ({ page }) => {
  await mockSession(page, false);
  await page.route("**/api/auth/login", (route) =>
    route.fulfill(json({ detail: "Incorrect email or password." }, 401)),
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
});

test("signing out returns to the login screen", async ({ page }) => {
  await mockSession(page, true);
  await page.route("**/api/auth/logout", (route) => route.fulfill(json({ status: "ok" })));

  await page.goto("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});
