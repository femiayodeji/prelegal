"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCatalog } from "@/lib/documents";
import {
  deleteSavedDocument,
  listSavedDocuments,
  SavedDocumentSummary,
} from "@/lib/library";

/** Format a SQLite "YYYY-MM-DD HH:MM:SS" (UTC) timestamp as a readable date. */
function formatDate(raw: string): string {
  const d = new Date(raw.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The "My Documents" library: lists saved documents and reopens them. */
export default function DocumentLibrary() {
  const [docs, setDocs] = useState<SavedDocumentSummary[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listSavedDocuments(), fetchCatalog()])
      .then(([saved, catalog]) => {
        setDocs(saved);
        setNames(Object.fromEntries(catalog.map((c) => [c.filename, c.name])));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load documents."),
      );
  }, []);

  const handleDelete = async (id: number) => {
    const previous = docs ?? [];
    setDocs(previous.filter((d) => d.id !== id)); // optimistic
    try {
      await deleteSavedDocument(id);
    } catch {
      setDocs(previous); // restore on failure
      setError("Couldn't delete that document. Please try again.");
    }
  };

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My documents</h1>
          <p className="mt-1 text-sm text-slate-600">
            Reopen a saved draft to view, download, or keep editing it.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          New document
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {docs === null && !error && (
        <p className="text-sm text-slate-500">Loading your documents…</p>
      )}

      {docs !== null && docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            You haven&apos;t saved any documents yet.
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Draft your first agreement →
          </Link>
        </div>
      )}

      {docs !== null && docs.length > 0 && (
        <ul className="grid gap-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:ring-brand-blue/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {doc.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {names[doc.documentType] || doc.documentType} · Updated{" "}
                  {formatDate(doc.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/?doc=${doc.id}`}
                  className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
