import { electionScraper, ScrapedElectionData } from './web-scraper';
import { storage } from './storage';
import { perplexityCongressService } from './perplexity-congress-service';
import fetch from 'node-fetch';

export interface MonitoringTarget {
  url: string;
  type: 'results' | 'feed' | 'api';
  priority: 'high' | 'medium' | 'low';
  state?: string;
  lastChecked?: Date;
  status: 'active' | 'inactive' | 'error';
}

/**
 * OR-03: the only destinations the monitor may ever contact. Operators enable an entry
 * by id; no request path accepts a URL. Hosts are matched exactly (no subdomain wildcard).
 */
export interface MonitoringCatalogEntry {
  id: string;
  url: string;
  type: 'results' | 'feed' | 'api';
  priority: 'high' | 'medium' | 'low';
  state: string;
  label: string;
}

export const MONITORING_TARGET_CATALOG: readonly MonitoringCatalogEntry[] = Object.freeze([
  { id: 'va-results', url: 'https://results.elections.virginia.gov', type: 'results', priority: 'high', state: 'VA', label: 'Virginia Department of Elections results' },
  { id: 'wi-results', url: 'https://elections.wi.gov/elections-voting/results', type: 'results', priority: 'high', state: 'WI', label: 'Wisconsin Elections Commission results' },
  { id: 'ga-results', url: 'https://results.enr.clarityelections.com/GA', type: 'results', priority: 'high', state: 'GA', label: 'Georgia Secretary of State results (Clarity ENR)' },
  { id: 'al-feed', url: 'https://www.sos.alabama.gov/alabama-votes/voter/election-information', type: 'feed', priority: 'high', state: 'AL', label: 'Alabama Secretary of State election information' },
  { id: 'tx-results', url: 'https://results.sos.state.tx.us', type: 'results', priority: 'high', state: 'TX', label: 'Texas Secretary of State results' },
]);

export const MONITOR_FETCH_LIMITS = Object.freeze({ timeoutMs: 10_000, maxBodyBytes: 1_000_000, maxConcurrentTargets: 3, minIntervalMinutes: 1, maxIntervalMinutes: 60 });

/** True only for an https URL whose host is exactly a catalog host. */
export function isAllowedTargetUrl(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  return MONITORING_TARGET_CATALOG.some(entry => new URL(entry.url).host === parsed.host);
}

/**
 * Bounded fetch for catalog destinations: https + catalog host only, no redirects
 * (a redirect to another host is a policy change, not something to follow silently),
 * hard timeout, and a byte cap on the body.
 */
export async function boundedCatalogFetch(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!isAllowedTargetUrl(url)) throw new Error('destination not in monitoring catalog');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MONITOR_FETCH_LIMITS.timeoutMs);
  try {
    const response = await fetchImpl(url, { redirect: 'error', signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MONITOR_FETCH_LIMITS.maxBodyBytes) throw new Error('upstream body exceeds size limit');
    if (!response.body) return await response.text();
    const chunks: Buffer[] = []; let received = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      received += chunk.byteLength;
      if (received > MONITOR_FETCH_LIMITS.maxBodyBytes) { controller.abort(); throw new Error('upstream body exceeds size limit'); }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timer);
  }
}

export class RealTimeElectionMonitor {
  private monitoringTargets: MonitoringTarget[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.initializeDefaultTargets();
  }

  private initializeDefaultTargets(): void {
    // Every default is a catalog entry (OR-03): the catalog is the single source of destinations.
    this.monitoringTargets = MONITORING_TARGET_CATALOG.map(entry => ({
      url: entry.url, type: entry.type, priority: entry.priority, state: entry.state, status: 'active' as const,
    }));
  }

  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isRunning) {
      console.log('Real-time monitoring already running');
      return;
    }

    intervalMinutes = Math.min(MONITOR_FETCH_LIMITS.maxIntervalMinutes, Math.max(MONITOR_FETCH_LIMITS.minIntervalMinutes, Math.floor(Number(intervalMinutes) || 5)));
    console.log(`Starting real-time election monitoring with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    try {
      // Try to initialize web scraper, continue with API-only monitoring if it fails
      try {
        await electionScraper.initialize();
        console.log('Web scraper initialized successfully');
      } catch (scraperError) {
        console.warn('Web scraper initialization failed, continuing with API-only monitoring:', scraperError.message);
      }

      // Start monitoring loop
      this.monitoringInterval = setInterval(async () => {
        await this.checkAllTargets();
      }, intervalMinutes * 60 * 1000);

      // Run initial check
      await this.checkAllTargets();
      console.log('Real-time monitoring started successfully');
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    await electionScraper.destroy();
    console.log('Real-time monitoring stopped');
  }

  private async checkAllTargets(): Promise<void> {
    const active = this.monitoringTargets.filter(t => t.status === 'active' || t.status === 'error');
    console.log(`Checking ${active.length} monitoring targets...`);
    // OR-03: bounded fan-out - at most maxConcurrentTargets upstream fetches in flight.
    for (let i = 0; i < active.length; i += MONITOR_FETCH_LIMITS.maxConcurrentTargets) {
      const batch = active.slice(i, i + MONITOR_FETCH_LIMITS.maxConcurrentTargets);
      await Promise.all(batch.map(async target => {
        try {
          await this.checkTarget(target);
          target.lastChecked = new Date();
          target.status = 'active';
        } catch (error) {
          console.error(`Error checking target ${target.url}:`, error);
          target.status = 'error';
        }
      }));
    }
  }

  private async checkTarget(target: MonitoringTarget): Promise<void> {
    let newElections: ScrapedElectionData[] = [];
    if (!isAllowedTargetUrl(target.url)) {
      target.status = 'error';
      console.error(`Refusing to check non-catalog target ${target.url}`);
      return;
    }

    try {
      switch (target.type) {
        case 'results':
          const resultData = await electionScraper.scrapeElectionSite(target.url);
          if (resultData) {
            newElections = [resultData];
          }
          break;

        case 'feed':
          newElections = await electionScraper.fetchElectionFeed(target.url);
          break;

        case 'api':
          newElections = await this.fetchFromAPI(target.url);
          break;
      }

      // Process and store new elections
      for (const election of newElections) {
        await this.processNewElection(election, target);
      }

    } catch (error) {
      console.error(`Failed to check target ${target.url}:`, error);
    }
  }

  private async fetchFromAPI(apiUrl: string): Promise<ScrapedElectionData[]> {
    try {
      // OR-03: catalog host only, https only, no redirects, 10 s / 1 MB bounds.
      const data = JSON.parse(await boundedCatalogFetch(apiUrl)) as any;
      
      // Convert API response to standard format
      const elections: ScrapedElectionData[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          elections.push({
            title: item.title || item.name || 'Unknown Election',
            date: item.date || item.election_date || new Date().toISOString(),
            location: item.location || item.district || 'Unknown',
            state: item.state || 'Unknown',
            type: item.type || 'General',
            level: item.level || 'Local',
            description: item.description || `Election data from API: ${apiUrl}`,
            lastUpdated: new Date()
          });
        }
      }
      
      return elections;
    } catch (error) {
      console.error(`Failed to fetch from API ${apiUrl}:`, error);
      return [];
    }
  }

  private async processNewElection(election: ScrapedElectionData, source: MonitoringTarget): Promise<void> {
    try {
      // Check if this election already exists in database
      const existingElections = await storage.getElections({
        search: election.title,
        state: election.state
      } as any);

      const isDuplicate = existingElections.some(existing => 
        existing.title.toLowerCase() === election.title.toLowerCase() &&
        existing.state === election.state
      );

      if (!isDuplicate) {
        // Create new election in database
        const newElection = await storage.createElection({
          title: election.title,
          subtitle: election.location,
          location: election.location,
          state: election.state,
          date: new Date(election.date),
          type: election.type,
          level: election.level,
          description: election.description || '',
          isActive: true
        });

        // Add candidates if available
        if (election.candidates && election.candidates.length > 0) {
          for (const candidate of election.candidates) {
            await storage.createCandidate({
              name: candidate.name,
              party: candidate.party,
              electionId: newElection.id,
              votesReceived: candidate.votes,
              votePercentage: candidate.percentage ? candidate.percentage.toString() : undefined,
              isWinner: false
            });
          }
        }

        console.log(`New election discovered: ${election.title} in ${election.state}`);
        
        // Enhance with AI analysis if high priority
        if (source.priority === 'high') {
          await this.enhanceWithAI(newElection.id, election);
        }
      } else {
        // Update existing election with new candidate data if available
        const existing = existingElections.find(e => 
          e.title.toLowerCase() === election.title.toLowerCase()
        );
        
        if (existing && election.candidates && election.candidates.length > 0) {
          await this.updateElectionResults(existing.id, election.candidates);
        }
      }
    } catch (error) {
      console.error(`Failed to process election ${election.title}:`, error);
    }
  }

  private async enhanceWithAI(electionId: number, electionData: ScrapedElectionData): Promise<void> {
    try {
      // Use Perplexity AI to get additional context and verification
      const query = `Verify election details for ${electionData.title} in ${electionData.state}. 
                    Provide additional context about candidates, key issues, and voting procedures.`;
      
      const aiAnalysis = await perplexityCongressService.searchWithAI(query);
      
      if (aiAnalysis) {
        // Update election description with AI-enhanced information
        const enhancedDescription = `${electionData.description}\n\nAI Analysis: ${aiAnalysis}`;
        
        // Note: In a production system, you'd update the election description here
        console.log(`Enhanced election ${electionId} with AI analysis`);
      }
    } catch (error) {
      console.error(`Failed to enhance election ${electionId} with AI:`, error);
    }
  }

  private async updateElectionResults(electionId: number, candidates: ScrapedElectionData['candidates']): Promise<void> {
    if (!candidates) return;

    try {
      // Get existing candidates
      const existingCandidates = await storage.getCandidatesByElection(electionId);
      
      for (const newCandidate of candidates) {
        const existing = existingCandidates.find(c => 
          c.name.toLowerCase() === newCandidate.name.toLowerCase()
        );

        if (existing && (newCandidate.votes || newCandidate.percentage)) {
          // Update candidate with new vote data
          await storage.updateElectionResults(electionId, {
            candidateId: existing.id,
            votes: newCandidate.votes,
            percentage: newCandidate.percentage
          });
        }
      }
    } catch (error) {
      console.error(`Failed to update results for election ${electionId}:`, error);
    }
  }

  /** OR-03: enable a catalog entry by id. Returns the entry, or null when the id is unknown. */
  enableCatalogTarget(targetId: string): MonitoringCatalogEntry | null {
    const entry = MONITORING_TARGET_CATALOG.find(e => e.id === targetId);
    if (!entry) return null;
    const existing = this.monitoringTargets.find(t => t.url === entry.url);
    if (existing) { existing.status = 'active'; return entry; }
    this.monitoringTargets.push({ url: entry.url, type: entry.type, priority: entry.priority, state: entry.state, status: 'active' });
    console.log(`Enabled monitoring target ${entry.id}`);
    return entry;
  }

  /** Kept for callers that pass a full target; refuses anything outside the catalog. */
  addMonitoringTarget(target: Omit<MonitoringTarget, 'status'>): void {
    if (!isAllowedTargetUrl(target.url)) throw new Error('monitoring target must be a catalog destination');
    const entry = MONITORING_TARGET_CATALOG.find(e => e.url === target.url);
    if (!entry) throw new Error('monitoring target must be a catalog destination');
    this.enableCatalogTarget(entry.id);
  }

  getCatalog(): readonly MonitoringCatalogEntry[] { return MONITORING_TARGET_CATALOG; }

  getEnabledTargetIds(): string[] {
    return this.monitoringTargets.filter(t => t.status !== 'inactive')
      .map(t => MONITORING_TARGET_CATALOG.find(e => e.url === t.url)?.id).filter((id): id is string => !!id);
  }

  removeMonitoringTarget(url: string): void {
    this.monitoringTargets = this.monitoringTargets.filter(target => target.url !== url);
    console.log(`Removed monitoring target: ${url}`);
  }

  getMonitoringStatus(): { 
    isRunning: boolean; 
    targetCount: number; 
    activeTargets: number;
    lastChecked?: Date;
  } {
    const activeTargets = this.monitoringTargets.filter(t => t.status === 'active').length;
    const lastChecked = this.monitoringTargets
      .filter(t => t.lastChecked)
      .sort((a, b) => (b.lastChecked!.getTime() - a.lastChecked!.getTime()))[0]?.lastChecked;

    return {
      isRunning: this.isRunning,
      targetCount: this.monitoringTargets.length,
      activeTargets,
      lastChecked
    };
  }
}

export const realTimeMonitor = new RealTimeElectionMonitor();