import React from 'react';
import { Component as BauhausCard } from '@/components/ui/bauhaus-card';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export function DataStewardStatusCard() {
  const [, setLocation] = useLocation();
  
  // Fetch latest audit run
  const { data: auditRuns } = useQuery({
    queryKey: ['/api/steward/audit-runs'],
    queryFn: async () => {
      const response = await fetch('/api/steward/audit-runs?limit=1');
      if (!response.ok) throw new Error('Failed to fetch audit runs');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch bot suggestions to get issue count
  const { data: suggestions } = useQuery({
    queryKey: ['/api/bot/suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/bot/suggestions');
      if (!response.ok) return { suggestions: [] };
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const latestRun = auditRuns?.runs?.[0];
  const issueCount = suggestions?.suggestions?.length || 0;
  const fixedCount = latestRun?.issues_fixed || 0;
  const totalIssues = latestRun?.issues_detected || issueCount;
  
  const handleRunAutoFix = () => {
    setLocation('/data-steward');
  };
  
  const handleViewIssues = () => {
    setLocation('/data-steward?tab=issues');
  };
  
  const handleMoreOptions = () => {
    setLocation('/data-steward?tab=audit');
  };
  
  const getTimeSinceRun = () => {
    if (!latestRun?.created_at) return 'Never';
    const runTime = new Date(latestRun.created_at);
    const now = new Date();
    const hoursAgo = Math.floor((now.getTime() - runTime.getTime()) / (1000 * 60 * 60));
    
    if (hoursAgo < 1) return 'Just now';
    if (hoursAgo === 1) return '1 hour ago';
    if (hoursAgo < 24) return `${hoursAgo} hours ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
  };
  
  const progress = totalIssues > 0 ? (fixedCount / totalIssues) * 100 : 0;
  
  return (
    <div className="bauhaus-theme" data-testid="data-steward-status-card">
      <BauhausCard
        id="data-steward-status"
        accentColor="#00bcd4"
        backgroundColor="hsl(var(--card))"
        separatorColor="hsl(var(--border))"
        borderRadius="1.5rem"
        borderWidth="2px"
        topInscription={`Last scan: ${getTimeSinceRun()}`}
        mainText="Data Integrity"
        subMainText={`${issueCount} active issues detected`}
        progressBarInscription="Auto-fix progress:"
        progress={progress}
        progressValue={totalIssues > 0 ? `${fixedCount} of ${totalIssues} fixed` : 'No issues'}
        filledButtonInscription="Run Auto-fix"
        outlinedButtonInscription="View Issues"
        onFilledButtonClick={handleRunAutoFix}
        onOutlinedButtonClick={handleViewIssues}
        onMoreOptionsClick={handleMoreOptions}
        textColorTop="hsl(var(--muted-foreground))"
        textColorMain="hsl(var(--foreground))"
        textColorSub="hsl(var(--muted-foreground))"
        textColorProgressLabel="hsl(var(--muted-foreground))"
        textColorProgressValue="hsl(var(--foreground))"
        progressBarBackground="hsl(var(--muted))"
        chronicleButtonBg="hsl(var(--primary))"
        chronicleButtonFg="hsl(var(--primary-foreground))"
        chronicleButtonHoverFg="hsl(var(--primary-foreground))"
      />
    </div>
  );
}