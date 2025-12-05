import { CepStatus } from "../types/cep.types";
import { BrowserType, CepTypeStatus, FormatType } from "../types/global.enums";
import { BanxicoAutomation } from "./banxico-automation.service";

const BROWSER_ORDER = [BrowserType.CHROMIUM, BrowserType.FIREFOX, BrowserType.WEBKIT];

const isDev = process.env.NODE_ENV !== "production";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBanxicoAutomation(
  cepId: string,
  ceps: Map<string, CepStatus>,
  filepath: string,
  email: string,
  format: FormatType = FormatType.BOTH
): Promise<void> {
  const cep = ceps.get(cepId);
  if (!cep) throw new Error("CEP no encontrado");

  let automationResult = null;
  let lastError = null;

  for (let i = 0; i < BROWSER_ORDER.length; i++) {
    const browserType = BROWSER_ORDER[i] as BrowserType;
    const attempt = i + 1;

    try {
      console.log(`🔄 Intento ${attempt}/${BROWSER_ORDER.length}: ${browserType.toUpperCase()}`);
      const pauseSeconds = i === 0 ? 10 : 20 + (i - 1) * 15;
      const automation = new BanxicoAutomation(cepId);
      automationResult = await automation.automate(filepath, email, format, pauseSeconds, browserType, true);
      break;
    } catch (error: unknown) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";

      if (isDev) {
        console.error(`❌ Error en ${browserType}:`, errorMsg);
      } else {
        console.error(`❌ Error en intento ${attempt} con ${browserType}`);
      }

      if (i < BROWSER_ORDER.length - 1) {
        const delay = (i + 1) * 8000;
        console.log(`⏳ Esperando ${delay / 1000}s antes de intentar con el siguiente navegador...`);
        await sleep(delay);
      }
    }
  }

  if (!automationResult) {
    const finalError =
      isDev && lastError instanceof Error
        ? lastError.message
        : "Falló la automatización con todos los navegadores disponibles";
    throw new Error(finalError);
  }

  cep.token = automationResult.token;
  cep.status = CepTypeStatus.COMPLETED;
  cep.result = automationResult;
  cep.banxico_result_path = automationResult.download_path;
}
