// Client for the user's saved documents — the "My Documents" library (PL-7).

import { DocField } from "@/lib/documents";

/** A saved document as shown in the library list. */
export interface SavedDocumentSummary {
  id: number;
  documentType: string;
  title: string;
  updatedAt: string;
}

/** A saved document with its fields, for reopening in the workspace. */
export interface SavedDocument extends SavedDocumentSummary {
  fields: DocField[];
}

interface SaveInput {
  documentType: string;
  title: string;
  fields: DocField[];
}

async function ok(res: Response, fallback: string): Promise<Response> {
  if (res.ok) return res;
  let detail = fallback;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
  } catch {
    /* no JSON body */
  }
  throw new Error(detail);
}

const jsonHeaders = { "Content-Type": "application/json" };

/** List the current user's saved documents (newest first). */
export async function listSavedDocuments(): Promise<SavedDocumentSummary[]> {
  const res = await ok(
    await fetch("/api/saved-documents", { credentials: "same-origin" }),
    "Failed to load documents.",
  );
  return (await res.json()) as SavedDocumentSummary[];
}

/** Fetch one saved document with its fields. */
export async function getSavedDocument(id: number): Promise<SavedDocument> {
  const res = await ok(
    await fetch(`/api/saved-documents/${id}`, { credentials: "same-origin" }),
    "Failed to load document.",
  );
  return (await res.json()) as SavedDocument;
}

/** Create a new saved document, returning it (with its new id). */
export async function createSavedDocument(
  input: SaveInput,
): Promise<SavedDocument> {
  const res = await ok(
    await fetch("/api/saved-documents", {
      method: "POST",
      headers: jsonHeaders,
      credentials: "same-origin",
      body: JSON.stringify(input),
    }),
    "Failed to save document.",
  );
  return (await res.json()) as SavedDocument;
}

/** Update an existing saved document in place. */
export async function updateSavedDocument(
  id: number,
  input: SaveInput,
): Promise<SavedDocument> {
  const res = await ok(
    await fetch(`/api/saved-documents/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      credentials: "same-origin",
      body: JSON.stringify(input),
    }),
    "Failed to save document.",
  );
  return (await res.json()) as SavedDocument;
}

/** Delete a saved document. */
export async function deleteSavedDocument(id: number): Promise<void> {
  await ok(
    await fetch(`/api/saved-documents/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    }),
    "Failed to delete document.",
  );
}
