# Prelegal Frontend — Mutual NDA Creator

A Next.js prototype ([PL-3](https://femi-ayodeji.atlassian.net/browse/PL-3)) that
generates a completed **Mutual Non-Disclosure Agreement** from a short form.

The user enters key details (the two parties, purpose, effective date, term,
confidentiality period, governing law, and jurisdiction). The app renders a live
preview of the filled Common Paper Mutual NDA — a completed Cover Page followed
by the standard terms — and lets the user download it as a PDF.

## Tech

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Fully client-side; no backend required

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## How download works

The **Download PDF** button calls `window.print()`. A print stylesheet
(`app/globals.css`) hides the app chrome and form so only the generated document
(`.nda-document`) is printed — the user saves it as a PDF from the print dialog.

## Testing

```bash
npm run lint     # ESLint (next/core-web-vitals)
npm test         # Vitest unit tests for lib/nda.ts helpers
npx playwright test   # End-to-end tests (form → preview, term options, PDF export)
```

Unit tests live next to the code (`lib/nda.test.ts`); Playwright specs live in
`e2e/`. The e2e suite drives a real browser to confirm the form fills the
preview, the term/confidentiality options render correctly, editing the year
fields produces the right value, and the Download PDF path yields a
document-only PDF.

## Structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Split layout: form + live preview + Download button |
| `components/NdaForm.tsx` | Controlled form for the cover-page fields |
| `components/NdaDocument.tsx` | Renders the filled cover page + standard terms |
| `lib/nda.ts` | Types, defaults, and the embedded Standard Terms text |

## Source & license

The Mutual NDA text is from [Common Paper](https://github.com/CommonPaper/Mutual-NDA)
(the templates curated in PL-2), free to use and modify under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
