import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Download, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditRun {
  id: string;
  run_type: 'nightly' | 'manual' | 'predeploy';
  started_at: string;
  finished_at: string | null;
  pass: boolean | null;
  total_findings_before: number | null;
  fixes_applied: number | null;
  remaining_open: number | null;
  duration_s: number | null;
}

interface AuditRunsResponse {
  total: number;
  limit: number;
  offset: number;
  items: AuditRun[];
}

export function AuditRunsPanel() {
  const [items, setItems] = useState<AuditRun[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [runType, setRunType] = useState<'' | 'nightly' | 'manual' | 'predeploy'>('');
  const [passFilter, setPassFilter] = useState<'' | 'true' | 'false'>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    
    if (runType) params.set('run_type', runType);
    if (passFilter) params.set('pass', passFilter);
    
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const from = new Date();
      from.setDate(from.getDate() - days);
      params.set('from', from.toISOString());
    }
    
    return params.toString();
  }, [limit, offset, runType, passFilter, timeRange]);

  const fetchAuditRuns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/steward/audit-runs?${queryParams}`);
      const data: AuditRunsResponse = await response.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching audit runs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditRuns();
  }, [queryParams]);

  const downloadCSV = () => {
    const params = new URLSearchParams(queryParams);
    window.open(`/api/steward/audit-runs.csv?${params.toString()}`);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getRunTypeColor = (type: string) => {
    switch (type) {
      case 'nightly': return 'default';
      case 'manual': return 'secondary';
      case 'predeploy': return 'outline';
      default: return 'default';
    }
  };

  const getPassIcon = (pass: boolean | null) => {
    if (pass === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (pass === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Run History</CardTitle>
            <CardDescription>
              Track all Data Steward bot runs including nightly scans and manual fixes
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={downloadCSV}
              disabled={items.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={fetchAuditRuns}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Select value={runType} onValueChange={(v: any) => { setRunType(v); setOffset(0); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="nightly">Nightly</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="predeploy">Pre-deploy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select value={passFilter} onValueChange={(v: any) => { setPassFilter(v); setOffset(0); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                <SelectItem value="true">Passed</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Range:</span>
            <div className="flex gap-1">
              {(['7d', '30d', '90d', 'all'] as const).map(range => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'default' : 'outline'}
                  onClick={() => { setTimeRange(range); setOffset(0); }}
                >
                  {range === 'all' ? 'All time' : `Last ${range}`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">Before</TableHead>
                <TableHead className="text-center">Fixed</TableHead>
                <TableHead className="text-center">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading audit runs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No audit runs found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(run.started_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(run.started_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRunTypeColor(run.run_type)}>
                        {run.run_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDuration(run.duration_s)}
                    </TableCell>
                    <TableCell className="text-center">
                      {run.total_findings_before ?? '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-medium">
                        {run.fixes_applied ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={run.remaining_open ? 'text-orange-600 font-medium' : ''}>
                        {run.remaining_open ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getPassIcon(run.pass)}
                        <span className="text-sm">
                          {run.pass === true ? 'Passed' : 
                           run.pass === false ? 'Failed' : 
                           'Running'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} runs
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        
        {/* Summary Stats */}
        {items.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Summary Statistics</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Runs:</span>
                <span className="ml-2 font-medium">{total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="ml-2 font-medium">
                  {Math.round((items.filter(r => r.pass === true).length / items.length) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Fixes:</span>
                <span className="ml-2 font-medium text-green-600">
                  {items.reduce((sum, r) => sum + (r.fixes_applied || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}