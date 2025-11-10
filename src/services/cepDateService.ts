import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CepRequest, CepStatus, ElectronicPayment } from "../types/cep.types";
import { CepTypeStatus } from "../types/global.types";
import { generateTxtFile } from "../utils/txtGenerator";
import { runBanxicoAutomation } from "./banxicoService";

const supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const payments_table = process.env.PAYMENTS_TABLE;

export async function cepFromDates(cepId: string, ceps: Map<string, CepStatus>, payload: CepRequest): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) return;

  try {
    cep.status = CepTypeStatus.PROCESSING;
    let query = supabase
      .from(payments_table as string)
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
      .or("claverastreo.not.ilike.%yorch%")
      .limit(5);

    if (payload.start_date) query = query.gte("fecha_operacion", payload.start_date);
    if (payload.end_date) query = query.lte("fecha_operacion", payload.end_date);

    const { data, error } = await query;
    if (error) throw new Error(`Error en base de datos: ${error.message}`);

    const pagos = data as ElectronicPayment[];
    if (pagos.length === 0) throw new Error("No se encontraron datos para el rango de fechas especificado");
    cep.records_processed = pagos.length;

    const filepath = await generateTxtFile(pagos, cepId);
    cep.input_file_path = filepath;

    await runBanxicoAutomation(cepId, ceps, filepath, payload.email, payload.format);
  } catch (error: unknown) {
    cep.status = CepTypeStatus.FAILED;
    cep.error = error instanceof Error ? error.message : "Error desconocido";
  } finally {
    cep.completed_at = new Date().toISOString();
  }
}
