const { env } = require('../../config');

// Este middleware imprime el payload solo en development.
function requestLogger(req, res, next) {
    console.log('\n\n =======================================================================');
    console.log('HORA:', new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
    console.log(`📥 Payload recibido en ${req.originalUrl}`);
    console.log(JSON.stringify(req.body, null, 2));
  next();
}

module.exports = requestLogger;
