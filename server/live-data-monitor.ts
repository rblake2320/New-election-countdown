/**
 * Live Data Monitor Service
 * Continuously monitors and maintains election count from live sources
 */

import { storage } from './storage';

export class LiveDataMonitor {
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Data monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting live data monitoring...');

    // Check election count every 30 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndMaintainElectionCount();
    }, 30 * 60 * 1000);

    // Initial check
    await this.checkAndMaintainElectionCount();
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('Live data monitoring stopped');
  }

  private async checkAndMaintainElectionCount(): Promise<void> {
    try {
      const stats = await storage.getElectionStats();
      const currentCount = stats.total;
      const targetCount = 601;

      console.log(`Current election count: ${currentCount} (target: ${targetCount}+)`);

      if (currentCount < targetCount) {
        console.log(`Election count below target. Syncing additional elections...`);
        await this.syncAdditionalElections(targetCount - currentCount);
      }

      // Also check Google Civic API for new elections
      await this.checkGoogleCivicForUpdates();

    } catch (error) {
      console.error('Error in election count monitoring:', error);
    }
  }

  private async syncAdditionalElections(needed: number): Promise<void> {
    try {
      const { comprehensiveElectionSync } = await import('./comprehensive-election-sync');
      const result = await comprehensiveElectionSync.syncAllElections();
      
      console.log(`Synced ${result.results.reduce((sum, r) => sum + r.newElections, 0)} new elections`);
      console.log(`Election count: ${result.totalBefore} → ${result.totalAfter}`);
      
    } catch (error) {
      console.error('Error syncing additional elections:', error);
    }
  }

  private async checkGoogleCivicForUpdates(): Promise<void> {
    try {
      const { getGoogleCivicService } = await import('./google-civic-service');
      const civicService = getGoogleCivicService();
      
      if (!civicService) return;

      const elections = await civicService.fetchElections();
      let newCount = 0;

      for (const election of elections) {
        const existing = await storage.getElectionByTitleAndDate(election.title, election.date);
        
        if (!existing) {
          await storage.createElection({
            title: election.title,
            subtitle: election.subtitle || null,
            location: election.location,
            state: election.state,
            date: election.date,
            type: this.determineElectionType(election.title),
            level: this.determineElectionLevel(election.title),
            offices: election.offices || [],
            description: election.description || null,
            isActive: true
          });
          newCount++;
        }
      }

      if (newCount > 0) {
        console.log(`Added ${newCount} new elections from Google Civic API`);
      }

    } catch (error) {
      console.error('Error checking Google Civic for updates:', error);
    }
  }

  private determineElectionType(title: string): string {
    if (title.toLowerCase().includes('primary')) return 'Primary';
    if (title.toLowerCase().includes('special')) return 'Special';
    return 'General';
  }

  private determineElectionLevel(title: string): string {
    if (title.toLowerCase().includes('house') || title.toLowerCase().includes('senate') || title.toLowerCase().includes('congressional')) return 'Federal';
    if (title.toLowerCase().includes('governor') || title.toLowerCase().includes('state')) return 'State';
    return 'Local';
  }

  getStatus(): { isMonitoring: boolean; uptime?: number } {
    return {
      isMonitoring: this.isMonitoring,
      uptime: this.isMonitoring ? Date.now() : undefined
    };
  }
}

export const liveDataMonitor = new LiveDataMonitor();