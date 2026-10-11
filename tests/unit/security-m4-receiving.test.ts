import { describe, expect, it, vi } from 'vitest';

vi.mock('../../server/storage', () => ({ storage: {} }));
vi.mock('../../server/services/secrets-rotation-service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../server/services/secrets-rotation-service')>();
  return { ...actual, secretsRotationService: new actual.SecretsRotationService({ encryptionKey: '' }) };
});
import router from '../../server/routes/secrets-rotation';

describe('M4 receiving: unavailable vault initialization', () => {
  it('reports configuration refusal rather than successful initialization', async () => {
    const layer = (router as any).stack.find((entry: any) => entry.route?.path === '/initialize');
    const response: any = { statusCode: 200, body: undefined };
    response.status = (code: number) => { response.statusCode = code; return response; };
    response.json = (body: unknown) => { response.body = body; return response; };
    await layer.route.stack[0].handle({}, response, vi.fn());
    expect({ status: response.statusCode, body: response.body }).toEqual({
      status: 503,
      body: {
        error: 'vault_unconfigured',
        message: 'Secrets vault is not configured on this deployment',
        reason: 'BACKUP_ENCRYPTION_KEY is missing or shorter than 32 bytes',
        vault: { ready: false, reason: 'BACKUP_ENCRYPTION_KEY is missing or shorter than 32 bytes' },
      },
    });
  });
});
