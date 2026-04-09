const { getSupabaseClients } = require('../../config');
const {
  createHttpError,
  buildPaymentRecord,
} = require('../utils/paymentHelpers');

// Este servicio contiene la lógica específica para Claro.
async function processClaroPayment(payload) {
  const { claro } = getSupabaseClients();
  const paymentRecord = buildPaymentRecord(payload);

  const { data, error } = await claro
    .from('stp_pagos_recibidos')
    .insert([paymentRecord])
    .select()
    .single();

  if (error) {
    throw createHttpError(
      'No se pudo insertar el pago en claro.',
      500,
      'devolver',
      error
    );
  }

  // Después de insertar, se ejecuta el RPC usando el stp_id del pago recibido.
  const { error: rpcError } = await claro.rpc('pago_stp_a_cxc', {
    p_stp_id: paymentRecord.stp_id,
  });

  if (rpcError) {
    throw createHttpError(
      'No se pudo ejecutar el RPC pago_stp_a_cxc en claro.',
      500,
      'devolver',
      rpcError
    );
  }

  return {
    destination: 'claro',
    table: 'stp_pagos_recibidos',
    record: data,
    postInsert: {
      rpcExecuted: true,
      rpcName: 'pago_stp_a_cxc',
    },
  };
}

module.exports = {
  processClaroPayment,
};
