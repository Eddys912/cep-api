const express = require('express');
const cors = require('cors');
const { env } = require('../config');
const webhookRoutes = require('./routes/webhookRoutes');

// Este archivo arma la aplicación Express.
const app = express();
const startTime = Date.now();

// Estos middlewares preparan el parseo base del request.
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Esta ruta permite verificar rápidamente si el servidor está vivo.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Esta ruta agrupa los endpoints del webhook.
app.use('/webhook', webhookRoutes);

// Este handler responde rutas no encontradas.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada.',
  });
});

// Este handler responde errores globales.
app.use((error, req, res, next) => {
  console.log('Error al procesar la solicitud:', error.message);
  console.log('🔴 json response',
    json({
      success: false,
      message: error.messageStp || 'devolver',
      internal_message: error.messageInter || 'Ocurrió un error al procesar la solicitud.',
      details: error.details || null,
      processingTime: Date.now() - startTime,
      camposFaltantes: error.details || null,
    })
  );

  if (error.details) {
    console.log('Detalles del error:', JSON.stringify(error.details, null, 2));
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.messageStp || 'devolver',
    internal_message: error.messageInter || 'Ocurrió un error al procesar la solicitud.',
    details: error.details || null,
    processingTime: Date.now() - startTime,
    camposFaltantes: error.details || null,
  });
});

module.exports = app;
