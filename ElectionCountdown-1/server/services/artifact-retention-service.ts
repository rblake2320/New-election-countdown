/**
 * Artifact Retention and Versioning Service
 * Manages application builds, configurations, dependencies with version tracking,
 * rollback capabilities, integrity verification, and automated cleanup
 */

import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { writeFile, readFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import {
  ArtifactStorage,
  InsertArtifactStorage,
  type InsertPlatformContinuityEvents
} from '@shared/schema';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface ArtifactConfig {
  storageBasePath: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  defaultRetentionDays: number;
  maxArtifactSize: number; // bytes
  supportedTypes: string[];
  cleanupSchedule: string; // cron format
}

export interface ArtifactUploadOptions {
  artifactName: string;
  artifactType: 'deployment' | 'configuration' | 'dependency' | 'backup' | 'database_schema' | 'environment_config';
  version: string;
  environment: string;
  data: Buffer | string;
  tags?: string[];
  metadata?: Record<string, any>;
  retentionDays?: number;
  compressionType?: 'gzip' | 'brotli' | 'none';
  encryptionType?: 'aes-256' | 'none';
}

export interface ArtifactVersion {
  id: number;
  version: string;
  contentHash: string;
  size: number;
  createdAt: Date;
  tags: string[];
  metadata: Record<string, any>;
  storageLocation: string;
  isActive: boolean;
}

export interface VersionComparison {
  artifact: string;
  fromVersion: string;
  toVersion: string;
  changes: VersionChange[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackRecommended: boolean;
}

export interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  oldValue?: any;
  newValue?: any;
}

export interface RollbackResult {
  rollbackId: string;
  artifactName: string;
  fromVersion: string;
  toVersion: string;
  success: boolean;
  affectedServices: string[];
  duration: number;
  error?: string;
}

export interface CleanupResult {
  cleanupId: string;
  artifactsScanned: number;
  artifactsDeleted: number;
  spaceSaved: number; // bytes
  errors: string[];
  duration: number;
}

export class ArtifactRetentionService {
  private config: ArtifactConfig;
  private cleanupScheduler: NodeJS.Timeout | null = null;

  constructor(config?: Partial<ArtifactConfig>) {
    this.config = {
      storageBasePath: join(process.cwd(), 'artifacts'),
      compressionEnabled: true,
      encryptionEnabled: false, // Enable when encryption keys available
      defaultRetentionDays: 90,
      maxArtifactSize: 100 * 1024 * 1024, // 100MB
      supportedTypes: ['deployment', 'configuration', 'dependency', 'backup', 'database_schema', 'environment_config'],
      cleanupSchedule: '0 4 * * 0', // Weekly Sunday at 4 AM
      ...config
    };

    this.initializeStorage();
    this.startCleanupScheduler();
    
    console.log('✅ Artifact Retention Service initialized', {
      storageBasePath: this.config.storageBasePath,
      compressionEnabled: this.config.compressionEnabled,
      defaultRetentionDays: this.config.defaultRetentionDays
    });
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    const directories = [
      this.config.storageBasePath,
      join(this.config.storageBasePath, 'deployment'),
      join(this.config.storageBasePath, 'configuration'),
      join(this.config.storageBasePath, 'dependency'),
      join(this.config.storageBasePath, 'backup'),
      join(this.config.storageBasePath, 'database_schema'),
      join(this.config.storageBasePath, 'environment_config'),
      join(this.config.storageBasePath, 'temp')
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Start automated cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (this.cleanupScheduler) {
      clearInterval(this.cleanupScheduler);
    }

    // Run cleanup check every 6 hours
    this.cleanupScheduler = setInterval(async () => {
      await this.performAutomatedCleanup();
    }, 6 * 60 * 60 * 1000); // 6 hours

    console.log('⏰ Artifact cleanup scheduler started');
  }

  /**
   * Store artifact with versioning and integrity verification
   */
  async storeArtifact(options: ArtifactUploadOptions): Promise<{ artifactId: number; contentHash: string; storageLocation: string }> {
    console.log(`📦 Storing artifact: ${options.artifactName} v${options.version}`);

    // Validate artifact type
    if (!this.config.supportedTypes.includes(options.artifactType)) {
      throw new Error(`Unsupported artifact type: ${options.artifactType}`);
    }

    // Convert data to buffer
    const dataBuffer = Buffer.isBuffer(options.data) ? options.data : Buffer.from(options.data);

    // Check size limits
    if (dataBuffer.length > this.config.maxArtifactSize) {
      throw new Error(`Artifact size ${dataBuffer.length} exceeds maximum ${this.config.maxArtifactSize} bytes`);
    }

    // Calculate content hash for integrity
    const contentHash = createHash('sha256').update(dataBuffer).digest('hex');

    // Check for duplicate artifacts
    const { storage } = await import('../storage');
    const existingArtifact = await storage.getArtifactByHash(contentHash);
    if (existingArtifact) {
      console.log(`✅ Artifact already exists with same content: ${existingArtifact.id}`);
      return {
        artifactId: existingArtifact.id,
        contentHash,
        storageLocation: existingArtifact.storageLocation
      };
    }

    // Process data (compression, encryption)
    let processedData = dataBuffer;
    let compressionType = options.compressionType || (this.config.compressionEnabled ? 'gzip' : 'none');
    let encryptionType = options.encryptionType || (this.config.encryptionEnabled ? 'aes-256' : 'none');

    // Apply compression
    if (compressionType === 'gzip') {
      processedData = await gzipAsync(processedData);
      console.log(`🗜️ Compressed artifact: ${dataBuffer.length} → ${processedData.length} bytes`);
    }

    // Generate storage location
    const fileName = `${options.artifactName}-${options.version}-${nanoid(8)}.artifact`;
    const storageLocation = join(this.config.storageBasePath, options.artifactType, fileName);

    // Store file
    await writeFile(storageLocation, processedData);

    // Calculate retention date
    const retentionDays = options.retentionDays || this.config.defaultRetentionDays;
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + retentionDays);

    // Create database record
    const artifact: InsertArtifactStorage = {
      artifactName: options.artifactName,
      artifactType: options.artifactType,
      version: options.version,
      environment: options.environment,
      storageLocation,
      contentHash,
      size: dataBuffer.length, // Original size
      compressionType,
      encryptionType,
      tags: options.tags || [],
      retentionDate,
      metadata: {
        ...options.metadata,
        originalSize: dataBuffer.length,
        compressedSize: processedData.length,
        compressionRatio: dataBuffer.length > 0 ? Math.round((1 - processedData.length / dataBuffer.length) * 100) : 0
      },
      createdBy: 'artifact-retention-service'
    };

    const artifactId = await storage.createArtifact(artifact);

    // Log artifact creation event
    await this.logArtifactEvent(
      'artifact_stored',
      'artifacts',
      'info',
      `Artifact Stored: ${options.artifactName} v${options.version}`,
      `Artifact stored for ${options.environment} environment`,
      { artifactId, artifactType: options.artifactType, size: dataBuffer.length }
    );

    console.log(`✅ Artifact stored: ${artifactId} at ${storageLocation}`);

    return { artifactId: artifactId!, contentHash, storageLocation };
  }

  /**
   * Retrieve artifact by name and version
   */
  async retrieveArtifact(artifactName: string, version: string, environment?: string): Promise<{
    artifact: ArtifactStorage;
    data: Buffer;
  }> {
    console.log(`📥 Retrieving artifact: ${artifactName} v${version}`);

    const { storage } = await import('../storage');
    const artifact = await storage.getArtifactByNameVersion?.(artifactName, version, environment);

    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactName} v${version}`);
    }

    if (!artifact.isActive) {
      throw new Error(`Artifact is inactive: ${artifactName} v${version}`);
    }

    // Read file
    const fileData = await readFile(artifact.storageLocation);

    // Verify integrity
    let processedData = fileData;

    // Decompress if needed
    if (artifact.compressionType === 'gzip') {
      processedData = await gunzipAsync(fileData);
    }

    // Verify content hash
    const contentHash = createHash('sha256').update(processedData).digest('hex');
    if (contentHash !== artifact.contentHash) {
      throw new Error(`Artifact integrity check failed: ${artifactName} v${version}`);
    }

    console.log(`✅ Artifact retrieved and verified: ${artifactName} v${version}`);

    return { artifact, data: processedData };
  }

  /**
   * Get all versions of an artifact
   */
  async getArtifactVersions(artifactName: string, environment?: string): Promise<ArtifactVersion[]> {
    const { storage } = await import('../storage');
    const artifacts = await storage.getArtifactVersions?.(artifactName, environment) || [];

    return artifacts.map(artifact => ({
      id: artifact.id,
      version: artifact.version,
      contentHash: artifact.contentHash,
      size: artifact.size || 0,
      createdAt: new Date(artifact.createdAt),
      tags: artifact.tags || [],
      metadata: artifact.metadata || {},
      storageLocation: artifact.storageLocation,
      isActive: artifact.isActive
    }));
  }

  /**
   * Compare two artifact versions
   */
  async compareVersions(artifactName: string, fromVersion: string, toVersion: string, environment?: string): Promise<VersionComparison> {
    console.log(`🔍 Comparing artifact versions: ${artifactName} ${fromVersion} → ${toVersion}`);

    const fromArtifact = await this.retrieveArtifact(artifactName, fromVersion, environment);
    const toArtifact = await this.retrieveArtifact(artifactName, toVersion, environment);

    // For configuration artifacts, perform detailed comparison
    let changes: VersionChange[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (fromArtifact.artifact.artifactType === 'configuration' || fromArtifact.artifact.artifactType === 'environment_config') {
      try {
        const fromConfig = JSON.parse(fromArtifact.data.toString());
        const toConfig = JSON.parse(toArtifact.data.toString());
        changes = this.compareConfigurationObjects(fromConfig, toConfig);
        riskLevel = this.calculateRiskLevel(changes);
      } catch (error) {
        // If not JSON, compare as text
        changes = [{
          type: 'modified',
          path: artifactName,
          description: 'Binary or text file modified',
          impact: 'medium'
        }];
        riskLevel = 'medium';
      }
    } else {
      // For other types, basic comparison
      const sizeChange = toArtifact.artifact.size! - fromArtifact.artifact.size!;
      changes = [{
        type: 'modified',
        path: artifactName,
        description: `Artifact modified (size change: ${sizeChange > 0 ? '+' : ''}${sizeChange} bytes)`,
        impact: Math.abs(sizeChange) > 1024 * 1024 ? 'high' : 'low' // 1MB threshold
      }];
      riskLevel = Math.abs(sizeChange) > 10 * 1024 * 1024 ? 'high' : 'low'; // 10MB threshold
    }

    const rollbackRecommended = riskLevel === 'high' || riskLevel === 'critical';

    return {
      artifact: artifactName,
      fromVersion,
      toVersion,
      changes,
      riskLevel,
      rollbackRecommended
    };
  }

  /**
   * Compare configuration objects for detailed changes
   */
  private compareConfigurationObjects(from: any, to: any, path: string = ''): VersionChange[] {
    const changes: VersionChange[] = [];

    // Check for removed keys
    for (const key in from) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in to)) {
        changes.push({
          type: 'removed',
          path: currentPath,
          description: `Configuration key removed: ${key}`,
          impact: this.isHighImpactKey(key) ? 'high' : 'medium',
          oldValue: from[key]
        });
      } else if (typeof from[key] === 'object' && typeof to[key] === 'object') {
        changes.push(...this.compareConfigurationObjects(from[key], to[key], currentPath));
      } else if (from[key] !== to[key]) {
        changes.push({
          type: 'modified',
          path: currentPath,
          description: `Configuration value changed: ${key}`,
          impact: this.isHighImpactKey(key) ? 'high' : 'low',
          oldValue: from[key],
          newValue: to[key]
        });
      }
    }

    // Check for added keys
    for (const key in to) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in from)) {
        changes.push({
          type: 'added',
          path: currentPath,
          description: `Configuration key added: ${key}`,
          impact: this.isHighImpactKey(key) ? 'medium' : 'low',
          newValue: to[key]
        });
      }
    }

    return changes;
  }

  /**
   * Determine if a configuration key has high impact
   */
  private isHighImpactKey(key: string): boolean {
    const highImpactKeys = [
      'DATABASE_URL', 'JWT_SECRET', 'API_KEY', 'SECRET', 'PASSWORD', 'TOKEN',
      'ENCRYPTION', 'PRIVATE_KEY', 'AUTH', 'SECURITY'
    ];
    
    return highImpactKeys.some(keyword => 
      key.toUpperCase().includes(keyword)
    );
  }

  /**
   * Calculate risk level based on changes
   */
  private calculateRiskLevel(changes: VersionChange[]): 'low' | 'medium' | 'high' | 'critical' {
    const highImpactChanges = changes.filter(c => c.impact === 'high').length;
    const removedChanges = changes.filter(c => c.type === 'removed').length;
    
    if (highImpactChanges > 3 || removedChanges > 5) return 'critical';
    if (highImpactChanges > 1 || removedChanges > 2) return 'high';
    if (changes.length > 10) return 'medium';
    return 'low';
  }

  /**
   * Rollback to previous artifact version
   */
  async rollbackArtifact(artifactName: string, targetVersion: string, environment: string, affectedServices: string[] = []): Promise<RollbackResult> {
    const rollbackId = nanoid();
    const startTime = Date.now();
    
    console.log(`↩️ Rolling back artifact: ${artifactName} to v${targetVersion}`);

    try {
      // Get current and target versions
      const versions = await this.getArtifactVersions(artifactName, environment);
      const currentVersion = versions.find(v => v.isActive);
      const targetVersionArtifact = versions.find(v => v.version === targetVersion);

      if (!targetVersionArtifact) {
        throw new Error(`Target version not found: ${artifactName} v${targetVersion}`);
      }

      if (!currentVersion) {
        throw new Error(`No current active version found for: ${artifactName}`);
      }

      // Retrieve target artifact to ensure it's accessible
      await this.retrieveArtifact(artifactName, targetVersion, environment);

      // Mark target version as active and current version as inactive
      const { storage } = await import('../storage');
      
      if (storage.updateArtifact) {
        await storage.updateArtifact(targetVersionArtifact.id, { isActive: true });
        await storage.updateArtifact(currentVersion.id, { isActive: false });
      }

      const duration = Date.now() - startTime;

      // Log rollback event
      await this.logArtifactEvent(
        'artifact_rollback',
        'artifacts',
        'warning',
        `Artifact Rollback: ${artifactName}`,
        `Rolled back from v${currentVersion.version} to v${targetVersion}`,
        { rollbackId, fromVersion: currentVersion.version, toVersion: targetVersion, affectedServices }
      );

      console.log(`✅ Artifact rollback completed: ${rollbackId}`);

      return {
        rollbackId,
        artifactName,
        fromVersion: currentVersion.version,
        toVersion: targetVersion,
        success: true,
        affectedServices,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log rollback failure
      await this.logArtifactEvent(
        'artifact_rollback_failed',
        'artifacts',
        'error',
        `Artifact Rollback Failed: ${artifactName}`,
        `Failed to rollback to v${targetVersion}: ${errorMessage}`,
        { rollbackId, error: errorMessage }
      );

      console.error(`❌ Artifact rollback failed: ${rollbackId}`, error);

      return {
        rollbackId,
        artifactName,
        fromVersion: 'unknown',
        toVersion: targetVersion,
        success: false,
        affectedServices,
        duration,
        error: errorMessage
      };
    }
  }

  /**
   * Perform automated cleanup of expired artifacts
   */
  async performAutomatedCleanup(): Promise<CleanupResult> {
    const cleanupId = nanoid();
    const startTime = Date.now();
    
    console.log(`🧹 Starting automated artifact cleanup: ${cleanupId}`);

    const { storage } = await import('../storage');
    const expiredArtifacts = await storage.getExpiredArtifacts?.() || [];
    
    let artifactsDeleted = 0;
    let spaceSaved = 0;
    const errors: string[] = [];

    for (const artifact of expiredArtifacts) {
      try {
        // Check if artifact file exists and get size
        let fileSize = 0;
        if (existsSync(artifact.storageLocation)) {
          const stats = await stat(artifact.storageLocation);
          fileSize = stats.size;
          
          // Delete physical file
          await unlink(artifact.storageLocation);
        }

        // Mark artifact as deleted in database
        if (storage.deleteArtifact) {
          await storage.deleteArtifact(artifact.id);
        }

        artifactsDeleted++;
        spaceSaved += fileSize;
        
        console.log(`🗑️ Deleted expired artifact: ${artifact.artifactName} v${artifact.version}`);

      } catch (error) {
        const errorMsg = `Failed to delete artifact ${artifact.id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    const duration = Date.now() - startTime;

    // Log cleanup event
    await this.logArtifactEvent(
      'artifact_cleanup',
      'artifacts',
      'info',
      `Artifact Cleanup: ${cleanupId}`,
      `Cleaned up ${artifactsDeleted} expired artifacts, saved ${Math.round(spaceSaved / 1024 / 1024)}MB`,
      { cleanupId, artifactsDeleted, spaceSaved, errors: errors.length }
    );

    console.log(`✅ Artifact cleanup completed: ${cleanupId} (${artifactsDeleted} deleted, ${Math.round(spaceSaved / 1024 / 1024)}MB saved)`);

    return {
      cleanupId,
      artifactsScanned: expiredArtifacts.length,
      artifactsDeleted,
      spaceSaved,
      errors,
      duration
    };
  }

  /**
   * Verify integrity of all stored artifacts
   */
  async verifyArtifactIntegrity(): Promise<{
    totalArtifacts: number;
    verifiedArtifacts: number;
    corruptedArtifacts: number;
    missingFiles: number;
    errors: string[];
  }> {
    console.log('🔍 Verifying artifact integrity...');

    const { storage } = await import('../storage');
    const allArtifacts = await storage.getAllArtifacts?.() || [];
    
    let verifiedArtifacts = 0;
    let corruptedArtifacts = 0;
    let missingFiles = 0;
    const errors: string[] = [];

    for (const artifact of allArtifacts) {
      try {
        if (!existsSync(artifact.storageLocation)) {
          missingFiles++;
          errors.push(`Missing file: ${artifact.storageLocation}`);
          continue;
        }

        // Read and verify hash
        const fileData = await readFile(artifact.storageLocation);
        let processedData = fileData;

        // Decompress if needed
        if (artifact.compressionType === 'gzip') {
          processedData = await gunzipAsync(fileData);
        }

        const calculatedHash = createHash('sha256').update(processedData).digest('hex');
        
        if (calculatedHash === artifact.contentHash) {
          verifiedArtifacts++;
        } else {
          corruptedArtifacts++;
          errors.push(`Hash mismatch: ${artifact.artifactName} v${artifact.version}`);
        }

      } catch (error) {
        corruptedArtifacts++;
        const errorMsg = `Verification failed for ${artifact.artifactName} v${artifact.version}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
      }
    }

    console.log(`✅ Integrity verification completed: ${verifiedArtifacts}/${allArtifacts.length} verified`);

    return {
      totalArtifacts: allArtifacts.length,
      verifiedArtifacts,
      corruptedArtifacts,
      missingFiles,
      errors
    };
  }

  /**
   * Get artifact storage statistics
   */
  async getStorageStatistics(): Promise<{
    totalArtifacts: number;
    totalSize: number;
    storageByType: Record<string, { count: number; size: number }>;
    storageByEnvironment: Record<string, { count: number; size: number }>;
    oldestArtifact?: Date;
    newestArtifact?: Date;
  }> {
    const { storage } = await import('../storage');
    const allArtifacts = await storage.getAllArtifacts?.() || [];

    const storageByType: Record<string, { count: number; size: number }> = {};
    const storageByEnvironment: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;

    const dates = allArtifacts.map(a => new Date(a.createdAt)).sort();

    for (const artifact of allArtifacts) {
      const size = artifact.size || 0;
      totalSize += size;

      // By type
      if (!storageByType[artifact.artifactType]) {
        storageByType[artifact.artifactType] = { count: 0, size: 0 };
      }
      storageByType[artifact.artifactType].count++;
      storageByType[artifact.artifactType].size += size;

      // By environment
      if (!storageByEnvironment[artifact.environment]) {
        storageByEnvironment[artifact.environment] = { count: 0, size: 0 };
      }
      storageByEnvironment[artifact.environment].count++;
      storageByEnvironment[artifact.environment].size += size;
    }

    return {
      totalArtifacts: allArtifacts.length,
      totalSize,
      storageByType,
      storageByEnvironment,
      oldestArtifact: dates[0],
      newestArtifact: dates[dates.length - 1]
    };
  }

  /**
   * Log artifact-related events
   */
  private async logArtifactEvent(
    eventType: string,
    category: string,
    severity: string,
    title: string,
    description: string,
    metadata: any
  ): Promise<void> {
    const { storage } = await import('../storage');
    
    const event: InsertPlatformContinuityEvents = {
      eventId: nanoid(),
      eventType,
      category,
      severity,
      status: 'completed',
      title,
      description,
      affectedServices: metadata.affectedServices || ['artifact-storage'],
      initiatedBy: 'artifact-retention-service',
      completedAt: new Date(),
      outcome: severity === 'error' ? 'failure' : 'success',
      metadata
    };

    if (storage.createPlatformContinuityEvent) {
      await storage.createPlatformContinuityEvent(event);
    }
  }

  /**
   * Stop cleanup scheduler
   */
  stop(): void {
    if (this.cleanupScheduler) {
      clearInterval(this.cleanupScheduler);
      this.cleanupScheduler = null;
      console.log('🛑 Artifact cleanup scheduler stopped');
    }
  }
}

// Export singleton instance
export const artifactRetentionService = new ArtifactRetentionService();
export default artifactRetentionService;