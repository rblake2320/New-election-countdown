import { db } from './db';
import { elections } from '@shared/schema';
import { gte, lte, and, eq, type SQL } from 'drizzle-orm';

// Simple in-memory cache implementation
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  set(key: string, data: any, ttlSeconds: number = 300) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export class CacheService {
  private cache = new MemoryCache();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cache.cleanup();
    }, 5 * 60 * 1000);
  }

  // Cache election countdowns (1 second TTL for real-time updates)
  async getElectionCountdowns(filters?: any): Promise<any> {
    const cacheKey = `countdowns:${JSON.stringify(filters || {})}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const electionsData = await db
      .select()
      .from(elections)
      .where(eq(elections.isActive, true));

    const countdowns = electionsData.map(election => ({
      id: election.id,
      title: election.title,
      timeRemaining: Math.max(0, election.date.getTime() - Date.now()),
      isActive: election.date.getTime() > Date.now()
    }));

    this.cache.set(cacheKey, countdowns, 1); // 1 second TTL
    return countdowns;
  }

  // Cache API responses (5 minute TTL)
  async getElectionsWithCache(filters?: any): Promise<any> {
    const cacheKey = `elections:${JSON.stringify(filters || {})}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    // Build the predicate first: reassigning a Drizzle builder narrows its type.
    const conditions: SQL[] = [];
    if (filters?.state) conditions.push(eq(elections.state, filters.state));
    if (filters?.type) conditions.push(eq(elections.type, filters.type));
    const result = conditions.length
      ? await db.select().from(elections).where(and(...conditions))
      : await db.select().from(elections);
    this.cache.set(cacheKey, result, 300); // 5 minute TTL
    return result;
  }

  // ---------------------------------------------------------------------------
  // Generic namespaced cache (owner: Lane A). Domain services that need a plain
  // get/set (PositionAggregator and friends) use these; keys are prefixed so they
  // can never collide with session/analytics entries. TTL is in SECONDS, capped at
  // one day; values are stored by reference (callers must not mutate after set).
  // ---------------------------------------------------------------------------
  static readonly GENERIC_MAX_TTL_SECONDS = 24 * 60 * 60;

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.cache.get(`generic:${key}`) as T | null;
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const ttl = Math.min(CacheService.GENERIC_MAX_TTL_SECONDS, Math.max(1, Math.floor(Number(ttlSeconds) || 300)));
    this.cache.set(`generic:${key}`, value, ttl);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(`generic:${key}`);
  }

  // Cache user sessions (30 minute TTL)
  async cacheUserSession(sessionToken: string, userData: any) {
    this.cache.set(`session:${sessionToken}`, userData, 1800); // 30 minutes
  }

  async getCachedUserSession(sessionToken: string): Promise<any | null> {
    return this.cache.get(`session:${sessionToken}`);
  }

  // getAggregateAnalytics was removed (ET-5 strict types): it queried a `userAnalytics`
  // table that does not exist in shared/schema.ts and had no callers, so it could only
  // ever throw. Real aggregates live in analytics-service.ts.

  async getCachedCampaignAnalytics(campaignId: number, electionId: number): Promise<any | null> {
    const cacheKey = `campaign:${campaignId}:election:${electionId}`;
    return this.cache.get(cacheKey);
  }

  async cacheCampaignAnalytics(campaignId: number, electionId: number, data: any) {
    const cacheKey = `campaign:${campaignId}:election:${electionId}`;
    this.cache.set(cacheKey, data, 300); // 5 minute TTL
  }

  // Cache invalidation methods
  invalidateElectionCache() {
    // Remove all election-related cache entries
    for (const key of this.cache['cache'].keys()) {
      if (key.startsWith('elections:') || key.startsWith('countdowns:')) {
        this.cache.delete(key);
      }
    }
  }

  invalidateUserSession(sessionToken: string) {
    this.cache.delete(`session:${sessionToken}`);
  }

  invalidateAnalyticsCache() {
    for (const key of this.cache['cache'].keys()) {
      if (key.startsWith('analytics:')) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    const entries = this.cache['cache'].size;
    const keys = Array.from(this.cache['cache'].keys());

    return {
      totalEntries: entries,
      keysByType: {
        elections: keys.filter(k => k.startsWith('elections:')).length,
        countdowns: keys.filter(k => k.startsWith('countdowns:')).length,
        sessions: keys.filter(k => k.startsWith('session:')).length,
        analytics: keys.filter(k => k.startsWith('analytics:')).length,
        campaigns: keys.filter(k => k.startsWith('campaign:')).length,
      }
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

export const cacheService = new CacheService();