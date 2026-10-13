import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const mocked = vi.hoisted(() => ({
  queue: vi.fn().mockResolvedValue('queue-receipt'),
  storage: {
    createIncidentRunbook: vi.fn(), createRunbookStep: vi.fn(),
    getIncidentRunbook: vi.fn(), createRunbookExecution: vi.fn(),
    getRunbookStepsByOrder: vi.fn(), updateRunbookExecution: vi.fn(),
    getFailoverDrillConfiguration: vi.fn(), createDrillExecution: vi.fn(),
    createDrillStep: vi.fn(), updateDrillStep: vi.fn(), updateDrillExecution: vi.fn(),
    getDrillExecution: vi.fn(), createRtoRpoMeasurement: vi.fn(),
    createBackupHealthMetric: vi.fn(), getActiveMonitoringConfigurations: vi.fn(),
    createBackupMonitoringConfiguration: vi.fn(), getActiveBackupAlerts: vi.fn(),
    createBackupAlert: vi.fn(), updateBackupAlert: vi.fn(),
  }
}));
vi.mock('../server/storage', () => ({ storage: mocked.storage }));
vi.mock('../server/services/notification-queue-service', () => ({ notificationQueueService: { queueNotification: mocked.queue } }));

import { S3BackupService } from '../server/services/s3-backup-service';
import { RunbookManagementService } from '../server/services/runbook-management-service';
import { SyntheticDrillService } from '../server/services/synthetic-drill-service';
import { BackupAlertService } from '../server/services/backup-alert-service';
import { BackupMonitoringService } from '../server/services/backup-monitoring-service';

describe('S3 backup stream integrity (local transport fixture)', () => {
  let directory: string;
  let source: string;
  let destination: string;
  let payload = Buffer.alloc(0);
  let metadata: Record<string, string> = {};
  let headMetadata: Record<string, string> | undefined;
  let sends: ReturnType<typeof vi.spyOn>;
  let oldKey: string | undefined;
  const config = { bucket: 'fixture', region: 'us-east-1', accessKeyId: 'fixture', secretAccessKey: 'fixture' };

  beforeEach(async () => {
    oldKey = process.env.BACKUP_ENCRYPTION_KEY;
    process.env.BACKUP_ENCRYPTION_KEY = '17'.repeat(32);
    directory = await mkdtemp(join(tmpdir(), 'et-contract-test-'));
    source = join(directory, 'source.sql');
    destination = join(directory, 'restored.sql');
    await writeFile(source, 'CREATE TABLE fixture(id integer);\n'.repeat(2000));
    payload = Buffer.alloc(0); metadata = {}; headMetadata = undefined;
    sends = vi.spyOn(S3Client.prototype, 'send').mockImplementation(async command => {
      if (command instanceof PutObjectCommand) {
        if (!(command.input.Body instanceof Readable)) throw new Error('Expected readable payload');
        const chunks: Buffer[] = [];
        for await (const chunk of command.input.Body) chunks.push(Buffer.from(chunk));
        payload = Buffer.concat(chunks);
        metadata = Object.fromEntries(Object.entries(command.input.Metadata ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
        return {};
      }
      if (command instanceof HeadObjectCommand) return { ContentLength: payload.length, Metadata: headMetadata ?? metadata };
      if (command instanceof GetObjectCommand) return { Body: Readable.from([payload]), Metadata: metadata };
      throw new Error('Unexpected S3 command');
    });
  });
  afterEach(async () => {
    sends.mockRestore();
    if (oldKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
    else process.env.BACKUP_ENCRYPTION_KEY = oldKey;
    await rm(directory, { recursive: true, force: true });
  });

  it.each([true, false])('round trips real gzip/GCM streams after service restart, compression=%s', async compression => {
    const service = new S3BackupService({ ...config, enableCompression: compression });
    await service.uploadBackup(source, { key: 'fixture', metadata: { checksum: 'forged', encrypted: 'false' } });
    expect(metadata.cipher).toBe('aes-256-gcm-v1');
    expect(metadata.encrypted).toBe('true');
    expect(payload.equals(await readFile(source))).toBe(false);
    const restarted = new S3BackupService({ ...config, enableCompression: compression });
    const result = await restarted.downloadBackup({ key: 'fixture', localPath: destination, verifyChecksum: true });
    expect(result.verified).toBe(true);
    expect((await readFile(destination)).equals(await readFile(source))).toBe(true);
    expect((await readdir(directory)).filter(name => name.startsWith('.backup-restore-'))).toEqual([]);
  });

  it.each([true, false])('uses body-version metadata when stale HEAD describes plaintext, compression=%s', async compression => {
    const service = new S3BackupService({ ...config, enableCompression: compression });
    await service.uploadBackup(source, { key: 'fixture' });
    headMetadata = { encrypted: 'false', compressed: 'false' };
    sends.mockClear();
    await service.downloadBackup({ key: 'fixture', localPath: destination });
    expect((await readFile(destination)).equals(await readFile(source))).toBe(true);
    expect(sends.mock.calls.some(([command]) => command instanceof HeadObjectCommand)).toBe(false);
  });

  it('authenticates ciphertext despite stale plaintext HEAD when checksum is omitted', async () => {
    const service = new S3BackupService({ ...config, enableCompression: false });
    await service.uploadBackup(source, { key: 'fixture' });
    headMetadata = { encrypted: 'false', compressed: 'false' };
    payload[0] ^= 1;
    await writeFile(destination, 'previous verified restore');
    await expect(service.downloadBackup({ key: 'fixture', localPath: destination })).rejects.toThrow();
    expect(await readFile(destination, 'utf8')).toBe('previous verified restore');
  });

  it('refuses ephemeral encryption keys before any upload', async () => {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    const service = new S3BackupService(config);
    await expect(service.uploadBackup(source, { key: 'fixture' })).rejects.toThrow('persistent BACKUP_ENCRYPTION_KEY');
    expect(sends).not.toHaveBeenCalled();
  });

  it.each(['ciphertext', 'checksum', 'missing-checksum', 'legacy'])('preserves existing destination on %s failure', async failure => {
    const service = new S3BackupService(config);
    await service.uploadBackup(source, { key: 'fixture' });
    if (failure === 'ciphertext') payload[0] ^= 1;
    if (failure === 'checksum') metadata.checksum = '0'.repeat(64);
    if (failure === 'missing-checksum') delete metadata.checksum;
    if (failure === 'legacy') delete metadata.cipher;
    await writeFile(destination, 'keep existing restore');
    await expect(service.downloadBackup({ key: 'fixture', localPath: destination, verifyChecksum: true })).rejects.toThrow();
    expect(await readFile(destination, 'utf8')).toBe('keep existing restore');
    expect((await readdir(directory)).filter(name => name.startsWith('.backup-restore-'))).toEqual([]);
  });
});

describe('runbook foreign keys', () => {
  it('uses the natural runbook key for steps and numeric key only for executions', async () => {
    let savedRunbook;
    const steps = [];
    mocked.storage.createIncidentRunbook.mockImplementation(async input => (savedRunbook = { ...input, id: 731 }));
    mocked.storage.createRunbookStep.mockImplementation(async input => {
      if (input.runbookId !== savedRunbook.runbookId) throw new Error('runbook_steps natural FK violation');
      steps.push(input); return input;
    });
    mocked.storage.getIncidentRunbook.mockImplementation(async key => key === savedRunbook.runbookId ? { ...savedRunbook, status: 'published' } : undefined);
    mocked.storage.createRunbookExecution.mockImplementation(async input => {
      if (input.runbookId !== 731) throw new Error('runbook_executions numeric FK violation');
      return { ...input, id: 97 };
    });
    mocked.storage.getRunbookStepsByOrder.mockImplementation(async key => {
      if (key !== savedRunbook.runbookId) throw new Error('wrong step lookup key');
      return steps;
    });
    const service = new RunbookManagementService();
    const runbook = await service.createRunbookFromTemplate('database_outage_response', { createdBy: 'fixture-operator' });
    expect(steps.length).toBeGreaterThan(0);
    const execution = await service.executeRunbook(runbook.runbookId, { executedBy: 'fixture-operator', executionType: 'manual' });
    expect(execution).toBeTruthy();
    expect(mocked.storage.updateRunbookExecution).toHaveBeenCalledWith(execution, expect.objectContaining({ status: 'in_progress' }));
  });
});

describe('operational evidence boundaries', () => {
  const failedEvent = { eventId: 'event-1', eventType: 'backup_failed', backupJobId: 'job-1', backupType: 'full', source: 'fixture', destination: 'fixture', startTime: new Date('2026-01-01T00:00:00Z'), status: 'failed', duration: 2, size: 0 };
  beforeEach(() => {
    mocked.storage.getActiveMonitoringConfigurations.mockResolvedValue([]);
    mocked.storage.getActiveBackupAlerts.mockResolvedValue([]);
    mocked.storage.createBackupAlert.mockImplementation(async input => ({ ...input, id: 1, createdAt: new Date() }));
  });
  it('persists observed event counts, decimal strings, bytes and seconds in existing columns', async () => {
    const service = new BackupAlertService(mocked.storage);
    await service.processBackupEvent(failedEvent);
    expect(mocked.storage.createBackupHealthMetric).toHaveBeenCalledWith(expect.objectContaining({ totalBackups: 1, failedBackups: 1, successfulBackups: 0, successRate: '0', averageBackupDuration: 120, averageBackupSize: 0 }));
    expect(mocked.storage.createBackupHealthMetric.mock.calls[0][0]).not.toHaveProperty('metricValue');
    service.destroy();
  });
  it('queues real email with retry scheduling without claiming it was delivered', async () => {
    mocked.storage.getActiveMonitoringConfigurations.mockResolvedValue([{ id: 2, name: 'fixture', isEnabled: true, monitoringType: 'all_backups', alertChannels: ['email'], alertEmails: ['ops@example.invalid'], alertSeverity: 'critical' }]);
    const service = new BackupAlertService(mocked.storage);
    await service.processBackupEvent(failedEvent);
    expect(mocked.queue).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'ops@example.invalid', maxRetries: 3, scheduledAt: expect.any(Date) }));
    expect(mocked.storage.createBackupAlert).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', title: 'Backup operation failed', alertData: expect.objectContaining({ backupJobId: 'job-1' }) }));
    expect(mocked.storage.updateBackupAlert).not.toHaveBeenCalled();
    service.destroy();
  });
  it('does not inject simulated events into operational health', async () => {
    const service = new BackupAlertService(mocked.storage);
    await expect(service.simulateBackupEvent('backup_completed', 'fixture')).rejects.toThrow('SYNTHETIC_EVENT_DISABLED');
    expect(mocked.storage.createBackupHealthMetric).not.toHaveBeenCalled();
    service.destroy();
  });
  it('refuses unsupported notification channels when saving configuration', async () => {
    const service = new BackupAlertService(mocked.storage);
    await expect(service.createMonitoringConfiguration({ name: 'fixture', monitoringType: 'all_backups', alertChannels: ['webhook'] })).rejects.toThrow('configured email');
    expect(mocked.storage.createBackupMonitoringConfiguration).not.toHaveBeenCalled();
    service.destroy();
  });
  it('does not claim unperformed checksum or corruption verification', async () => {
    const service = new BackupMonitoringService();
    expect(await service['performChecksumValidation']({ id: 1 })).toMatchObject({ passed: false, details: { code: 'VERIFIER_UNAVAILABLE' } });
    expect(await service['performBasicCorruptionScan']({ id: 1 })).toMatchObject({ passed: false, details: { code: 'VERIFIER_UNAVAILABLE' } });
  });
  it('returns an explicit unavailable result for every unimplemented drill operation', async () => {
    const service = new SyntheticDrillService();
    for (const type of ['failover', 'restore', 'validate', 'health_check', 'cleanup']) {
      const result = await service['executeStep']({ id: 'fixture', name: 'fixture', type, expectedDuration: 0 }, {}, {});
      expect(result.success).toBe(false);
      expect(result.code).toBe('DRILL_ADAPTER_UNAVAILABLE');
      expect(result.error).toContain('DRILL_ADAPTER_UNAVAILABLE');
    }
    await expect(service.scheduleDrill(1)).rejects.toThrow('DRILL_ADAPTER_UNAVAILABLE');
    expect(mocked.storage.createRtoRpoMeasurement).not.toHaveBeenCalled();
  });
});

