import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChat } from "./chat";
import { fetchCatalog, fetchDocumentMarkdown } from "./documents";

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

describe("sendChat", () => {
  it("POSTs the transcript and document state to /api/chat", async () => {
    const doc = { documentType: "CSA.md", fields: [] };
    const fetchFn = mockFetch(200, { reply: "Hi", doc });

    const result = await sendChat([{ role: "user", content: "hello" }], doc);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      messages: [{ role: "user", content: "hello" }],
      doc,
    });
    expect(result.reply).toBe("Hi");
  });

  it("throws on a non-2xx response", async () => {
    mockFetch(502, {});
    await expect(sendChat([], { documentType: null, fields: [] })).rejects.toThrow(
      /502/,
    );
  });
});

describe("documents client", () => {
  it("fetches the catalog from /api/documents", async () => {
    const catalog = [{ name: "CSA", filename: "CSA.md", description: "…" }];
    const fetchFn = mockFetch(200, catalog);

    expect(await fetchCatalog()).toEqual(catalog);
    expect(fetchFn.mock.calls[0][0]).toBe("/api/documents");
  });

  it("encodes the filename when fetching a document", async () => {
    const fetchFn = mockFetch(200, { name: "CSA", filename: "CSA.md", markdown: "#" });
    await fetchDocumentMarkdown("CSA.md");
    expect(fetchFn.mock.calls[0][0]).toBe("/api/documents/CSA.md");
  });
});
