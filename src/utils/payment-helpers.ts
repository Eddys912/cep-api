export interface HttpError extends Error {
  statusCode: number;
  messageStp: string;
  details: unknown;
  success: boolean;
}

/**
 * Creates a structured HTTP error compatible with the Express error handler.
 */
export function createHttpError(
  messageInter: string,
  statusCode = 500,
  messageStp = 'devolver',
  details: unknown = null,
  success = false
): HttpError {
  const error = new Error(messageInter) as HttpError;
  error.statusCode = statusCode;
  error.messageStp = messageStp;
  error.details = details;
  error.success = success;
  return error;
}

/**
 * Converts fechaOperacion from YYYYMMDD format to YYYY-MM-DD.
 */
export function toOperationDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^\d{8}$/.test(raw)) {
    throw createHttpError(`El campo fechaOperacion es inválido: ${value}`, 400, 'devolver');
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/**
 * Represents a raw STP webhook payload.
 */
export interface StpPayload {
  id: string | number;
  claveRastreo: string;
  fechaOperacion: string | number;
  tsLiquidacion: string;
  institucionOrdenante: string;
  institucionBeneficiaria: string;
  monto: number;
  nombreOrdenante: string;
  tipoCuentaOrdenante: string;
  cuentaOrdenante: string;
  rfcCurpOrdenante: string;
  nombreBeneficiario: string;
  tipoCuentaBeneficiario: string;
  cuentaBeneficiario: string;
  nombreBeneficiario2?: string;
  tipoCuentaBeneficiario2?: string;
  cuentaBeneficiario2?: string;
  rfcCurpBeneficiario: string;
  conceptoPago: string;
  referenciaNumerica: string;
  empresa: string;
  tipoPago: string;
  folioCodi?: string;
}

export interface PaymentRecord {
  stp_id: string | number;
  clave_rastreo: string;
  fecha_operacion: string;
  ts_liquidacion: string;
  institucion_ordenante: string;
  institucion_beneficiaria: string;
  monto: number;
  nombre_ordenante: string;
  tipo_cuenta_ordenante: string;
  cuenta_ordenante: string;
  rfc_curp_ordenante: string;
  nombre_beneficiario: string;
  tipo_cuenta_beneficiario: string;
  cuenta_beneficiario: string;
  nombre_beneficiario_2?: string;
  tipo_cuenta_beneficiario_2?: string;
  rfc_curp_beneficiario: string;
  concepto_pago: string;
  referencia_numerica: string;
  empresa: string;
  tipo_pago: string;
  folio_codi?: string;
  payload_json: StpPayload;
}

/**
 * Builds a normalized DB payment record from an STP webhook payload.
 */
export function buildPaymentRecord(payload: StpPayload): PaymentRecord {
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
