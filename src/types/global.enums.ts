/**
 * Browser types supported by Playwright
 */
export enum BrowserType {
  CHROMIUM = "chromium",
  FIREFOX = "firefox",
  WEBKIT = "webkit",
}

/**
 * Output format types for CEP files
 */
export enum FormatType {
  PDF = "pdf",
  XML = "xml",
  BOTH = "ambos",
}

/**
 * Status types for CEP processing jobs
 */
export enum CepTypeStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Database connection error codes
 */
export enum DatabaseErrorCode {
  MISSING_CREDENTIALS = "DB_MISSING_CREDENTIALS",
  CONNECTION_FAILED = "DB_CONNECTION_FAILED",
  INVALID_SCHEMA = "DB_INVALID_SCHEMA",
  QUERY_FAILED = "DB_QUERY_FAILED",
}

/**
 * Environment variable names
 */
export enum EnvVarName {
  SUPABASE_URL = "SUPABASE_URL",
  SUPABASE_KEY = "SUPABASE_KEY",
  SUPABASE_SCHEMA = "SUPABASE_SCHEMA",
  PORT = "PORT",
  NODE_ENV = "NODE_ENV",
}
