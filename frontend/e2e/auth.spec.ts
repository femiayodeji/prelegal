import { test, expect } from "@playwright/test";

// End-to-end coverage for the V1 foundation's fake login gate (PL-4).

test("visiting the platform without a session redirects to login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Sign in" }),
  ).toBeVisible();
});

test("signing in brings the user into the platform", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Lands on the platform shell with the NDA workspace inside it.
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Mutual NDA Creator" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("signing out returns to the login screen", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "prelegal.session",
      JSON.stringify({ email: "user@example.com" }),
    );
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});
