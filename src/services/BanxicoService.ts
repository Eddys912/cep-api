import axios from 'axios';
import fs from 'fs';

import { env } from '@config/env';
import { logger } from '@config/logger';

import { CepStatus } from '@defs/cep.types';
import { BrowserType, CepTypeStatus, FormatType } from '@defs/global.enums';
import { BanxicoAutomation } from '@services/BanxicoAutomationService';
import { getMexicoDateTimeISO } from '@utils/date-yesterday';
import { FileManager } from '@utils/file-manager';

const ALL_BROWSERS = [BrowserType.CHROMIUM, BrowserType.FIREFOX, BrowserType.WEBKIT] as const;
const BROWSER_ORDER = [
  env.CEP_PLAYWRIGHT_BROWSER,
  ...ALL_BROWSERS.filter((browser) => browser !== env.CEP_PLAYWRIGHT_BROWSER),
];

/**
 * Sleeps for a given amount of milliseconds
 * @param ms milliseconds to sleep
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Uploads the ZIP file to the n8n production webhook
 * @param {string} filePath - Path to the local file
 * @param {string} cepId - CEP ID for naming the file
 */
async function uploadToN8n(filePath: string, cepId: string): Promise<void> {
  try {
    logger.info({ cepId }, 'Subiendo archivo ZIP a webhook n8n');
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    formData.append('file', blob, `${cepId}.zip`);

    await axios.post(env.CEP_N8N_WEBHOOK_URL, formData);

    logger.info({ cepId }, 'Archivo enviado a n8n con exito');
  } catch (error) {
    logger.error({ cepId, error }, 'Fallo al enviar archivo a n8n');
    throw error;
  }
}

/**
 * Cleans up temporary files
 * @param {string} filePath - Path to the file to delete
 */
function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      FileManager.deleteFile(filePath);
      logger.info({ filePath }, 'Archivo temporal eliminado');
    }
  } catch (error: any) {
    logger.warn({ filePath, error: error.message }, 'Fallo limpieza de archivo temporal');
  }
}

/**
 * Executes the Banxico automation logic with browser fallback
 */
async function executeAutomationWithFallback(
  cepId: string,
  filepath: string,
  email: string,
  format: FormatType
): Promise<{ token: string; downloadPath: string }> {
  let lastError: unknown;

  for (let i = 0; i < BROWSER_ORDER.length; i++) {
    const browserType = BROWSER_ORDER[i];
    const attempt = i + 1;

    try {
      logger.info(
        { attempt, maxAttempts: BROWSER_ORDER.length, browserType },
        'Intentando automatizacion Banxico con browser fallback'
      );

      const pauseSeconds = i === 0 ? 10 : 20 + (i - 1) * 15;
      const automation = new BanxicoAutomation(cepId);

      const result = await automation.automate(
        filepath,
        email,
        format,
        pauseSeconds,
        browserType,
        env.CEP_PLAYWRIGHT_HEADLESS,
        env.CEP_PLAYWRIGHT_RETRIES_PER_BROWSER
      );

      return {
        token: result.token!,
        downloadPath: result.download_path,
      };
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      logger.warn({ browserType, error: errorMsg }, 'Fallo de intento con navegador');

      if (i < BROWSER_ORDER.length - 1) {
        const delay = (i + 1) * 5000;
        logger.info({ delaySeconds: delay / 1000 }, 'Esperando antes del siguiente intento');
        await sleep(delay);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falló la automatización con todos los navegadores');
}

/**
 * Runs the Banxico automation process managed by CEP service
 */
export async function runBanxicoAutomation(
  cepId: string,
  ceps: Map<string, CepStatus>,
  inputFilePath: string,
  email: string,
  format: FormatType = FormatType.BOTH
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) throw new Error(`CEP ${cepId} no encontrado en memoria`);

  let tempDownloadPath: string | undefined;

  try {
    // 1. Run Automation
    const { token, downloadPath } = await executeAutomationWithFallback(
      cepId,
      inputFilePath,
      email,
      format
    );
    tempDownloadPath = downloadPath;

    // 2. Upload to n8n Webhook
    await uploadToN8n(downloadPath, cepId);

    // 3. Update Status
    cep.token = token;
    cep.status = CepTypeStatus.COMPLETED;
    cep.banxicoResultPath = 'Enviado a n8n'; // truthy so downloadAvailable resolves correctly
    cep.completedAt = getMexicoDateTimeISO();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ cepId, error: msg }, 'Proceso Banxico fallido');

    cep.status = CepTypeStatus.FAILED;
    cep.error = msg;
    cep.completedAt = getMexicoDateTimeISO();

    // If we have a local file but upload failed, we might want to keep the local path as fallback?
    // Requirement says "nothing local", but for debugging/fallback maybe?
    // Adhering to strict requirement: if upload fails, it fails.
  } finally {
    // 4. Cleanup
    if (tempDownloadPath) cleanupFile(tempDownloadPath);
    // Note: inputFilePath is managed by CepService / txt-generator, potentially should be cleaned too?
    // Leaving inputFilePath cleanup to caller or separate cleanup routine if intended.
  }
}
