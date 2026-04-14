const { createHttpError } = require('../utils/paymentHelpers');
const { routePaymentByBeneficiaryAccount } = require('../services/paymentDestinationService');

const { makePayment } = require('../services/sozuPaymentsService');

// Este controlador solo recibe el webhook y delega al servicio correspondiente.
async function processPaymentWebhook(req, res, next) {
  const startTime = Date.now();

  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createHttpError('El cuerpo de la petición es inválido.', 400, 'devolver');
    }

    const result = await routePaymentByBeneficiaryAccount(payload);

    return res.status(200).json({
      success: true,
      message: 'accept',
      internalMessage: 'Pago procesado correctamente.',
      processingTimeMs: Date.now() - startTime,
      data: result,
    });
  } catch (error) {
    error.processingTimeMs = Date.now() - startTime;
    return next(error);
  }
}

//controller Sozu
async function processPaymentSozu(req, res, next) {
  const startTime = Date.now();

  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createHttpError('El cuerpo de la petición es inválido.', 400, 'devolver');
    }

    const result = await makePayment(payload);

    return res.status(200).json({
      success: result.success,
      message: result.message,
      internalMessage: result.internalMessage,
      processingTimeMs: Date.now() - startTime,
      data: result.data,
      claveRastreo: result.claveRastreo,
      monto: result.monto,
      environment: result.environment,
    });
  } catch (error) {
    console.error('🔴 Error en processPaymentSozu:', error.message);

    error.processingTimeMs = Date.now() - startTime;
    return next(error);
  }
}

module.exports = {
  processPaymentWebhook,
  processPaymentSozu,
};
