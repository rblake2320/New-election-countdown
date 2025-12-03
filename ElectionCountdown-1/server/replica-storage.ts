/**
 * Replica Storage Implementation
 * Handles read-only connections to Neon database replicas
 * Provides connection pooling and health monitoring for replica databases
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import type { IStorage } from "./storage";
import { type Election, type InsertElection, type Candidate, type InsertCandidate, type ElectionFilters, type CongressMember, type InsertCongressMember, type User, type UpsertUser, type WatchlistItem, type InsertWatchlistItem, type CandidateAccount, type InsertCandidateAccount, type CandidateProfile, type InsertCandidateProfile, type CandidateDataSource, type InsertCandidateDataSource, type CandidatePosition, type InsertCandidatePosition, type CandidateQA, type InsertCandidateQA } from "@shared/schema";
import { eq, and, gte, lte, ilike, or, desc, inArray } from "drizzle-orm";

// Configure Neon for replica connections
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.fetchConnectionCache = true;

export interface ReplicaHealthMetrics {
  connectionLatency: number;
  queryLatency: number;
  errorRate: number;
  lastError?: string;
  uptime: number;
  lagBehindPrimary?: number; // In milliseconds
}

export class ReplicaStorage implements IStorage {
  private pool: Pool;
  private db: any;
  private connectionString: string;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date = new Date(0);
  private metrics: ReplicaHealthMetrics = {
    connectionLatency: 0,
    queryLatency: 0,
    errorRate: 0,
    uptime: 0
  };
  private readonly replicaId: string;
  private consecutiveErrors: number = 0;
  private totalQueries: number = 0;
  private totalErrors: number = 0;

  constructor(connectionString: string, replicaId?: string) {
    this.connectionString = connectionString;
    this.replicaId = replicaId || this.extractReplicaIdFromConnectionString(connectionString);
    
    // Configure connection pool for replica (read-only optimized)
    const poolConfig = {
      connectionString: this.connectionString,
      max: 8, // Slightly lower than primary for read-heavy workloads
      min: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 45000, // Longer idle for read replicas
      allowExitOnIdle: true,
      retryDelay: 2000,
      retryAttempts: 2 // Fewer retries for replicas
    };

    this.pool = new Pool(poolConfig);
    this.db = drizzle({ client: this.pool, schema });

    // Set up error handling
    this.pool.on('error', (err) => {
      console.error(`Replica ${this.replicaId} pool error:`, {
        message: err.message,
        code: (err as any).code,
        severity: (err as any).severity
      });
      this.recordError(err.message);
    });

    this.pool.on('connect', () => {
      console.log(`✅ Replica ${this.replicaId} connection established`);
    });

    console.log(`📋 Replica storage initialized: ${this.replicaId}`);
  }

  private extractReplicaIdFromConnectionString(connectionString: string): string {
    // Extract replica ID from connection string pattern
    const match = connectionString.match(/\/([^\/]+)\.neon\.tech/);
    return match ? match[1].substring(0, 8) : 'unknown';
  }

  private recordError(error: string): void {
    this.consecutiveErrors++;
    this.totalErrors++;
    this.metrics.errorRate = (this.totalErrors / Math.max(this.totalQueries, 1)) * 100;
    this.metrics.lastError = error;
    this.isHealthy = false;
  }

  private recordSuccess(queryTime: number): void {
    this.consecutiveErrors = 0;
    this.totalQueries++;
    this.metrics.queryLatency = queryTime;
    this.metrics.errorRate = (this.totalErrors / this.totalQueries) * 100;
    this.isHealthy = true;
  }

  // Health check method for replica
  async performHealthCheck(): Promise<{ healthy: boolean; latency: number; metrics: ReplicaHealthMetrics }> {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        this.db.execute('SELECT 1 as health_check, NOW() as server_time, pg_last_xact_replay_timestamp() as last_replay'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Replica health check timeout')), 5000)
        )
      ]);

      const latency = Date.now() - startTime;
      this.metrics.connectionLatency = latency;
      this.recordSuccess(latency);
      this.lastHealthCheck = new Date();

      // Calculate lag behind primary if available
      if (result && result[0]?.last_replay) {
        const replayTime = new Date(result[0].last_replay).getTime();
        const now = new Date().getTime();
        this.metrics.lagBehindPrimary = now - replayTime;
      }

      console.log(`✅ Replica ${this.replicaId} health check passed (${latency}ms)`);

      return {
        healthy: true,
        latency,
        metrics: { ...this.metrics }
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.recordError(errorMessage);
      console.log(`❌ Replica ${this.replicaId} health check failed:`, errorMessage);

      return {
        healthy: false,
        latency,
        metrics: { ...this.metrics }
      };
    }
  }

  // Enhanced query execution with error handling and metrics
  private async executeQuery<T>(queryFn: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;
      this.recordSuccess(queryTime);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordError(errorMessage);
      
      console.error(`Replica ${this.replicaId} query error in ${operationName}:`, errorMessage);
      throw new Error(`Replica query failed: ${errorMessage}`);
    }
  }

  // IStorage interface implementation - all read-only operations
  
  isDbHealthy(): boolean {
    return this.isHealthy && this.consecutiveErrors < 3;
  }

  async getElections(filters?: ElectionFilters): Promise<Election[]> {
    return this.executeQuery(async () => {
      let query = this.db.select().from(schema.elections);
      
      if (filters) {
        const conditions = [];
        if (filters.state) conditions.push(eq(schema.elections.state, filters.state));
        if (filters.type) conditions.push(eq(schema.elections.type, filters.type));
        if (filters.level) conditions.push(eq(schema.elections.level, filters.level));
        if (filters.isActive !== undefined) conditions.push(eq(schema.elections.isActive, filters.isActive));
        if (filters.dateFrom) conditions.push(gte(schema.elections.date, filters.dateFrom));
        if (filters.dateTo) conditions.push(lte(schema.elections.date, filters.dateTo));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      return query.orderBy(schema.elections.date).execute();
    }, 'getElections');
  }

  async getElection(id: number): Promise<Election | undefined> {
    return this.executeQuery(async () => {
      const results = await this.db.select()
        .from(schema.elections)
        .where(eq(schema.elections.id, id))
        .execute();
      return results[0];
    }, 'getElection');
  }

  async getCandidatesByElection(electionId: number): Promise<Candidate[]> {
    return this.executeQuery(async () => {
      return this.db.select()
        .from(schema.candidates)
        .where(eq(schema.candidates.electionId, electionId))
        .orderBy(schema.candidates.name)
        .execute();
    }, 'getCandidatesByElection');
  }

  async getCandidates(electionId?: number): Promise<Candidate[]> {
    return this.executeQuery(async () => {
      let query = this.db.select().from(schema.candidates);
      
      if (electionId) {
        query = query.where(eq(schema.candidates.electionId, electionId));
      }
      
      return query.orderBy(schema.candidates.name).execute();
    }, 'getCandidates');
  }

  async getCandidatesByIds(ids: number[]): Promise<Candidate[]> {
    return this.executeQuery(async () => {
      return this.db.select()
        .from(schema.candidates)
        .where(inArray(schema.candidates.id, ids))
        .execute();
    }, 'getCandidatesByIds');
  }

  async getElectionResults(electionId: number): Promise<any> {
    return this.executeQuery(async () => {
      return this.db.select()
        .from(schema.electionResults)
        .where(eq(schema.electionResults.electionId, electionId))
        .execute();
    }, 'getElectionResults');
  }

  async getElectionStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    nextElection: Election | null;
  }> {
    return this.executeQuery(async () => {
      const elections = await this.db.select().from(schema.elections).execute();
      
      const stats = {
        total: elections.length,
        byType: {} as Record<string, number>,
        byLevel: {} as Record<string, number>,
        nextElection: null as Election | null
      };

      // Calculate statistics
      elections.forEach(election => {
        stats.byType[election.type] = (stats.byType[election.type] || 0) + 1;
        stats.byLevel[election.level] = (stats.byLevel[election.level] || 0) + 1;
      });

      // Find next election
      const futureElections = elections
        .filter(e => new Date(e.date) > new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (futureElections.length > 0) {
        stats.nextElection = futureElections[0];
      }

      return stats;
    }, 'getElectionStats');
  }

  async getAllCongressMembers(): Promise<CongressMember[]> {
    return this.executeQuery(async () => {
      return this.db.select().from(schema.congressMembers).execute();
    }, 'getAllCongressMembers');
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.executeQuery(async () => {
      const results = await this.db.select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .execute();
      return results[0];
    }, 'getUser');
  }

  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    return this.executeQuery(async () => {
      return this.db.select()
        .from(schema.watchlist)
        .where(eq(schema.watchlist.userId, userId))
        .execute();
    }, 'getUserWatchlist');
  }

  async getCandidateProfile(candidateId: number): Promise<CandidateProfile | null> {
    return this.executeQuery(async () => {
      const results = await this.db.select()
        .from(schema.candidateProfiles)
        .where(eq(schema.candidateProfiles.candidateId, candidateId))
        .execute();
      return results[0] || null;
    }, 'getCandidateProfile');
  }

  // Write operations - all throw errors since this is read-only replica
  async createElection(election: InsertElection): Promise<Election> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async deleteElection(id: number): Promise<void> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async updateCandidatePolling(candidateId: number, pollingData: any): Promise<void> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async updateElectionResults(electionId: number, resultsData: any): Promise<any> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async addToWatchlist(userId: string, electionId: number): Promise<WatchlistItem> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async removeFromWatchlist(userId: string, electionId: number): Promise<void> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async createCandidateAccount(account: InsertCandidateAccount): Promise<CandidateAccount> {
    throw new Error('Write operations not supported on read-only replica');
  }

  async updateCandidateProfile(candidateId: number, profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
    throw new Error('Write operations not supported on read-only replica');
  }

  // Stub implementations for methods not relevant to replica storage
  async syncElectionsFromGoogleCivic(): Promise<void> {
    throw new Error('External API operations not supported on read-only replica');
  }

  async getVoterInfo(address: string): Promise<any> {
    throw new Error('External API operations not supported on read-only replica');
  }

  async getAllBills(): Promise<any[]> { return []; }
  async getBillsByCongress(congress: string): Promise<any[]> { return []; }
  async getAllMembers(): Promise<any[]> { return []; }
  async getMembersByState(state: string): Promise<any[]> { return []; }
  async getAllCommittees(): Promise<any[]> { return []; }
  async getCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]> { return []; }
  async getDailyCongressionalRecords(): Promise<any[]> { return []; }
  async getSenateCommunications(): Promise<any[]> { return []; }
  async getAllNominations(): Promise<any[]> { return []; }
  async getHouseVotes(): Promise<any[]> { return []; }
  async searchElectionsWithAI(query: string): Promise<string> { return ''; }
  async expandElectionData(): Promise<void> {}
  async getElectionCycles(): Promise<any[]> { return []; }
  async getElectionCycle(slug: string): Promise<any> { return null; }
  async logInteraction(data: any): Promise<void> {}
  async authenticateCandidate(email: string, password: string): Promise<CandidateAccount | null> { return null; }
  async getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]> { return []; }
  async recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource> { throw new Error('Write operations not supported on read-only replica'); }
  async getCandidateWithRAG(candidateId: number): Promise<any> { return null; }
  async recordEngagement(data: any): Promise<void> {}
  async updateUserPreferences(userId: number, preferences: any): Promise<void> {}
  async updateUserDemographics(userId: number, demographics: any): Promise<void> {}
  async exportUserData(userId: number): Promise<any> { return null; }
  async deleteUserData(userId: number): Promise<boolean> { return false; }
  async createCampaignAccount(data: any): Promise<any> { throw new Error('Write operations not supported on read-only replica'); }
  async validateCampaignAccess(apiKey: string): Promise<any> { return null; }
  async getCampaignAnalytics(campaignId: number, electionId: number, tier: string): Promise<any> { return null; }
  async getCampaignGeographics(campaignId: number, region: string, tier: string): Promise<any> { return null; }
  async getCampaignPolling(campaignId: number, electionId: number, dateRange: string): Promise<any> { return null; }

  // Get replica-specific metrics and health information
  getReplicaMetrics(): ReplicaHealthMetrics {
    return { ...this.metrics };
  }

  getReplicaInfo(): {
    id: string;
    isHealthy: boolean;
    lastHealthCheck: Date;
    consecutiveErrors: number;
    totalQueries: number;
    totalErrors: number;
  } {
    return {
      id: this.replicaId,
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      consecutiveErrors: this.consecutiveErrors,
      totalQueries: this.totalQueries,
      totalErrors: this.totalErrors
    };
  }

  // Graceful shutdown
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log(`✅ Replica ${this.replicaId} connection pool closed`);
    } catch (error) {
      console.error(`❌ Error closing replica ${this.replicaId} pool:`, error);
    }
  }
}