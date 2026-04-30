import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

/** HealthController → archivo `health.test.ts` (sin “Controller”). */
describe('GET /health — sistema', () => {
  it('devuelve 200 con status, entorno y marca de tiempo', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      environment: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
