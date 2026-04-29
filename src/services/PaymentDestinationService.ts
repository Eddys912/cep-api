import { processClaroPayment } from '@services/ClaroPaymentsService';
import { processMutuoPayment } from '@services/MutuoPaymentsService';
import { createHttpError, StpPayload } from '@utils/payment-helpers';

const CLARO_PREFIXES = ['6461806986002', '6461806986003', '6461806986004'] as const;
const MUTUO_PREFIXES = ['6461806986001', '6461806986005', '6461806986006'] as const;

/**
 * Routes an STP payment to the correct processor based on the beneficiary account prefix.
 */
export async function routePaymentByBeneficiaryAccount(
  payload: StpPayload
): Promise<Record<string, unknown>> {
  const account = String(payload?.cuentaBeneficiario ?? '').trim();

  if (!account) {
    throw createHttpError('No se recibió la cuenta beneficiaria.', 400, 'devolver');
  }

  if (CLARO_PREFIXES.some((prefix) => account.startsWith(prefix))) {
    return processClaroPayment(payload);
  }

  if (MUTUO_PREFIXES.some((prefix) => account.startsWith(prefix))) {
    return processMutuoPayment(payload);
  }

  throw createHttpError(
    `El prefijo de la cuenta beneficiaria no está soportado: ${account}`,
    400,
    'devolver'
  );
}
