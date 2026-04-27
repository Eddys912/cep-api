const { getSupabaseClients } = require('../../config');
const { createHttpError, buildPaymentRecord } = require('../utils/paymentHelpers');

// Este servicio contiene la lógica específica para Claro.
async function processClaroPayment(payload) {
  console.log('\n\n 🔵 [CLARO] Inicio procesamiento de pago');

  try {
    const { claro } = getSupabaseClients();
    const paymentRecord = buildPaymentRecord(payload);

    const { error } = await claro.from('stp_pagos_recibidos').insert([paymentRecord]);

    if (error) {
      console.error('🔴 Error al insertar en Claro:', error);
      throw createHttpError('No se pudo insertar el pago en claro.', 500, 'devolver', error);
    }

    const { error: rpcError } = await claro.rpc('pago_stp_a_cxc', {
      p_stp_id: paymentRecord.stp_id,
    });

    if (rpcError) {
      console.error('🔴 Error en RPC pago_stp_a_cxc:', rpcError);
      throw createHttpError('No se pudo ejecutar el RPC pago_stp_a_cxc en claro.', 500, 'devolver', rpcError);
    }

    console.log('🟢 [CLARO] Pago procesado correctamente');
    return {
      destination: 'claro',
      stpId: paymentRecord.stp_id,
      claveRastreo: paymentRecord.clave_rastreo,
      cuentaBeneficiario: paymentRecord.cuenta_beneficiario,
      monto: paymentRecord.monto,
    };
  } catch (error) {
    console.error('🔴 [CLARO] Error procesando pago:', error.message);
    error.details && console.error('📄 Detalles:', JSON.stringify(error.details, null, 2));

    throw error;
  }
}

module.exports = {
  processClaroPayment,
};
