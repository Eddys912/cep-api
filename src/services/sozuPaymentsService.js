const axios = require('axios');
const { createHttpError } = require('../utils/paymentHelpers');
const { getSupabaseClients } = require('../../config');

const environment = process.env.NODE_ENV;
const sozuApiExterna = process.env.SOZU_API_URL;
const n8nApiNotificaRechazo = process.env.N8N_API_NOTIFICA_RECHAZO;

function validarPayloadSTP(payload) {
  const camposRequeridos = [
    'id',
    'fechaOperacion',
    'institucionOrdenante',
    'institucionBeneficiaria',
    'claveRastreo',
    'monto',
    'cuentaBeneficiario',
    'nombreOrdenante',
    'tipoCuentaOrdenante',
    'cuentaOrdenante',
    'rfcCurpOrdenante',
    'nombreBeneficiario',
    'tipoCuentaBeneficiario',
    'rfcCurpBeneficiario',
    'conceptoPago',
    'referenciaNumerica',
    'empresa',
    'tipoPago',
    'tsLiquidacion',
  ];

  const camposFaltantes = camposRequeridos.filter((c) => payload[c] === undefined || payload[c] === null);

  return {
    esValido: camposFaltantes.length === 0,
    camposFaltantes,
  };
}

// -------------------------------------------------------------
// 🔹 Insertar pago (USA CLIENTE SOZU)
// -------------------------------------------------------------
async function insertarPagoSTP(sozu, payload) {
  console.log('💾 Iniciando inserción del pago en la base de datos...');
  const { data, error } = await sozu.rpc('insertar_pago_stp', {
    p_stp_id: payload.id,
    p_monto: payload.monto,
    p_nombre_ordenante: payload.nombreOrdenante,
    p_concepto_pago: payload.conceptoPago,
    p_institucion_beneficiaria: payload.institucionBeneficiaria,
    p_nombre_beneficiario: payload.nombreBeneficiario,
    p_ts_liquidacion: payload.tsLiquidacion,
    p_cuenta_beneficiario: payload.cuentaBeneficiario,
    p_tipo_pago: payload.tipoPago,
    p_tipo_cuenta_beneficiario: payload.tipoCuentaBeneficiario,
    p_cuenta_ordenante: payload.cuentaOrdenante,
    p_claverastreo: payload.claveRastreo,
    p_institucion_ordenante: payload.institucionOrdenante,
    p_rfc_curp_beneficiario: payload.rfcCurpBeneficiario,
    p_tipo_cuenta_ordenante: payload.tipoCuentaOrdenante,
    p_fecha_operacion: payload.fechaOperacion,
    p_empresa: payload.empresa,
    p_referencia_numerica: payload.referenciaNumerica,
    p_rfc_curp_ordenante: payload.rfcCurpOrdenante,
    p_nombre_beneficiario2: payload.nombreBeneficiario2 || null,
    p_tipo_cuenta_beneficiario2: payload.tipoCuentaBeneficiario2 || null,
    p_cuenta_beneficiario2: payload.cuentaBeneficiario2 || null,
    p_folio_codi: payload.folioCodi || null,
  });

  // 1. Error real de Supabase/Postgres
  if (error) {
    throw createHttpError(error.message || 'Error SQL', 500, 'devolver', error);
  }

  // 2. La función devolvió success = false
  if (data && data.success === false) {
    if (!n8nApiNotificaRechazo) return;

    // Notificar rechazo a n8n (sin bloquear flujo)
    try {
      await axios.post(
        n8nApiNotificaRechazo,
        {
          resultado: data, // success, message, claverastreo, id_cuenta_cobranza, etc.
          payload_original: payload, // todos los datos STP originales
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error('⚠️ Error enviando rechazo a n8n:', error.message);
    }

    console.log('📧 Rechazo enviado a n8n');
    console.log('Pago rechazado:', data.message, ' Clave rastreo: ', data.claverastreo);
    throw new Error(data.message || 'Pago rechazado por la función insertar_pago_stp');
  }

  console.log('💾 Inserción del pago finalizada');
  return data;
}

// -------------------------------------------------------------
// 🔹 API externa
// -------------------------------------------------------------
async function llamarAPIExterna(data) {
  console.log('📡 Iniciando llamada a API externa...');

  try {
    console.log('📡 Llamando a API externa:', sozuApiExterna);
    console.log('📦 Payload enviado en API externa:', data);

    await axios.post(sozuApiExterna, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log('✅ Llamada a API externa finalizada correctamente');
  } catch (error) {
    console.error('❌ Error llamando al endpoint externo:', error.message);
    throw error;
  }
}

// -------------------------------------------------------------
// 🧾 Webhook principal
// -------------------------------------------------------------
async function makePayment(payload) {
  const { sozu } = getSupabaseClients();

  const validacion = validarPayloadSTP(payload);

  if (!validacion.esValido) {
    throw createHttpError('Payload inválido', 400, 'devolver', validacion.camposFaltantes);
  }

  const insertResult = await insertarPagoSTP(sozu, payload);

  if (insertResult.success) {
    await llamarAPIExterna({
      ...insertResult,
      environment,
    });

    return {
      success: true,
      message: 'accept',
      internalMessage: 'Pago aplicado.',
      claveRastreo: payload.claveRastreo,
      monto: payload.monto,
      data: insertResult,
      environment,
    };
  } else {
    return {
      success: false,
      message: 'devolver',
      internalMessage: 'Pago rechazado.',
      claveRastreo: payload.claveRastreo,
      data: insertResult,
    };
  }
}

module.exports = {
  makePayment,
};
