import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { env } from '@config/env';

/**
 * Middleware que registra el payload entrante en modo desarrollo.
 * En producción solo registra la URL con el logger de pino.
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'development') {
    logger.debug(
      {
        url: req.originalUrl,
        body: req.body,
        timestamp: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      },
      'Payload recibido'
    );
  }
  next();
}
