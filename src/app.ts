import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swagger from 'swagger-ui-express';
import { ValidateError } from 'tsoa';

import { logger } from '@config/logger';
import { cleanupByFileCount } from '@utils/cleanup';

import { RegisterRoutes } from '@src/routes';

const app = express();

//  Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger for HTTP requests
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url?.startsWith('/api/docs'),
    },
    customSuccessMessage: (req: Request, res: Response, responseTime: number) => {
      return `${req.method} - ${req.url} - ${responseTime}ms`;
    },
    customErrorMessage: (req: Request, res: Response, err: any) => {
      return `${req.method} - ${req.url} - ${err.message}`;
    },
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
  })
);

//  TSOA Routes
RegisterRoutes(app);

// Run CEP folder cleanup after each CEP request.
app.use('/api/v1/ceps', (_req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    cleanupByFileCount();
  });
  next();
});

//  Swagger UI
app.use('/api/docs', swagger.serve, async (_req: Request, res: Response) => {
  return res.send(swagger.generateHTML(await import('./swagger.json')));
});
app.get('/', (_req: Request, res: Response) => res.redirect('/api/docs'));

//  404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});

//  Global Error Handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidateError) {
    logger.warn({ url: req.url, fields: err.fields }, 'Caught Validation Error');
    return res.status(422).json({
      success: false,
      message: 'Validation Failed',
      error: err.fields,
    });
  }

  if (err instanceof Error) {
    logger.error({ err, name: err.constructor.name }, 'Unhandled error');
    return res.status((err as any).statusCode ?? (err as any).status ?? 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      error: err.message || String(err),
      details: (err as any).details,
    });
  }

  if (typeof err === 'object' && err !== null) {
    const unknownErr = err as Record<string, unknown>;
    const statusCode = Number(unknownErr.statusCode ?? unknownErr.status ?? 500);
    const message =
      typeof unknownErr.message === 'string' ? unknownErr.message : 'Internal Server Error';

    const logPayload = { err: unknownErr, statusCode };
    if (statusCode >= 500) {
      logger.error(logPayload, 'Unhandled non-Error throwable');
    } else {
      logger.warn(logPayload, 'Controlled non-Error throwable');
    }
    return res.status(statusCode).json({
      success: false,
      message,
      error: message,
      details: unknownErr.details,
    });
  }

  logger.error({ err }, 'Unhandled primitive throwable');
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: String(err),
  });
});

export { app };
