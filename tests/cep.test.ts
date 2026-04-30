import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import { externalDataService } from '../src/services/ExternalDataService';
import * as cepService from '../src/services/CepService';

/**
 * CepController — pruebas por ruta. Nombre de archivo = recurso (`cep`), sin sufijo "Controller".
 */
describe('api/v1/ceps — CEP Banxico', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /generate (ayer)', () => {
    it('rechaza email inválido con 400 y JSON', async () => {
      const res = await request(app).post('/api/v1/ceps/generate').send({ email: 'correo-invalido' });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).toMatchObject({
        success: false,
        message: expect.any(String),
        error: expect.any(String),
      });
    });
  });

  describe('POST /generate-date (por fecha)', () => {
    it('acepta lote con registros y responde 202', async () => {
      vi.spyOn(externalDataService, 'fetchCepsBySpecificDate').mockResolvedValue({
        success: true,
        batch: {
          operationDate: '2026-04-28',
          total: 3,
          payments: [
            { chain: '2026-04-28,TRACK001,40012,90646,646180287400072227,2512.50' },
            { chain: '2026-04-28,TRACK002,40012,90646,646180287400072777,4280.67' },
            { chain: '2026-04-28,TRACK003,40012,90646,646180287400040262,31421.11' },
          ],
          daysBack: 0,
        },
      });
      vi.spyOn(cepService, 'cepFromBatch').mockResolvedValue();

      const res = await request(app).post('/api/v1/ceps/generate-date').send({
        operation_date: '2026-04-28',
      });

      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({
        cep_id: expect.any(String),
        status: 'pending',
      });
    });

    it('responde 404 cuando el lote no trae registros', async () => {
      vi.spyOn(externalDataService, 'fetchCepsBySpecificDate').mockResolvedValue({
        success: true,
        batch: {
          operationDate: '2026-04-28',
          total: 0,
          payments: [],
          daysBack: 0,
        },
      });

      const res = await request(app).post('/api/v1/ceps/generate-date').send({
        operation_date: '2026-04-28',
      });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: expect.stringContaining('No hay registros'),
      });
    });
  });

  describe('POST /generate-missing (lote faltantes)', () => {
    it('acepta lote con misma forma que generate-date y responde 202', async () => {
      vi.spyOn(externalDataService, 'fetchMissingCeps').mockResolvedValue({
        success: true,
        batch: {
          operationDate: '2026-04-27',
          total: 2,
          payments: [
            { chain: '2026-04-27,A001,40012,90646,646180287400072227,100.00' },
            { chain: '2026-04-27,A002,40012,90646,646180287400072777,200.00' },
          ],
          daysBack: 0,
        },
      });
      vi.spyOn(cepService, 'cepFromMissing').mockResolvedValue();

      const res = await request(app).post('/api/v1/ceps/generate-missing').send({});

      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({
        cep_id: expect.any(String),
        status: 'pending',
      });
      expect(res.body.message).toMatch(/faltantes|Obtenidos/i);
    });

    it('responde 404 cuando el lote externo está vacío', async () => {
      vi.spyOn(externalDataService, 'fetchMissingCeps').mockResolvedValue({
        success: true,
        batch: {
          operationDate: '',
          total: 0,
          payments: [],
        },
      });

      const res = await request(app).post('/api/v1/ceps/generate-missing').send({});

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: expect.stringContaining('No hay CEPs faltantes'),
      });
    });

    it('responde 404 cuando offset supera el tamaño del lote', async () => {
      vi.spyOn(externalDataService, 'fetchMissingCeps').mockResolvedValue({
        success: true,
        batch: {
          operationDate: '2026-04-27',
          total: 1,
          payments: [{ chain: '2026-04-27,A001,40012,90646,646180287400072227,100.00' }],
        },
      });

      const res = await request(app)
        .post('/api/v1/ceps/generate-missing')
        .send({ offset: 10, limit: 10 });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('offset=10');
    });
  });

  describe('GET /health y /status/:cepId', () => {
    it('devuelve health del módulo CEP', async () => {
      const res = await request(app).get('/api/v1/ceps/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        environment: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('devuelve 404 si el cepId no existe', async () => {
      const res = await request(app).get('/api/v1/ceps/status/no-existe');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Trabajo no encontrado',
      });
    });
  });
});
