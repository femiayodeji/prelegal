"use client";

import { useEffect, useState } from "react";
import DocChat from "@/components/DocChat";
import DocumentPreview from "@/components/DocumentPreview";
import { DocumentState, emptyDocument, fetchCatalog } from "@/lib/documents";
import {
  createSavedDocument,
  getSavedDocument,
  updateSavedDocument,
} from "@/lib/library";

/** Build a friendly title from the document type and a party/company field. */
function deriveTitle(doc: DocumentState, docName: string): string {
  const base = docName || "Untitled document";
  const party = doc.fields.find(
    (f) => /company|party|provider|customer|name/i.test(f.label) && f.value.trim(),
  );
  return party ? `${base} — ${party.value.trim()}` : base;
}

/**
 * The interactive client island: holds the document state, renders the live
 * preview, saves to the user's library, and triggers the PDF export. State is
 * driven by a freeform AI chat (DocChat). Opening `/?doc=ID` reopens a saved
 * document back into the workspace.
 */
export default function DocWorkspace() {
  const [doc, setDoc] = useState<DocumentState>(emptyDocument);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the catalog names once (for titling saved documents).
  useEffect(() => {
    fetchCatalog()
      .then((catalog) =>
        setNames(Object.fromEntries(catalog.map((c) => [c.filename, c.name]))),
      )
      .catch(() => {
        /* titling falls back to the filename */
      });
  }, []);

  // Reopen a saved document when arriving via /?doc=ID.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("doc"));
    if (!id) return;
    getSavedDocument(id)
      .then((saved) => {
        setDoc({ documentType: saved.documentType, fields: saved.fields });
        setSavedId(saved.id);
      })
      .catch(() => setError("Couldn't open that saved document."));
  }, []);

  const handleDownload = () => window.print();

  const handleSave = async () => {
    if (!doc.documentType || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const input = {
      documentType: doc.documentType,
      title: deriveTitle(doc, names[doc.documentType] ?? doc.documentType),
      fields: doc.fields,
    };
    try {
      const saved =
        savedId === null
          ? await createSavedDocument(input)
          : await updateSavedDocument(savedId, input);
      setSavedId(saved.id);
      setNotice("Saved to My documents.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Legal Document Creator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chat with the assistant to choose an agreement and fill in the
            details, then save or download your document.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notice && (
            <span className="text-sm font-medium text-green-700">{notice}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!doc.documentType || saving}
            className="inline-flex items-center justify-center rounded-md border border-brand-purple px-4 py-2.5 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : savedId === null ? "Save" : "Update"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600 print:hidden">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Chat pane — hidden when printing. */}
        <section className="print:hidden">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Document assistant
          </h2>
          <DocChat doc={doc} onChange={setDoc} />
        </section>

        {/* Live document preview — becomes the printable output. */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800 print:hidden">
            Preview
          </h2>
          <DocumentPreview doc={doc} />
        </section>
      </div>
    </>
  );
}
