const { env, validateEnv } = require('./config');
const app = require('./src/app');

// Este archivo inicia el servidor HTTP.
function startServer() {
  validateEnv();

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://localhost:${env.port}`);

  });

  server.on('error', (error) => {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  });

  return server;
}

startServer();
