// Map the candidate detail payload (snake_case from /api/candidates/:id,
// camelCase from list endpoints) onto what the profile shows, with provenance.

type AnyCandidate = Record<string, any>;

const pick = (c: AnyCandidate, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = c?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

export interface ProfileSummary {
  text: string;
  /** Who wrote it: shown beside the text so readers can weigh it. */
  source: "Candidate supplied" | "Editorial summary";
}

/** Best available background text. Candidate-supplied first, then the editorial summary shown on cards. */
export function profileSummary(c: AnyCandidate): ProfileSummary | null {
  const supplied = pick(c, "biography", "campaign_bio", "campaignBio", "professional_background", "professionalBackground", "background", "politicalExperience");
  if (supplied) return { text: supplied, source: "Candidate supplied" };
  const editorial = pick(c, "description");
  if (editorial) return { text: editorial, source: "Editorial summary" };
  return null;
}

/**
 * What the record's status actually establishes. FEC registration is not ballot
 * access, so it is never presented as "certified" (owner rule).
 */
export function provenanceLabel(c: AnyCandidate): string {
  const ballot = pick(c, "ballotStatus", "ballot_status");
  if (ballot === "certified") {
    const by = pick(c, "ballotSourceName", "ballot_source_name");
    return by ? `On certified ballot (${by})` : "On certified ballot";
  }
  if (ballot === "withdrawn") return "Withdrawn";
  if (ballot === "disqualified") return "Disqualified";
  switch (pick(c, "sourceStatus", "source_status")) {
    case "fec_registered": return "FEC-registered (not ballot certification)";
    case "editorial_verified": return "Editorially verified";
  }
  return "Source not yet recorded";
}
