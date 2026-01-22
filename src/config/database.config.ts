import { DatabaseErrorCode, EnvVarName } from "../types/global.enums";

export interface DatabaseConnectionResult {
  success: boolean;
  error?: {
    code: DatabaseErrorCode;
    message: string;
    missingVars?: string[];
  };
}

export interface DatabaseConfig {
  url: string;
  key: string;
  schema: string;
}

/**
 * Validates required environment variables for database connection
 * @returns {DatabaseConnectionResult} Validation result
 */
export function validateDatabaseEnv(): DatabaseConnectionResult {
  const requiredVars = [EnvVarName.SUPABASE_URL, EnvVarName.SUPABASE_KEY];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    return {
      success: false,
      error: {
        code: DatabaseErrorCode.MISSING_CREDENTIALS,
        message: `Missing required environment variables for database connection`,
        missingVars,
      },
    };
  }

  return { success: true };
}

/**
 * Gets database configuration from environment variables
 * @returns {DatabaseConfig | null} Database configuration or null if validation fails
 */
export function getDatabaseConfig(): DatabaseConfig | null {
  const validation = validateDatabaseEnv();
  if (!validation.success) {
    return null;
  }

  return {
    url: process.env[EnvVarName.SUPABASE_URL]!,
    key: process.env[EnvVarName.SUPABASE_KEY]!,
    schema: process.env[EnvVarName.SUPABASE_SCHEMA] || "public",
  };
}
