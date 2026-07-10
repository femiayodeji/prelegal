// Data layer for the multi-document engine (PL-6).
//
// The frontend is a static export with no server of its own, so the catalog of
// supported documents and each document's Standard Terms are fetched from the
// FastAPI backend, which owns catalog.json and the templates.

/** A document the user can create, as advertised by the backend catalog. */
export interface CatalogDocument {
  name: string;
  filename: string;
  description: string;
}

/** A single cover-page value collected from the user. */
export interface DocField {
  label: string;
  value: string;
}

/** A document in progress: which type, and the fields gathered so far. */
export interface DocumentState {
  /** A catalog filename (e.g. "CSA.md"), or null while still being decided. */
  documentType: string | null;
  fields: DocField[];
}

/** The empty starting state before any document is chosen. */
export const emptyDocument: DocumentState = { documentType: null, fields: [] };

/** A document's Standard Terms markdown, for rendering the preview. */
export interface DocumentMarkdown {
  name: string;
  filename: string;
  markdown: string;
}

/** Fetch the list of supported documents. */
export async function fetchCatalog(): Promise<CatalogDocument[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
  return (await res.json()) as CatalogDocument[];
}

/** Fetch a document's Standard Terms markdown by catalog filename. */
export async function fetchDocumentMarkdown(
  filename: string,
): Promise<DocumentMarkdown> {
  const res = await fetch(`/api/documents/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
  return (await res.json()) as DocumentMarkdown;
}
