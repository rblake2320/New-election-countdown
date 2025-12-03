import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Filter, RefreshCw, Loader2 } from "lucide-react";
import { type ElectionFilters } from "@shared/schema";
import { statesList } from "@/lib/election-data";
import { useElectionStats } from "@/hooks/use-elections";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FilterSidebarProps {
  filters: ElectionFilters;
  onFiltersChange: (filters: ElectionFilters) => void;
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const { data: stats } = useElectionStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const syncElectionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync-elections', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to sync elections');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Elections Updated",
        description: "Successfully synced latest election data from Google Civic Information API",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Unable to sync election data. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleElectionTypeChange = (type: string, checked: boolean) => {
    const currentTypes = filters.electionType || [];
    const newTypes = checked 
      ? [...currentTypes, type as any]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({
      ...filters,
      electionType: newTypes.length > 0 ? newTypes : undefined
    });
  };

  const handleLevelChange = (level: string, checked: boolean) => {
    const currentLevels = filters.level || [];
    const newLevels = checked 
      ? [...currentLevels, level as any]
      : currentLevels.filter(l => l !== level);
    
    onFiltersChange({
      ...filters,
      level: newLevels.length > 0 ? newLevels : undefined
    });
  };

  const handlePartyChange = (party: string, checked: boolean) => {
    const currentParties = filters.party || [];
    const newParties = checked 
      ? [...currentParties, party]
      : currentParties.filter(p => p !== party);
    
    onFiltersChange({
      ...filters,
      party: newParties.length > 0 ? newParties : undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      state: undefined,
      type: undefined,
      level: undefined,
      timeframe: undefined,
      timeRange: undefined,
      party: undefined,
      electionType: undefined,
      search: undefined
    });
  };

  const isElectionTypeChecked = (type: string) => {
    return filters.electionType?.includes(type as any) ?? false;
  };

  const isLevelChecked = (level: string) => {
    return filters.level?.includes(level as any) ?? false;
  };

  const isPartyChecked = (party: string) => {
    return filters.party?.includes(party) ?? false;
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Controls
        </CardTitle>
        
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-3 rounded-lg">
              <div className="text-sm opacity-90">Next Election</div>
              <div className="font-bold">
                {stats.nextElection ? (
                  `${Math.ceil((new Date(stats.nextElection.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                ) : (
                  'None'
                )}
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-lg">
              <div className="text-sm opacity-90">Total Tracked</div>
              <div className="font-bold">{stats.total}</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Time Range Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Time Range</label>
          <Select 
            value={filters.timeRange || 'all'} 
            onValueChange={(value) => onFiltersChange({
              ...filters,
              timeRange: value === 'all' ? undefined : value as any
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Elections</SelectItem>
              <SelectItem value="week">Next 7 Days</SelectItem>
              <SelectItem value="month">Next 30 Days</SelectItem>
              <SelectItem value="quarter">Next 3 Months</SelectItem>
              <SelectItem value="year">Next Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Election Type Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Election Type</label>
          <div className="space-y-2">
            {[
              { value: 'Federal', label: 'Federal Elections', count: stats?.byLevel.Federal || 0 },
              { value: 'State', label: 'State Elections', count: stats?.byLevel.State || 0 },
              { value: 'Local', label: 'Local Elections', count: stats?.byLevel.Local || 0 },
            ].map(({ value, label, count }) => (
              <div key={value} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={value}
                    checked={isLevelChecked(value)}
                    onCheckedChange={(checked) => handleLevelChange(value, checked as boolean)}
                  />
                  <label htmlFor={value} className="text-sm cursor-pointer">
                    {label}
                  </label>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
            
            {[
              { value: 'primary', label: 'Primary Elections', count: stats?.byType.primary || 0 },
              { value: 'general', label: 'General Elections', count: stats?.byType.general || 0 },
              { value: 'special', label: 'Special Elections', count: stats?.byType.special || 0 },
            ].map(({ value, label, count }) => (
              <div key={value} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={value}
                    checked={isElectionTypeChecked(value)}
                    onCheckedChange={(checked) => handleElectionTypeChange(value, checked as boolean)}
                  />
                  <label htmlFor={value} className="text-sm cursor-pointer">
                    {label}
                  </label>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* State Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">State</label>
          <Select 
            value={filters.state || 'all'} 
            onValueChange={(value) => onFiltersChange({
              ...filters,
              state: value === 'all' ? undefined : value
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statesList.map(state => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Party Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Party Focus</label>
          <div className="space-y-2">
            {[
              { value: 'D', label: 'Democratic' },
              { value: 'R', label: 'Republican' },
              { value: 'I', label: 'Independent' },
              { value: 'G', label: 'Green' },
              { value: 'L', label: 'Libertarian' },
            ].map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`party-${value}`}
                  checked={isPartyChecked(value)}
                  onCheckedChange={(checked) => handlePartyChange(value, checked as boolean)}
                />
                <label htmlFor={`party-${value}`} className="text-sm cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Elections */}
        <div>
          <label className="text-sm font-medium mb-2 block">Data Management</label>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => syncElectionsMutation.mutate()}
              disabled={syncElectionsMutation.isPending}
              className="w-full"
            >
              {syncElectionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Latest Elections
            </Button>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
