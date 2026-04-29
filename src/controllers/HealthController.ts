import { Controller, Get, Route, Tags } from 'tsoa';

import { env } from '@config/env';

interface HealthResponse {
  status: 'ok';
  environment: string;
  timestamp: string;
}

@Route('health')
@Tags('System')
export class HealthController extends Controller {
  /**
   * Returns the current health status of the API.
   * @summary Health Check
   */
  @Get('/')
  public getHealth(): HealthResponse {
    const mexicoTime = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour12: false,
    });

    return {
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: mexicoTime,
    };
  }
}
