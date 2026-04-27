import { CepDaysRequest, CepMissingRequest, CepRequest, CepStatus, ElectronicPayment, ExternalBatchResponse } from "../types/cep.types";
import { CepTypeStatus } from "../types/global.enums";
import { getYesterdayDate } from "../utils/date-yesterday";
import { FileManager } from "../utils/file-manager";
import { generateTxt } from "../utils/txt-generator";
import { runBanxicoAutomation } from "./banxico.service";


/**
 * Handles the CEP generation workflow from a batch (lote) response.
 * Instead of querying the DB for individual records, it uses the cadenas
 * returned directly from the external API.
 * @param cepId Unique identifier for the process
 * @param ceps In-memory state map
 * @param payload Request payload with email, format, and numero_dias_atras
 * @param batch The batch data from the external API
 */
export async function cepFromBatch(
  cepId: string,
  ceps: Map<string, CepStatus>,
  payload: CepDaysRequest,
  batch: ExternalBatchResponse
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    console.error(`[ERROR] CEP ID ${cepId} no encontrado en memoria.`);
    return;
  }

  let generatedTxtPath: string | undefined;

  try {
    console.log(`[INFO] Procesando CEP ${cepId} (batch/lote) para ${payload.email}`);
    console.log(`[INFO] Lote: fecha_operacion=${batch.fecha_operacion}, total=${batch.total}, dias_atras=${batch.numero_dias_atras}`);
    console.log(`[INFO] Cadenas recibidas del endpoint externo: ${batch.data.length}`);
    cep.status = CepTypeStatus.PROCESSING;

    // 1. Parse cadenas into ElectronicPayment objects directly from the external API data
    const pagos: ElectronicPayment[] = batch.data.map((item) => {
      const [fecha, claveRastreo, emisora, receptora, cuenta, monto] = item.cadena.split(",");

      return {
        fecha_pago: fecha,
        clave_rastreo: claveRastreo,
        clave_institucion_emisora: emisora,
        clave_institucion_receptora: receptora,
        cuenta_beneficiario: cuenta,
        monto: monto,
      };
    });

    if (pagos.length === 0) {
      console.warn(`[WARN] No se encontraron registros en el lote.`);
      throw new Error("No hay registros para procesar en el lote recibido.");
    }

    cep.records_processed = pagos.length;
    console.log(`[INFO] Registros parseados del lote externo: ${pagos.length}`);



    // 3. Generate Input File from external API cadenas
    console.log(`[INFO] Generando TXT con ${pagos.length} registros del endpoint externo...`);
    const txtResult = await generateTxt(pagos, cepId);
    if (!txtResult.success || !txtResult.filepath) {
      throw new Error(`Fallo generación TXT: ${txtResult.error}`);
    }

    generatedTxtPath = txtResult.filepath;
    cep.input_file_path = generatedTxtPath;
    console.log(`[INFO] Archivo TXT generado correctamente con ${txtResult.recordCount} registros del endpoint externo`);

    // 4. Run Automation (Upload, Query, Download, Re-upload)
    await runBanxicoAutomation(cepId, ceps, generatedTxtPath, payload.email, payload.format);


  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en proceso CEP (batch)";
    console.error(`[ERROR] Proceso CEP ${cepId} (batch) fallido:`, errorMsg);

    cep.status = CepTypeStatus.FAILED;
    cep.error = errorMsg;
    cep.completed_at = new Date().toISOString();
  } finally {
    // 6. Cleanup Input File
    if (generatedTxtPath) {
      try {
        FileManager.deleteFile(generatedTxtPath);
        console.log(`[INFO] Limpieza de archivo TXT completada`);
      } catch (cleanupErr) {
        console.warn(`[WARN] No se pudo borrar archivo TXT temporal:`, cleanupErr);
      }
    }
  }
}

/**
 * Handles the CEP generation workflow for missing CEPs.
 * @param cepId Unique identifier for the process
 * @param ceps In-memory state map
 * @param payload Request payload with email, format
 * @param missingCadenas Array of missing cadenas to process
 */
export async function cepFromMissing(
  cepId: string,
  ceps: Map<string, CepStatus>,
  payload: CepMissingRequest,
  missingCadenas: any[]
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    console.error(`[ERROR] CEP ID ${cepId} no encontrado en memoria.`);
    return;
  }

  let generatedTxtPath: string | undefined;

  try {
    console.log(`[INFO] Procesando CEP ${cepId} (Faltantes) para ${payload.email}`);
    console.log(`[INFO] Cadenas a procesar: ${missingCadenas.length}`);
    cep.status = CepTypeStatus.PROCESSING;

    // 1. Parse cadenas into ElectronicPayment objects
    const pagos: ElectronicPayment[] = missingCadenas.map((item) => {
      const [fecha, claveRastreo, emisora, receptora, cuenta, monto] = item.cadena.split(",");
      return {
        fecha_pago: fecha,
        clave_rastreo: claveRastreo,
        clave_institucion_emisora: emisora,
        clave_institucion_receptora: receptora,
        cuenta_beneficiario: cuenta,
        monto: monto,
      };
    });

    if (pagos.length === 0) {
      throw new Error("No hay registros para procesar en el lote de faltantes.");
    }

    cep.records_processed = pagos.length;



    // 3. Generate Input File from external API cadenas
    console.log(`[INFO] Generando TXT con ${pagos.length} registros...`);
    const txtResult = await generateTxt(pagos, cepId);
    if (!txtResult.success || !txtResult.filepath) {
      throw new Error(`Fallo generación TXT: ${txtResult.error}`);
    }

    generatedTxtPath = txtResult.filepath;
    cep.input_file_path = generatedTxtPath;

    // 4. Run Automation (Upload, Query, Download, Re-upload to Supabase & n8n)
    await runBanxicoAutomation(cepId, ceps, generatedTxtPath, payload.email, payload.format);



  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en proceso CEP (faltantes)";
    console.error(`[ERROR] Proceso CEP ${cepId} (faltantes) fallido:`, errorMsg);

    cep.status = CepTypeStatus.FAILED;
    cep.error = errorMsg;
    cep.completed_at = new Date().toISOString();
  } finally {
    // 6. Cleanup Input File
    if (generatedTxtPath) {
      try {
        FileManager.deleteFile(generatedTxtPath);
      } catch (cleanupErr) {
        console.warn(`[WARN] No se pudo borrar archivo TXT temporal:`, cleanupErr);
      }
    }
  }
}
