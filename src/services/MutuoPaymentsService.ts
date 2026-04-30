import { logger } from '@config/logger';

import { getSupabaseClients } from '@config/database';
import { buildPaymentRecord, createHttpError, StpPayload } from '@utils/payment-helpers';

export async function processMutuoPayment(payload: StpPayload): Promise<Record<string, unknown>> {
  logger.debug('[MUTUO] Inicio procesamiento de pago');

  const { mutuo } = getSupabaseClients();
  const paymentRecord = buildPaymentRecord(payload);

  const { data, error } = await mutuo
    .from('stp_pagos_recibidos')
    .insert([paymentRecord])
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, '[MUTUO] Error al insertar pago');
    throw createHttpError('No se pudo insertar el pago en mutuo.', 500, 'devolver', error);
  }

  const { error: rpcError } = await mutuo.rpc('update_pago_recibido', {
    p_stp_id: paymentRecord.stp_id,
  });

  if (rpcError) {
    logger.error({ err: rpcError }, '[MUTUO] Error en RPC update_pago_recibido');
    throw createHttpError(
      'No se pudo ejecutar el RPC update_pago_recibido en mutuo.',
      500,
      'devolver',
      rpcError
    );
  }

  logger.debug('[MUTUO] Pago procesado correctamente');
  return {
    destination: 'mutuo',
    table: 'stp_pagos_recibidos',
    record: data,
    postInsert: { rpcExecuted: true, rpcName: 'update_pago_recibido' },
  };
}
