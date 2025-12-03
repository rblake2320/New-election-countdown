/**
 * S3 Backup Service
 * Provides encrypted offsite storage for database backups using AWS S3
 * Supports multiple storage classes and configurable retention policies
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, createWriteStream, stat } from 'fs';
import { promisify } from 'util';
import { createHash, createCipher, createDecipher, randomBytes } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { pipeline } from 'stream';
import { nanoid } from 'nanoid';
import {
  BackupOperation,
  InsertBackupOperation,
  BackupStorageLocation,
  type InsertBackupStorageLocation
} from '@shared/schema';

const statAsync = promisify(stat);
const pipelineAsync = promisify(pipeline);
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface S3BackupConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  storageClass?: 'STANDARD' | 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  enableEncryption?: boolean;
  encryptionMethod?: 'AES256' | 'aws:kms';
  kmsKeyId?: string;
  enableCompression?: boolean;
}

export interface UploadOptions {
  key: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  storageClass?: string;
  serverSideEncryption?: boolean;
  contentType?: string;
}

export interface DownloadOptions {
  key: string;
  localPath: string;
  verifyChecksum?: boolean;
}

export interface BackupFileInfo {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass: string;
  metadata: Record<string, string>;
  url?: string;
}

export interface RetentionPolicy {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  retentionDays: number;
  storageClass?: string;
}

export class S3BackupService {
  private s3Client: S3Client;
  private config: S3BackupConfig;
  private encryptionKey: Buffer;

  constructor(config: S3BackupConfig) {
    this.config = {
      enableEncryption: true,
      encryptionMethod: 'AES256',
      enableCompression: true,
      storageClass: 'STANDARD',
      ...config
    };

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: !!this.config.endpoint, // Required for custom endpoints
    });

    // Generate or retrieve encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();

    console.log('✅ S3 Backup Service initialized', {
      region: this.config.region,
      bucket: this.config.bucket,
      endpoint: this.config.endpoint || 'AWS S3',
      encryption: this.config.enableEncryption,
      compression: this.config.enableCompression
    });
  }

  /**
   * Upload a backup file to S3 with optional encryption and compression
   */
  async uploadBackup(
    filePath: string,
    options: UploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<{
    key: string;
    url: string;
    size: number;
    checksum: string;
    uploadId?: string;
  }> {
    const startTime = Date.now();
    console.log(`🔄 Uploading backup to S3: ${options.key}`);

    try {
      // Get file stats
      const fileStats = await statAsync(filePath);
      const originalSize = fileStats.size;

      // Prepare the upload stream
      let uploadStream = createReadStream(filePath);
      let finalSize = originalSize;
      let checksum = await this.calculateFileChecksum(filePath);

      // Apply compression if enabled
      if (this.config.enableCompression) {
        const gzipStream = gzip();
        uploadStream = uploadStream.pipe(gzipStream);
        
        // For compressed files, we'll calculate size during upload
        finalSize = 0; // Will be updated during upload
      }

      // Apply encryption if enabled
      if (this.config.enableEncryption && this.config.encryptionMethod === 'AES256') {
        const cipher = createCipher('aes-256-cbc', this.encryptionKey);
        uploadStream = uploadStream.pipe(cipher);
      }

      // Prepare upload parameters
      const uploadParams = {
        Bucket: this.config.bucket,
        Key: options.key,
        Body: uploadStream,
        ContentType: options.contentType || 'application/octet-stream',
        StorageClass: options.storageClass || this.config.storageClass,
        Metadata: {
          originalSize: originalSize.toString(),
          compressed: this.config.enableCompression ? 'true' : 'false',
          encrypted: this.config.enableEncryption ? 'true' : 'false',
          checksum: checksum,
          uploadedAt: new Date().toISOString(),
          ...options.metadata
        },
        ...(this.config.encryptionMethod === 'aws:kms' && {
          ServerSideEncryption: 'aws:kms',
          SSEKMSKeyId: this.config.kmsKeyId
        }),
        ...(options.tags && {
          Tagging: Object.entries(options.tags)
            .map(([key, value]) => `${key}=${value}`)
            .join('&')
        })
      };

      // Use multipart upload for large files (>100MB)
      if (originalSize > 100 * 1024 * 1024) {
        const upload = new Upload({
          client: this.s3Client,
          params: uploadParams,
        });

        // Track progress if callback provided
        if (onProgress) {
          upload.on('httpUploadProgress', (progress) => {
            const percentage = Math.round((progress.loaded || 0) / (progress.total || 1) * 100);
            onProgress(percentage);
          });
        }

        const result = await upload.done();
        finalSize = result.Location ? originalSize : finalSize; // Fallback to original size
      } else {
        // Simple upload for smaller files
        const command = new PutObjectCommand(uploadParams);
        await this.s3Client.send(command);
      }

      // Get the actual uploaded size and generate URL
      const headResult = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: options.key
      }));

      finalSize = headResult.ContentLength || finalSize;
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`✅ S3 upload completed`, {
        key: options.key,
        originalSize: `${Math.round(originalSize / 1024 / 1024)}MB`,
        uploadedSize: `${Math.round(finalSize / 1024 / 1024)}MB`,
        compressionRatio: this.config.enableCompression 
          ? `${Math.round((1 - finalSize / originalSize) * 100)}%` 
          : 'N/A',
        duration: `${duration}s`
      });

      return {
        key: options.key,
        url: `s3://${this.config.bucket}/${options.key}`,
        size: finalSize,
        checksum,
        uploadId: undefined // For multipart uploads, this would contain the upload ID
      };

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.error(`❌ S3 upload failed after ${duration}s:`, error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download and verify a backup file from S3
   */
  async downloadBackup(options: DownloadOptions): Promise<{
    localPath: string;
    size: number;
    checksum: string;
    verified: boolean;
  }> {
    const startTime = Date.now();
    console.log(`🔄 Downloading backup from S3: ${options.key}`);

    try {
      // Get object metadata first
      const headResult = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: options.key
      }));

      const metadata = headResult.Metadata || {};
      const originalChecksum = metadata.checksum;
      const isCompressed = metadata.compressed === 'true';
      const isEncrypted = metadata.encrypted === 'true';

      // Download the object
      const getCommand = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: options.key
      });

      const response = await this.s3Client.send(getCommand);
      
      if (!response.Body) {
        throw new Error('No data received from S3');
      }

      // Create the download stream pipeline
      let downloadStream = response.Body as NodeJS.ReadableStream;
      
      // Apply decryption if needed
      if (isEncrypted && this.config.enableEncryption) {
        const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
        downloadStream = downloadStream.pipe(decipher);
      }

      // Apply decompression if needed
      if (isCompressed) {
        const gunzipStream = gunzip();
        downloadStream = downloadStream.pipe(gunzipStream);
      }

      // Write to local file
      const writeStream = createWriteStream(options.localPath);
      await pipelineAsync(downloadStream, writeStream);

      // Get final file stats
      const finalStats = await statAsync(options.localPath);
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Verify checksum if requested and available
      let verified = false;
      let actualChecksum = '';
      
      if (options.verifyChecksum && originalChecksum) {
        actualChecksum = await this.calculateFileChecksum(options.localPath);
        verified = actualChecksum === originalChecksum;
        
        if (!verified) {
          console.warn(`⚠️ Checksum verification failed for ${options.key}`);
        }
      }

      console.log(`✅ S3 download completed`, {
        key: options.key,
        localPath: options.localPath,
        size: `${Math.round(finalStats.size / 1024 / 1024)}MB`,
        verified: verified ? '✓' : originalChecksum ? '✗' : 'N/A',
        duration: `${duration}s`
      });

      return {
        localPath: options.localPath,
        size: finalStats.size,
        checksum: actualChecksum,
        verified
      };

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.error(`❌ S3 download failed after ${duration}s:`, error);
      throw new Error(`S3 download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List backup files in S3 bucket with filtering
   */
  async listBackups(prefix?: string, maxKeys?: number): Promise<BackupFileInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys || 1000
      });

      const response = await this.s3Client.send(command);
      const objects = response.Contents || [];

      return objects
        .filter(obj => obj.Key && obj.Size !== undefined)
        .map(obj => ({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified || new Date(),
          etag: obj.ETag || '',
          storageClass: obj.StorageClass || 'STANDARD',
          metadata: {} // Would need separate HeadObject call to get metadata
        }));

    } catch (error) {
      console.error('Failed to list S3 backups:', error);
      throw error;
    }
  }

  /**
   * Delete a backup file from S3
   */
  async deleteBackup(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      console.log(`✅ Deleted backup from S3: ${key}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete S3 backup ${key}:`, error);
      return false;
    }
  }

  /**
   * Generate a presigned URL for backup access
   */
  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });

    } catch (error) {
      console.error(`Failed to generate presigned URL for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Apply retention policy and cleanup old backups
   */
  async applyRetentionPolicy(retentionPolicy: RetentionPolicy): Promise<{
    deleted: string[];
    retained: string[];
    errors: string[];
  }> {
    console.log(`🧹 Applying retention policy: ${retentionPolicy.type} (${retentionPolicy.retentionDays} days)`);

    try {
      const allBackups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionPolicy.retentionDays);

      const backupsToDelete = allBackups.filter(backup => 
        backup.lastModified < cutoffDate
      );

      const deleted: string[] = [];
      const retained: string[] = [];
      const errors: string[] = [];

      // Delete expired backups
      for (const backup of backupsToDelete) {
        try {
          const success = await this.deleteBackup(backup.key);
          if (success) {
            deleted.push(backup.key);
          } else {
            errors.push(`Failed to delete ${backup.key}`);
          }
        } catch (error) {
          errors.push(`Error deleting ${backup.key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Track retained backups
      retained.push(...allBackups
        .filter(backup => backup.lastModified >= cutoffDate)
        .map(backup => backup.key)
      );

      console.log(`✅ Retention policy applied: ${deleted.length} deleted, ${retained.length} retained, ${errors.length} errors`);

      return { deleted, retained, errors };

    } catch (error) {
      console.error('Failed to apply retention policy:', error);
      throw error;
    }
  }

  /**
   * Get service health and connectivity status
   */
  async getServiceHealth(): Promise<{
    isHealthy: boolean;
    bucket: string;
    region: string;
    totalObjects?: number;
    totalSize?: number;
    errors?: string[];
  }> {
    const errors: string[] = [];
    let isHealthy = true;
    let totalObjects = 0;
    let totalSize = 0;

    try {
      // Test bucket access by listing objects
      const objects = await this.listBackups('', 1);
      
      // Get bucket statistics
      const allObjects = await this.listBackups();
      totalObjects = allObjects.length;
      totalSize = allObjects.reduce((sum, obj) => sum + obj.size, 0);

    } catch (error) {
      errors.push(`Bucket access failed: ${error instanceof Error ? error.message : String(error)}`);
      isHealthy = false;
    }

    return {
      isHealthy,
      bucket: this.config.bucket,
      region: this.config.region,
      totalObjects,
      totalSize,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Calculate SHA256 checksum of a file
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      
      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Get or create encryption key for local file encryption
   */
  private getOrCreateEncryptionKey(): Buffer {
    // In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
    const keyEnvVar = process.env.BACKUP_ENCRYPTION_KEY;
    
    if (keyEnvVar) {
      return Buffer.from(keyEnvVar, 'hex');
    }

    // Generate a random key (THIS IS NOT SECURE FOR PRODUCTION)
    console.warn('⚠️ Using randomly generated encryption key - not secure for production!');
    return randomBytes(32);
  }

  /**
   * Test bucket connectivity and permissions
   */
  async testConnection(): Promise<{
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let canRead = false;
    let canWrite = false;
    let canDelete = false;

    const testKey = `test-${nanoid()}.txt`;
    const testContent = 'S3 backup service test file';

    try {
      // Test write permission
      const putCommand = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: testKey,
        Body: testContent,
        Metadata: { test: 'true' }
      });
      await this.s3Client.send(putCommand);
      canWrite = true;

      // Test read permission
      const getCommand = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: testKey
      });
      const response = await this.s3Client.send(getCommand);
      if (response.Body) {
        canRead = true;
      }

      // Test delete permission
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: testKey
      });
      await this.s3Client.send(deleteCommand);
      canDelete = true;

    } catch (error) {
      errors.push(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { canRead, canWrite, canDelete, errors };
  }
}

/**
 * Factory function to create S3 backup service from storage location config
 */
export function createS3BackupService(storageLocation: BackupStorageLocation): S3BackupService {
  if (storageLocation.type !== 's3') {
    throw new Error(`Invalid storage type: ${storageLocation.type}. Expected 's3'.`);
  }

  const config: S3BackupConfig = {
    region: storageLocation.region || 'us-east-1',
    bucket: storageLocation.bucket!,
    accessKeyId: storageLocation.accessKeyId!,
    secretAccessKey: process.env[`${storageLocation.name.toUpperCase()}_SECRET_KEY`] || '',
    endpoint: storageLocation.endpoint || undefined,
    enableEncryption: storageLocation.isEncrypted,
    encryptionMethod: storageLocation.encryptionMethod as any || 'AES256'
  };

  return new S3BackupService(config);
}

export default S3BackupService;