const express = require('express');
const requestLogger = require('../middleware/requestLogger');
const { processPaymentWebhook, processPaymentSozu } = require('../controllers/webhookController');

// Este archivo declara las rutas del webhook.
const router = express.Router();

// Esta ruta recibe pagos STP y delega el procesamiento al controlador.
router.post('/dzog-capital/payments', requestLogger, processPaymentWebhook);
router.post('/aplicarPago', requestLogger, processPaymentSozu);

module.exports = router;
