import fs from "fs";
import { CepStatus } from "../types/cep.types";
import { BrowserType, CepTypeStatus, FormatType } from "../types/global.enums";
import { FileManager } from "../utils/file-manager";
import { BanxicoAutomation } from "./banxico-automation.service";

const BROWSER_ORDER = [BrowserType.CHROMIUM, BrowserType.FIREFOX, BrowserType.WEBKIT];
const IS_DEV = process.env.NODE_ENV !== "production";

interface AutomationServiceResult {
  success: boolean;
  token?: string;
  downloadUrl?: string;
  error?: string;
}

/**
 * Sleeps for a given amount of milliseconds
 * @param ms milliseconds to sleep
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



/**
 * Uploads the ZIP file to the n8n production webhook
 * @param {string} filePath - Path to the local file
 * @param {string} cepId - CEP ID for naming the file
 */
async function uploadToN8n(filePath: string, cepId: string): Promise<void> {
  try {
    console.log(`[INFO] Subiendo archivo ${cepId}.zip a webhook de n8n...`);
    const fileBuffer = fs.readFileSync(filePath);
    
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "application/zip" });
    formData.append("file", blob, `${cepId}.zip`);

    const response = await fetch("https://automatizacion-n8n.fbqqbe.easypanel.host/webhook/cargarArchivoCep", {
      method: "POST",
      body: formData as any,
    });

    if (!response.ok) {
      throw new Error(`Error en n8n webhook: ${response.status} ${response.statusText}`);
    }

    console.log(`[SUCCESS] Archivo enviado a n8n con éxito`);
  } catch (error) {
    console.error(`[ERROR] Fallo al enviar archivo a n8n:`, error);
    throw error;
  }
}

/**
 * Cleans up temporary files
 * @param {string} filePath - Path to the file to delete
 */
function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      FileManager.deleteFile(filePath);
      console.log(`[INFO] Archivo temporal eliminado: ${filePath}`);
    }
  } catch (error: any) {
    console.warn(`[WARN] Falló limpieza de archivo ${filePath}: ${error.message}`);
  }
}

/**
 * Executes the Banxico automation logic with browser fallback
 */
async function executeAutomationWithFallback(
  cepId: string,
  filepath: string,
  email: string,
  format: FormatType
): Promise<{ token: string; downloadPath: string }> {
  let lastError: unknown;

  for (let i = 0; i < BROWSER_ORDER.length; i++) {
    const browserType = BROWSER_ORDER[i];
    const attempt = i + 1;

    try {
      console.log(`[INFO] Intento ${attempt}/${BROWSER_ORDER.length} con ${browserType.toUpperCase()}`);

      const pauseSeconds = i === 0 ? 10 : 20 + (i - 1) * 15;
      const automation = new BanxicoAutomation(cepId);

      const result = await automation.automate(filepath, email, format, pauseSeconds, browserType, true);

      return {
        token: result.token!,
        downloadPath: result.download_path,
      };
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      console.error(`[ERROR] Fallo con ${browserType}: ${errorMsg}`);

      if (i < BROWSER_ORDER.length - 1) {
        const delay = (i + 1) * 5000;
        console.log(`[INFO] Esperando ${delay / 1000}s para siguiente intento...`);
        await sleep(delay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falló la automatización con todos los navegadores");
}

/**
 * Runs the Banxico automation process managed by CEP service
 */
export async function runBanxicoAutomation(
  cepId: string,
  ceps: Map<string, CepStatus>,
  inputFilePath: string,
  email: string,
  format: FormatType = FormatType.BOTH
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) throw new Error(`CEP ${cepId} no encontrado en memoria`);

  let tempDownloadPath: string | undefined;

  try {
    // 1. Run Automation
    const { token, downloadPath } = await executeAutomationWithFallback(cepId, inputFilePath, email, format);
    tempDownloadPath = downloadPath;

    // 2. Upload to n8n Webhook
    await uploadToN8n(downloadPath, cepId);

    // 3. Update Status
    cep.token = token;
    cep.status = CepTypeStatus.COMPLETED;
    cep.banxico_result_path = "Enviado a n8n"; // Using string since download_available depends on it being truthy
    cep.completed_at = new Date().toISOString();
  } catch (error: any) {
    console.error(`[ERROR] Proceso Banxico fallido para ${cepId}:`, error.message);

    cep.status = CepTypeStatus.FAILED;
    cep.error = error.message;
    cep.completed_at = new Date().toISOString();

    // If we have a local file but upload failed, we might want to keep the local path as fallback?
    // Requirement says "nothing local", but for debugging/fallback maybe?
    // Adhering to strict requirement: if upload fails, it fails.
  } finally {
    // 4. Cleanup
    if (tempDownloadPath) cleanupFile(tempDownloadPath);
    // Note: inputFilePath is managed by cep.service / txt-generator, potentially should be cleaned too?
    // Leaving inputFilePath cleanup to caller or separate cleanup routine if intended.
  }
}
