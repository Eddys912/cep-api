const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Este archivo centraliza la carga de variables de entorno y la creación de clientes.
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3100),
  supabaseClaroUrl: process.env.SUPABASE_CLARO_URL,
  supabaseClaroKey: process.env.SUPABASE_CLARO_KEY,
  supabaseMutuoUrl: process.env.SUPABASE_MUTUO_URL,
  supabaseMutuoKey: process.env.SUPABASE_MUTUO_KEY,
  supabaseSozuUrl: process.env.SUPABASE_SOZU_URL,
  supabaseSozuKey: process.env.SUPABASE_SOZU_KEY
};

env.isDevelopment = env.nodeEnv === 'development';
env.isProduction = env.nodeEnv === 'production';

let cachedClients = null;

// Esta función valida que el proceso tenga todo lo necesario para iniciar.
function validateEnv() {
  const missingVars = [];

  if (!env.supabaseClaroUrl) {
    missingVars.push('SUPABASE_CLARO_URL');
  }

  if (!env.supabaseClaroKey) {
    missingVars.push('SUPABASE_CLARO_KEY');
  }

  if (!env.supabaseMutuoUrl) {
    missingVars.push('SUPABASE_MUTUO_URL');
  }

  if (!env.supabaseMutuoKey) {
    missingVars.push('SUPABASE_MUTUO_KEY');
  }

  if (!env.supabaseSozuUrl) {
    missingVars.push('SUPABASE_SOZU_URL');
  }

  if (!env.supabaseSozuKey) {
    missingVars.push('SUPABASE_SOZU_KEY');
  }

  if (!Number.isFinite(env.port) || env.port <= 0) {
    missingVars.push('PORT');
  }

  if (missingVars.length > 0) {
    const error = new Error(`Faltan variables de entorno: ${missingVars.join(', ')}`);
    error.code = 'INVALID_ENVIRONMENT';
    error.statusCode = 500;
    throw error;
  }

  return env;
}

// Esta función crea un cliente Supabase con una configuración segura para backend.
function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Esta función reutiliza las instancias de Supabase para no recrearlas en cada request.
function getSupabaseClients() {
  if (cachedClients) {
    return cachedClients;
  }

  cachedClients = {
    mutuo: createSupabaseClient(env.supabaseMutuoUrl, env.supabaseMutuoKey),
    claro: createSupabaseClient(env.supabaseClaroUrl, env.supabaseClaroKey),
    sozu: createSupabaseClient(env.supabaseSozuUrl, env.supabaseSozuKey)

  };

  return cachedClients;
}

module.exports = {
  env,
  validateEnv,
  getSupabaseClients
};
