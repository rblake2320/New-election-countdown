import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FilterGuidanceIssue } from '@/hooks/use-filter-guidance';
import { ElectionFilters } from '@shared/schema';
import { GuidanceSettingsPanel } from '@/components/guidance-settings-panel';

interface FilterGuidancePanelProps {
  issues: FilterGuidanceIssue[];
  onApplySuggestion: (filters: Partial<ElectionFilters>) => void;
  onDismiss: () => void;
  guidanceEnabled: boolean;
  onToggleGuidance: (enabled: boolean) => void;
}

export function FilterGuidancePanel({ 
  issues, 
  onApplySuggestion, 
  onDismiss,
  guidanceEnabled,
  onToggleGuidance 
}: FilterGuidancePanelProps) {
  if (!guidanceEnabled || issues.length === 0) return null;
  
  return (
    <Card className="mb-4 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Filter Guidance
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GuidanceSettingsPanel
              guidanceEnabled={guidanceEnabled}
              onToggleGuidance={onToggleGuidance}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
              data-testid="guidance-dismiss-button"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start gap-2">
                {issue.severity === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {issue.title}
                    </span>
                    <Badge 
                      variant={issue.severity === 'warning' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {issue.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {issue.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApplySuggestion(issue.suggestion.filters)}
                    className={cn(
                      "text-xs h-7",
                      issue.severity === 'warning' 
                        ? "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800" 
                        : "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800"
                    )}
                    data-testid={`guidance-apply-${index}`}
                  >
                    {issue.suggestion.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            💡 Tip: You can disable these suggestions in settings if you prefer to explore on your own.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}