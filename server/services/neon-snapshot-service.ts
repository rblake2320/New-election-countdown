/**
 * Neon Snapshot Service
 * Provides automated database snapshots using Neon's Snapshots API
 * Implements point-in-time recovery and configurable retention policies
 */

import {
  BackupOperation,
  InsertBackupOperation,
  BackupRetentionPolicy,
  SchemaVersion,
  InsertSchemaVersion,
  type BackupStorageLocation
} from '@shared/schema';
import { nanoid } from 'nanoid';

export interface NeonSnapshotConfig {
  apiKey: string;
  projectId: string;
  branchId: string;
  baseUrl?: string;
}

export interface SnapshotCreateOptions {
  name?: string;
  expiresAt?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SnapshotInfo {
  id: string;
  name: string;
  branchId: string;
  createdAt: Date;
  expiresAt?: Date;
  size?: number;
  status: 'creating' | 'ready' | 'deleting' | 'deleted' | 'failed';
}

export interface RestoreOptions {
  targetBranchId: string;
  finalizeRestore?: boolean;
  restoreName?: string;
}

export interface RestoreResult {
  success: boolean;
  restoreId?: string;
  branchId?: string;
  error?: string;
  duration?: number;
}

export class NeonSnapshotService {
  private config: NeonSnapshotConfig;
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor(config?: Partial<NeonSnapshotConfig>) {
    const apiKey = config?.apiKey || process.env.NEON_API_KEY;
    const projectId = config?.projectId || process.env.NEON_PROJECT_ID;
    const branchId = config?.branchId || process.env.NEON_BRANCH_ID || 'main';

    if (!apiKey) {
      throw new Error('NEON_API_KEY environment variable is required');
    }
    if (!projectId) {
      throw new Error('NEON_PROJECT_ID environment variable is required');
    }

    this.config = {
      apiKey,
      projectId,
      branchId,
      baseUrl: config?.baseUrl || 'https://console.neon.tech/api/v2'
    };

    this.baseUrl = this.config.baseUrl!;
    this.headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ElectionTracker-DisasterRecovery/1.0'
    };

    console.log('✅ Neon Snapshot Service initialized', {
      projectId: this.config.projectId,
      branchId: this.config.branchId
    });
  }

  /**
   * Create a new database snapshot
   */
  async createSnapshot(options: SnapshotCreateOptions = {}): Promise<{
    snapshot: SnapshotInfo;
    backupOperation: BackupOperation;
  }> {
    const startTime = Date.now();
    const operationId = nanoid();
    
    // Generate snapshot name if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = options.name || `auto-backup-${timestamp}`;

    console.log(`🔄 Creating Neon snapshot: ${snapshotName}`);

    try {
      // Build API request URL
      const url = new URL(
        `/projects/${this.config.projectId}/branches/${this.config.branchId}/snapshot`,
        this.baseUrl
      );
      
      url.searchParams.append('name', snapshotName);
      if (options.expiresAt) {
        url.searchParams.append('expires_at', options.expiresAt.toISOString());
      }

      // Make API request to create snapshot
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neon API error: ${response.status} - ${errorText}`);
      }

      const neonResponse = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`✅ Neon snapshot created successfully`, {
        snapshotId: neonResponse.snapshot?.id,
        duration: `${duration}s`
      });

      // Create snapshot info object
      const snapshot: SnapshotInfo = {
        id: neonResponse.snapshot?.id || nanoid(),
        name: snapshotName,
        branchId: this.config.branchId,
        createdAt: new Date(neonResponse.snapshot?.created_at || new Date()),
        expiresAt: options.expiresAt,
        size: neonResponse.snapshot?.size_bytes,
        status: neonResponse.snapshot?.status || 'creating'
      };

      // Create backup operation record
      const { storage } = await import('../storage');
      const backupOperationData: InsertBackupOperation = {
        operationId,
        type: 'neon_snapshot',
        status: 'completed',
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        sourceDatabase: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
        sourceBranch: this.config.branchId,
        neonSnapshotId: snapshot.id,
        neonBranchId: this.config.branchId,
        neonProjectId: this.config.projectId,
        backupSize: snapshot.size || 0,
        tags: options.tags || ['automated'],
        triggeredBy: 'api',
        metadata: {
          neonResponse,
          snapshotName,
          apiVersion: 'v2',
          ...options.metadata
        }
      };

      const backupOperation = await storage.createBackupOperation(backupOperationData);

      return { snapshot, backupOperation };

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Failed to create Neon snapshot:`, errorMessage);

      // Record failed operation
      try {
        const { storage } = await import('../storage');
        await storage.createBackupOperation({
          operationId,
          type: 'neon_snapshot',
          status: 'failed',
          startedAt: new Date(startTime),
          duration,
          errorMessage,
          sourceBranch: this.config.branchId,
          neonProjectId: this.config.projectId,
          tags: options.tags || ['automated'],
          triggeredBy: 'api',
          metadata: options.metadata || {}
        });
      } catch (recordError) {
        console.error('Failed to record backup operation:', recordError);
      }

      throw new Error(`Snapshot creation failed: ${errorMessage}`);
    }
  }

  /**
   * List available snapshots for the current branch
   */
  async listSnapshots(): Promise<SnapshotInfo[]> {
    try {
      const url = `${this.baseUrl}/projects/${this.config.projectId}/branches/${this.config.branchId}/snapshots`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neon API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return (data.snapshots || []).map((snap: any) => ({
        id: snap.id,
        name: snap.name,
        branchId: snap.branch_id,
        createdAt: new Date(snap.created_at),
        expiresAt: snap.expires_at ? new Date(snap.expires_at) : undefined,
        size: snap.size_bytes,
        status: snap.status
      }));

    } catch (error) {
      console.error('Failed to list snapshots:', error);
      throw error;
    }
  }

  /**
   * Get details of a specific snapshot
   */
  async getSnapshot(snapshotId: string): Promise<SnapshotInfo | null> {
    try {
      const url = `${this.baseUrl}/projects/${this.config.projectId}/snapshots/${snapshotId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neon API error: ${response.status} - ${errorText}`);
      }

      const snap = await response.json();
      
      return {
        id: snap.id,
        name: snap.name,
        branchId: snap.branch_id,
        createdAt: new Date(snap.created_at),
        expiresAt: snap.expires_at ? new Date(snap.expires_at) : undefined,
        size: snap.size_bytes,
        status: snap.status
      };

    } catch (error) {
      console.error(`Failed to get snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * Restore from a snapshot to a target branch
   */
  async restoreSnapshot(snapshotId: string, options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Starting restore from snapshot ${snapshotId}`);

    try {
      const url = `${this.baseUrl}/projects/${this.config.projectId}/snapshots/${snapshotId}/restore`;
      
      const requestBody = {
        target_branch_id: options.targetBranchId,
        finalize_restore: options.finalizeRestore !== false
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neon API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`✅ Snapshot restore completed`, {
        snapshotId,
        targetBranch: options.targetBranchId,
        duration: `${duration}s`
      });

      return {
        success: true,
        restoreId: result.restore_id,
        branchId: result.branch_id || options.targetBranchId,
        duration
      };

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Snapshot restore failed:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/projects/${this.config.projectId}/snapshots/${snapshotId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (response.status === 404) {
        console.warn(`Snapshot ${snapshotId} not found (already deleted?)`);
        return true;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neon API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Snapshot ${snapshotId} deleted successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to delete snapshot ${snapshotId}:`, error);
      return false;
    }
  }

  /**
   * Create scheduled snapshots based on retention policy
   */
  async createScheduledSnapshot(policy: BackupRetentionPolicy): Promise<BackupOperation> {
    const options: SnapshotCreateOptions = {
      name: `${policy.name}-${Date.now()}`,
      tags: ['scheduled', policy.name.toLowerCase().replace(/\s+/g, '-')],
      metadata: {
        policyId: policy.id,
        policyName: policy.name,
        schedule: policy.schedule,
        retentionDays: policy.retentionDays
      }
    };

    // Set expiration based on retention policy
    if (policy.retentionDays && policy.retentionDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);
      options.expiresAt = expirationDate;
    }

    const result = await this.createSnapshot(options);
    return result.backupOperation;
  }

  /**
   * Cleanup expired snapshots based on retention policies
   */
  async cleanupExpiredSnapshots(): Promise<{
    deleted: string[];
    failed: string[];
    total: number;
  }> {
    console.log('🧹 Starting cleanup of expired snapshots');

    try {
      const snapshots = await this.listSnapshots();
      const now = new Date();
      const expiredSnapshots = snapshots.filter(snap => 
        snap.expiresAt && snap.expiresAt <= now && snap.status !== 'deleted'
      );

      console.log(`Found ${expiredSnapshots.length} expired snapshots to clean up`);

      const deleted: string[] = [];
      const failed: string[] = [];

      for (const snapshot of expiredSnapshots) {
        try {
          const success = await this.deleteSnapshot(snapshot.id);
          if (success) {
            deleted.push(snapshot.id);
          } else {
            failed.push(snapshot.id);
          }
        } catch (error) {
          console.error(`Failed to delete snapshot ${snapshot.id}:`, error);
          failed.push(snapshot.id);
        }
      }

      console.log(`✅ Cleanup completed: ${deleted.length} deleted, ${failed.length} failed`);

      return {
        deleted,
        failed,
        total: expiredSnapshots.length
      };

    } catch (error) {
      console.error('Failed to cleanup expired snapshots:', error);
      throw error;
    }
  }

  /**
   * Get service health and configuration status
   */
  async getServiceHealth(): Promise<{
    isHealthy: boolean;
    config: Partial<NeonSnapshotConfig>;
    lastSnapshot?: SnapshotInfo;
    totalSnapshots: number;
    errors?: string[];
  }> {
    const errors: string[] = [];
    let isHealthy = true;
    let totalSnapshots = 0;
    let lastSnapshot: SnapshotInfo | undefined;

    // Check configuration
    if (!this.config.apiKey) {
      errors.push('Missing NEON_API_KEY');
      isHealthy = false;
    }
    if (!this.config.projectId) {
      errors.push('Missing NEON_PROJECT_ID');
      isHealthy = false;
    }

    // Test API connectivity
    try {
      const snapshots = await this.listSnapshots();
      totalSnapshots = snapshots.length;
      lastSnapshot = snapshots.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      )[0];
    } catch (error) {
      errors.push(`API connectivity failed: ${error instanceof Error ? error.message : String(error)}`);
      isHealthy = false;
    }

    return {
      isHealthy,
      config: {
        projectId: this.config.projectId,
        branchId: this.config.branchId,
        baseUrl: this.config.baseUrl
      },
      lastSnapshot,
      totalSnapshots,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
export const neonSnapshotService = new NeonSnapshotService();
export default neonSnapshotService;