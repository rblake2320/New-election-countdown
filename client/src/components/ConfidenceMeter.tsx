export default function ConfidenceMeter({value}:{value:number}) {
  if (!value || value <= 0) {
    return <span className="text-xs text-muted-foreground">No signal</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 rounded bg-muted">
        <div className="h-1.5 rounded bg-green-500" style={{width: `${Math.min(100,value)}%`}} />
      </div>
      <span className="text-xs">{Math.round(value)}%</span>
    </div>
  );
}