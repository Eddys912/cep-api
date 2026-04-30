import axios from 'axios';

import { env } from '@config/env';
import { logger } from '@config/logger';

import { getSupabaseClients, SupabaseClients } from '@config/database';
import { createHttpError, StpPayload } from '@utils/payment-helpers';

interface InsertPaymentResult {
  success: boolean;
  message?: string;
  claverastreo?: string;
  [key: string]: unknown;
}

const STP_REQUIRED_FIELDS: (keyof StpPayload)[] = [
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

function validateStpPayload(payload: StpPayload): { isValid: boolean; missingFields: string[] } {
  const missingFields = STP_REQUIRED_FIELDS.filter(
    (field) => payload[field] === undefined || payload[field] === null
  );
  return { isValid: missingFields.length === 0, missingFields };
}

async function insertStpPayment(
  sozu: SupabaseClients['sozu'],
  payload: StpPayload
): Promise<InsertPaymentResult> {
  logger.debug('Iniciando inserción del pago en la base de datos');

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
    p_nombre_beneficiario2: payload.nombreBeneficiario2 ?? null,
    p_tipo_cuenta_beneficiario2: payload.tipoCuentaBeneficiario2 ?? null,
    p_cuenta_beneficiario2: payload.cuentaBeneficiario2 ?? null,
    p_folio_codi: payload.folioCodi ?? null,
  });

  if (error) {
    throw createHttpError(error.message || 'Error SQL al insertar pago', 500, 'devolver', error);
  }

  const result = data as InsertPaymentResult;

  if (result?.success === false) {
    if (env.N8N_API_NOTIFICA_RECHAZO) {
      try {
        await axios.post(
          env.N8N_API_NOTIFICA_RECHAZO,
          { resultado: result, payload_original: payload },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 }
        );
        logger.warn('Rechazo notificado a n8n');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        logger.error({ err: msg }, 'Error enviando rechazo a n8n');
      }
    }
    throw new Error(result.message || 'Pago rechazado por insertar_pago_stp');
  }

  logger.debug('Inserción del pago finalizada');
  return result;
}

async function callExternalApi(data: Record<string, unknown>): Promise<void> {
  if (!env.SOZU_API_URL) return;

  logger.debug({ url: env.SOZU_API_URL }, 'Llamando a API externa Sozu');

  try {
    await axios.post(env.SOZU_API_URL, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
    logger.debug('Llamada a API externa finalizada correctamente');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    logger.error({ err: msg }, 'Error llamando al endpoint externo Sozu');
    throw err;
  }
}

export interface PaymentResult {
  success: boolean;
  message: string;
  internalMessage: string;
  claveRastreo?: string;
  monto?: number;
  data?: unknown;
  environment?: string;
}

export async function makePayment(payload: StpPayload): Promise<PaymentResult> {
  const { sozu } = getSupabaseClients();
  const validation = validateStpPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Payload inválido', 400, 'devolver', validation.missingFields);
  }

  const insertResult = await insertStpPayment(sozu, payload);

  if (insertResult.success) {
    await callExternalApi({ ...insertResult, environment: env.NODE_ENV });
    return {
      success: true,
      message: 'accept',
      internalMessage: 'Pago aplicado.',
      claveRastreo: payload.claveRastreo,
      monto: payload.monto,
      data: insertResult,
      environment: env.NODE_ENV,
    };
  }

  return {
    success: false,
    message: 'devolver',
    internalMessage: 'Pago rechazado.',
    claveRastreo: payload.claveRastreo,
    data: insertResult,
  };
}
