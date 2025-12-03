import { useMemo } from 'react';
import { ElectionFilters } from '@shared/schema';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface FilterGuidanceIssue {
  type: 'incompatible' | 'likely_empty' | 'suggestion';
  title: string;
  description: string;
  suggestion: {
    action: string;
    filters: Partial<ElectionFilters>;
  };
  severity: 'warning' | 'info';
}

// Known incompatible combinations based on real data
const INCOMPATIBLE_COMBINATIONS = [
  {
    condition: (filters: ElectionFilters) => 
      filters.state === 'Alabama' && filters.level?.includes('Local'),
    issue: {
      type: 'incompatible' as const,
      title: 'Alabama has no Local elections',
      description: 'Alabama only has Federal level elections (House, Senate, Governor) in our database.',
      suggestion: {
        action: 'Switch to Federal level',
        filters: { level: ['Federal'] }
      },
      severity: 'warning' as const
    }
  },
  {
    condition: (filters: ElectionFilters) => 
      filters.state === 'Wyoming' && filters.level?.includes('Local'),
    issue: {
      type: 'incompatible' as const,
      title: 'Wyoming has no Local elections',
      description: 'Wyoming only has Federal level elections in our database.',
      suggestion: {
        action: 'Switch to Federal level',
        filters: { level: ['Federal'] }
      },
      severity: 'warning' as const
    }
  }
];

const HELPFUL_SUGGESTIONS = [
  {
    condition: (filters: ElectionFilters) => 
      filters.state && !filters.level,
    issue: {
      type: 'suggestion' as const,
      title: 'Add Government Level filter',
      description: 'Most states have both Federal and State level elections. Adding a level filter helps narrow results.',
      suggestion: {
        action: 'Add Federal level',
        filters: { level: ['Federal'] }
      },
      severity: 'info' as const
    }
  }
];

export function useFilterGuidance(filters: ElectionFilters) {
  const [guidanceEnabled, setGuidanceEnabled] = useLocalStorage('filter-guidance-enabled', true);
  
  const issues = useMemo(() => {
    if (!guidanceEnabled) return [];
    
    const foundIssues: FilterGuidanceIssue[] = [];
    
    // Check for incompatible combinations
    for (const combo of INCOMPATIBLE_COMBINATIONS) {
      if (combo.condition(filters)) {
        foundIssues.push(combo.issue);
      }
    }
    
    // Check for helpful suggestions
    for (const suggestion of HELPFUL_SUGGESTIONS) {
      if (suggestion.condition(filters)) {
        foundIssues.push(suggestion.issue);
      }
    }
    
    return foundIssues;
  }, [filters, guidanceEnabled]);
  
  return {
    issues,
    guidanceEnabled,
    setGuidanceEnabled,
    hasWarnings: issues.some(i => i.severity === 'warning'),
    hasSuggestions: issues.some(i => i.severity === 'info')
  };
}