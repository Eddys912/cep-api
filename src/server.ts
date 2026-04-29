import { env } from '@config/env';
import { logger } from '@config/logger';

import { app } from '@src/app';
import { FileManager } from '@utils/file-manager';

try {
  const dirInit = FileManager.initializeDirectories();
  if (!dirInit.success) {
    logger.warn({ errors: dirInit.errors }, 'Algunos directorios no pudieron inicializarse');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor iniciado en el puerto ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger disponible en /api/docs`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Señal de terminacion recibida. Cerrando servidor...');
    server.close(() => {
      logger.info('Servidor cerrado correctamente.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  logger.error({ err: error }, 'Fallo crítico al iniciar el servidor');
  process.exit(1);
}
