import puppeteer, { Browser, Page } from 'puppeteer';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface ScrapedElectionData {
  title: string;
  date: string;
  location: string;
  state: string;
  type: string;
  level: string;
  description?: string;
  candidates?: Array<{
    name: string;
    party: string;
    votes?: number;
    percentage?: number;
  }>;
  resultsComplete?: boolean;
  lastUpdated: Date;
}

export class ElectionWebScraper {
  private browser: Browser | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Check if Chrome dependencies are available, fall back to API-only mode if not
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        this.isInitialized = true;
        console.log('Election web scraper initialized successfully with browser support');
      } catch (browserError) {
        console.warn('Browser initialization failed, falling back to API-only monitoring:', browserError.message);
        this.isInitialized = true; // Mark as initialized for API-only mode
      }
    } catch (error) {
      console.error('Failed to initialize web scraper:', error);
      throw error;
    }
  }

  async scrapeElectionSite(url: string): Promise<ScrapedElectionData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If browser is not available, fall back to fetch-based scraping
    if (!this.browser) {
      return this.scrapeWithFetch(url);
    }

    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Navigate to the election results page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Extract election data
      const electionData = await page.evaluate(() => {
        const extractText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        // Common selectors for election sites
        const titleSelectors = ['h1', '.election-title', '.race-title', '[data-election-title]'];
        const dateSelectors = ['.election-date', '.date', '[data-date]', '.race-date'];
        const locationSelectors = ['.location', '.district', '.constituency', '[data-location]'];
        
        let title = '';
        let date = '';
        let location = '';

        for (const selector of titleSelectors) {
          title = extractText(selector);
          if (title) break;
        }

        for (const selector of dateSelectors) {
          date = extractText(selector);
          if (date) break;
        }

        for (const selector of locationSelectors) {
          location = extractText(selector);
          if (location) break;
        }

        // Extract candidate results if available
        const candidates: Array<{name: string, party: string, votes?: number, percentage?: number}> = [];
        const candidateRows = document.querySelectorAll('.candidate, .result-row, tr[data-candidate]');
        
        candidateRows.forEach(row => {
          const nameEl = row.querySelector('.name, .candidate-name, td:first-child');
          const partyEl = row.querySelector('.party, .candidate-party, .affiliation');
          const votesEl = row.querySelector('.votes, .vote-count, .total-votes');
          const percentEl = row.querySelector('.percentage, .percent, .vote-percent');

          if (nameEl?.textContent?.trim()) {
            candidates.push({
              name: nameEl.textContent.trim(),
              party: partyEl?.textContent?.trim() || 'Unknown',
              votes: votesEl?.textContent ? parseInt(votesEl.textContent.replace(/[^\d]/g, '') || '0') : undefined,
              percentage: percentEl?.textContent ? parseFloat(percentEl.textContent.replace(/[^\d.]/g, '') || '0') : undefined
            });
          }
        });

        return { title, date, location, candidates };
      });

      await page.close();

      if (!electionData.title) {
        return null;
      }

      // Determine election type and level from title and URL
      const type = this.determineElectionType(electionData.title, url);
      const level = this.determineElectionLevel(electionData.title, url);
      const state = this.extractState(electionData.title, electionData.location, url);

      return {
        title: electionData.title,
        date: electionData.date || new Date().toISOString(),
        location: electionData.location || 'Unknown',
        state,
        type,
        level,
        description: `Real-time election data from ${url}`,
        candidates: electionData.candidates,
        resultsComplete: electionData.candidates.length > 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`Failed to scrape election site ${url}:`, error);
      return null;
    }
  }

  async fetchElectionFeed(feedUrl: string): Promise<ScrapedElectionData[]> {
    try {
      const response = await fetch(feedUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const elections: ScrapedElectionData[] = [];

      // Parse election listings from common feed formats
      $('.election-item, .race-item, .contest').each((_, element) => {
        const $el = $(element);
        
        const title = $el.find('.title, .name, h3, h4').first().text().trim();
        const date = $el.find('.date, .election-date').first().text().trim();
        const location = $el.find('.location, .district').first().text().trim();

        if (title) {
          elections.push({
            title,
            date: date || new Date().toISOString(),
            location: location || 'Unknown',
            state: this.extractState(title, location, feedUrl),
            type: this.determineElectionType(title, feedUrl),
            level: this.determineElectionLevel(title, feedUrl),
            description: `Election data from feed: ${feedUrl}`,
            lastUpdated: new Date()
          });
        }
      });

      return elections;
    } catch (error) {
      console.error(`Failed to fetch election feed ${feedUrl}:`, error);
      return [];
    }
  }

  async monitorElectionResults(urls: string[]): Promise<Map<string, ScrapedElectionData>> {
    const results = new Map<string, ScrapedElectionData>();

    await Promise.allSettled(
      urls.map(async (url) => {
        const data = await this.scrapeElectionSite(url);
        if (data) {
          results.set(url, data);
        }
      })
    );

    return results;
  }

  private determineElectionType(title: string, url: string): string {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    if (titleLower.includes('primary') || urlLower.includes('primary')) return 'Primary';
    if (titleLower.includes('special') || urlLower.includes('special')) return 'Special';
    if (titleLower.includes('runoff') || urlLower.includes('runoff')) return 'Runoff';
    return 'General';
  }

  private determineElectionLevel(title: string, url: string): string {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    if (titleLower.includes('congress') || titleLower.includes('senate') || 
        titleLower.includes('house') || urlLower.includes('federal')) return 'Federal';
    if (titleLower.includes('governor') || titleLower.includes('state') || 
        titleLower.includes('legislature')) return 'State';
    return 'Local';
  }

  private extractState(title: string, location: string, url: string): string {
    // State abbreviation mapping
    const stateAbbreviations: { [key: string]: string } = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };

    const text = `${title} ${location} ${url}`.toLowerCase();
    
    // Check for state names or abbreviations
    for (const [stateName, stateAbbr] of Object.entries(stateAbbreviations)) {
      if (text.includes(stateName.toLowerCase()) || text.includes(stateAbbr.toLowerCase())) {
        return stateAbbr;
      }
    }

    return 'Unknown';
  }

  // Fallback scraping method using fetch when browser is not available
  private async scrapeWithFetch(url: string): Promise<ScrapedElectionData | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('h1, .election-title, .race-title').first().text().trim() || 
                   $('title').text().trim() || 'Election Results';
      
      const date = $('.election-date, .date, [data-date]').first().text().trim() || 
                  new Date().toISOString();
      
      const location = $('.location, .district, .constituency').first().text().trim() || 'Unknown';
      
      return {
        title,
        date,
        location,
        state: this.extractState(title, location, url),
        type: this.determineElectionType(title, url),
        level: this.determineElectionLevel(title, url),
        description: `Election data from ${url} (API-only mode)`,
        candidates: [],
        resultsComplete: false,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error(`Failed to scrape with fetch ${url}:`, error);
      return null;
    }
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.isInitialized = false;
  }
}

export const electionScraper = new ElectionWebScraper();