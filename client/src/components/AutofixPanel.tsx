import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, WrenchIcon } from 'lucide-react';

interface AutofixCandidate {
  suggestion_id: number;
  kind: string;
  severity: string;
  message: string;
  can_autofix: boolean;
}

interface AutofixHistory {
  id: number;
  mcp_name: string;
  suggestion_message: string;
  success: boolean;
  executed_at: string;
}

export function AutofixPanel() {
  const queryClient = useQueryClient();
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  // Fetch autofix candidates
  const { data: candidates, isLoading: loadingCandidates } = useQuery<{
    ok: boolean;
    count: number;
    items: AutofixCandidate[];
  }>({
    queryKey: ['/api/autofix/candidates'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch autofix history
  const { data: history } = useQuery<{
    ok: boolean;
    count: number;
    items: AutofixHistory[];
  }>({
    queryKey: ['/api/autofix/history']
  });

  // Apply single fix mutation
  const applyFix = useMutation({
    mutationFn: async (suggestionId: number) => {
      const response = await fetch(`/api/autofix/apply/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executor: 'ui' })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/autofix/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/autofix/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/suggestions'] });
      setSelectedSuggestion(null);
    }
  });

  // Batch apply fixes
  const batchApply = useMutation<{ ok: boolean; applied: number; failed: number }>({
    mutationFn: async () => {
      const response = await fetch('/api/autofix/apply-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSeverity: 'low', limit: 5 })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/autofix/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/autofix/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/suggestions'] });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-fix Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WrenchIcon className="h-5 w-5" />
            Auto-fixable Issues
          </CardTitle>
          <CardDescription>
            Issues that can be automatically resolved based on policy settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCandidates ? (
            <div>Loading candidates...</div>
          ) : candidates?.count === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No auto-fixable issues found. All critical issues may require manual review.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">
                  {candidates?.count} issues can be auto-fixed
                </span>
                <Button
                  size="sm"
                  onClick={() => batchApply.mutate()}
                  disabled={batchApply.isPending || candidates?.count === 0}
                >
                  {batchApply.isPending ? 'Applying...' : 'Apply Safe Fixes'}
                </Button>
              </div>

              <div className="space-y-2">
                {candidates?.items?.map((item: any) => (
                  <div
                    key={item.suggestion_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(item.severity)}>
                          {item.severity}
                        </Badge>
                        <span className="font-medium text-sm">{item.kind}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyFix.mutate(item.suggestion_id)}
                      disabled={applyFix.isPending && selectedSuggestion === item.suggestion_id}
                    >
                      {applyFix.isPending && selectedSuggestion === item.suggestion_id
                        ? 'Applying...'
                        : 'Fix'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {applyFix.isError && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to apply fix. Please check the logs for details.
              </AlertDescription>
            </Alert>
          )}

          {batchApply.data && batchApply.data.applied > 0 && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully applied {batchApply.data.applied} fixes.
                {batchApply.data.failed > 0 && ` ${batchApply.data.failed} fixes failed.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Fix History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Auto-fix History</CardTitle>
          <CardDescription>
            Log of recently applied automatic fixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history?.count === 0 ? (
            <p className="text-sm text-muted-foreground">No fixes have been applied yet.</p>
          ) : (
            <div className="space-y-2">
              {history?.items?.slice(0, 10).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{log.mcp_name}</span>
                    <span className="text-muted-foreground">
                      {log.suggestion_message}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.executed_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}