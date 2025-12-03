import { useState } from "react";
import CodeToggle from "@/components/CodeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function BallotInfoPane() {
  const [addr, setAddr] = useState('');
  const [data, setData] = useState<any>(null);
  const [raw, setRaw] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    try {
      const r = await fetch(`/api/civic/ballot-info?address=${encodeURIComponent(addr)}`);
      const j = await r.json();
      setData(j.summary || null);
      setRaw(j);
    } catch (err) {
      console.error('Ballot lookup failed:', err);
      setRaw({ error: 'Failed to fetch ballot information' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input 
          className="w-full" 
          placeholder="Enter address" 
          value={addr} 
          onChange={e => setAddr(e.target.value)}
        />
        <Button onClick={lookup} disabled={loading}>
          {loading ? 'Checking...' : 'Check'}
        </Button>
      </div>

      {!data && raw && (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          No ballot information available for this address right now.
        </div>
      )}

      {data && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Your Voting Area</h4>
            {/* Static map placeholder */}
            <div className="h-40 rounded-md bg-[linear-gradient(45deg,#eee,#fafafa)]" />
            <div className="mt-2 text-xs text-muted-foreground">{data.locationText || addr}</div>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Upcoming Elections</h4>
            <ul className="space-y-2 text-sm">
              {data.elections?.map((e: any) => (
                <li key={e.id}>{e.title} · {e.date}</li>
              )) || <li className="text-muted-foreground">No upcoming elections</li>}
            </ul>
          </div>
        </div>
      )}

      <CodeToggle json={raw} />
    </div>
  );
}