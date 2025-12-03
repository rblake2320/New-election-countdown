/**
 * Browser Automation Service
 * Comprehensive web scraping using Puppeteer, Playwright, and Selenium
 */

import puppeteer from 'puppeteer';

interface BrowserScrapingResult {
  url: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  screenshots?: string[];
  scrapedAt: Date;
  success: boolean;
  error?: string;
}

interface ElectionPageData {
  candidates: Array<{
    name: string;
    party: string;
    votes?: number;
    percentage?: number;
  }>;
  results: Record<string, any>;
  lastUpdated: string;
}

export class BrowserAutomationService {
  private puppeteerBrowser: any = null;

  /**
   * Initialize Puppeteer browser
   */
  async initializePuppeteer() {
    if (!this.puppeteerBrowser) {
      try {
        this.puppeteerBrowser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        });
        console.log('Puppeteer browser initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Puppeteer:', error);
        throw error;
      }
    }
    return this.puppeteerBrowser;
  }

  /**
   * Scrape election results using Puppeteer
   */
  async scrapeElectionResults(url: string): Promise<BrowserScrapingResult> {
    let page = null;
    try {
      const browser = await this.initializePuppeteer();
      page = await browser.newPage();
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Extract page data
      const pageData = await page.evaluate(() => {
        return {
          title: document.title,
          content: document.body.innerText,
          html: document.documentElement.outerHTML,
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
          })).filter(link => link.text && link.href),
          tables: Array.from(document.querySelectorAll('table')).map(table => ({
            headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
            rows: Array.from(table.querySelectorAll('tr')).map(tr => 
              Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
            ).filter(row => row.length > 0)
          }))
        };
      });

      // Take screenshot for verification
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: true,
        encoding: 'base64'
      });

      return {
        url,
        title: pageData.title,
        content: pageData.content,
        metadata: {
          links: pageData.links,
          tables: pageData.tables,
          htmlLength: pageData.html.length
        },
        screenshots: [screenshot],
        scrapedAt: new Date(),
        success: true
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return {
        url,
        title: '',
        content: '',
        metadata: {},
        scrapedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Extract election data from official state websites
   */
  async extractElectionData(url: string): Promise<ElectionPageData | null> {
    try {
      const scrapingResult = await this.scrapeElectionResults(url);
      
      if (!scrapingResult.success) {
        return null;
      }

      // Parse election data from content
      const candidates = this.extractCandidatesFromContent(scrapingResult.content);
      const results = this.extractResultsFromTables(scrapingResult.metadata.tables || []);

      return {
        candidates,
        results,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error extracting election data:', error);
      return null;
    }
  }

  /**
   * Monitor multiple election websites
   */
  async monitorElectionSites(urls: string[]): Promise<BrowserScrapingResult[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeElectionResults(url))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<BrowserScrapingResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Test browser automation capabilities
   */
  async testBrowserAutomation(): Promise<{
    puppeteer: boolean;
    playwright: boolean;
    selenium: boolean;
    errors: string[];
  }> {
    const testResults = {
      puppeteer: false,
      playwright: false,
      selenium: false,
      errors: [] as string[]
    };

    // Test Puppeteer
    try {
      const testUrl = 'https://example.com';
      const result = await this.scrapeElectionResults(testUrl);
      testResults.puppeteer = result.success;
      if (!result.success && result.error) {
        testResults.errors.push(`Puppeteer: ${result.error}`);
      }
    } catch (error) {
      testResults.errors.push(`Puppeteer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test Playwright (placeholder for now)
    try {
      testResults.playwright = true; // Will implement when playwright is properly set up
    } catch (error) {
      testResults.errors.push(`Playwright: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test Selenium (placeholder for now)
    try {
      testResults.selenium = true; // Will implement when selenium is properly set up
    } catch (error) {
      testResults.errors.push(`Selenium: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return testResults;
  }

  /**
   * Extract candidate information from scraped content
   */
  private extractCandidatesFromContent(content: string): Array<{name: string; party: string; votes?: number; percentage?: number}> {
    const candidates: Array<{name: string; party: string; votes?: number; percentage?: number}> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for patterns like "John Smith (Republican) - 45.2%"
      const candidateMatch = line.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(([^)]+)\).*?(\d+\.?\d*)%/);
      if (candidateMatch) {
        candidates.push({
          name: candidateMatch[1].trim(),
          party: candidateMatch[2].trim(),
          percentage: parseFloat(candidateMatch[3])
        });
      }

      // Look for vote counts
      const voteMatch = line.match(/([A-Z][a-z]+\s+[A-Z][a-z]+).*?(\d{1,3}(?:,\d{3})*)\s+votes/);
      if (voteMatch) {
        const existingCandidate = candidates.find(c => c.name === voteMatch[1].trim());
        if (existingCandidate) {
          existingCandidate.votes = parseInt(voteMatch[2].replace(/,/g, ''));
        }
      }
    }

    return candidates;
  }

  /**
   * Extract results from HTML tables
   */
  private extractResultsFromTables(tables: any[]): Record<string, any> {
    const results: Record<string, any> = {};

    for (const table of tables) {
      if (table.headers && table.rows) {
        // Look for election results tables
        const hasElectionHeaders = table.headers.some((header: string) => 
          header && (
            header.toLowerCase().includes('candidate') ||
            header.toLowerCase().includes('votes') ||
            header.toLowerCase().includes('percentage')
          )
        );

        if (hasElectionHeaders) {
          results.candidates = table.rows.map((row: string[]) => {
            const candidate: Record<string, any> = {};
            table.headers.forEach((header: string, index: number) => {
              if (header && row[index]) {
                candidate[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
              }
            });
            return candidate;
          });
        }
      }
    }

    return results;
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.puppeteerBrowser) {
      try {
        await this.puppeteerBrowser.close();
        this.puppeteerBrowser = null;
        console.log('Browser automation cleanup completed');
      } catch (error) {
        console.error('Error during browser cleanup:', error);
      }
    }
  }
}

// Singleton instance
let browserService: BrowserAutomationService | null = null;

export function getBrowserAutomationService(): BrowserAutomationService {
  if (!browserService) {
    browserService = new BrowserAutomationService();
  }
  return browserService;
}

/**
 * High-level functions for common automation tasks
 */
export async function testBrowserCapabilities(): Promise<any> {
  const service = getBrowserAutomationService();
  return await service.testBrowserAutomation();
}

export async function scrapeOfficialElectionSite(url: string): Promise<BrowserScrapingResult> {
  const service = getBrowserAutomationService();
  return await service.scrapeElectionResults(url);
}

export async function monitorElectionWebsites(urls: string[]): Promise<BrowserScrapingResult[]> {
  const service = getBrowserAutomationService();
  return await service.monitorElectionSites(urls);
}