// Este archivo contiene utilidades simples de formato y errores.

/**
 * @param {string} message
 * @param {number} statusCode
 * @param {string} messageStp
 * @param {any} details
 */
function createHttpError(
  messageInter,
  statusCode = 500,
  messageStp = 'devolver',
  details = null,
  success = false
) {
  const error = new Error(messageInter);
  error.statusCode = statusCode;
  error.messageStp = messageStp;
  error.details = details;
  error.success = success;
  return error;
}

// Esta función convierte fechaOperacion de formato YYYYMMDD a YYYY-MM-DD.
function toOperationDate(value) {
  const rawValue = String(value || '').trim();

  if (!/^\d{8}$/.test(rawValue)) {
    throw createHttpError(`El campo fechaOperacion es inválido: ${value}`, 400, 'devolver');
  }

  return `${rawValue.slice(0, 4)}-${rawValue.slice(4, 6)}-${rawValue.slice(6, 8)}`;
}

// Esta función arma el registro final para insertar en la base.
function buildPaymentRecord(payload) {
  return {
    stp_id: payload.id,
    clave_rastreo: payload.claveRastreo,
    fecha_operacion: toOperationDate(payload.fechaOperacion),
    ts_liquidacion: payload.tsLiquidacion,
    institucion_ordenante: payload.institucionOrdenante,
    institucion_beneficiaria: payload.institucionBeneficiaria,
    monto: payload.monto,
    nombre_ordenante: payload.nombreOrdenante,
    tipo_cuenta_ordenante: payload.tipoCuentaOrdenante,
    cuenta_ordenante: payload.cuentaOrdenante,
    rfc_curp_ordenante: payload.rfcCurpOrdenante,
    nombre_beneficiario: payload.nombreBeneficiario,
    tipo_cuenta_beneficiario: payload.tipoCuentaBeneficiario,
    cuenta_beneficiario: payload.cuentaBeneficiario,
    nombre_beneficiario_2: payload.nombreBeneficiario2,
    tipo_cuenta_beneficiario_2: payload.tipoCuentaBeneficiario2,
    rfc_curp_beneficiario: payload.rfcCurpBeneficiario,
    concepto_pago: payload.conceptoPago,
    referencia_numerica: payload.referenciaNumerica,
    empresa: payload.empresa,
    tipo_pago: payload.tipoPago,
    folio_codi: payload.folioCodi,
    payload_json: payload,
  };
}

module.exports = {
  createHttpError,
  toOperationDate,
  buildPaymentRecord,
};
