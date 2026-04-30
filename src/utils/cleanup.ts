import fs from 'fs';
import path from 'path';

import { env } from '@config/env';
import { logger } from '@config/logger';

import { FileManager } from '@utils/file-manager';

const DIRECTORIES_TO_CLEAN = [
  FileManager.SCREENSHOTS_DIR,
  FileManager.DOWNLOADS_DIR,
  FileManager.OUTPUTS_DIR,
] as const;

const MAX_FILES_PER_DIR = env.CEP_CLEANUP_MAX_FILES;
let activeCepOperations = 0;

export function markCepOperationStart() {
  activeCepOperations += 1;
}

export function markCepOperationEnd() {
  activeCepOperations = Math.max(0, activeCepOperations - 1);
}

export function cleanupByFileCount() {
  if (activeCepOperations > 0) {
    logger.debug({ activeCepOperations }, 'Cleanup omitido: hay peticiones CEP en proceso');
    return;
  }

  for (const dir of DIRECTORIES_TO_CLEAN) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const files = fs.readdirSync(dir).filter((file) => file !== '.gitkeep');
      if (files.length < MAX_FILES_PER_DIR) {
        continue;
      }

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        if (stats?.isFile()) {
          fs.unlinkSync(filePath);
        }
      }

      logger.info({ dir, removedFiles: files.length }, 'Limpieza ejecutada por limite de archivos');
    } catch (error: any) {
      logger.error({ dir, error: error.message }, 'Fallo al limpiar directorio');
    }
  }
}

// Backward compatibility with existing bootstrapping call.
export const cleanupOldFiles = cleanupByFileCount;
