import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

interface Policy {
  id: number;
  name: string;
  detect_sql?: string;
  auto_fix_enabled: boolean;
  auto_fix_max_severity: number | null;
  auto_fixes_applied: number;
  has_fix_sql: boolean;
  has_verification: boolean;
}

export function PolicyTogglePanel() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/steward/policies');
      const data = await response.json();
      if (data.ok) {
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const updatePolicy = async (name: string, enabled: boolean, maxSeverity?: number) => {
    setSaving(name);
    try {
      const response = await fetch(`/api/steward/policies/${name}/auto-fix`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, maxSeverity })
      });
      
      if (response.ok) {
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Error updating policy:', error);
    } finally {
      setSaving(null);
    }
  };

  const getSeverityLabel = (severity: number | null) => {
    switch (severity) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      case 5: return 'Info';
      default: return 'None';
    }
  };

  const getSeverityColor = (severity: number | null) => {
    switch (severity) {
      case 1: return 'destructive';
      case 2: return 'destructive';
      case 3: return 'default';
      case 4: return 'secondary';
      case 5: return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div>Loading policies...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Auto-fix Policy Configuration
        </CardTitle>
        <CardDescription>
          Control which policies can automatically fix detected issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.name}
              className="flex flex-col space-y-3 p-4 border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{policy.name}</span>
                    {policy.has_fix_sql ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    {policy.has_verification && (
                      <Badge variant="outline" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {policy.name.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  {policy.auto_fixes_applied > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {policy.auto_fixes_applied} fixes applied
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${policy.name}`} className="text-sm">
                      Auto-fix
                    </Label>
                    <Switch
                      id={`toggle-${policy.name}`}
                      checked={policy.auto_fix_enabled}
                      disabled={!policy.has_fix_sql || saving === policy.name}
                      onCheckedChange={(checked) => 
                        updatePolicy(policy.name, checked, policy.auto_fix_max_severity || undefined)
                      }
                    />
                  </div>
                  
                  {policy.auto_fix_enabled && (
                    <Select
                      value={String(policy.auto_fix_max_severity || 5)}
                      onValueChange={(value) => 
                        updatePolicy(policy.name, true, parseInt(value))
                      }
                      disabled={saving === policy.name}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Critical</SelectItem>
                        <SelectItem value="2">High</SelectItem>
                        <SelectItem value="3">Medium</SelectItem>
                        <SelectItem value="4">Low</SelectItem>
                        <SelectItem value="5">Info</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              {policy.auto_fix_enabled && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Badge variant={getSeverityColor(policy.auto_fix_max_severity)}>
                    Max severity: {getSeverityLabel(policy.auto_fix_max_severity)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Will auto-fix issues up to this severity level
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {policies.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No policies configured yet
          </p>
        )}
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Safety Features</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• All fixes are applied in transactions with automatic rollback on failure</li>
            <li>• Verification SQL runs after each fix to ensure data integrity</li>
            <li>• Full audit logging tracks all auto-fix attempts and results</li>
            <li>• Manual review required for critical severity issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}