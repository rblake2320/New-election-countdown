import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfidenceMeter from "@/components/ConfidenceMeter";

/**
 * One candidate's stated position. The server returns only stored, verified sources and
 * sets `confidence` to null when none is recorded (lane C, 2026-10-13), so both can be null.
 */
export interface PolicyPosition {
  candidateId: string;
  candidateName: string;
  position: string;
  details: string;
  source: string | null;
  confidence: number | null;
}

export interface PolicyComparison {
  category: string;
  positions: PolicyPosition[];
}

/** Fraction (0..1) from the API to the percent the meter shows; unknown stays unknown, never 0. */
export function confidencePercent(confidence: number | null | undefined): number | null {
  return typeof confidence === "number" && Number.isFinite(confidence) ? confidence * 100 : null;
}

export function PolicyComparisonResults({ data, isLoading, error, onRetry }: {
  data: PolicyComparison[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
        <p className="mt-2 text-sm text-text-muted">Gathering multi-source policy data...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="text-center py-8 space-y-3">
        <p className="text-sm text-destructive">Policy positions could not be loaded ({error instanceof Error ? error.message : "request failed"}). This does not mean none are recorded.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;
  if (data.length === 0) {
    return <p className="text-sm text-text-muted py-4">No positions are recorded for these candidates and categories.</p>;
  }
  return (
    <div className="space-y-4">
      {data.map(category => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="text-lg">{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.positions.map(position => (
                <div key={position.candidateId} className="border-l-4 border-brand-primary pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{position.candidateName}</h4>
                    <ConfidenceMeter value={confidencePercent(position.confidence)} />
                  </div>
                  <p className="text-sm text-text-muted mb-1">{position.position}</p>
                  <p className="text-xs text-text-muted">{position.source ? `Source: ${position.source}` : "Source not recorded"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
