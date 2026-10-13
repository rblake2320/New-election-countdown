import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const store = vi.hoisted(() => ({
  getBackupMonitoringConfiguration: vi.fn(),
  updateBackupMonitoringConfiguration: vi.fn(),
  createBackupMonitoringConfiguration: vi.fn(),
}));
vi.mock('../server/storage', () => ({ storage: store }));
vi.mock('../server/auth', () => ({ isAuthenticated: (_req, _res, next) => next() }));
vi.mock('../server/services/notification-queue-service', () => ({ notificationQueueService: { queueNotification: vi.fn() } }));
import router from '../server/routes/track4-backup-routes';

const app = express();
app.use(express.json());
app.use('/backup', router);
const base = { id: 31, name: 'fixture', monitoringType: 'all_backups', alertChannels: ['dashboard'], alertEmails: [], isEnabled: true };

describe('backup configuration merged contract', () => {
  beforeEach(() => {
    store.getBackupMonitoringConfiguration.mockResolvedValue({ ...base });
    store.updateBackupMonitoringConfiguration.mockImplementation(async (id, patch) => ({ ...base, ...patch, id }));
    store.createBackupMonitoringConfiguration.mockImplementation(async value => ({ ...value, id: 31 }));
  });

  it('rejects enabling email without recipients inherited from the existing configuration', async () => {
    const response = await request(app).put('/backup/monitoring/configurations/31').send({ alertChannels: ['email'] });
    expect(response.status).toBe(400);
    expect(store.updateBackupMonitoringConfiguration).not.toHaveBeenCalled();
  });

  it('rejects removing all recipients while the existing configuration still enables email', async () => {
    store.getBackupMonitoringConfiguration.mockResolvedValue({ ...base, alertChannels: ['email'], alertEmails: ['ops@example.invalid'] });
    const response = await request(app).put('/backup/monitoring/configurations/31').send({ alertEmails: [] });
    expect(response.status).toBe(400);
    expect(store.updateBackupMonitoringConfiguration).not.toHaveBeenCalled();
  });

  it('keeps POST and PUT contract violations as client errors', async () => {
    const response = await request(app).post('/backup/monitoring/configurations').send({ name: 'fixture', monitoringType: 'all_backups', alertChannels: ['email'] });
    expect(response.status).toBe(400);
    expect(store.createBackupMonitoringConfiguration).not.toHaveBeenCalled();
  });

  it('allows a valid email transition using inherited recipients', async () => {
    store.getBackupMonitoringConfiguration.mockResolvedValue({ ...base, alertEmails: ['ops@example.invalid'] });
    const response = await request(app).put('/backup/monitoring/configurations/31').send({ alertChannels: ['email'] });
    expect(response.status).toBe(200);
    expect(store.updateBackupMonitoringConfiguration).toHaveBeenCalledWith(31, { alertChannels: ['email'] });
  });

  it('returns404 without writing when the update target does not exist', async () => {
    store.getBackupMonitoringConfiguration.mockResolvedValue(undefined);
    const response = await request(app).put('/backup/monitoring/configurations/31').send({ name: 'renamed' });
    expect(response.status).toBe(404);
    expect(store.updateBackupMonitoringConfiguration).not.toHaveBeenCalled();
  });
});
