import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, logIn, signUp } from "./auth";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("getCurrentUser", () => {
  it("returns null when unauthenticated (401)", async () => {
    mockFetch(401, {});
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the user when authenticated", async () => {
    mockFetch(200, { email: "a@b.com", displayName: "Ada" });
    expect(await getCurrentUser()).toEqual({ email: "a@b.com", displayName: "Ada" });
  });
});

describe("logIn / signUp", () => {
  it("posts credentials and returns the user", async () => {
    const fetchFn = mockFetch(200, { email: "a@b.com", displayName: null });
    await logIn("a@b.com", "secret");
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "a@b.com",
      password: "secret",
    });
  });

  it("surfaces the backend error message", async () => {
    mockFetch(409, { detail: "An account with that email already exists." });
    await expect(signUp("a@b.com", "password123")).rejects.toThrow(
      /already exists/,
    );
  });
});
