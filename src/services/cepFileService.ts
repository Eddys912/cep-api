import { CepStatus } from "../types/cep.types";
import { CepTypeStatus, FormatType } from "../types/global.types";
import { validateTxtFile } from "../utils/validateTxtFile";
import { runBanxicoAutomation } from "./banxicoService";

export async function cepFromFile(
  cepId: string,
  ceps: Map<string, CepStatus>,
  filepath: string,
  email: string,
  formato: FormatType
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) return;

  try {
    cep.status = CepTypeStatus.PROCESSING;
    await validateTxtFile(filepath);
    cep.input_file_path = filepath;
    await runBanxicoAutomation(cepId, ceps, filepath, email, formato);
  } catch (error: unknown) {
    cep.status = CepTypeStatus.FAILED;
    cep.error = error instanceof Error ? error.message : "Error desconocido";
    throw error;
  } finally {
    cep.completed_at = new Date().toISOString();
  }
}
