/**
 * Confidence as a percent. `null` (or anything that is not a finite number) means the
 * confidence was never recorded: it is stated as such and never drawn as 0%. A recorded
 * 0 is a real value and is shown as 0%.
 */
export default function ConfidenceMeter({ value }: { value: number | null | undefined }) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">Confidence not recorded</span>;
  }
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 rounded bg-muted" role="img" aria-label={`Confidence ${Math.round(pct)}%`}>
        <div className="h-1.5 rounded bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs">{Math.round(pct)}%</span>
    </div>
  );
}
