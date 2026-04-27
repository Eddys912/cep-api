import { ExternalBatchResponse } from "../types/cep.types";

export class ExternalDataService {
  private readonly EXTERNAL_URL = "https://tzmhgfjmddkfyffkkmto.supabase.co/functions/v1/get-cadenas-cep-ayer";
  private readonly EXTERNAL_DAYS_URL = "https://tzmhgfjmddkfyffkkmto.supabase.co/functions/v1/get-cadenas-cep";

  /**
   * Fetches data from the external endpoint for yesterday
   */
  async fetchYesterdayCeps(): Promise<{ success: boolean; data?: any[]; error?: string }> {
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

      return {
        success: true,
        data: rawData.data
      };
    } catch (error) {
      console.error(`[ERROR] External data sync failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Fetches CEP batch data from the external API by number of days back.
   * @param {number} numeroDiasAtras - Number of days back to query
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

  /**
   * Fetches CEP batch data from the external API by specific date.
   * @param {string} fechaOperacion - Specific date to query (YYYY-MM-DD)
   */
  async fetchCepsBySpecificDate(fechaOperacion: string): Promise<{
    success: boolean;
    batch?: ExternalBatchResponse;
    error?: string;
  }> {
    try {
      console.log(`[INFO] Fetching CEPs for date ${fechaOperacion} from ${this.EXTERNAL_DAYS_URL}`);

      const response = await fetch(this.EXTERNAL_DAYS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fecha_operacion: fechaOperacion }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CEP data by date: ${response.status} ${response.statusText}`);
      }

      const batchData: ExternalBatchResponse = await response.json();

      if (!batchData.data || !Array.isArray(batchData.data)) {
        throw new Error("Invalid batch data format from external endpoint");
      }

      return {
        success: true,
        batch: batchData,
      };
    } catch (error) {
      console.error(`[ERROR] Fetch CEPs by date failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetches missing CEP data from the external n8n webhook.
   */
  async fetchMissingCeps(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = "https://automatizacion-n8n.fbqqbe.easypanel.host/webhook/cep-faltantes";
      console.log(`[INFO] Fetching missing CEPs from ${url}`);
      
      // We use GET by default, n8n webhooks usually accept GET for fetching
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch missing CEPs: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      
      let cadenasArray: any[] = [];
      if (Array.isArray(rawData)) {
        cadenasArray = rawData;
      } else if (rawData.data && Array.isArray(rawData.data)) {
        cadenasArray = rawData.data;
      } else {
        throw new Error("Invalid format from missing CEPs endpoint");
      }

      return {
        success: true,
        data: cadenasArray,
      };
    } catch (error) {
      console.error(`[ERROR] Fetch missing CEPs failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const externalDataService = new ExternalDataService();
