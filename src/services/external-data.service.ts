import { cepRepository } from "../repositories/cep.repository";
import { ExternalBatchResponse } from "../types/cep.types";

export class ExternalDataService {
  private readonly EXTERNAL_URL = "https://tzmhgfjmddkfyffkkmto.supabase.co/functions/v1/get-cadenas-cep-ayer";
  private readonly EXTERNAL_DAYS_URL = "https://tzmhgfjmddkfyffkkmto.supabase.co/functions/v1/get-cadenas-cep";

  /**
   * Fetches data from the external endpoint and saves it to the local database
   */
  async syncExternalData(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log(`[INFO] Fetching external data from ${this.EXTERNAL_URL}`);
      const response = await fetch(this.EXTERNAL_URL);

      if (!response.ok) {
        throw new Error(`Failed to fetch external data: ${response.statusText}`);
      }

      const rawData = await response.json();

      if (!rawData.data || !Array.isArray(rawData.data)) {
        throw new Error("Invalid data format from external endpoint");
      }

      const recordsToSave = rawData.data.map((item: { cadena: string }) => {
        // Format: fecha_operacion,claverastreo,institucion_ordenante,institucion_beneficiaria,cuenta_beneficiario,monto
        const [fecha, claverastreo, emisora, receptora, cuenta, monto] = item.cadena.split(",");

        return {
          fecha_operacion: fecha,
          claverastreo: claverastreo,
          institucion_ordenante: emisora,
          institucion_beneficiaria: receptora,
          cuenta_beneficiario: cuenta,
          monto: parseFloat(monto)
        };
      });

      console.log(`[INFO] Saving ${recordsToSave.length} records to Supabase`);
      const result = await cepRepository.saveRawCeps(recordsToSave);

      if (!result.success) {
        throw new Error(result.error?.message || "Error saving records to database");
      }

      return {
        success: true,
        count: recordsToSave.length
      };
    } catch (error) {
      console.error(`[ERROR] External data sync failed:`, error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Fetches CEP batch data from the external API by number of days back.
   * Calls POST to get-cadenas-cep with { numero_dias_atras } in the body.
   * Saves the batch as a group record in cep_lotes table.
   * @param {number} numeroDiasAtras - Number of days back to query
   * @returns {Promise<{ success: boolean; batch?: ExternalBatchResponse; error?: string }>}
   */
  async fetchCepsByDays(numeroDiasAtras: number): Promise<{
    success: boolean;
    batch?: ExternalBatchResponse;
    error?: string;
  }> {
    try {
      console.log(`[INFO] Fetching CEPs for ${numeroDiasAtras} days back from ${this.EXTERNAL_DAYS_URL}`);

      const response = await fetch(this.EXTERNAL_DAYS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numero_dias_atras: numeroDiasAtras }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CEP data by days: ${response.status} ${response.statusText}`);
      }

      const batchData: ExternalBatchResponse = await response.json();

      if (!batchData.data || !Array.isArray(batchData.data)) {
        throw new Error("Invalid batch data format from external endpoint");
      }

      if (batchData.data.length === 0) {
        return {
          success: true,
          batch: batchData,
        };
      }

      // Save the batch as a group in the database
      const cadenas = batchData.data.map((item) => item.cadena);

      console.log(`[INFO] Saving batch (lote) with ${cadenas.length} cadenas for fecha_operacion: ${batchData.fecha_operacion}`);
      const saveResult = await cepRepository.saveCepBatch({
        fecha_operacion: batchData.fecha_operacion,
        numero_dias_atras: batchData.numero_dias_atras,
        total: batchData.total,
        cadenas,
      });

      if (!saveResult.success) {
        console.warn(`[WARN] Failed to save batch to database: ${saveResult.error?.message}`);
        // Continue anyway - we have the data in memory
      } else {
        console.log(`[INFO] Batch saved successfully to cep_lotes`);
      }

      return {
        success: true,
        batch: batchData,
      };
    } catch (error) {
      console.error(`[ERROR] Fetch CEPs by days failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const externalDataService = new ExternalDataService();
