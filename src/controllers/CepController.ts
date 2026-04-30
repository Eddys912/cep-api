import { Body, Controller, Get, Path, Post, Response, Route, SuccessResponse, Tags } from 'tsoa';
import { z } from 'zod';

import { env } from '@config/env';
import { logger } from '@config/logger';

import { CepErrorResponse, CepResponse, CepStatus, CepStatusResponse } from '@defs/cep.types';
import { CepTypeStatus, FormatType } from '@defs/global.enums';
import { cepFromBatch, cepFromMissing } from '@services/CepService';
import { externalDataService } from '@services/ExternalDataService';
import { getMexicoDateTimeISO } from '@utils/date-yesterday';
import { generateId } from '@utils/id-generator';

// Zod schemas for request validation

const formatSchema = z.enum(FormatType);

const cepBaseSchema = z
  .object({
    email: z.email('email inválido').optional().default(env.CEP_DEFAULT_EMAIL),
    format: formatSchema.optional().default(env.CEP_DEFAULT_FORMAT),
  })
  .superRefine((data, ctx) => {
    const parseResult = formatSchema.safeParse(data.format);
    if (!parseResult.success) {
      ctx.addIssue({
        path: ['format'],
        code: 'custom',
        message: `Formato inválido. Valores permitidos: ${Object.values(FormatType).join(', ')}`,
      });
    }
  });

const generateDateSchema = cepBaseSchema.extend({
  operation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'operation_date must be YYYY-MM-DD'),
});

const generateMissingSchema = cepBaseSchema.extend({
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(1000).default(500),
});

// In-memory job store

const cepStore = new Map<string, CepStatus>();

function createControllerError(
  statusCode: number,
  message: string,
  status?: CepTypeStatus
): { statusCode: number; message: string; status?: CepTypeStatus } {
  return { statusCode, message, status };
}

// Controller

@Route('api/v1/ceps')
@Tags('CEP Banxico')
export class CepController extends Controller {
  /**
   * Health check specific to the CEP subsystem.
   * @summary CEP Health Check
   */
  @Get('/health')
  public getHealth(): { status: 'ok'; timestamp: string; environment: string } {
    return {
      status: 'ok',
      timestamp: getMexicoDateTimeISO(),
      environment: process.env.NODE_ENV ?? 'development',
    };
  }

  /**
   * Generates CEP files from yesterday's data pulled from the external source.
   * @summary Generate CEPs for Yesterday
   */
  @Post('/generate')
  @SuccessResponse('202', 'Job accepted')
  @Response<CepErrorResponse>('400', 'Validation error')
  @Response<CepErrorResponse>('404', 'No records found')
  @Response<CepErrorResponse>('502', 'External API error')
  public async generateFromYesterday(@Body() body: unknown): Promise<CepResponse> {
    const parsed = cepBaseSchema.safeParse(body ?? {});
    if (!parsed.success) {
      this.setStatus(400);
      throw createControllerError(400, parsed.error.issues[0].message);
    }
    const { email, format } = parsed.data;

    logger.info('Solicitando CEPs de ayer');
    const fetchResult = await externalDataService.fetchYesterdayCeps();

    if (!fetchResult.success || !fetchResult.batch) {
      logger.error({ err: fetchResult.error }, 'Fallo al obtener lote de ayer');
      this.setStatus(502);
      throw createControllerError(
        502,
        `Error al obtener datos externos: ${fetchResult.error}`,
        CepTypeStatus.FAILED
      );
    }

    if (fetchResult.batch.total === 0) {
      logger.warn('No se encontraron registros para ayer');
      this.setStatus(404);
      throw createControllerError(
        404,
        'No hay CEPs disponibles para procesar hoy.',
        CepTypeStatus.FAILED
      );
    }

    const batch = fetchResult.batch;
    const dateStr = batch.operationDate || batch.payments[0]?.chain.split(',')[0];
    const cepId = generateId(dateStr);

    const job: CepStatus = {
      cepId,
      status: CepTypeStatus.PENDING,
      createdAt: getMexicoDateTimeISO(),
      email,
      format,
      operationDate: dateStr,
      daysBack: batch.daysBack ?? 1,
    };
    cepStore.set(cepId, job);

    logger.info(
      {
        cepId,
        email,
        total: batch.total,
        operationDate: batch.operationDate,
      },
      'Iniciando trabajo CEP (ayer)'
    );

    cepFromBatch(cepId, cepStore, { email, format, daysBack: batch.daysBack ?? 1 }, batch).catch(
      (err: Error) => {
        logger.error({ cepId, err: err.message }, 'Fallo en procesamiento CEP (ayer)');
        const stored = cepStore.get(cepId);
        if (stored) {
          stored.status = CepTypeStatus.FAILED;
          stored.error = err.message;
          stored.completedAt = getMexicoDateTimeISO();
        }
      }
    );

    this.setStatus(202);
    return {
      cep_id: cepId,
      message: `Trabajo iniciado. Registros: ${batch.payments.length}`,
      status: CepTypeStatus.PENDING,
    };
  }

  /**
   * Generates CEP files for a specific operation date.
   * @summary Generate CEPs for a Specific Date
   */
  @Post('/generate-date')
  @SuccessResponse('202', 'Job accepted')
  @Response<CepErrorResponse>('400', 'Validation error')
  @Response<CepErrorResponse>('404', 'No records found')
  @Response<CepErrorResponse>('502', 'External API error')
  public async generateFromSpecificDate(@Body() body: unknown): Promise<CepResponse> {
    const parsed = generateDateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      this.setStatus(400);
      throw createControllerError(400, parsed.error.issues[0].message);
    }
    const { email, format, operation_date } = parsed.data;

    logger.info({ operationDate: operation_date }, 'Solicitando lote de CEPs por fecha');
    const fetchResult = await externalDataService.fetchCepsBySpecificDate(operation_date);

    if (!fetchResult.success || !fetchResult.batch) {
      logger.error({ err: fetchResult.error }, 'Fallo al obtener datos por fecha');
      this.setStatus(502);
      throw createControllerError(
        502,
        `Error al obtener datos externos: ${fetchResult.error}`,
        CepTypeStatus.FAILED
      );
    }

    const batch = fetchResult.batch;

    if (batch.total === 0) {
      logger.warn({ operationDate: operation_date }, 'Sin registros para la fecha');
      this.setStatus(404);
      throw createControllerError(
        404,
        `No hay registros para operation_date=${operation_date}.`,
        CepTypeStatus.FAILED
      );
    }

    const cepId = generateId(batch.operationDate);
    const job: CepStatus = {
      cepId,
      status: CepTypeStatus.PENDING,
      createdAt: getMexicoDateTimeISO(),
      email,
      format,
      operationDate: batch.operationDate,
      daysBack: batch.daysBack ?? 0,
    };
    cepStore.set(cepId, job);

    logger.info(
      { cepId, email, operationDate: batch.operationDate },
      'Iniciando trabajo CEP (fecha específica)'
    );

    cepFromBatch(cepId, cepStore, { email, format, daysBack: batch.daysBack ?? 0 }, batch).catch(
      (err: Error) => {
        logger.error({ cepId, err: err.message }, 'Fallo en procesamiento CEP (fecha específica)');
        const stored = cepStore.get(cepId);
        if (stored) {
          stored.status = CepTypeStatus.FAILED;
          stored.error = err.message;
          stored.completedAt = getMexicoDateTimeISO();
        }
      }
    );

    this.setStatus(202);
    return {
      cep_id: cepId,
      message: `Trabajo iniciado. Lote: operation_date=${batch.operationDate}, total=${batch.total}`,
      status: CepTypeStatus.PENDING,
    };
  }

  /**
   * Processes a batch of missing CEP records (mismo contrato interno que generate-date: lote + data).
   * @summary Generate Missing CEPs (lote)
   */
  @Post('/generate-missing')
  @SuccessResponse('202', 'Job accepted')
  @Response<CepErrorResponse>('400', 'Validation error')
  @Response<CepErrorResponse>('404', 'No records found')
  @Response<CepErrorResponse>('502', 'External API error')
  public async generateMissing(@Body() body: unknown): Promise<CepResponse> {
    const parsed = generateMissingSchema.safeParse(body ?? {});
    if (!parsed.success) {
      this.setStatus(400);
      throw createControllerError(400, parsed.error.issues[0].message);
    }
    const { email, format, offset, limit } = parsed.data;

    logger.info({ offset, limit }, 'Solicitando lote de CEPs faltantes');
    const fetchResult = await externalDataService.fetchMissingCeps();

    if (!fetchResult.success || !fetchResult.batch) {
      logger.error({ err: fetchResult.error }, 'Fallo al obtener lote de faltantes');
      this.setStatus(502);
      throw createControllerError(
        502,
        `Error al obtener faltantes: ${fetchResult.error}`,
        CepTypeStatus.FAILED
      );
    }

    const batch = fetchResult.batch;

    if (batch.total === 0) {
      logger.warn('Sin registros en el lote de faltantes');
      this.setStatus(404);
      throw createControllerError(
        404,
        'No hay CEPs faltantes disponibles para procesar.',
        CepTypeStatus.FAILED
      );
    }

    const totalAvailable = batch.payments.length;
    const slicedData = batch.payments.slice(offset, offset + limit);

    if (slicedData.length === 0) {
      logger.warn(
        { offset, totalAvailable, reportedTotal: batch.total },
        'Sin registros en el rango offset/limit'
      );
      this.setStatus(404);
      throw createControllerError(
        404,
        `Sin registros en offset=${offset} con limit=${limit}. Total en lote: ${totalAvailable}.`,
        CepTypeStatus.FAILED
      );
    }

    const dateStr = batch.operationDate || slicedData[0]?.chain.split(',')[0];
    const cepId = generateId(dateStr);

    const job: CepStatus = {
      cepId,
      status: CepTypeStatus.PENDING,
      createdAt: getMexicoDateTimeISO(),
      email,
      format,
      operationDate: dateStr,
    };
    cepStore.set(cepId, job);

    logger.info(
      {
        cepId,
        email,
        sliced: slicedData.length,
        totalInBatch: totalAvailable,
        operationDate: batch.operationDate,
      },
      'Iniciando trabajo CEP (lote faltantes)'
    );

    cepFromMissing(cepId, cepStore, { email, format, offset, limit }, slicedData).catch(
      (err: Error) => {
        logger.error({ cepId, err: err.message }, 'Fallo en procesamiento CEP (faltantes)');
        const stored = cepStore.get(cepId);
        if (stored) {
          stored.status = CepTypeStatus.FAILED;
          stored.error = err.message;
          stored.completedAt = getMexicoDateTimeISO();
        }
      }
    );

    this.setStatus(202);
    return {
      cep_id: cepId,
      message: `Trabajo de faltantes iniciado. Offset: ${offset}, Limit: ${limit}, Obtenidos: ${slicedData.length}/${totalAvailable}`,
      status: CepTypeStatus.PENDING,
    };
  }

  /**
   * Returns the current status of a CEP generation job.
   * @summary Get CEP Job Status
   */
  @Get('/status/{cepId}')
  @Response<CepErrorResponse>('404', 'Job not found')
  public getCepStatus(@Path() cepId: string): CepStatusResponse {
    const job = cepStore.get(cepId);
    if (!job) {
      this.setStatus(404);
      throw createControllerError(404, 'Trabajo no encontrado');
    }

    return {
      cep_id: job.cepId,
      status: job.status,
      created_at: job.createdAt,
      completed_at: job.completedAt,
      operation_date: job.operationDate,
      days_back: job.daysBack,
      records_processed: job.recordsProcessed,
      token: job.token,
      error: job.status === CepTypeStatus.FAILED ? job.error : undefined,
      download_available: job.status === CepTypeStatus.COMPLETED && !!job.banxicoResultPath,
    };
  }
}
