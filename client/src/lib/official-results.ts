import { safeSourceUrl } from "@/lib/general-roster";

// Receiving side of lane C's C6 contract (shared/official-results.ts on
// lane-c/c6-results-routes). Mirrors only the fields the UI reads; the
// schema and its guards stay lane C's. A link to an official results page is
// navigation, not publication: unless the source is verified 'published' for
// this exact election, the UI says the page is a general results location.

export interface OfficialResultsSourceLite {
  targetElectionDate?: string;
  electionPhase?: "general" | "primary" | "runoff" | "other" | string;
  routeType?: string;
  publisher?: string;
  checkedAt?: string;
  routeVerification?: "worked" | "blocked" | string;
  status?: "not_linked" | "unknown" | "published" | string;
  availabilityReason?: string;
}

export interface OfficialResultsFields {
  officialResultsUrl?: string | null;
  officialResultsSource?: OfficialResultsSourceLite | null;
}

export interface OfficialResultsLink {
  href: string;
  label: string;
  publisher: string | null;
  note: string;
  checkedAt: string | null;
}

const ROUTE_LABELS: Record<string, string> = {
  government_results_archive: "Official election results archive",
  government_results_gateway: "Official election results portal",
  generic_results_portal: "Official election results portal",
  government_results_landing: "Official election results page",
  year_results_landing: "Official election results page",
  government_elections_fallback: "State elections office",
  government_results_history_information: "Official results information",
};

const PHASE_WORDS: Record<string, string> = { general: "general", primary: "primary", runoff: "runoff" };

function longDate(ymd: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? "");
  if (!m) return "this election";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function officialResultsLink(e: OfficialResultsFields | null | undefined): OfficialResultsLink | null {
  const src = e?.officialResultsSource;
  // Only https destinations from a verified route; NH-style blocked routes have no destination.
  const href = e?.officialResultsUrl && /^https:/i.test(e.officialResultsUrl) ? safeSourceUrl(e.officialResultsUrl) : null;
  if (!href || !src || src.routeVerification !== "worked") return null;

  const when = longDate(src.targetElectionDate);
  const phase = PHASE_WORDS[src.electionPhase ?? ""];
  const published = src.status === "published" && src.routeType === "election_specific_results"
    && src.availabilityReason === "published_for_target_election";

  if (published) {
    return {
      href, publisher: src.publisher ?? null, checkedAt: src.checkedAt ?? null,
      label: `Official ${phase ? phase + " " : ""}election results`,
      note: `Posted for the ${when}${phase ? " " + phase : ""} election.`,
    };
  }
  return {
    href, publisher: src.publisher ?? null, checkedAt: src.checkedAt ?? null,
    label: ROUTE_LABELS[src.routeType ?? ""] ?? "Official election results page",
    note: src.status === "not_linked"
      ? `When checked, this page did not yet list the ${when} election.`
      : `We couldn't confirm whether this page will carry ${when} results.`,
  };
}
