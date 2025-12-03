import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Flag, Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ElectionCycle {
  id: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  type: string;
  description: string;
  isActive: boolean;
}

interface VersionSwitcherProps {
  currentCycle?: string;
  onCycleChange?: (cycle: string) => void;
  compact?: boolean;
}

export function VersionSwitcher({ currentCycle, onCycleChange, compact = false }: VersionSwitcherProps) {
  const [selectedCycle, setSelectedCycle] = useState(currentCycle || "2026-midterm");

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['/api/election-cycles'],
    queryFn: async () => {
      const response = await fetch('/api/election-cycles');
      if (!response.ok) throw new Error('Failed to fetch election cycles');
      return response.json() as ElectionCycle[];
    },
  });

  const activeCycle = cycles.find(c => c.isActive) || cycles[0];
  const selectedCycleData = cycles.find(c => c.slug === selectedCycle) || activeCycle;

  useEffect(() => {
    if (activeCycle && !currentCycle) {
      setSelectedCycle(activeCycle.slug);
    }
  }, [activeCycle, currentCycle]);

  const handleCycleChange = (cycleSlug: string) => {
    setSelectedCycle(cycleSlug);
    onCycleChange?.(cycleSlug);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedCycle} onValueChange={handleCycleChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.slug}>
                <div className="flex items-center gap-2">
                  <span>{cycle.name}</span>
                  {cycle.isActive && <Badge variant="default" className="text-xs">Current</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Election Cycle
        </CardTitle>
        <CardDescription>
          Switch between different election tracking periods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCycle} onValueChange={handleCycleChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.slug}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cycle.name}</span>
                    {cycle.isActive && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                    {!cycle.isActive && (
                      <Badge variant="outline" className="text-xs">
                        {cycle.type === 'presidential' ? 'Coming Soon' : 'Available'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{cycle.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCycleData && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(selectedCycleData.startDate).toLocaleDateString()} - {' '}
                {new Date(selectedCycleData.endDate).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {selectedCycleData.isActive ? 'Currently Active' : 'Tracking Available'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="capitalize">{selectedCycleData.type} Election Cycle</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Your election tracking preferences and watchlist will be preserved across all cycles.
        </div>
      </CardContent>
    </Card>
  );
}