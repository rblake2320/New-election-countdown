import { describe, it, expect } from "vitest";
import { profileSummary, provenanceLabel } from "../client/src/lib/candidate-profile";

describe("profileSummary", () => {
  it("falls back to the editorial description the card already shows (was a blank 0% profile)", () => {
    // shape of /api/candidates/52 today
    const c = { name: "James Talarico", description: "Texas state representative and former teacher", biography: null, campaign_bio: null, professional_background: null };
    expect(profileSummary(c)).toEqual({ text: "Texas state representative and former teacher", source: "Editorial summary" });
  });
  it("prefers candidate-supplied text", () => {
    expect(profileSummary({ campaign_bio: " Teacher. ", description: "x" })).toEqual({ text: "Teacher.", source: "Candidate supplied" });
  });
  it("returns null when nothing is published", () => {
    expect(profileSummary({ description: "  " })).toBeNull();
  });
});

describe("provenanceLabel", () => {
  it("never calls FEC registration certification", () => {
    expect(provenanceLabel({ source_status: "fec_registered" })).toMatch(/^FEC-registered \(not ballot certification\)$/);
  });
  it("names the certifying authority when on a certified ballot", () => {
    expect(provenanceLabel({ ballotStatus: "certified", ballotSourceName: "Texas Secretary of State" })).toBe("On certified ballot (Texas Secretary of State)");
  });
  it("is honest when unknown", () => {
    expect(provenanceLabel({})).toBe("Source not yet recorded");
  });
});
