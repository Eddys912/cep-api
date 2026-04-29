import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

/** WebhookController → archivo `webhook.test.ts`. */
describe('webhooks STP', () => {
  it('POST /webhook/aplicarPago — 422 si el body no cumple StpPayload', async () => {
    const res = await request(app).post('/webhook/aplicarPago').send({});

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Validation Failed',
    });
  });

  it('POST /webhook/dzog-capital/payments — 422 si el body no cumple StpPayload', async () => {
    const res = await request(app).post('/webhook/dzog-capital/payments').send({});

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Validation Failed',
    });
  });
});
