const { getSupabaseClients } = require('../../config');
const { createHttpError, buildPaymentRecord } = require('../utils/paymentHelpers');

// Este servicio contiene la lógica específica para Mutuo.
async function processMutuoPayment(payload) {
  const { mutuo } = getSupabaseClients();
  const paymentRecord = buildPaymentRecord(payload);

  const { data, error } = await mutuo
    .from('stp_pagos_recibidos')
    .insert([paymentRecord])
    .select()
    .single();

  if (error) {
    throw createHttpError(
      'No se pudo insertar el pago en mutuo.',
      500,
      'devolver',
      error
    );
  }

  // Después de insertar, se ejecuta el RPC usando el stp_id del pago recibido.
  const { error: rpcError } = await mutuo.rpc('update_pago_recibido', {
    p_stp_id: paymentRecord.stp_id
  });

  if (rpcError) {
    throw createHttpError(
      'No se pudo ejecutar el RPC update_pago_recibido en mutuo.',
      500,
      'devolver',
      rpcError
    );
  }

  return {
    destination: 'mutuo',
    table: 'stp_pagos_recibidos',
    record: data,
    postInsert: {
      rpcExecuted: true,
      rpcName: 'update_pago_recibido'
    }
  };
}

module.exports = {
  processMutuoPayment
};
