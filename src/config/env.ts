import 'dotenv/config';
import { z } from 'zod';

import { BrowserType, FormatType } from '@defs/global.enums';

const optionalUrl = z.preprocess((val) => (val === '' ? undefined : val), z.url().optional());

const strictNodeEnv = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
  z.enum(['development', 'production', 'test'])
);

const toBoolean = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return val;
}, z.boolean());

const schema = z.object({
  PORT: z.coerce.number().positive().default(3001),
  NODE_ENV: strictNodeEnv.default('development'),
  URL_BASE: z.url().default('http://localhost:3001'),
  CEP_EXTERNAL_API_URL: z.url(),
  CEP_EXTERNAL_API_URL_MISSING: z.url(),
  CEP_EXTERNAL_API_KEY: z.string().optional(),
  CEP_N8N_WEBHOOK_URL: z.url(),
  CEP_DEFAULT_EMAIL: z.email(),
  CEP_DEFAULT_FORMAT: z.enum(FormatType).default(FormatType.PDF),
  CEP_CLEANUP_MAX_FILES: z.coerce.number().int().min(1).default(10),
  CEP_PLAYWRIGHT_HEADLESS: toBoolean.default(true),
  CEP_PLAYWRIGHT_BROWSER: z.enum(BrowserType).default(BrowserType.CHROMIUM),
  CEP_PLAYWRIGHT_RETRIES_PER_BROWSER: z.coerce.number().int().min(1).max(10).default(3),
  SUPABASE_CLARO_URL: z.url(),
  SUPABASE_CLARO_KEY: z.string(),
  SUPABASE_MUTUO_URL: z.url(),
  SUPABASE_MUTUO_KEY: z.string(),
  SUPABASE_SOZU_URL: z.url(),
  SUPABASE_SOZU_KEY: z.string(),
  SOZU_API_URL: optionalUrl,
  N8N_API_NOTIFICA_RECHAZO: optionalUrl,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ');
  throw new Error(`[ENV] Variables de entorno inválidas o faltantes: ${missing}`);
}

export const env = parsed.data;
