import { describe, expect, it } from "vitest";
import {
  NdaData,
  defaultNdaData,
  describeConfidentiality,
  describeTerm,
  formatDate,
  orBlank,
} from "./nda";

// Helper to build NdaData from partial overrides.
const make = (overrides: Partial<NdaData> = {}): NdaData => ({
  ...defaultNdaData,
  ...overrides,
});

describe("describeTerm", () => {
  it("describes an expiry term with pluralized years", () => {
    expect(describeTerm(make({ termKind: "expires", termYears: 3 }))).toBe(
      "Expires 3 years from the Effective Date.",
    );
  });

  it("uses the singular for a one-year term", () => {
    expect(describeTerm(make({ termKind: "expires", termYears: 1 }))).toBe(
      "Expires 1 year from the Effective Date.",
    );
  });

  it("ignores the year count when the term is open-ended", () => {
    expect(
      describeTerm(make({ termKind: "untilTerminated", termYears: 5 })),
    ).toBe("Continues until terminated in accordance with the terms of the MNDA.");
  });
});

describe("describeConfidentiality", () => {
  it("describes a fixed confidentiality period with trade-secret carve-out", () => {
    const result = describeConfidentiality(
      make({ confidentialityKind: "years", confidentialityYears: 2 }),
    );
    expect(result).toContain("2 years from the Effective Date");
    expect(result).toContain("trade secret");
  });

  it("uses the singular for a one-year period", () => {
    const result = describeConfidentiality(
      make({ confidentialityKind: "years", confidentialityYears: 1 }),
    );
    expect(result).toContain("1 year from the Effective Date");
  });

  it("returns perpetuity when selected", () => {
    expect(
      describeConfidentiality(make({ confidentialityKind: "perpetuity" })),
    ).toBe("In perpetuity.");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as a long US date", () => {
    expect(formatDate("2026-07-09")).toBe("July 9, 2026");
  });

  it("returns a placeholder for an empty string", () => {
    expect(formatDate("")).toBe("___________________");
  });

  it("does not shift the day across timezones", () => {
    // Parsing "2026-01-01" as UTC midnight could roll back a day in
    // negative-offset zones; the helper anchors to local midnight to avoid it.
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns the raw input when it is not a valid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("orBlank", () => {
  it("returns trimmed content when present", () => {
    expect(orBlank("  Acme, Inc.  ")).toBe("Acme, Inc.");
  });

  it("returns a placeholder for empty or whitespace-only input", () => {
    expect(orBlank("")).toBe("___________________");
    expect(orBlank("   ")).toBe("___________________");
  });
});
