import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const mocks = vi.hoisted(() => ({ execFile: vi.fn(), execute: vi.fn() }));
vi.mock('child_process', () => ({ execFile: mocks.execFile, default: { execFile: mocks.execFile } }));
vi.mock('../../server/db', () => ({ db: { execute: mocks.execute } }));
import { BackupService } from '../../server/backup-service';

describe('backup child-process and error boundary', () => {
  let directory: string;
  let service: BackupService;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'et-backup-contract-'));
    service = new BackupService();
    Object.assign((service as any).config, { backupPath: directory });
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/backup_contract?sslmode=require');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.execFile.mockReset();
    mocks.execute.mockReset();
    mocks.execFile.mockImplementation((_command, args, _options, callback) => {
      writeFileSync(args[args.indexOf('--file') + 1], 'ordinary dump fixture');
      callback(null, '', '');
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  it('passes only fixed arguments and process-local connection fields, then publishes a gzip file', async () => {
    const result = await service.createFullBackup();
    const [command, args, options] = mocks.execFile.mock.calls[0];
    expect(command).toBe('pg_dump');
    expect(args).toEqual(['--no-password', '--format=custom', '--file', expect.stringContaining(directory)]);
    expect(JSON.stringify(args)).not.toContain('postgresql:');
    expect(options).toMatchObject({ shell: false, windowsHide: true, timeout: 1800000 });
    expect(options.env).toMatchObject({ PGHOST: 'localhost', PGPORT: '5432', PGDATABASE: 'backup_contract', PGSSLMODE: 'require' });
    expect(options.env).not.toHaveProperty('DATABASE_URL');
    expect(options.env).not.toHaveProperty('JWT_SECRET');
    expect(gunzipSync(await readFile(result)).toString()).toBe('ordinary dump fixture');
    expect(await readdir(directory)).toEqual([result.slice(directory.length + 1)]);
    const status = await service.getBackupStatus();
    expect(status.totalBackups).toBe(1);
    expect(status.lastBackup).toBe(result.slice(directory.length + 1));
    expect(mocks.execFile).toHaveBeenCalledTimes(1);
  });

  it('publishes an uncompressed custom dump when compression is disabled', async () => {
    Object.assign((service as any).config, { compressionEnabled: false });
    const result = await service.createFullBackup();
    expect(result.endsWith('.sql')).toBe(true);
    expect(await readFile(result, 'utf8')).toBe('ordinary dump fixture');
  });

  it('redacts child errors and removes incomplete files', async () => {
    mocks.execFile.mockImplementation((_command, args, _options, callback) => {
      writeFileSync(args[args.indexOf('--file') + 1], 'incomplete dump fixture');
      callback(Object.assign(new Error('internal connection diagnostic'), { stderr: 'internal stderr diagnostic' }), '', '');
    });
    await expect(service.createFullBackup()).rejects.toThrow('Full database backup failed');
    expect(console.error).toHaveBeenCalledWith('Full database backup failed');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('internal');
    expect(await readdir(directory)).toEqual([]);
  });

  it('refuses missing database configuration without starting a child', async () => {
    vi.stubEnv('DATABASE_URL', '');
    await expect(service.createFullBackup()).rejects.toThrow('Full database backup failed');
    expect(mocks.execFile).not.toHaveBeenCalled();
  });

  it('refuses unsupported connection options instead of silently dropping them', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/backup_contract?unsupported=setting');
    await expect(service.createFullBackup()).rejects.toThrow('Full database backup failed');
    expect(mocks.execFile).not.toHaveBeenCalled();
  });

  it('reports only completed backup files without using a shell', async () => {
    await writeFile(join(directory, 'unfinished.sql.partial'), 'partial fixture');
    await writeFile(join(directory, 'completed.json'), '{}');
    const status = await service.getBackupStatus();
    expect(status.totalBackups).toBe(1);
    expect(status.lastBackup).toBe('completed.json');
    expect(mocks.execFile).not.toHaveBeenCalled();
  });

  it('keeps database export diagnostics out of public errors and logs', async () => {
    mocks.execute.mockRejectedValue(new Error('internal database diagnostic'));
    await expect(service.backupUserData()).rejects.toThrow('User data backup failed');
    expect(console.error).toHaveBeenCalledWith('User data backup failed');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('internal');
  });
});
