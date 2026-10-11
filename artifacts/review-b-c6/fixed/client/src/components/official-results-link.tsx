import { ExternalLink } from "lucide-react";
import { officialResultsLink, type OfficialResultsFields } from "@/lib/official-results";

const fmt = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/** Optional link to the state's official results location (lane C C6). Renders nothing without a verified destination. */
export function OfficialResultsLink({ election }: { election: OfficialResultsFields | null | undefined }) {
  const link = officialResultsLink(election);
  if (!link) return null;
  const checked = fmt(link.checkedAt);
  return (
    <div className="text-sm" data-testid="official-results-link">
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline">
        {link.label}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      {link.publisher && <span className="text-muted-foreground"> · {link.publisher}</span>}
      <p className="text-xs text-muted-foreground">
        {link.note}{checked ? ` Checked ${checked}.` : ""}
      </p>
    </div>
  );
}
