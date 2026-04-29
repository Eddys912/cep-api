import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

/** Pruebas transversales de la app (no ligadas a un solo controlador). */
describe('app — e2e', () => {
  it('ruta inexistente devuelve JSON 404', async () => {
    const res = await request(app).get('/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not Found' });
  });

  it('GET / redirige a documentación OpenAPI', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/docs');
  });
});
