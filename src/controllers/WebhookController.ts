import { Body, Controller, Post, Response, Route, SuccessResponse, Tags } from 'tsoa';

import { logger } from '@config/logger';

import { routePaymentByBeneficiaryAccount } from '@services/PaymentDestinationService';
import { makePayment, PaymentResult } from '@services/SozuPaymentsService';
import { createHttpError, StpPayload } from '@utils/payment-helpers';

interface WebhookResponse {
  success: boolean;
  message: string;
  internalMessage: string;
  processingTimeMs: number;
  data?: unknown;
}

@Route('webhook')
@Tags('STP Webhooks')
export class WebhookController extends Controller {
  /**
   * Receives STP payments for Dzog Capital and routes to the appropriate processor.
   * @summary Process STP Payment (Dzog Capital)
   */
  @Post('dzog-capital/payments')
  @SuccessResponse('200', 'Payment processed')
  @Response('400', 'Invalid payload')
  @Response('500', 'Processing error')
  public async processDzogPayment(@Body() payload: StpPayload): Promise<WebhookResponse> {
    const startTime = Date.now();

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createHttpError('El cuerpo de la petición es inválido.', 400, 'devolver');
    }

    logger.debug(
      { cuentaBeneficiario: payload.cuentaBeneficiario },
      '[WEBHOOK] Procesando pago Dzog'
    );
    const result = await routePaymentByBeneficiaryAccount(payload);

    return {
      success: true,
      message: 'accept',
      internalMessage: 'Pago procesado correctamente.',
      processingTimeMs: Date.now() - startTime,
      data: result,
    };
  }

  /**
   * Receives STP payments for Sozu and applies payment through the Sozu pipeline.
   * @summary Process STP Payment (Sozu)
   */
  @Post('aplicarPago')
  @SuccessResponse('200', 'Payment applied')
  @Response('400', 'Invalid payload')
  @Response('500', 'Processing error')
  public async processStpPayment(
    @Body() payload: StpPayload
  ): Promise<PaymentResult & { processingTimeMs: number }> {
    const startTime = Date.now();

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createHttpError('El cuerpo de la petición es inválido.', 400, 'devolver');
    }

    logger.debug({ claveRastreo: payload.claveRastreo }, '[WEBHOOK] Procesando pago Sozu');
    const result = await makePayment(payload);

    return { ...result, processingTimeMs: Date.now() - startTime };
  }
}
