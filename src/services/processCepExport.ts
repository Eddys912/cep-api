import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CepRequest, CepStatus, PagoElectronico } from "../types/cep.types";
import { BrowserType, CepTypeStatus } from "../types/global.types";
import { generateTxtFile } from "../utils/generateTxtFile";
import { automateBanxicoWithPause } from "./BanxicoAutomation";

const supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const BROWSER_ORDER = [BrowserType.WEBKIT, BrowserType.CHROMIUM, BrowserType.FIREFOX];
const payments_table = process.env.PAYMENTS_TABLE;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processCepExport(
  jobId: string,
  jobs: Map<string, CepStatus>,
  payload: CepRequest
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = CepTypeStatus.PROCESSING;

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

    if (payload.fecha_inicio) query = query.gte("fecha_operacion", payload.fecha_inicio);
    if (payload.fecha_fin) query = query.lte("fecha_operacion", payload.fecha_fin);

    const { data, error } = await query;
    if (error) throw error;

    const pagos = data as PagoElectronico[];
    if (pagos.length === 0) throw new Error("No hay datos");
    job.records_processed = pagos.length;

    const filepath = await generateTxtFile(pagos, jobId);
    job.input_file_path = filepath;
    console.log(`✅ Archivo TXT generado: ${filepath}`);

    let automationResult = null;
    let lastError = null;

    for (let i = 0; i < BROWSER_ORDER.length; i++) {
      const browserType = BROWSER_ORDER[i] as BrowserType;
      const attempt = i + 1;

      try {
        console.log(`\n======================================================`);
        console.log(`🔄 Intento ${attempt}/${BROWSER_ORDER.length}: Usando navegador ${browserType.toUpperCase()}`);
        console.log(`======================================================`);

        // WebKit (primer intento): pausa base de 10s
        // Navegadores subsiguientes: pausas progresivamente mayores
        const pauseSeconds = i === 0 ? 10 : 20 + (i - 1) * 15;

        automationResult = await automateBanxicoWithPause(
          filepath,
          payload.email,
          payload.formato,
          pauseSeconds,
          browserType
        );

        console.log(`✅ Proceso completado exitosamente con ${browserType.toUpperCase()}.`);
        break;
      } catch (error: unknown) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";

        console.error(`❌ Fallo completo con ${browserType.toUpperCase()}:`, errorMsg);

        if (i < BROWSER_ORDER.length - 1) {
          const delay = (i + 1) * 8000;
          console.log(`⏳ Esperando ${delay / 1000} segundos antes de probar ${BROWSER_ORDER[i + 1].toUpperCase()}...`);
          await sleep(delay);
        }
      }
    }

    if (!automationResult)
      throw lastError || new Error("Fallo en la automatización con todos los navegadores disponibles.");

    job.token = automationResult.token;
    job.status = CepTypeStatus.COMPLETED;
    job.result = automationResult;
    job.banxico_result_path = automationResult.downloadPath;
  } catch (error: unknown) {
    job.status = CepTypeStatus.FAILED;
    job.error = error instanceof Error ? error.message : "Error desconocido";
    console.error("✗ Error final en exportación de CEPs:", job.error);
  } finally {
    job.completed_at = new Date().toISOString();
  }
}
