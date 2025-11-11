import { cepRepository } from "../repositories/cep.repository";
import { CepRequest, CepStatus, ElectronicPayment } from "../types/cep.types";
import { CepTypeStatus } from "../types/global.enums";
import { getYesterdayDate } from "../utils/date-yesterday";
import { generateTxt } from "../utils/txt-generator";
import { runBanxicoAutomation } from "./banxico.service";

export async function cepFromDates(cepId: string, ceps: Map<string, CepStatus>, payload: CepRequest): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) {
    console.error(`⚠️ CEP ${cepId} no encontrado en el mapa`);
    return;
  }

  try {
    console.log(`🔄 Iniciando procesamiento del CEP ${cepId}`);
    cep.status = CepTypeStatus.PROCESSING;

    const yesterdayDate = getYesterdayDate();
    console.log(`📅 Consultando datos...`);

    const data =
      payload.start_date && payload.end_date
        ? await cepRepository.getCepsByDateRange(payload.start_date, payload.end_date)
        : await cepRepository.getCepsByDate(yesterdayDate);

    const pagos = data as ElectronicPayment[];
    if (pagos.length === 0) throw new Error("No se encontraron datos para el rango de fechas especificado");

    cep.records_processed = pagos.length;
    console.log(`📊 Se obtuvieron ${pagos.length} registros`);

    const filepath = await generateTxt(pagos, cepId);
    cep.input_file_path = filepath;
    console.log(`📝 Archivo generado: ${filepath}`);

    console.log(`🤖 Iniciando automatización Banxico...`);
    await runBanxicoAutomation(cepId, ceps, filepath, payload.email, payload.format);
  } catch (error: unknown) {
    cep.status = CepTypeStatus.FAILED;
    cep.error = error instanceof Error ? error.message : "Error desconocido";
    console.error(`❌ Error en CEP ${cepId}:`, cep.error);
  } finally {
    cep.completed_at = new Date().toISOString();
    console.log(`⏹️ CEP ${cepId} finalizado con estado: ${cep.status}`);
  }
}
