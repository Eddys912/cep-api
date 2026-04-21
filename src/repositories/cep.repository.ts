import { getSupabaseClient } from "../config/database";
import { DatabaseErrorCode } from "../types/global.enums";

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class CepRepository {
  /**
   * Retrieves CEPs for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<RepositoryResult<any[]>>} Query result
   */
  async getCepsByDate(date: string): Promise<RepositoryResult<any[]>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("pagos_stp_raw")
        .select(
          `
          fecha_pago: fecha_operacion,
          clave_rastreo: claverastreo,
          clave_institucion_emisora: institucion_ordenante,
          clave_institucion_receptora: institucion_beneficiaria,
          cuenta_beneficiario,
          monto
        `
        )
        .eq("fecha_operacion", date);

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.QUERY_FAILED,
            message: `Error querying CEPs for date ${date}`,
            details: error,
          },
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }

  /**
   * Retrieves CEPs for a date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<RepositoryResult<any[]>>} Query result
   */
  async getCepsByDateRange(startDate: string, endDate: string): Promise<RepositoryResult<any[]>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("pagos_stp_raw")
        .select(
          `
          fecha_pago: fecha_operacion,
          clave_rastreo: claverastreo,
          clave_institucion_emisora: institucion_ordenante,
          clave_institucion_receptora: institucion_beneficiaria,
          cuenta_beneficiario,
          monto
        `
        )
        .gte("fecha_operacion", startDate)
        .lte("fecha_operacion", endDate);

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.QUERY_FAILED,
            message: `Error querying CEPs for range ${startDate} - ${endDate}`,
            details: error,
          },
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }

  /**
   * Saves raw CEP data to the database
   * @param {any[]} records - Array of records to save
   * @returns {Promise<RepositoryResult<any>>} Result of the operation
   */
  async saveRawCeps(records: any[]): Promise<RepositoryResult<any>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("pagos_stp_raw")
        .upsert(records, { onConflict: "claverastreo" });

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.INSERT_FAILED,
            message: "Error saving raw records",
            details: error,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }

  /**
   * Saves a CEP batch (lote) as a group record in the database
   * @param {object} batch - The batch data with fecha_operacion, numero_dias_atras, total, and cadenas
   * @returns {Promise<RepositoryResult<any>>} Result of the operation
   */
  async saveCepBatch(batch: {
    fecha_operacion: string;
    numero_dias_atras: number;
    total: number;
    cadenas: string[];
  }): Promise<RepositoryResult<any>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("cep_lotes")
        .upsert(
          {
            fecha_operacion: batch.fecha_operacion,
            numero_dias_atras: batch.numero_dias_atras,
            total: batch.total,
            cadenas: batch.cadenas,
          },
          { onConflict: "fecha_operacion" }
        );

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.INSERT_FAILED,
            message: "Error saving CEP batch",
            details: error,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }

  /**
   * Retrieves a CEP batch by fecha_operacion
   * @param {string} fechaOperacion - Operation date in YYYY-MM-DD format
   * @returns {Promise<RepositoryResult<any>>} Query result
   */
  async getCepBatchByFechaOperacion(fechaOperacion: string): Promise<RepositoryResult<any>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("cep_lotes")
        .select("*")
        .eq("fecha_operacion", fechaOperacion)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.QUERY_FAILED,
            message: `Error querying CEP batch for date ${fechaOperacion}`,
            details: error,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }

  /**
   * Updates lote_referencia for all records matching a fecha_operacion.
   * This links the payment records to the generated ZIP file.
   * @param {string} fechaOperacion - Operation date in YYYY-MM-DD format
   * @param {string} loteReferencia - The CEP ID / ZIP filename (without .zip)
   * @returns {Promise<RepositoryResult<any>>} Result of the operation
   */
  async updateLoteReferencia(fechaOperacion: string, loteReferencia: string): Promise<RepositoryResult<any>> {
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("pagos_stp_raw")
        .update({ lote_referencia: loteReferencia })
        .eq("fecha_operacion", fechaOperacion);

      if (error) {
        return {
          success: false,
          error: {
            code: DatabaseErrorCode.QUERY_FAILED,
            message: `Error updating lote_referencia for ${fechaOperacion}`,
            details: error,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DatabaseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : "Unknown repository error",
        },
      };
    }
  }
}

export const cepRepository = new CepRepository();
