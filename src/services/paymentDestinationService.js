const { createHttpError } = require('../utils/paymentHelpers');
const { processClaroPayment } = require('./claroPaymentsService');
const { processMutuoPayment } = require('./mutuoPaymentsService');

const CLARO_PREFIXES = ['6461806986002', '6461806986003', '6461806986004'];
const MUTUO_PREFIXES = ['6461806986001', '6461806986005', '6461806986006'];

// Este servicio decide a qué flujo enviar el pago según la cuenta beneficiaria.
async function routePaymentByBeneficiaryAccount(payload) {
  const account = String(payload?.cuentaBeneficiario || '').trim();

  if (!account) {
    throw createHttpError(
      'No se recibió la cuenta beneficiaria.',
      400,
      'devolver'
    );
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

module.exports = {
  routePaymentByBeneficiaryAccount
};
