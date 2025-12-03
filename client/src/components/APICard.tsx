import CodeToggle from "@/components/CodeToggle";
import { Button } from "@/components/ui/button";

export function APICard({
  name, 
  status, 
  quota, 
  sampleCurl, 
  lastStatus,
}: {
  name: string; 
  status: 'connected' | 'disconnected'; 
  quota: string; 
  sampleCurl?: string; 
  lastStatus?: string;
}) {
  const okay = status === 'connected';
  
  return (
    <div className="rounded-xl border p-4 min-h-[160px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${okay ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {okay ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        Quota: {quota} · Last check: {lastStatus || '—'}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline">Try request</Button>
        <Button size="sm" variant="outline">Copy API key</Button>
      </div>
      <CodeToggle curl={sampleCurl} />
    </div>
  );
}