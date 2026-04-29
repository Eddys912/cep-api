import { logger } from '@config/logger';

import { getSupabaseClients } from '@config/database';
import { buildPaymentRecord, createHttpError, StpPayload } from '@utils/payment-helpers';

export async function processClaroPayment(payload: StpPayload): Promise<Record<string, unknown>> {
  logger.debug('[CLARO] Inicio procesamiento de pago');

  const { claro } = getSupabaseClients();
  const paymentRecord = buildPaymentRecord(payload);

  const { error } = await claro.from('stp_pagos_recibidos').insert([paymentRecord]);

  if (error) {
    logger.error({ err: error }, '[CLARO] Error al insertar pago');
    throw createHttpError('No se pudo insertar el pago en claro.', 500, 'devolver', error);
  }

  const { error: rpcError } = await claro.rpc('pago_stp_a_cxc', {
    p_stp_id: paymentRecord.stp_id,
  });

  if (rpcError) {
    logger.error({ err: rpcError }, '[CLARO] Error en RPC pago_stp_a_cxc');
    throw createHttpError(
      'No se pudo ejecutar el RPC pago_stp_a_cxc en claro.',
      500,
      'devolver',
      rpcError
    );
  }

  logger.debug('[CLARO] Pago procesado correctamente');
  return {
    destination: 'claro',
    stpId: paymentRecord.stp_id,
    claveRastreo: paymentRecord.clave_rastreo,
    cuentaBeneficiario: paymentRecord.cuenta_beneficiario,
    monto: paymentRecord.monto,
  };
}
