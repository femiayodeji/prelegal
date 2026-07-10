import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSavedDocument,
  deleteSavedDocument,
  getSavedDocument,
  listSavedDocuments,
} from "./library";

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

describe("library client", () => {
  it("lists saved documents", async () => {
    const fn = mockFetch(200, [{ id: 1, documentType: "CSA.md", title: "X", updatedAt: "" }]);
    const docs = await listSavedDocuments();
    expect(docs).toHaveLength(1);
    expect(fn.mock.calls[0][0]).toBe("/api/saved-documents");
  });

  it("fetches one document by id", async () => {
    const fn = mockFetch(200, { id: 7, documentType: "CSA.md", title: "X", updatedAt: "", fields: [] });
    await getSavedDocument(7);
    expect(fn.mock.calls[0][0]).toBe("/api/saved-documents/7");
  });

  it("POSTs the input when creating", async () => {
    const fn = mockFetch(201, { id: 1, documentType: "CSA.md", title: "X", updatedAt: "", fields: [] });
    await createSavedDocument({ documentType: "CSA.md", title: "X", fields: [] });
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/saved-documents");
    expect(init.method).toBe("POST");
  });

  it("throws the backend message on failure", async () => {
    mockFetch(404, { detail: "Document not found." });
    await expect(deleteSavedDocument(9)).rejects.toThrow(/not found/);
  });
});
