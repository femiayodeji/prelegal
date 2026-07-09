import {
  ATTRIBUTION,
  NdaData,
  Party,
  describeConfidentiality,
  describeTerm,
  formatDate,
  orBlank,
  standardTerms,
} from "@/lib/nda";

/** A single labelled field row on the cover page. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="nda-clause mb-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-slate-900">{value}</p>
    </div>
  );
}

/** The signature block for one party. */
function SignatureBlock({ label, party }: { label: string; party: Party }) {
  return (
    <div className="nda-clause rounded border border-slate-300 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <dl className="space-y-2 text-sm">
        <Row term="Company" value={orBlank(party.company)} />
        <Row term="Signature" value="" line />
        <Row term="Print Name" value={orBlank(party.signatoryName)} />
        <Row term="Title" value={orBlank(party.title)} />
        <Row term="Notice Address" value={orBlank(party.noticeAddress)} />
        <Row term="Date" value="" line />
      </dl>
    </div>
  );
}

function Row({
  term,
  value,
  line,
}: {
  term: string;
  value: string;
  line?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-500">{term}</dt>
      <dd className="flex-1 border-b border-slate-300 text-slate-900">
        {line ? " " : value}
      </dd>
    </div>
  );
}

/**
 * Renders the completed Mutual NDA: a filled Cover Page followed by the fixed
 * Common Paper Standard Terms. This element carries the `.nda-document` class
 * so the print stylesheet can isolate it for PDF export.
 */
export default function NdaDocument({ data }: { data: NdaData }) {
  return (
    <article className="nda-document mx-auto max-w-[8.5in] bg-white p-10 text-[15px] leading-relaxed text-slate-900 shadow-sm print:shadow-none">
      {/* ---- Cover Page ---- */}
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold">Mutual Non-Disclosure Agreement</h1>
        <p className="mt-1 text-sm text-slate-500">Cover Page</p>
      </header>

      <p className="mb-6 text-sm text-slate-600">
        This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this
        Cover Page and (2) the Common Paper Mutual NDA Standard Terms Version 1.0
        (“Standard Terms”). Any modifications of the Standard Terms are made on
        this Cover Page, which controls over conflicts with the Standard Terms.
      </p>

      <Field label="Purpose" value={orBlank(data.purpose)} />
      <Field label="Effective Date" value={formatDate(data.effectiveDate)} />
      <Field label="MNDA Term" value={describeTerm(data)} />
      <Field
        label="Term of Confidentiality"
        value={describeConfidentiality(data)}
      />
      <Field label="Governing Law" value={orBlank(data.governingLaw)} />
      <Field label="Jurisdiction" value={orBlank(data.jurisdiction)} />
      {data.modifications.trim() && (
        <Field label="MNDA Modifications" value={data.modifications} />
      )}

      <p className="nda-clause mb-4 mt-6 text-sm text-slate-600">
        By signing this Cover Page, each party agrees to enter into this MNDA as
        of the Effective Date.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <SignatureBlock label="Party 1" party={data.partyOne} />
        <SignatureBlock label="Party 2" party={data.partyTwo} />
      </div>

      {/* ---- Standard Terms ---- */}
      <div className="nda-clause border-t border-slate-200 pt-6">
        <h2 className="mb-4 text-xl font-bold">Standard Terms</h2>
        <ol className="space-y-4">
          {standardTerms.map((term, i) => (
            <li key={term.heading} className="nda-clause">
              <p>
                <span className="font-semibold">
                  {i + 1}. {term.heading}.
                </span>{" "}
                {term.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
        {ATTRIBUTION}
      </footer>
    </article>
  );
}
