import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Check, X, AlertTriangle, Info } from 'lucide-react';

type Suggestion = {
  id: number;
  kind: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'OPEN' | 'APPLIED' | 'DISMISSED' | 'FAILED';
  election_id?: number;
  state?: string;
  message: string;
  payload: any;
  created_at: string;
};

type BotStats = {
  suggestions: {
    open: number;
    applied: number;
    dismissed: number;
    failed: number;
    total: number;
  };
  recentRuns: Array<{
    run_id: string;
    started_at: string;
    finished_at: string | null;
    trigger: string;
    tasks: string[];
  }>;
};

export default function BotPanel() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load suggestions
      const suggestionsRes = await fetch('/api/bot/suggestions?status=OPEN');
      if (!suggestionsRes.ok) throw new Error('Failed to load suggestions');
      const suggestionsData = await suggestionsRes.json();
      setItems(suggestionsData);
      
      // Load stats
      const statsRes = await fetch('/api/bot/stats');
      if (!statsRes.ok) throw new Error('Failed to load stats');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch('/api/bot/run', { method: 'POST' });
      const data = await res.json();
      
      if (data.ok) {
        setSuccess(`Bot scan complete. Created ${data.suggestionsCreated || 0} suggestions.`);
        await load();
      } else {
        throw new Error(data.error || 'Failed to run bot');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (id: number) => {
    try {
      const res = await fetch(`/api/bot/suggestions/${id}/apply`, { method: 'POST' });
      const data = await res.json();
      
      if (data.ok) {
        setSuccess('Suggestion applied successfully');
        await load();
      } else {
        throw new Error(data.error || 'Failed to apply suggestion');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const dismiss = async (id: number) => {
    try {
      const res = await fetch(`/api/bot/suggestions/${id}/dismiss`, { method: 'POST' });
      const data = await res.json();
      
      if (data.ok) {
        setSuccess('Suggestion dismissed');
        await load();
      } else {
        throw new Error(data.error || 'Failed to dismiss suggestion');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    };
    return <Badge variant={colors[severity as keyof typeof colors] as any}>{severity}</Badge>;
  };

  const getKindLabel = (kind: string) => {
    const labels: Record<string, string> = {
      'DATE_DRIFT': 'Date Mismatch',
      'MISSING_CANDIDATES': 'Missing Candidates',
      'CONGRESS_MISMATCH': 'Congress Count',
      'UDEL_HEURISTIC': 'CA UDEL Date',
      'DUPLICATE_ELECTION': 'Duplicate'
    };
    return labels[kind] || kind;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Steward Bot</CardTitle>
          <CardDescription>
            Automated data integrity monitoring and fixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button onClick={run} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Bot Scan
                  </>
                )}
              </Button>
              
              {stats && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{stats.suggestions.open} open</span>
                  <span>{stats.suggestions.applied} applied</span>
                  <span>{stats.suggestions.dismissed} dismissed</span>
                </div>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2" />
              <p>No open suggestions</p>
              <p className="text-sm mt-1">Run a scan to check for issues</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getKindLabel(s.kind)}</span>
                      {getSeverityBadge(s.severity)}
                      {s.state && (
                        <Badge variant="outline">{s.state}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{s.message}</p>
                    {s.payload?.title && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.payload.title} • {s.payload.state} • 
                        {s.payload.date && new Date(s.payload.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => apply(s.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismiss(s.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {stats && stats.recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentRuns.map((run) => (
                <div key={run.run_id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                  <Badge variant="outline">{run.trigger}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}