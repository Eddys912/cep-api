import { env } from '@config/env';
import { logger } from '@config/logger';

import { extractChainFromExternalItem } from '@utils/cep-chain-parser';
import { getYesterdayDate } from '@utils/date-yesterday';

import { CepChainItem, ExternalBatchResponse, InternalCepBatch } from '@defs/cep.types';
import axios from 'axios';

export class ExternalDataService {
  private readonly EXTERNAL_URL = env.CEP_EXTERNAL_API_URL;
  private readonly EXTERNAL_MISSING_URL = env.CEP_EXTERNAL_API_URL_MISSING;

  private getRequestHeaders(): Record<string, string> | undefined {
    if (!env.CEP_EXTERNAL_API_KEY) {
      return undefined;
    }
    return {
      'x-api-key': env.CEP_EXTERNAL_API_KEY,
    };
  }

  private mapDataRowsToChainItems(rows: unknown[]): CepChainItem[] {
    const out: CepChainItem[] = [];
    for (const row of rows) {
      const chain = extractChainFromExternalItem(row);
      if (chain) {
        out.push({ chain });
      }
    }
    return out;
  }

  private mapExternalBatchToInternal(batch: {
    fecha_operacion: string;
    total: number;
    numero_dias_atras?: number;
    data: unknown[];
  }): InternalCepBatch {
    const payments = this.mapDataRowsToChainItems(batch.data);
    return {
      operationDate: batch.fecha_operacion,
      total: typeof batch.total === 'number' ? batch.total : payments.length,
      payments,
      daysBack: batch.numero_dias_atras,
    };
  }

  /**
   * Fetches data from the external endpoint for yesterday
   */
  async fetchYesterdayCeps(): Promise<{
    success: boolean;
    batch?: InternalCepBatch;
    error?: string;
  }> {
    const operationDate = getYesterdayDate();
    try {
      logger.info(
        { operationDate, timezone: 'America/Mexico_City' },
        'Requesting yesterday CEP batch from external service'
      );
      const response = await axios.post(
        this.EXTERNAL_URL,
        { fecha_operacion: operationDate },
        { headers: this.getRequestHeaders() }
      );

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid data format from external endpoint');
      }

      const raw = response.data as Partial<ExternalBatchResponse>;
      const mapped = this.mapExternalBatchToInternal({
        fecha_operacion: raw.fecha_operacion ?? operationDate,
        total: typeof raw.total === 'number' ? raw.total : response.data.data.length,
        numero_dias_atras: typeof raw.numero_dias_atras === 'number' ? raw.numero_dias_atras : 1,
        data: response.data.data,
      });

      logger.info(
        { total: mapped.total, operationDate: mapped.operationDate },
        'External CEP request succeeded'
      );
      return {
        success: true,
        batch: mapped,
      };
    } catch (error) {
      try {
        logger.warn(
          { operationDate },
          'POST fetch for yesterday failed, retrying with legacy GET endpoint behavior'
        );
        const response = await axios.get(this.EXTERNAL_URL, {
          headers: this.getRequestHeaders(),
        });

        if (!response.data || !Array.isArray(response.data.data)) {
          throw new Error('Invalid data format from external endpoint');
        }

        const raw = response.data as Partial<ExternalBatchResponse>;
        const mapped = this.mapExternalBatchToInternal({
          fecha_operacion: raw.fecha_operacion ?? operationDate,
          total: typeof raw.total === 'number' ? raw.total : response.data.data.length,
          numero_dias_atras: typeof raw.numero_dias_atras === 'number' ? raw.numero_dias_atras : 1,
          data: response.data.data,
        });
        logger.info(
          { total: mapped.total, operationDate: mapped.operationDate },
          'External CEP request succeeded via fallback GET'
        );
        return {
          success: true,
          batch: mapped,
        };
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        logger.error({ error: message, operationDate }, 'External CEP request failed');
        return {
          success: false,
          error: message,
        };
      }
    }
  }

  /**
   * Fetches CEP batch data from the external API by number of days back.
   * @param {number} daysBack - Number of days back to query
   */
  async fetchCepsByDays(daysBack: number): Promise<{
    success: boolean;
    batch?: InternalCepBatch;
    error?: string;
  }> {
    try {
      logger.info({ daysBack }, 'Requesting CEP batch by days from external service');

      const response = await axios.post(
        this.EXTERNAL_URL,
        {
          numero_dias_atras: daysBack,
        },
        {
          headers: this.getRequestHeaders(),
        }
      );

      const batchData = response.data as ExternalBatchResponse;

      if (!batchData.data || !Array.isArray(batchData.data)) {
        throw new Error('Invalid batch data format from external endpoint');
      }

      return {
        success: true,
        batch: this.mapExternalBatchToInternal(batchData),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message, daysBack }, 'External CEP-by-days request failed');
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Fetches CEP batch data from the external API by specific date.
   * @param {string} operationDate - Specific date to query (YYYY-MM-DD)
   */
  async fetchCepsBySpecificDate(operationDate: string): Promise<{
    success: boolean;
    batch?: InternalCepBatch;
    error?: string;
  }> {
    try {
      logger.info(
        { operationDate },
        'Requesting CEP batch by operation date from external service'
      );

      const response = await axios.post(
        this.EXTERNAL_URL,
        {
          fecha_operacion: operationDate,
        },
        {
          headers: this.getRequestHeaders(),
        }
      );

      const batchData = response.data as ExternalBatchResponse;

      if (!batchData.data || !Array.isArray(batchData.data)) {
        throw new Error('Invalid batch data format from external endpoint');
      }

      return {
        success: true,
        batch: this.mapExternalBatchToInternal(batchData),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message, operationDate }, 'External CEP-by-date request failed');
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Normalizes missing-CEP webhook responses to InternalCepBatch (same contract as other CEP fetches).
   */
  private normalizeMissingCepResponse(rawData: unknown): InternalCepBatch {
    if (
      rawData &&
      typeof rawData === 'object' &&
      'data' in rawData &&
      Array.isArray((rawData as ExternalBatchResponse).data)
    ) {
      const batch = rawData as ExternalBatchResponse;
      return this.mapExternalBatchToInternal({
        fecha_operacion: batch.fecha_operacion ?? '',
        total: typeof batch.total === 'number' ? batch.total : batch.data.length,
        numero_dias_atras:
          typeof batch.numero_dias_atras === 'number' ? batch.numero_dias_atras : 0,
        data: batch.data,
      });
    }

    if (Array.isArray(rawData)) {
      const payments = this.mapDataRowsToChainItems(rawData);
      const firstDate = payments[0]?.chain.split(',')[0] ?? '';
      return {
        operationDate: firstDate,
        total: payments.length,
        payments,
        daysBack: undefined,
      };
    }

    throw new Error('Invalid format from missing CEPs endpoint');
  }

  /**
   * Fetches missing CEP data from the configured external URL (same batch shape as otros endpoints when possible).
   */
  async fetchMissingCeps(): Promise<{
    success: boolean;
    batch?: InternalCepBatch;
    error?: string;
  }> {
    try {
      logger.info('Requesting missing CEP batch from external service');

      const response = await axios.get(this.EXTERNAL_MISSING_URL, {
        headers: this.getRequestHeaders(),
      });

      const batch = this.normalizeMissingCepResponse(response.data);

      logger.info(
        { total: batch.total, operationDate: batch.operationDate },
        'External missing-CEP request succeeded'
      );

      return {
        success: true,
        batch,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'External missing-CEP request failed');
      return {
        success: false,
        error: message,
      };
    }
  }
}

export const externalDataService = new ExternalDataService();
