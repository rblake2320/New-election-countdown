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

/** Provenance markers: flat on /api/candidates/:id, nested under `source` on /api/elections/:id/candidates. */
const pickSource = (c: AnyCandidate, ...keys: string[]): string | undefined => pick(c, ...keys) ?? pick(c?.source ?? {}, ...keys);

export interface ProfileSummary {
  text: string;
  /** Who wrote it, shown beside the text. Only claimed when the record proves it. */
  source: "Candidate supplied" | "Editorial summary" | "Source not recorded";
}

/**
 * Best available background text with honest attribution. A field name alone
 * does not prove authorship: text is "Candidate supplied" only when it is the
 * campaign bio of a candidate whose portal account is verified. Imported
 * biographies are shown but labelled "Source not recorded"; the description
 * shown on cards is the editorial summary.
 */
export function profileSummary(c: AnyCandidate): ProfileSummary | null {
  const campaignBio = pick(c, "campaign_bio", "campaignBio");
  if (campaignBio && c?.verified === true) return { text: campaignBio, source: "Candidate supplied" };
  const unattributed = pick(c, "biography", "campaign_bio", "campaignBio", "professional_background", "professionalBackground", "background", "politicalExperience");
  if (unattributed) return { text: unattributed, source: "Source not recorded" };
  const editorial = pick(c, "description");
  if (editorial) return { text: editorial, source: "Editorial summary" };
  return null;
}

/**
 * What the record's status actually establishes. FEC registration is not ballot
 * access, so it is never presented as "certified" (owner rule).
 */
export function provenanceLabel(c: AnyCandidate): string {
  const ballot = pickSource(c, "ballotStatus", "ballot_status");
  if (ballot === "certified") {
    const by = pickSource(c, "ballotSourceName", "ballot_source_name");
    return by ? `On certified ballot (${by})` : "On certified ballot";
  }
  if (ballot === "withdrawn") return "Withdrawn";
  if (ballot === "disqualified") return "Disqualified";
  switch (pickSource(c, "sourceStatus", "source_status")) {
    case "fec_registered": return "FEC-registered (not ballot certification)";
    case "editorial_verified": return "Editorially verified";
  }
  return "Source not yet recorded";
}
