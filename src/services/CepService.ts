import { logger } from '@config/logger';

import {
  BanxicoTxtRow,
  CepChainItem,
  CepDaysRequest,
  CepMissingRequest,
  CepStatus,
  InternalCepBatch,
} from '@defs/cep.types';
import { CepTypeStatus } from '@defs/global.enums';
import { runBanxicoAutomation } from '@services/BanxicoService';
import { parseBanxicoChainToTxtRow } from '@utils/cep-chain-parser';
import { markCepOperationEnd, markCepOperationStart } from '@utils/cleanup';
import { getMexicoDateTimeISO } from '@utils/date-yesterday';
import { FileManager } from '@utils/file-manager';
import { generateTxt } from '@utils/txt-generator';

/**
 * Handles the CEP generation workflow from a batch (lote) response.
 * Uses chain strings returned by the external API.
 */
export async function cepFromBatch(
  cepId: string,
  ceps: Map<string, CepStatus>,
  payload: CepDaysRequest,
  batch: InternalCepBatch
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    logger.error({ cepId }, 'CEP ID no encontrado en memoria');
    return;
  }

  let generatedTxtPath: string | undefined;
  markCepOperationStart();

  try {
    logger.info({ cepId, email: payload.email }, 'Procesando CEP desde lote externo');
    logger.info(
      { cepId, operationDate: batch.operationDate, total: batch.total, daysBack: batch.daysBack },
      'Resumen de lote externo'
    );
    logger.info(
      { cepId, paymentsCount: batch.payments.length },
      'Cadenas recibidas del endpoint externo'
    );
    cep.status = CepTypeStatus.PROCESSING;

    const pagos: BanxicoTxtRow[] = batch.payments.map((item) =>
      parseBanxicoChainToTxtRow(item.chain)
    );

    if (pagos.length === 0) {
      logger.warn({ cepId }, 'No se encontraron registros en el lote');
      throw new Error('No hay registros para procesar en el lote recibido.');
    }

    cep.recordsProcessed = pagos.length;
    logger.info({ cepId, recordsProcessed: pagos.length }, 'Registros parseados del lote externo');

    logger.info(
      { cepId, records: pagos.length },
      'Generando TXT con registros del endpoint externo'
    );
    const txtResult = await generateTxt(pagos, cepId);
    if (!txtResult.success || !txtResult.filepath) {
      throw new Error(`Fallo generación TXT: ${txtResult.error}`);
    }

    generatedTxtPath = txtResult.filepath;
    cep.inputFilePath = generatedTxtPath;
    logger.info(
      { cepId, recordCount: txtResult.recordCount },
      'Archivo TXT generado correctamente con registros del endpoint externo'
    );

    await runBanxicoAutomation(cepId, ceps, generatedTxtPath, payload.email, payload.format);
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Error desconocido en proceso CEP (batch)';
    logger.error({ cepId, error: errorMsg }, 'Proceso CEP (batch) fallido');

    cep.status = CepTypeStatus.FAILED;
    cep.error = errorMsg;
    cep.completedAt = getMexicoDateTimeISO();
  } finally {
    if (generatedTxtPath) {
      try {
        FileManager.deleteFile(generatedTxtPath);
        logger.info({ cepId }, 'Limpieza de archivo TXT completada');
      } catch (cleanupErr) {
        logger.warn({ cepId, cleanupErr }, 'No se pudo borrar archivo TXT temporal');
      }
    }
    markCepOperationEnd();
  }
}

/**
 * Handles the CEP generation workflow for missing CEPs.
 */
export async function cepFromMissing(
  cepId: string,
  ceps: Map<string, CepStatus>,
  payload: CepMissingRequest,
  missingChains: CepChainItem[]
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    logger.error({ cepId }, 'CEP ID no encontrado en memoria');
    return;
  }

  let generatedTxtPath: string | undefined;
  markCepOperationStart();

  try {
    logger.info({ cepId, email: payload.email }, 'Procesando CEP faltantes');
    logger.info({ cepId, records: missingChains.length }, 'Cadenas faltantes a procesar');
    cep.status = CepTypeStatus.PROCESSING;

    const pagos: BanxicoTxtRow[] = missingChains.map((item) =>
      parseBanxicoChainToTxtRow(item.chain)
    );

    if (pagos.length === 0) {
      throw new Error('No hay registros para procesar en el lote de faltantes.');
    }

    cep.recordsProcessed = pagos.length;

    logger.info({ cepId, records: pagos.length }, 'Generando TXT con registros de faltantes');
    const txtResult = await generateTxt(pagos, cepId);
    if (!txtResult.success || !txtResult.filepath) {
      throw new Error(`Fallo generación TXT: ${txtResult.error}`);
    }

    generatedTxtPath = txtResult.filepath;
    cep.inputFilePath = generatedTxtPath;

    await runBanxicoAutomation(cepId, ceps, generatedTxtPath, payload.email, payload.format);
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Error desconocido en proceso CEP (faltantes)';
    logger.error({ cepId, error: errorMsg }, 'Proceso CEP (faltantes) fallido');

    cep.status = CepTypeStatus.FAILED;
    cep.error = errorMsg;
    cep.completedAt = getMexicoDateTimeISO();
  } finally {
    if (generatedTxtPath) {
      try {
        FileManager.deleteFile(generatedTxtPath);
      } catch (cleanupErr) {
        logger.warn({ cepId, cleanupErr }, 'No se pudo borrar archivo TXT temporal');
      }
    }
    markCepOperationEnd();
  }
}
