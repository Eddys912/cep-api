import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DatabaseErrorCode } from "../types/global.enums";
import { DatabaseConnectionResult, getDatabaseConfig, validateDatabaseEnv } from "./database.config";

class Database {
  private static instance: Database | null = null;
  private client: SupabaseClient | null = null;
  private connectionResult: DatabaseConnectionResult | null = null;

  private constructor() {}

  /**
   * Gets the singleton instance of the Database class
   * @returns {Database} Database singleton instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initializes the database connection
   * @returns {DatabaseConnectionResult} Connection result with success status and potential errors
   */
  public initialize(): DatabaseConnectionResult {
    if (this.connectionResult) {
      return this.connectionResult;
    }

    const validation = validateDatabaseEnv();
    if (!validation.success) {
      this.connectionResult = validation;
      return validation;
    }

    const config = getDatabaseConfig();
    if (!config) {
      this.connectionResult = {
        success: false,
        error: {
          code: DatabaseErrorCode.MISSING_CREDENTIALS,
          message: "Failed to get database configuration",
        },
      };
      return this.connectionResult;
    }

    try {
      this.client = createClient(config.url, config.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: config.schema,
        },
      }) as SupabaseClient;

      this.connectionResult = { success: true };
      return this.connectionResult;
    } catch (error) {
      this.connectionResult = {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown connection error",
        },
      };
      return this.connectionResult;
    }
  }

  /**
   * Gets the Supabase client instance
   * @returns {SupabaseClient | null} Supabase client or null if not initialized
   */
  public getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Checks if the database is connected
   * @returns {boolean} True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.client !== null && this.connectionResult?.success === true;
  }

  /**
   * Gets the last connection result
   * @returns {DatabaseConnectionResult | null} Last connection result or null if not initialized
   */
  public getConnectionResult(): DatabaseConnectionResult | null {
    return this.connectionResult;
  }

  /**
   * Resets the database connection (useful for testing)
   * @internal
   */
  public reset(): void {
    this.client = null;
    this.connectionResult = null;
  }
}

const database = Database.getInstance();

/**
 * Initializes the database connection
 * Must be called before using getSupabaseClient()
 * @returns {DatabaseConnectionResult} Connection result
 */
export function initializeDatabase(): DatabaseConnectionResult {
  return database.initialize();
}

/**
 * Gets the Supabase client instance
 * @throws {Error} If database is not initialized
 * @returns {SupabaseClient} Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  const client = database.getClient();
  if (!client) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return client;
}

/**
 * Checks if database is connected
 * @returns {boolean} True if connected
 */
export function isDatabaseConnected(): boolean {
  return database.isConnected();
}

/**
 * Gets the connection result
 * @returns {DatabaseConnectionResult | null} Connection result
 */
export function getDatabaseConnectionResult(): DatabaseConnectionResult | null {
  return database.getConnectionResult();
}
