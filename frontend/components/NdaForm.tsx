"use client";

import { NdaData, Party } from "@/lib/nda";

interface Props {
  data: NdaData;
  onChange: (data: NdaData) => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Fieldset capturing one party's details. */
function PartyFields({
  legend,
  party,
  onChange,
}: {
  legend: string;
  party: Party;
  onChange: (party: Party) => void;
}) {
  const set = (key: keyof Party) => (value: string) =>
    onChange({ ...party, [key]: value });

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        {legend}
      </legend>
      <TextField
        label="Company"
        value={party.company}
        onChange={set("company")}
        placeholder="Acme, Inc."
      />
      <TextField
        label="Signatory name"
        value={party.signatoryName}
        onChange={set("signatoryName")}
        placeholder="Jane Doe"
      />
      <TextField
        label="Title"
        value={party.title}
        onChange={set("title")}
        placeholder="Chief Executive Officer"
      />
      <TextField
        label="Notice address (email or postal)"
        value={party.noticeAddress}
        onChange={set("noticeAddress")}
        placeholder="legal@acme.com"
      />
    </fieldset>
  );
}

export default function NdaForm({ data, onChange }: Props) {
  const set =
    <K extends keyof NdaData>(key: K) =>
    (value: NdaData[K]) =>
      onChange({ ...data, [key]: value });

  return (
    <form
      className="space-y-6"
      // Purely client-side; nothing to submit to a server.
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PartyFields
          legend="Party 1"
          party={data.partyOne}
          onChange={set("partyOne")}
        />
        <PartyFields
          legend="Party 2"
          party={data.partyTwo}
          onChange={set("partyTwo")}
        />
      </div>

      <label className="block space-y-1">
        <span className={labelClass}>Purpose</span>
        <textarea
          className={inputClass}
          rows={2}
          value={data.purpose}
          onChange={(e) => set("purpose")(e.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Effective date"
          type="date"
          value={data.effectiveDate}
          onChange={set("effectiveDate")}
        />
      </div>

      {/* MNDA Term */}
      <div className="space-y-2">
        <span className={labelClass}>MNDA term</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="termKind"
              checked={data.termKind === "expires"}
              onChange={() => set("termKind")("expires")}
            />
            Expires
            <input
              type="number"
              min={1}
              className="w-16 rounded border border-slate-300 px-2 py-1"
              value={data.termYears}
              disabled={data.termKind !== "expires"}
              onChange={(e) =>
                set("termYears")(Math.max(1, Number(e.target.value) || 1))
              }
            />
            year(s) from the Effective Date
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="termKind"
              checked={data.termKind === "untilTerminated"}
              onChange={() => set("termKind")("untilTerminated")}
            />
            Continues until terminated
          </label>
        </div>
      </div>

      {/* Term of Confidentiality */}
      <div className="space-y-2">
        <span className={labelClass}>Term of confidentiality</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="confidentialityKind"
              checked={data.confidentialityKind === "years"}
              onChange={() => set("confidentialityKind")("years")}
            />
            <input
              type="number"
              min={1}
              className="w-16 rounded border border-slate-300 px-2 py-1"
              value={data.confidentialityYears}
              disabled={data.confidentialityKind !== "years"}
              onChange={(e) =>
                set("confidentialityYears")(
                  Math.max(1, Number(e.target.value) || 1),
                )
              }
            />
            year(s) from the Effective Date
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="confidentialityKind"
              checked={data.confidentialityKind === "perpetuity"}
              onChange={() => set("confidentialityKind")("perpetuity")}
            />
            In perpetuity
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Governing law (state)"
          value={data.governingLaw}
          onChange={set("governingLaw")}
          placeholder="Delaware"
        />
        <TextField
          label="Jurisdiction (city/county & state)"
          value={data.jurisdiction}
          onChange={set("jurisdiction")}
          placeholder="New Castle, Delaware"
        />
      </div>

      <label className="block space-y-1">
        <span className={labelClass}>MNDA modifications (optional)</span>
        <textarea
          className={inputClass}
          rows={2}
          value={data.modifications}
          placeholder="List any modifications to the Standard Terms."
          onChange={(e) => set("modifications")(e.target.value)}
        />
      </label>
    </form>
  );
}
