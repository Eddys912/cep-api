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
}

export const cepRepository = new CepRepository();
