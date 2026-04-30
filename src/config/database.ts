import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { env } from '@config/env';

export interface SupabaseClients {
  claro: SupabaseClient;
  mutuo: SupabaseClient;
  sozu: SupabaseClient;
}

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};

let cachedClients: SupabaseClients | null = null;

export function getSupabaseClients(): SupabaseClients {
  if (cachedClients) return cachedClients;

  cachedClients = {
    claro: createClient(env.SUPABASE_CLARO_URL, env.SUPABASE_CLARO_KEY, clientOptions),
    mutuo: createClient(env.SUPABASE_MUTUO_URL, env.SUPABASE_MUTUO_KEY, clientOptions),
    sozu: createClient(env.SUPABASE_SOZU_URL, env.SUPABASE_SOZU_KEY, clientOptions),
  };

  return cachedClients;
}
