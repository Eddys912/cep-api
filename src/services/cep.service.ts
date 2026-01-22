import { cepRepository } from "../repositories/cep.repository";
import { CepRequest, CepStatus, ElectronicPayment } from "../types/cep.types";
import { CepTypeStatus } from "../types/global.enums";
import { getYesterdayDate } from "../utils/date-yesterday";
import { FileManager } from "../utils/file-manager";
import { generateTxt } from "../utils/txt-generator";
import { runBanxicoAutomation } from "./banxico.service";

/**
 * Handles the complete CEP generation workflow logic
 * @param cepId Unique identifier for the process
 * @param ceps In-memory state map
 * @param payload Request payload
 */
export async function cepFromDates(cepId: string, ceps: Map<string, CepStatus>, payload: CepRequest): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    console.error(`[ERROR] CEP ID ${cepId} no encontrado en memoria.`);
    return;
  }

  let generatedTxtPath: string | undefined;

  try {
    console.log(`[INFO] Procesando CEP ${cepId} para ${payload.email}`);
    cep.status = CepTypeStatus.PROCESSING;

    // 1. Fetch Data
    const isRange = payload.start_date && payload.end_date;
    const queryResult = isRange
      ? await cepRepository.getCepsByDateRange(payload.start_date!, payload.end_date!)
      : await cepRepository.getCepsByDate(getYesterdayDate());

    if (!queryResult.success) {
      throw new Error(queryResult.error?.message || "Error consultando base de datos");
    }

    const pagos = queryResult.data as ElectronicPayment[];

    if (!pagos || pagos.length === 0) {
      console.warn(`[WARN] No se encontraron registros para el periodo especificado.`);
      throw new Error("No hay registros para procesar en las fechas indicadas.");
    }

    cep.records_processed = pagos.length;
    console.log(`[INFO] Registros obtenidos: ${pagos.length}`);

    // 2. Generate Input File
    const txtResult = await generateTxt(pagos, cepId);
    if (!txtResult.success || !txtResult.filepath) {
      throw new Error(`Fallo generación TXT: ${txtResult.error}`);
    }

    generatedTxtPath = txtResult.filepath;
    cep.input_file_path = generatedTxtPath;
    console.log(`[INFO] Archivo TXT generado correctamente`);

    // 3. Run Automation (Upload, Query, Download, Re-upload)
    await runBanxicoAutomation(cepId, ceps, generatedTxtPath, payload.email, payload.format);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en proceso CEP";
    console.error(`[ERROR] Proceso CEP ${cepId} fallido:`, errorMsg);

    cep.status = CepTypeStatus.FAILED;
    cep.error = errorMsg;
    cep.completed_at = new Date().toISOString();
  } finally {
    // 4. Cleanup Input File
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
