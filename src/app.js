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

// --- ADAPTACIÓN TS ---
// Integrar rutas de la API de CEP escritas en TypeScript.
try {
  const fs = require('fs');
  const path = require('path');
  
  let cepRoutes;
  const isTsNode = process[Symbol.for("ts-node.register.instance")] || process.env.TS_NODE_DEV;
  const distPath = path.join(__dirname, '../dist/routes/cep.routes.js');

  if (isTsNode) {
    // Entorno de desarrollo con ts-node
    cepRoutes = require('./routes/cep.routes');
  } else if (fs.existsSync(distPath)) {
    // Entorno de producción: usar la versión compilada
    cepRoutes = require('../dist/routes/cep.routes');
  } else {
    // Fallback
    cepRoutes = require('./routes/cep.routes');
  }

  app.use('/api/v1', cepRoutes.default || cepRoutes);
  console.log('[INFO] Rutas de CEP integradas correctamente.');
} catch (error) {
  console.warn('[WARN] Advertencia: Rutas de CEP no cargadas.', error.message);
}
// ---------------------

// Este handler responde rutas no encontradas.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada.',
  });
});

// Este handler responde errores globales.
app.use((error, req, res, next) => {
  console.error('Error al procesar la solicitud:', error.message);

  if (error.details) {
    console.error('Detalles del error:', JSON.stringify(error.details, null, 2));
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
