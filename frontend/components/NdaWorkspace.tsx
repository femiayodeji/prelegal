"use client";

import { useState } from "react";
import NdaChat from "@/components/NdaChat";
import NdaDocument from "@/components/NdaDocument";
import { defaultNdaData, NdaData } from "@/lib/nda";

/**
 * The interactive client island: holds the document state, renders the live
 * preview, and triggers the PDF export. The state is now driven by a freeform
 * AI chat (NdaChat) rather than a manual form. Keeping this in its own
 * component lets the surrounding page stay a server component.
 */
export default function NdaWorkspace() {
  const [data, setData] = useState<NdaData>(defaultNdaData);

  // "Download" a PDF by opening the browser's print dialog. The print
  // stylesheet (globals.css) isolates the `.nda-document` element, so the
  // user gets a clean, form-free document they can save as PDF.
  const handleDownload = () => window.print();

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mutual NDA Creator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chat with the assistant on the left to fill in the details, then
            download your completed Mutual Non-Disclosure Agreement.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Download PDF
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Chat pane — hidden when printing. */}
        <section className="print:hidden">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Agreement assistant
          </h2>
          <NdaChat data={data} onChange={setData} />
        </section>

        {/* Live document preview — becomes the printable output. */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800 print:hidden">
            Preview
          </h2>
          <NdaDocument data={data} />
        </section>
      </div>
    </>
  );
}
