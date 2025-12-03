/* client/src/components/filter-sidebar-new.tsx
   Fully typed, array-safe filter sidebar                                         */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Building, Users, Filter, X } from "lucide-react";
import { type ElectionFilters } from "@shared/schema";

interface FilterSidebarProps {
  filters: ElectionFilters;
  onFiltersChange: (filters: ElectionFilters) => void;
}

/* -------------------------------------------------------------------------- */
/* 1.  FILTER GROUPS                                                         */
/* -------------------------------------------------------------------------- */

const FILTER_GROUPS = {
  electionType: ["General", "Primary", "Runoff", "Special"],
  level: ["Federal", "State", "Local"],
  party: ["Democratic", "Republican", "Independent", "Other"],
};

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export default function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  
  const handleElectionTypeChange = (type: string, checked: boolean) => {
    const currentTypes = Array.isArray(filters.electionType) ? [...filters.electionType] : [];
    const newTypes = checked 
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({
      ...filters,
      electionType: newTypes.length > 0 ? newTypes : undefined
    });
  };

  const handleLevelChange = (level: string, checked: boolean) => {
    const currentLevels = Array.isArray(filters.level) ? [...filters.level] : [];
    const newLevels = checked 
      ? [...currentLevels, level]
      : currentLevels.filter(l => l !== level);
    
    onFiltersChange({
      ...filters,
      level: newLevels.length > 0 ? newLevels : undefined
    });
  };

  const handlePartyChange = (party: string, checked: boolean) => {
    const currentParties = Array.isArray(filters.party) ? [...filters.party] : [];
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

  const isElectionTypeChecked = (type: string): boolean => {
    return Array.isArray(filters.electionType) ? filters.electionType.includes(type) : false;
  };

  const isLevelChecked = (level: string): boolean => {
    return Array.isArray(filters.level) ? filters.level.includes(level) : false;
  };

  const isPartyChecked = (party: string): boolean => {
    return Array.isArray(filters.party) ? filters.party.includes(party) : false;
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>

        {/* State Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filters.state || "all"} onValueChange={(value) => 
              onFiltersChange({ ...filters, state: value === "all" ? undefined : value })
            }>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Election Type Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Election Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FILTER_GROUPS.electionType.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`election-type-${type}`}
                  checked={isElectionTypeChecked(type)}
                  onCheckedChange={(checked) => handleElectionTypeChange(type, checked as boolean)}
                />
                <label 
                  htmlFor={`election-type-${type}`} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {type} Elections
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Government Level Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building size={16} />
              Government Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FILTER_GROUPS.level.map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox 
                  id={`level-${level}`}
                  checked={isLevelChecked(level)}
                  onCheckedChange={(checked) => handleLevelChange(level, checked as boolean)}
                />
                <label 
                  htmlFor={`level-${level}`} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {level}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time Range Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays size={16} />
              Time Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filters.timeframe || "all"} onValueChange={(value) => 
              onFiltersChange({ ...filters, timeframe: value === "all" ? undefined : value })
            }>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="next-30-days">Next 30 Days</SelectItem>
                <SelectItem value="next-90-days">Next 90 Days</SelectItem>
                <SelectItem value="next-6-months">Next 6 Months</SelectItem>
                <SelectItem value="next-year">Next Year</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Party Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users size={16} />
              Political Party
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FILTER_GROUPS.party.map((party) => (
              <div key={party} className="flex items-center space-x-2">
                <Checkbox 
                  id={`party-${party}`}
                  checked={isPartyChecked(party)}
                  onCheckedChange={(checked) => handlePartyChange(party, checked as boolean)}
                />
                <label 
                  htmlFor={`party-${party}`} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {party}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}