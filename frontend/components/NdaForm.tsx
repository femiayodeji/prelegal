"use client";

import { useEffect, useState } from "react";
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

/**
 * A "duration" choice used by both the MNDA Term and the Term of
 * Confidentiality: a radio for "a fixed number of years" (with an adjacent
 * number input) and a radio for an open-ended alternative.
 *
 * The number field keeps its own draft string so clearing it mid-edit does not
 * snap the value back to 1; the value is normalized (clamped to >= 1) on blur.
 * The number input carries its own aria-label rather than sharing the radio's
 * label, so assistive tech announces it correctly.
 */
function TermChoice({
  legend,
  name,
  isYears,
  onSelectYears,
  onSelectAlternative,
  years,
  onYearsChange,
  yearsPrefix,
  yearsSuffix,
  yearsRadioLabel,
  yearsInputLabel,
  alternativeLabel,
}: {
  legend: string;
  name: string;
  isYears: boolean;
  onSelectYears: () => void;
  onSelectAlternative: () => void;
  years: number;
  onYearsChange: (years: number) => void;
  yearsPrefix?: string;
  yearsSuffix: string;
  yearsRadioLabel: string;
  yearsInputLabel: string;
  alternativeLabel: string;
}) {
  const [draft, setDraft] = useState(String(years));

  // Keep the draft in sync when the value changes from outside this input.
  useEffect(() => {
    setDraft(String(years));
  }, [years]);

  const handleDraft = (raw: string) => {
    setDraft(raw);
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 1) onYearsChange(n);
  };

  const normalizeOnBlur = () => {
    const n = Number.parseInt(draft, 10);
    const clamped = Number.isNaN(n) || n < 1 ? 1 : n;
    setDraft(String(clamped));
    onYearsChange(clamped);
  };

  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            aria-label={yearsRadioLabel}
            checked={isYears}
            onChange={onSelectYears}
          />
          {yearsPrefix && <span>{yearsPrefix}</span>}
          <input
            type="number"
            min={1}
            aria-label={yearsInputLabel}
            className="w-16 rounded border border-slate-300 px-2 py-1"
            value={draft}
            disabled={!isYears}
            onChange={(e) => handleDraft(e.target.value)}
            onBlur={normalizeOnBlur}
          />
          <span>{yearsSuffix}</span>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={!isYears}
            onChange={onSelectAlternative}
          />
          {alternativeLabel}
        </label>
      </div>
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

      <TermChoice
        legend="MNDA term"
        name="termKind"
        isYears={data.termKind === "expires"}
        onSelectYears={() => set("termKind")("expires")}
        onSelectAlternative={() => set("termKind")("untilTerminated")}
        years={data.termYears}
        onYearsChange={set("termYears")}
        yearsPrefix="Expires"
        yearsSuffix="year(s) from the Effective Date"
        yearsRadioLabel="MNDA term expires after a fixed number of years"
        yearsInputLabel="Number of MNDA term years"
        alternativeLabel="Continues until terminated"
      />

      <TermChoice
        legend="Term of confidentiality"
        name="confidentialityKind"
        isYears={data.confidentialityKind === "years"}
        onSelectYears={() => set("confidentialityKind")("years")}
        onSelectAlternative={() => set("confidentialityKind")("perpetuity")}
        years={data.confidentialityYears}
        onYearsChange={set("confidentialityYears")}
        yearsSuffix="year(s) from the Effective Date"
        yearsRadioLabel="Confidentiality lasts a fixed number of years"
        yearsInputLabel="Number of confidentiality years"
        alternativeLabel="In perpetuity"
      />

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
