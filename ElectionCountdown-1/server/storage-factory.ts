import { MemStorage } from "./mem-storage";
import type { IStorage } from "./storage";
import { type Election, type InsertElection, type Candidate, type InsertCandidate, type ElectionFilters, type CongressMember, type InsertCongressMember, type User, type UpsertUser, type WatchlistItem, type InsertWatchlistItem, type CandidateAccount, type InsertCandidateAccount, type CandidateProfile, type InsertCandidateProfile, type CandidateDataSource, type InsertCandidateDataSource, type CandidatePosition, type InsertCandidatePosition, type CandidateQA, type InsertCandidateQA } from "@shared/schema";

export enum StorageMode {
  DATABASE = 'database',
  MEMORY = 'memory',
  MEMORY_OPTIMIZED = 'memory_optimized', // Stable memory-only mode after DB failures
  HYBRID = 'hybrid',
  READ_ONLY = 'read_only', // Degraded database operations - reads only
  REPLICA = 'replica' // Read-only database replica connections
}

export enum FailoverTrigger {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  PLANNED_MAINTENANCE = 'planned_maintenance',
  HEALTH_CHECK_FAILURE = 'health_check_failure',
  CONNECTION_TIMEOUT = 'connection_timeout',
  WRITE_FAILURE = 'write_failure'
}

interface WriteOperation {
  id: string;
  timestamp: Date;
  operation: string;
  method: string;
  data: any;
  retries: number;
}

interface FailoverEvent {
  id: string;
  timestamp: Date;
  fromMode: StorageMode;
  toMode: StorageMode;
  trigger: FailoverTrigger;
  reason: string;
  success: boolean;
  latency?: number;
  error?: string;
}

interface ReplicaConfig {
  connectionString: string;
  maxConnections: number;
  healthCheckInterval: number;
  priority: number; // Higher priority = preferred replica
}

export class StorageFactory implements IStorage {
  private currentStorage: IStorage;
  private databaseStorage: IStorage | null = null;
  private replicaStorages: Map<string, IStorage> = new Map(); // replica id -> storage
  private memoryStorage: MemStorage;
  private currentMode: StorageMode = StorageMode.HYBRID;
  private isDatabaseHealthy: boolean = false;
  private isReplicaHealthy: boolean = false;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval = 45000; // 45 seconds - less frequent for failing systems
  private retryAttempts = 0;
  private maxRetries = 15; // More attempts with better backoff
  private baseBackoffDelay = 2000; // 2 seconds base delay
  private maxBackoffDelay = 300000; // Maximum 5 minutes between attempts
  private consecutiveFailures = 0; // Track consecutive failures for adaptive intervals
  private connectionDiagnostics: Array<{timestamp: Date, success: boolean, error?: string, latency?: number}> = []
  private isMemoryOptimized: boolean = false; // True when settled into stable memory-only mode
  
  // Replica connection management
  private replicaConfigs: Map<string, ReplicaConfig> = new Map();
  private activeReplica: string | null = null;
  private replicaHealthChecks: Map<string, {timestamp: Date, healthy: boolean, latency?: number}> = new Map();
  
  // Failover event tracking
  private failoverEvents: FailoverEvent[] = [];
  private maxFailoverEvents = 100;
  
  // Write-ahead queue for database operations
  private writeQueue: WriteOperation[] = [];
  private queueProcessingInterval: NodeJS.Timer | null = null;
  
  // Read-only mode tracking
  private isReadOnlyMode: boolean = false;
  private lastWriteAttempt: Date | null = null;
  
  constructor() {
    this.memoryStorage = new MemStorage();
    this.currentStorage = this.memoryStorage; // Start with memory storage
    this.isDatabaseHealthy = false; // Start assuming database is unhealthy
    this.currentMode = StorageMode.MEMORY; // Start in memory-only mode for safety
    this.isMemoryOptimized = false; // Will become true after max retries
    
    this.initializeReplicaConfigs();
    this.initializeHealthChecking();
    this.initializeQueueProcessing();
  }
  
  // Initialize replica configurations from environment variables
  private initializeReplicaConfigs(): void {
    // Check for replica connection strings in environment
    const replicaEnvs = Object.keys(process.env)
      .filter(key => key.startsWith('DATABASE_REPLICA_'))
      .sort();
    
    replicaEnvs.forEach((envKey, index) => {
      const replicaId = envKey.replace('DATABASE_REPLICA_', '').toLowerCase();
      const connectionString = process.env[envKey];
      
      if (connectionString) {
        this.replicaConfigs.set(replicaId, {
          connectionString,
          maxConnections: 5,
          healthCheckInterval: 30000, // 30 seconds
          priority: index + 1 // Lower index = higher priority
        });
        
        console.log(`📋 Configured replica: ${replicaId} (priority: ${index + 1})`);
      }
    });
    
    if (this.replicaConfigs.size > 0) {
      console.log(`✅ Initialized ${this.replicaConfigs.size} replica configurations`);
    } else {
      console.log('ℹ️ No replica configurations found - running with primary database only');
    }
  }

  // Lazy initialization of database storage to avoid circular dependency
  private async getDatabaseStorage(): Promise<IStorage | null> {
    if (!this.databaseStorage) {
      try {
        const { DatabaseStorage } = await import("./storage-instance");
        this.databaseStorage = new DatabaseStorage();
      } catch (error) {
        console.error("Failed to initialize database storage:", error);
        return null;
      }
    }
    return this.databaseStorage;
  }

  private async initializeHealthChecking(): Promise<void> {
    // Check database and replica health immediately
    await this.checkDatabaseHealth();
    await this.checkReplicaHealth();
    
    // Set up periodic health checks
    setInterval(async () => {
      await this.checkDatabaseHealth();
      await this.checkReplicaHealth();
    }, this.healthCheckInterval);
  }

  private initializeQueueProcessing(): void {
    // Process write queue every 5 seconds when database is available
    this.queueProcessingInterval = setInterval(async () => {
      if (this.isDatabaseHealthy && this.writeQueue.length > 0) {
        await this.processWriteQueue();
      }
    }, 5000);
  }

  private async checkDatabaseHealth(): Promise<void> {
    const now = new Date();
    
    try {
      // Import enhanced database connection utilities
      const { testDatabaseConnection, connectWithRetry } = await import("./db");
      
      // Use enhanced health check with timeout and detailed diagnostics
      const healthCheck = await testDatabaseConnection(8000); // 8 second timeout
      
      // Record diagnostics
      this.connectionDiagnostics.push({
        timestamp: now,
        success: healthCheck.success,
        error: healthCheck.error,
        latency: healthCheck.latency
      });
      
      // Keep only last 50 diagnostic entries
      if (this.connectionDiagnostics.length > 50) {
        this.connectionDiagnostics = this.connectionDiagnostics.slice(-50);
      }
      
      if (healthCheck.success) {
        if (!this.isDatabaseHealthy) {
          console.log('✅ Primary database connection restored', {
            latency: healthCheck.latency + 'ms',
            attempts: this.retryAttempts,
            consecutiveFailures: this.consecutiveFailures
          });
          
          // Record failover recovery event
          this.recordFailoverEvent({
            fromMode: this.currentMode,
            toMode: StorageMode.DATABASE,
            trigger: FailoverTrigger.AUTOMATIC,
            reason: 'Primary database connection restored',
            success: true,
            latency: healthCheck.latency
          });
          
          this.isDatabaseHealthy = true;
          this.retryAttempts = 0;
          this.consecutiveFailures = 0;
          
          // Reset to normal health check interval
          this.healthCheckInterval = 45000;
          
          // Initialize database storage if needed
          const dbStorage = await this.getDatabaseStorage();
          
          // Intelligent failover decision based on current mode and availability
          await this.orchestrateFailover(StorageMode.DATABASE, FailoverTrigger.AUTOMATIC, 'Primary database restored');
        }
        
        this.lastHealthCheck = now;
        return;
      }
      
      // Connection failed - handle accordingly
      this.handleConnectionFailure(healthCheck.error, healthCheck.details);
      
    } catch (error) {
      // Unexpected error in health check process
      console.error('❌ Primary database health check error:', error);
      this.handleConnectionFailure(
        error instanceof Error ? error.message : 'Unknown health check error',
        { error }
      );
    }
  }
  
  // Check health of all configured replicas
  private async checkReplicaHealth(): Promise<void> {
    if (this.replicaConfigs.size === 0) return;
    
    const healthPromises = Array.from(this.replicaConfigs.entries()).map(async ([replicaId, config]) => {
      try {
        const startTime = Date.now();
        
        // Create temporary connection to test replica
        const { Pool } = await import('@neondatabase/serverless');
        const tempPool = new Pool({ connectionString: config.connectionString, max: 1 });
        
        // Simple health check query
        const result = await Promise.race([
          tempPool.query('SELECT 1 as health_check, NOW() as server_time'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Replica connection timeout')), 5000)
          )
        ]);
        
        const latency = Date.now() - startTime;
        
        // Update replica health status
        this.replicaHealthChecks.set(replicaId, {
          timestamp: new Date(),
          healthy: true,
          latency
        });
        
        // Clean up temporary connection
        await tempPool.end();
        
        console.log(`✅ Replica ${replicaId} healthy (${latency}ms)`);
        
        return { replicaId, healthy: true, latency };
        
      } catch (error) {
        console.log(`❌ Replica ${replicaId} unhealthy:`, error instanceof Error ? error.message : String(error));
        
        this.replicaHealthChecks.set(replicaId, {
          timestamp: new Date(),
          healthy: false
        });
        
        return { replicaId, healthy: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    const results = await Promise.allSettled(healthPromises);
    const healthyReplicas = results
      .filter(result => result.status === 'fulfilled' && result.value.healthy)
      .map(result => result.status === 'fulfilled' ? result.value.replicaId : null)
      .filter(Boolean) as string[];
    
    // Update overall replica health status
    const wasReplicaHealthy = this.isReplicaHealthy;
    this.isReplicaHealthy = healthyReplicas.length > 0;
    
    // Select best replica if available
    if (healthyReplicas.length > 0) {
      const bestReplica = this.selectBestReplica(healthyReplicas);
      if (bestReplica !== this.activeReplica) {
        console.log(`🔄 Switching to replica: ${bestReplica}`);
        this.activeReplica = bestReplica;
        
        // Initialize replica storage if needed
        await this.initializeReplicaStorage(bestReplica);
      }
    } else {
      this.activeReplica = null;
    }
    
    // If we lost replica health, consider failover options
    if (wasReplicaHealthy && !this.isReplicaHealthy && !this.isDatabaseHealthy) {
      console.log('⚠️ All replicas unhealthy and primary database down - considering degraded modes');
      await this.orchestrateFailover(StorageMode.MEMORY_OPTIMIZED, FailoverTrigger.HEALTH_CHECK_FAILURE, 'All database connections lost');
    }
  }
  
  private async handleConnectionFailure(error?: string, details?: any): Promise<void> {
    if (this.isDatabaseHealthy) {
      console.log('❌ Primary database connection lost', {
        error,
        details: details ? JSON.stringify(details, null, 2) : 'No details'
      });
      
      this.isDatabaseHealthy = false;
      
      // Intelligent failover decision based on available options
      if (this.isReplicaHealthy && this.activeReplica) {
        // Failover to replica
        await this.orchestrateFailover(StorageMode.REPLICA, FailoverTrigger.HEALTH_CHECK_FAILURE, `Primary database failure: ${error}`);
      } else {
        // Failover to memory or read-only mode
        const targetMode = this.currentMode === StorageMode.READ_ONLY ? StorageMode.MEMORY : StorageMode.READ_ONLY;
        await this.orchestrateFailover(targetMode, FailoverTrigger.HEALTH_CHECK_FAILURE, `Database connection lost: ${error}`);
      }
    }
    
    this.retryAttempts++;
    this.consecutiveFailures++;
    
    // Adaptive retry strategy based on failure patterns
    const recentFailures = this.connectionDiagnostics
      .slice(-10)
      .filter(d => !d.success).length;
    
    // If we have many recent failures, increase the interval
    if (recentFailures >= 8) {
      this.healthCheckInterval = Math.min(this.healthCheckInterval * 1.5, 300000); // Max 5 minutes
      console.log(`🕐 Increased health check interval to ${this.healthCheckInterval/1000}s due to persistent failures`);
    }
    
    // After max retries, switch to optimized memory-only mode but don't give up forever
    if (this.retryAttempts > this.maxRetries && !this.isMemoryOptimized) {
      await this.orchestrateFailover(StorageMode.MEMORY_OPTIMIZED, FailoverTrigger.AUTOMATIC, 'Maximum retry attempts exceeded');
    } else if (this.retryAttempts <= this.maxRetries) {
      // Calculate exponential backoff delay with jitter
      const baseDelay = Math.min(
        this.baseBackoffDelay * Math.pow(1.5, this.retryAttempts), 
        this.maxBackoffDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = baseDelay * 0.1 * (Math.random() - 0.5);
      const delay = baseDelay + jitter;
      
      console.log(`⏳ Primary database retry ${this.retryAttempts}/${this.maxRetries} in ${Math.round(delay/1000)}s`, {
        error: error?.substring(0, 100),
        consecutiveFailures: this.consecutiveFailures
      });
    }
  }

  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    const dbStorage = await this.getDatabaseStorage();
    if (!dbStorage) return;

    console.log(`Processing ${this.writeQueue.length} queued write operations...`);
    const operations = [...this.writeQueue];
    this.writeQueue = [];

    for (const operation of operations) {
      try {
        // Replay the operation against the database
        const method = (dbStorage as any)[operation.method];
        if (typeof method === 'function') {
          await method.call(dbStorage, ...operation.data);
          console.log(`✅ Synced queued operation: ${operation.method}`);
        }
      } catch (error) {
        console.log(`❌ Failed to sync operation ${operation.method}:`, error);
        
        // Re-queue if retry count is within limit
        if (operation.retries < 3) {
          operation.retries++;
          this.writeQueue.push(operation);
        } else {
          console.log(`⚠️  Dropping operation ${operation.method} after 3 retries`);
        }
      }
    }
  }

  private queueWriteOperation(method: string, data: any[]): void {
    if (this.isDatabaseHealthy && !this.isReadOnlyMode) return; // Don't queue if database is healthy and writable
    if (this.isMemoryOptimized) return; // Don't queue if we're in optimized memory-only mode
    if (this.isReadOnlyMode) {
      this.lastWriteAttempt = new Date();
      console.log(`⚠️ Write operation blocked in read-only mode: ${method}`);
      return;
    }
    
    const operation: WriteOperation = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      operation: 'write',
      method,
      data,
      retries: 0
    };
    
    this.writeQueue.push(operation);
    console.log(`📝 Queued write operation: ${method}`);
  }

  // Health monitoring methods
  public getStorageMode(): StorageMode {
    return this.currentMode;
  }

  public async setStorageMode(mode: StorageMode): Promise<void> {
    this.currentMode = mode;
    
    const dbStorage = await this.getDatabaseStorage();
    
    if (mode === StorageMode.DATABASE && this.isDatabaseHealthy && dbStorage) {
      this.currentStorage = dbStorage;
    } else if (mode === StorageMode.MEMORY) {
      this.currentStorage = this.memoryStorage;
    } else {
      // HYBRID mode - always use memory for reads to ensure data consistency
      // Database is only used for write queue processing when healthy
      this.currentStorage = this.memoryStorage;
    }
  }

  public isDatabaseAvailable(): boolean {
    return this.isDatabaseHealthy;
  }
  
  public isSystemHealthy(): boolean {
    // System is healthy if database is available OR if we're in optimized memory mode
    return this.isDatabaseHealthy || this.isMemoryOptimized;
  }

  // IStorage interface method - in optimized memory mode, system is considered healthy
  public isDbHealthy(): boolean {
    return this.isDatabaseHealthy || this.isMemoryOptimized;
  }

  public getHealthStatus(): {
    mode: StorageMode;
    isDatabaseHealthy: boolean;
    isReplicaHealthy: boolean;
    isMemoryOptimized: boolean;
    isReadOnlyMode: boolean;
    activeReplica: string | null;
    lastHealthCheck: Date;
    retryAttempts: number;
    consecutiveFailures: number;
    queueLength: number;
    currentStorageType: string;
    systemHealthy: boolean;
    healthCheckInterval: number;
    diagnostics: Array<{timestamp: Date, success: boolean, error?: string, latency?: number}>;
    replicaHealth: Map<string, {timestamp: Date, healthy: boolean, latency?: number}>;
    failoverEvents: FailoverEvent[];
    connectionStats: {
      successRate: number;
      averageLatency: number;
      recentFailures: number;
    };
  } {
    // Calculate connection statistics
    const recentDiagnostics = this.connectionDiagnostics.slice(-20); // Last 20 attempts
    const successCount = recentDiagnostics.filter(d => d.success).length;
    const successRate = recentDiagnostics.length > 0 ? (successCount / recentDiagnostics.length) * 100 : 0;
    const latencies = recentDiagnostics.filter(d => d.latency).map(d => d.latency!);
    const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const recentFailures = this.connectionDiagnostics.slice(-10).filter(d => !d.success).length;
    
    return {
      mode: this.currentMode,
      isDatabaseHealthy: this.isDatabaseHealthy,
      isReplicaHealthy: this.isReplicaHealthy,
      isMemoryOptimized: this.isMemoryOptimized,
      isReadOnlyMode: this.isReadOnlyMode,
      activeReplica: this.activeReplica,
      lastHealthCheck: this.lastHealthCheck,
      retryAttempts: this.retryAttempts,
      consecutiveFailures: this.consecutiveFailures,
      queueLength: this.writeQueue.length,
      currentStorageType: this.getCurrentStorageType(),
      systemHealthy: this.isDatabaseHealthy || this.isReplicaHealthy || this.isMemoryOptimized,
      healthCheckInterval: this.healthCheckInterval,
      diagnostics: this.connectionDiagnostics.slice(-10), // Last 10 for API response
      replicaHealth: this.replicaHealthChecks,
      failoverEvents: this.failoverEvents.slice(-20), // Last 20 failover events
      connectionStats: {
        successRate: Math.round(successRate * 100) / 100,
        averageLatency: Math.round(averageLatency * 100) / 100,
        recentFailures
      }
    };
  }
  
  // Get current storage type description
  private getCurrentStorageType(): string {
    if (this.currentStorage === this.databaseStorage) {
      return this.isReadOnlyMode ? 'database_readonly' : 'database';
    }
    if (this.activeReplica && this.replicaStorages.has(this.activeReplica) && 
        this.currentStorage === this.replicaStorages.get(this.activeReplica)) {
      return `replica_${this.activeReplica}`;
    }
    return this.isMemoryOptimized ? 'memory_optimized' : 'memory';
  }

  // Force health check (for testing)
  public async forceHealthCheck(): Promise<void> {
    console.log('🔍 Forcing database health check...');
    await this.checkDatabaseHealth();
  }
  
  // Force connection attempt with detailed retry
  public async forceReconnect(): Promise<{success: boolean, attempts: number, error?: string}> {
    console.log('🔄 Forcing primary database reconnection attempt...');
    
    try {
      const { connectWithRetry } = await import('./db');
      const result = await connectWithRetry({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 10000,
        jitter: true
      });
      
      if (result.success) {
        // Update our state immediately
        this.isDatabaseHealthy = true;
        this.retryAttempts = 0;
        this.consecutiveFailures = 0;
        this.lastHealthCheck = new Date();
        
        // Orchestrate failover back to database
        await this.orchestrateFailover(StorageMode.DATABASE, FailoverTrigger.MANUAL, 'Force reconnection successful');
        
        console.log(`✅ Force reconnection successful after ${result.attempts} attempts`);
      } else {
        console.log(`❌ Force reconnection failed after ${result.attempts} attempts:`, result.finalError);
      }
      
      return {
        success: result.success,
        attempts: result.attempts,
        error: result.finalError
      };
    } catch (error) {
      console.error('❌ Force reconnection error:', error);
      return {
        success: false,
        attempts: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Manual failover for planned maintenance
  public async triggerManualFailover(targetMode: StorageMode, reason: string = 'Manual failover'): Promise<{success: boolean, error?: string}> {
    try {
      await this.orchestrateFailover(targetMode, FailoverTrigger.MANUAL, reason);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
  
  // Get failover history for monitoring
  public getFailoverHistory(limit: number = 50): FailoverEvent[] {
    return this.failoverEvents.slice(-limit);
  }
  
  // Get replica configurations and health
  public getReplicaStatus(): {
    configured: Map<string, ReplicaConfig>;
    health: Map<string, {timestamp: Date, healthy: boolean, latency?: number}>;
    active: string | null;
  } {
    return {
      configured: this.replicaConfigs,
      health: this.replicaHealthChecks,
      active: this.activeReplica
    };
  }
  
  // Select the best available replica based on priority and latency
  private selectBestReplica(healthyReplicas: string[]): string {
    if (healthyReplicas.length === 0) {
      throw new Error('No healthy replicas available');
    }
    
    if (healthyReplicas.length === 1) {
      return healthyReplicas[0];
    }
    
    // Sort by priority (lower number = higher priority) and then by latency
    const replicaScores = healthyReplicas.map(replicaId => {
      const config = this.replicaConfigs.get(replicaId)!;
      const health = this.replicaHealthChecks.get(replicaId)!;
      
      return {
        replicaId,
        priority: config.priority,
        latency: health.latency || 999999 // High latency if unknown
      };
    });
    
    // Sort by priority (ascending) then by latency (ascending)
    replicaScores.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.latency - b.latency;
    });
    
    return replicaScores[0].replicaId;
  }
  
  // Initialize storage connection for a specific replica
  private async initializeReplicaStorage(replicaId: string): Promise<IStorage | null> {
    try {
      if (this.replicaStorages.has(replicaId)) {
        return this.replicaStorages.get(replicaId)!;
      }
      
      const config = this.replicaConfigs.get(replicaId);
      if (!config) {
        throw new Error(`No configuration found for replica: ${replicaId}`);
      }
      
      // Create storage instance for replica (this would be a specialized replica storage)
      const { ReplicaStorage } = await import('./replica-storage');
      const replicaStorage = new ReplicaStorage(config.connectionString);
      
      this.replicaStorages.set(replicaId, replicaStorage);
      console.log(`✅ Initialized replica storage: ${replicaId}`);
      
      return replicaStorage;
    } catch (error) {
      console.error(`❌ Failed to initialize replica storage ${replicaId}:`, error);
      return null;
    }
  }
  
  // Orchestrate failover between different storage modes
  private async orchestrateFailover(targetMode: StorageMode, trigger: FailoverTrigger, reason: string): Promise<void> {
    const startTime = Date.now();
    const fromMode = this.currentMode;
    
    try {
      console.log(`🔄 Orchestrating failover: ${fromMode} → ${targetMode}`, {
        trigger,
        reason
      });
      
      // Pre-failover validations
      if (fromMode === targetMode) {
        console.log('⚠️ Failover target is same as current mode - skipping');
        return;
      }
      
      // Execute failover based on target mode
      let success = false;
      let newStorage: IStorage | null = null;
      
      switch (targetMode) {
        case StorageMode.DATABASE:
          const dbStorage = await this.getDatabaseStorage();
          if (dbStorage && this.isDatabaseHealthy) {
            newStorage = dbStorage;
            this.isReadOnlyMode = false;
            success = true;
          }
          break;
          
        case StorageMode.REPLICA:
          if (this.activeReplica) {
            const replicaStorage = await this.initializeReplicaStorage(this.activeReplica);
            if (replicaStorage) {
              newStorage = replicaStorage;
              this.isReadOnlyMode = true; // Replicas are read-only
              success = true;
            }
          }
          break;
          
        case StorageMode.READ_ONLY:
          // Use database but in read-only mode
          const readOnlyDbStorage = await this.getDatabaseStorage();
          if (readOnlyDbStorage && this.isDatabaseHealthy) {
            newStorage = readOnlyDbStorage;
            this.isReadOnlyMode = true;
            success = true;
          } else {
            // Fall back to memory if database not available
            newStorage = this.memoryStorage;
            this.isReadOnlyMode = true;
            success = true;
          }
          break;
          
        case StorageMode.MEMORY:
        case StorageMode.MEMORY_OPTIMIZED:
          newStorage = this.memoryStorage;
          this.isReadOnlyMode = false;
          success = true;
          
          if (targetMode === StorageMode.MEMORY_OPTIMIZED) {
            this.isMemoryOptimized = true;
            
            // Clear write queue and stop processing
            if (this.writeQueue.length > 0) {
              console.log(`📝 Clearing ${this.writeQueue.length} queued write operations (memory-optimized mode)`);
              this.writeQueue = [];
            }
            
            if (this.queueProcessingInterval) {
              clearInterval(this.queueProcessingInterval as NodeJS.Timeout);
              this.queueProcessingInterval = null;
            }
            
            this.healthCheckInterval = 120000; // 2 minutes in memory-optimized mode
            this.retryAttempts = 0;
          }
          break;
          
        case StorageMode.HYBRID:
          // Always use memory for reads, database for writes when available
          newStorage = this.memoryStorage;
          this.isReadOnlyMode = false;
          success = true;
          break;
      }
      
      if (success && newStorage) {
        this.currentStorage = newStorage;
        this.currentMode = targetMode;
        
        const latency = Date.now() - startTime;
        
        console.log(`✅ Failover completed: ${fromMode} → ${targetMode} (${latency}ms)`, {
          trigger,
          reason,
          readOnlyMode: this.isReadOnlyMode
        });
        
        // Record successful failover event
        this.recordFailoverEvent({
          fromMode,
          toMode: targetMode,
          trigger,
          reason,
          success: true,
          latency
        });
        
        // Notify disaster recovery coordinator if available
        await this.notifyFailoverEvent({
          fromMode,
          toMode: targetMode,
          trigger,
          reason,
          success: true,
          latency
        });
        
      } else {
        const latency = Date.now() - startTime;
        console.error(`❌ Failover failed: ${fromMode} → ${targetMode}`, {
          trigger,
          reason
        });
        
        // Record failed failover event
        this.recordFailoverEvent({
          fromMode,
          toMode: targetMode,
          trigger,
          reason,
          success: false,
          latency,
          error: 'Target storage not available'
        });
      }
      
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Failover orchestration error: ${fromMode} → ${targetMode}`, {
        error: errorMessage,
        trigger,
        reason
      });
      
      // Record failed failover event
      this.recordFailoverEvent({
        fromMode,
        toMode: targetMode,
        trigger,
        reason,
        success: false,
        latency,
        error: errorMessage
      });
    }
  }
  
  // Record failover event for audit trail
  private recordFailoverEvent(event: Omit<FailoverEvent, 'id' | 'timestamp'>): void {
    const failoverEvent: FailoverEvent = {
      id: `fo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      ...event
    };
    
    this.failoverEvents.push(failoverEvent);
    
    // Keep only the most recent events
    if (this.failoverEvents.length > this.maxFailoverEvents) {
      this.failoverEvents = this.failoverEvents.slice(-this.maxFailoverEvents);
    }
  }
  
  // Notify disaster recovery coordinator of failover event
  private async notifyFailoverEvent(event: Omit<FailoverEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { disasterRecoveryCoordinator } = await import('./services/disaster-recovery-coordinator');
      await disasterRecoveryCoordinator.recordFailoverEvent(event);
    } catch (error) {
      console.log('ℹ️ Could not notify disaster recovery coordinator:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // Clear diagnostic history
  public clearDiagnostics(): void {
    this.connectionDiagnostics = [];
    this.failoverEvents = [];
    console.log('🧹 Cleared connection diagnostics and failover history');
  }

  // IStorage interface implementation - delegate to current storage
  async getElections(filters?: ElectionFilters): Promise<Election[]> {
    return this.currentStorage.getElections(filters);
  }

  async getElection(id: number): Promise<Election | undefined> {
    return this.currentStorage.getElection(id);
  }

  async createElection(election: InsertElection): Promise<Election> {
    if (this.isReadOnlyMode) {
      throw new Error('Cannot perform write operation in read-only mode');
    }
    const result = await this.currentStorage.createElection(election);
    this.queueWriteOperation('createElection', [election]);
    return result;
  }

  async deleteElection(id: number): Promise<void> {
    if (this.isReadOnlyMode) {
      throw new Error('Cannot perform write operation in read-only mode');
    }
    await this.currentStorage.deleteElection(id);
    this.queueWriteOperation('deleteElection', [id]);
  }

  async getCandidatesByElection(electionId: number): Promise<Candidate[]> {
    return this.currentStorage.getCandidatesByElection(electionId);
  }

  async getCandidates(electionId?: number): Promise<Candidate[]> {
    return this.currentStorage.getCandidates(electionId);
  }

  async getCandidatesByIds(ids: number[]): Promise<Candidate[]> {
    return this.currentStorage.getCandidatesByIds(ids);
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    if (this.isReadOnlyMode) {
      throw new Error('Cannot perform write operation in read-only mode');
    }
    const result = await this.currentStorage.createCandidate(candidate);
    this.queueWriteOperation('createCandidate', [candidate]);
    return result;
  }

  async updateCandidatePolling(candidateId: number, pollingData: {
    pollingSupport?: number;
    pollingTrend?: string;
    lastPollingUpdate?: Date;
    pollingSource?: string;
  }): Promise<void> {
    if (this.isReadOnlyMode) {
      throw new Error('Cannot perform write operation in read-only mode');
    }
    await this.currentStorage.updateCandidatePolling(candidateId, pollingData);
    this.queueWriteOperation('updateCandidatePolling', [candidateId, pollingData]);
  }

  async getElectionResults(electionId: number): Promise<any> {
    return this.currentStorage.getElectionResults(electionId);
  }

  async updateElectionResults(electionId: number, resultsData: any): Promise<any> {
    if (this.isReadOnlyMode) {
      throw new Error('Cannot perform write operation in read-only mode');
    }
    const result = await this.currentStorage.updateElectionResults(electionId, resultsData);
    this.queueWriteOperation('updateElectionResults', [electionId, resultsData]);
    return result;
  }

  async getElectionStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    nextElection: Election | null;
  }> {
    return this.currentStorage.getElectionStats();
  }

  async syncElectionsFromGoogleCivic(): Promise<void> {
    return this.currentStorage.syncElectionsFromGoogleCivic();
  }

  async getVoterInfo(address: string): Promise<any> {
    return this.currentStorage.getVoterInfo(address);
  }

  // Congress API methods
  async getAllBills(): Promise<any[]> {
    return this.currentStorage.getAllBills();
  }

  async getBillsByCongress(congress: string): Promise<any[]> {
    return this.currentStorage.getBillsByCongress(congress);
  }

  async getAllMembers(): Promise<any[]> {
    return this.currentStorage.getAllMembers();
  }

  async getAllCongressMembers(): Promise<CongressMember[]> {
    return this.currentStorage.getAllCongressMembers();
  }

  async getMembersByState(state: string): Promise<any[]> {
    return this.currentStorage.getMembersByState(state);
  }

  async getAllCommittees(): Promise<any[]> {
    return this.currentStorage.getAllCommittees();
  }

  async getCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]> {
    return this.currentStorage.getCommitteeMembers(chamber, committeeCode);
  }

  async getDailyCongressionalRecords(): Promise<any[]> {
    return this.currentStorage.getDailyCongressionalRecords();
  }

  async getSenateCommunications(): Promise<any[]> {
    return this.currentStorage.getSenateCommunications();
  }

  async getAllNominations(): Promise<any[]> {
    return this.currentStorage.getAllNominations();
  }

  async getHouseVotes(): Promise<any[]> {
    return this.currentStorage.getHouseVotes();
  }

  // AI Integration
  async searchElectionsWithAI(query: string): Promise<string> {
    return this.currentStorage.searchElectionsWithAI(query);
  }

  async expandElectionData(): Promise<void> {
    return this.currentStorage.expandElectionData();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.currentStorage.getUser(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const result = await this.currentStorage.upsertUser(user);
    this.queueWriteOperation('upsertUser', [user]);
    return result;
  }

  // Watchlist methods
  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    return this.currentStorage.getUserWatchlist(userId);
  }

  async addToWatchlist(userId: string, electionId: number): Promise<WatchlistItem> {
    const result = await this.currentStorage.addToWatchlist(userId, electionId);
    this.queueWriteOperation('addToWatchlist', [userId, electionId]);
    return result;
  }

  async removeFromWatchlist(userId: string, electionId: number): Promise<void> {
    await this.currentStorage.removeFromWatchlist(userId, electionId);
    this.queueWriteOperation('removeFromWatchlist', [userId, electionId]);
  }

  // Version Control & Election Cycles
  async getElectionCycles(): Promise<any[]> {
    return this.currentStorage.getElectionCycles();
  }

  async getElectionCycle(slug: string): Promise<any> {
    return this.currentStorage.getElectionCycle(slug);
  }

  // Analytics
  async logInteraction(data: any): Promise<void> {
    await this.currentStorage.logInteraction(data);
    this.queueWriteOperation('logInteraction', [data]);
  }

  // Candidate Portal methods
  async authenticateCandidate(email: string, password: string): Promise<CandidateAccount | null> {
    return this.currentStorage.authenticateCandidate(email, password);
  }

  async createCandidateAccount(account: InsertCandidateAccount): Promise<CandidateAccount> {
    const result = await this.currentStorage.createCandidateAccount(account);
    this.queueWriteOperation('createCandidateAccount', [account]);
    return result;
  }

  async getCandidateProfile(candidateId: number): Promise<CandidateProfile | null> {
    return this.currentStorage.getCandidateProfile(candidateId);
  }

  async updateCandidateProfile(candidateId: number, profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const result = await this.currentStorage.updateCandidateProfile(candidateId, profile);
    this.queueWriteOperation('updateCandidateProfile', [candidateId, profile]);
    return result;
  }

  async getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]> {
    return this.currentStorage.getCandidateDataSources(candidateId);
  }

  async recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource> {
    const result = await this.currentStorage.recordDataSource(source);
    this.queueWriteOperation('recordDataSource', [source]);
    return result;
  }

  async getCandidateWithRAG(candidateId: number): Promise<any> {
    return this.currentStorage.getCandidateWithRAG(candidateId);
  }

  async recordEngagement(data: any): Promise<void> {
    await this.currentStorage.recordEngagement(data);
    this.queueWriteOperation('recordEngagement', [data]);
  }

  async updateUserPreferences(userId: number, preferences: any): Promise<void> {
    await this.currentStorage.updateUserPreferences(userId, preferences);
    this.queueWriteOperation('updateUserPreferences', [userId, preferences]);
  }

  async updateUserDemographics(userId: number, demographics: any): Promise<void> {
    await this.currentStorage.updateUserDemographics(userId, demographics);
    this.queueWriteOperation('updateUserDemographics', [userId, demographics]);
  }

  async exportUserData(userId: number): Promise<any> {
    return this.currentStorage.exportUserData(userId);
  }

  async deleteUserData(userId: number): Promise<boolean> {
    const result = await this.currentStorage.deleteUserData(userId);
    this.queueWriteOperation('deleteUserData', [userId]);
    return result;
  }

  // Campaign Portal methods
  async createCampaignAccount(data: any): Promise<any> {
    const result = await this.currentStorage.createCampaignAccount(data);
    this.queueWriteOperation('createCampaignAccount', [data]);
    return result;
  }

  async validateCampaignAccess(apiKey: string): Promise<any> {
    return this.currentStorage.validateCampaignAccess(apiKey);
  }

  async getCampaignAnalytics(campaignId: number, electionId: number, tier: string): Promise<any> {
    return this.currentStorage.getCampaignAnalytics(campaignId, electionId, tier);
  }

  async getCampaignGeographics(campaignId: number, region: string, tier: string): Promise<any> {
    return this.currentStorage.getCampaignGeographics(campaignId, region, tier);
  }

  async getCampaignPolling(campaignId: number, electionId: number, dateRange: string): Promise<any> {
    return this.currentStorage.getCampaignPolling(campaignId, electionId, dateRange);
  }

  async purchaseDataExport(campaignId: number, datasetType: string, format?: string): Promise<any> {
    const result = await this.currentStorage.purchaseDataExport(campaignId, datasetType, format);
    this.queueWriteOperation('purchaseDataExport', [campaignId, datasetType, format]);
    return result;
  }

  async getCampaignSubscription(campaignId: number): Promise<any> {
    return this.currentStorage.getCampaignSubscription(campaignId);
  }

  // User Authentication Methods Implementation
  async createUser(email: string, password: string): Promise<any> {
    const result = await this.currentStorage.createUser(email, password);
    this.queueWriteOperation('createUser', [email, password]);
    return result;
  }

  async authenticateUser(email: string, password: string): Promise<any> {
    return this.currentStorage.authenticateUser(email, password);
  }

  async signoutUser(token: string): Promise<void> {
    const result = await this.currentStorage.signoutUser(token);
    this.queueWriteOperation('signoutUser', [token]);
    return result;
  }

  async validateUserSession(token: string): Promise<User | null> {
    return this.currentStorage.validateUserSession(token);
  }

  // Congressional Search & Missing Member Detection
  async searchCongressMembers(searchTerm: string): Promise<CongressMember[]> {
    return this.currentStorage.searchCongressMembers(searchTerm);
  }

  async findMissingCongressMember(): Promise<any> {
    return this.currentStorage.findMissingCongressMember();
  }

  // Disaster Recovery and Backup System Methods
  async getBackupOperations(filters?: { page?: number; limit?: number; status?: string; type?: string }): Promise<any> {
    return this.currentStorage.getBackupOperations(filters);
  }

  async getBackupOperation(id: number): Promise<any> {
    return this.currentStorage.getBackupOperation(id);
  }

  async createBackupOperation(operation: any): Promise<any> {
    const result = await this.currentStorage.createBackupOperation(operation);
    this.queueWriteOperation('createBackupOperation', [operation]);
    return result;
  }

  async updateBackupOperation(operationId: string, updates: any): Promise<any> {
    const result = await this.currentStorage.updateBackupOperation(operationId, updates);
    this.queueWriteOperation('updateBackupOperation', [operationId, updates]);
    return result;
  }

  async getRecentBackupOperations(limit: number): Promise<any[]> {
    return this.currentStorage.getRecentBackupOperations(limit);
  }

  async getBackupRetentionPolicies(): Promise<any[]> {
    return this.currentStorage.getBackupRetentionPolicies();
  }

  async getActiveRetentionPolicies(): Promise<any[]> {
    return this.currentStorage.getActiveRetentionPolicies();
  }

  async createBackupRetentionPolicy(policy: any): Promise<any> {
    const result = await this.currentStorage.createBackupRetentionPolicy(policy);
    this.queueWriteOperation('createBackupRetentionPolicy', [policy]);
    return result;
  }

  async updateBackupRetentionPolicy(id: number, updates: any): Promise<any> {
    const result = await this.currentStorage.updateBackupRetentionPolicy(id, updates);
    this.queueWriteOperation('updateBackupRetentionPolicy', [id, updates]);
    return result;
  }

  async getBackupStorageLocations(): Promise<any[]> {
    return this.currentStorage.getBackupStorageLocations();
  }

  async createBackupStorageLocation(location: any): Promise<any> {
    const result = await this.currentStorage.createBackupStorageLocation(location);
    this.queueWriteOperation('createBackupStorageLocation', [location]);
    return result;
  }

  async updateBackupStorageLocation(id: number, updates: any): Promise<any> {
    const result = await this.currentStorage.updateBackupStorageLocation(id, updates);
    this.queueWriteOperation('updateBackupStorageLocation', [id, updates]);
    return result;
  }

  async getRestoreValidations(filters?: { page?: number; limit?: number; status?: string }): Promise<any> {
    return this.currentStorage.getRestoreValidations(filters);
  }

  async createRestoreValidation(validation: any): Promise<any> {
    const result = await this.currentStorage.createRestoreValidation(validation);
    this.queueWriteOperation('createRestoreValidation', [validation]);
    return result;
  }

  async updateRestoreValidation(validationId: string, updates: any): Promise<any> {
    const result = await this.currentStorage.updateRestoreValidation(validationId, updates);
    this.queueWriteOperation('updateRestoreValidation', [validationId, updates]);
    return result;
  }

  async getRecentRestoreValidations(limit: number): Promise<any[]> {
    return this.currentStorage.getRecentRestoreValidations(limit);
  }

  async getSchemaVersions(): Promise<any[]> {
    return this.currentStorage.getSchemaVersions();
  }

  async getLatestSchemaVersion(): Promise<any> {
    return this.currentStorage.getLatestSchemaVersion();
  }

  async createSchemaVersion(version: any): Promise<any> {
    const result = await this.currentStorage.createSchemaVersion(version);
    this.queueWriteOperation('createSchemaVersion', [version]);
    return result;
  }

  async updateSchemaVersion(id: number, updates: any): Promise<any> {
    const result = await this.currentStorage.updateSchemaVersion(id, updates);
    this.queueWriteOperation('updateSchemaVersion', [id, updates]);
    return result;
  }

  async getBackupSystemConfig(): Promise<any[]> {
    return this.currentStorage.getBackupSystemConfig();
  }

  async setBackupSystemConfig(key: string, value: any): Promise<any> {
    const result = await this.currentStorage.setBackupSystemConfig(key, value);
    this.queueWriteOperation('setBackupSystemConfig', [key, value]);
    return result;
  }

  // Track 3 Platform Continuity Methods
  async getRecentDeployments(limit: number): Promise<any[]> {
    return this.currentStorage.getRecentDeployments(limit);
  }

  async getActiveArtifacts(): Promise<any[]> {
    return this.currentStorage.getActiveArtifacts();
  }

  async getEnvironmentConfigurations(): Promise<any[]> {
    return this.currentStorage.getEnvironmentConfigurations();
  }

  async getRecentPlatformContinuityEvents(limit: number): Promise<any[]> {
    return this.currentStorage.getRecentPlatformContinuityEvents(limit);
  }

  // Event handling for failover integration
  private failoverEventListeners: Array<(event: any) => Promise<void>> = [];
  private healthStatusListeners: Array<(status: any) => Promise<void>> = [];

  /**
   * Register a failover event listener
   */
  public onFailoverEvent(listener: (event: any) => Promise<void>): void {
    this.failoverEventListeners.push(listener);
  }

  /**
   * Register a health status change listener
   */
  public onHealthStatusChange(listener: (status: any) => Promise<void>): void {
    this.healthStatusListeners.push(listener);
  }

  /**
   * Emit a failover event to all listeners
   */
  private async emitFailoverEvent(event: any): Promise<void> {
    for (const listener of this.failoverEventListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Error in failover event listener:', error);
      }
    }
  }

  /**
   * Emit a health status change to all listeners
   */
  private async emitHealthStatusChange(status: any): Promise<void> {
    for (const listener of this.healthStatusListeners) {
      try {
        await listener(status);
      } catch (error) {
        console.error('Error in health status change listener:', error);
      }
    }
  }

  // Cleanup method
  public destroy(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval as any);
      this.queueProcessingInterval = null;
    }
    
    // Clear event listeners
    this.failoverEventListeners = [];
    this.healthStatusListeners = [];
  }
}

// Create global storage factory instance
export const storageFactory = new StorageFactory();