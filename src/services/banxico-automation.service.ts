import { Browser, chromium, firefox, Page, webkit } from "playwright";
import { BrowserType, FormatType } from "../types/global.enums";
import { FileManager } from "../utils/file-manager";
import { moveMouseHuman, simulateHumanActivity, waitForRecaptcha } from "../utils/human-events";

const isDev = process.env.NODE_ENV !== "production";

export interface AutomationResult {
  success: boolean;
  message: string;
  token?: string;
  download_path: string;
}

export class BanxicoAutomation {
  private browser: Browser | null = null;
  private readonly cepId: string;

  constructor(cepId: string) {
    this.cepId = cepId;
    FileManager.initializeDirectories();
  }

  /**
   * Selects the browser engine based on the type
   */
  private getBrowserEngine(browserType: BrowserType) {
    switch (browserType) {
      case BrowserType.FIREFOX:
        return firefox;
      case BrowserType.WEBKIT:
        return webkit;
      case BrowserType.CHROMIUM:
      default:
        return chromium;
    }
  }

  /**
   * Configures browser context options
   */
  private getContextOptions(browserType: BrowserType) {
    const options: any = {
      viewport: { width: 1366, height: 768 },
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
      acceptDownloads: true,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      permissions: ["geolocation"],
      colorScheme: "light",
      deviceScaleFactor: 1,
      javaScriptEnabled: true,
    };

    if (browserType === BrowserType.CHROMIUM) {
      options.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    } else if (browserType === BrowserType.FIREFOX) {
      options.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";
    }

    return options;
  }

  /**
   * Configures browser launch options
   */
  private getLaunchOptions(browserType: BrowserType, useHeadless: boolean) {
    const options: any = {
      headless: useHeadless,
      args: ["--lang=es-MX,es"],
    };

    if (browserType === BrowserType.CHROMIUM) {
      options.args.push(
        "--ignore-certificate-errors",
        "--window-position=0,0",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--disable-blink-features=AutomationControlled",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );
    } else if (browserType === BrowserType.FIREFOX) {
      options.args.push("--ignore-certificate-errors");
      options.firefoxUserPrefs = {
        "dom.webdriver.enabled": false,
        useAutomationExtension: false,
        "general.useragent.override":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
      };
    }

    return options;
  }

  /**
   * Handles the file upload process and token extraction
   */
  private async uploadFileAndGetToken(
    page: Page,
    filepath: string,
    email: string,
    format: FormatType
  ): Promise<string> {
    console.log(`[INFO] Subiendo archivo para CEP ${this.cepId}...`);
    await simulateHumanActivity(page);

    await page.waitForSelector('input[type="file"]', { state: "visible", timeout: 15000 });

    // Upload file
    await page.setInputFiles('input[type="file"]', filepath);
    await page.waitForTimeout(1000);

    // Fill email
    const emailInput = page.locator('input[type="email"][name="correo"]');
    await emailInput.click();
    await page.waitForTimeout(300);
    await emailInput.fill(email);

    // Select format
    const formatMap = { pdf: "1", xml: "2", ambos: "3" };
    await page.selectOption('select[name="formato"]', formatMap[format]);

    // Handle button interaction with enhanced human behavior
    const submitBtn = page.locator('input[type="button"][value="Cargar archivo"]#btn_grupo-footer');

    // Verify button exists and is visible
    await submitBtn.waitFor({ state: "visible", timeout: 10000 });

    // Get button position
    const box = await submitBtn.boundingBox();
    if (!box) {
      throw new Error("No se pudo obtener la posición del botón");
    }

    // Move mouse to button area in human-like manner
    await moveMouseHuman(page, box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await page.waitForTimeout(500);

    // Scroll button into view if needed
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    try {
      await submitBtn.click({ timeout: 5000 });
    } catch (error) {
      console.warn("[WARN] Clic directo falló, intentando con force...");
      await submitBtn.click({ force: true, timeout: 5000 });
    }

    try {
      // Wait for either upload page or error
      await Promise.race([
        page.waitForURL("**/upload*", { timeout: 30000 }),
        page.waitForFunction(
          () => {
            const body = document.body.innerText;
            return body.includes("Token:") || body.includes("Ha ocurrido un error");
          },
          { timeout: 30000 }
        ),
      ]);
    } catch (error) {
      console.warn("[WARN] Timeout esperando navegación, verificando contenido actual...");
    }

    // Additional wait for page to stabilize
    await page.waitForTimeout(2000);

    // Extract token from page
    const content = await page.content();
    console.log(`[DEBUG] URL actual: ${page.url()}`);

    // Multiple token extraction patterns for robustness
    const tokenPatterns = [
      /Token:\s*<strong>\s*([A-Z0-9]+)\s*<\/strong>/i,
      /Token:\s*<strong>([A-Z0-9]+)<\/strong>/i,
      /<strong>\s*([A-Z0-9]{10})\s*<\/strong>/i,
    ];

    let tokenMatch = null;
    for (const pattern of tokenPatterns) {
      tokenMatch = content.match(pattern);
      if (tokenMatch) {
        console.log(`[INFO] Token encontrado con patrón: ${pattern}`);
        break;
      }
    }

    if (tokenMatch && tokenMatch[1]) {
      const token = tokenMatch[1].trim();
      console.log(`[SUCCESS] Token extraído: ${token}`);
      return token;
    }

    if (content.includes("Ha ocurrido un error al procesar su solicitud")) {
      throw new Error("ERROR_BANXICO_GENERICO");
    }

    // Check if still on form page (click didn't work)
    const isFormPage = (await page.locator('input[type="file"]').count()) > 0;
    if (isFormPage) {
      // Take screenshot for debugging
      if (isDev) {
        await page.screenshot({ path: `debug_form_fail_${this.cepId}.png`, fullPage: true });
      }
      throw new Error("El formulario no se envió correctamente - aún en página de carga");
    }

    // Save page content for debugging
    if (isDev) {
      const fs = require("fs");
      fs.writeFileSync(`debug_no_token_${this.cepId}.html`, content);
    }

    throw new Error("Token no encontrado después del envío del formulario");
  }

  /**
   * Handles the query and download process
   */
  private async attemptQueryAndDownload(
    page: Page,
    email: string,
    token: string,
    pauseSeconds: number
  ): Promise<string> {
    console.log(`[INFO] Consultando token ${token}...`);

    await page.click('a[href="inicio2.do"]');
    await page.waitForLoadState("domcontentloaded");
    await simulateHumanActivity(page);

    // Fill email
    const emailField = page.locator('input[type="email"][name="correo"]');
    await emailField.waitFor({ state: "visible", timeout: 10000 });
    await emailField.click();
    await page.waitForTimeout(300);
    await emailField.fill(email);
    await page.waitForTimeout(500);

    // Fill token
    const tokenField = page.locator('input[type="text"][name="token"]');
    await tokenField.click();
    await page.waitForTimeout(300);
    await tokenField.fill(token);
    await page.waitForTimeout(500);

    // Wait for reCAPTCHA
    console.log(`[INFO] Esperando resolución de CAPTCHA (${pauseSeconds}s)...`);
    await page.waitForTimeout(pauseSeconds * 1000);
    await waitForRecaptcha(page, 5000);

    // Submit query
    const consultarBtn = page.locator('input[type="button"][value="Consultar resultado"]');
    await consultarBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    console.log("[INFO] Consultando resultado...");
    await consultarBtn.click();

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(2000);

    const htmlAfterQuery = await page.content();
    if (htmlAfterQuery.includes("Ha ocurrido un error") || (await page.title()).includes("ERROR")) {
      throw new Error("ERROR_BANXICO_CONSULTA: Error al consultar el token");
    }

    // Wait for download button
    console.log("[INFO] Esperando botón de descarga...");
    try {
      await page.waitForSelector('input[type="button"][value="Descargar"]', {
        state: "visible",
        timeout: 20000,
      });
    } catch {
      if (isDev) {
        await page.screenshot({ path: `debug_no_download_btn_${this.cepId}.png`, fullPage: true });
      }
      throw new Error("Botón de descarga no encontrado - verificar estado del proceso");
    }

    // Start download
    console.log(`[INFO] Iniciando descarga del archivo...`);
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.click('input[type="button"][value="Descargar"]');

    const download = await downloadPromise;
    const finalDownloadPath = FileManager.getTempDownloadPath(`${this.cepId}.zip`);
    await download.saveAs(finalDownloadPath);

    return finalDownloadPath;
  }

  /**
   * Executes the full automation flow
   */
  public async automate(
    filepath: string,
    email: string,
    format: FormatType = FormatType.BOTH,
    pauseSeconds: number = 10,
    browserType: BrowserType = BrowserType.CHROMIUM,
    useHeadless: boolean = true
  ): Promise<AutomationResult> {
    const BrowserEngine = this.getBrowserEngine(browserType);
    let token: string | undefined;
    let finalDownloadPath: string | undefined;

    try {
      console.log(`[INFO] Iniciando automatización con ${browserType} (Headless: ${useHeadless})`);

      this.browser = await BrowserEngine.launch(this.getLaunchOptions(browserType, useHeadless));
      const context = await this.browser.newContext(this.getContextOptions(browserType));
      const page = await context.newPage();

      // Stealth scripts
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        // @ts-ignore
        window.navigator.chrome = { runtime: {} };
      });

      console.log(`[INFO] Navegando a Banxico...`);
      await page.goto("https://www.banxico.org.mx/cep-scl/", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Phase 1: Upload
      const maxRetries = 3;
      for (let i = 1; i <= maxRetries; i++) {
        try {
          console.log(`[INFO] Intento ${i}/${maxRetries} de carga de archivo...`);
          token = await this.uploadFileAndGetToken(page, filepath, email, format);
          console.log(`[SUCCESS] Token obtenido: ${token}`);
          break;
        } catch (err: any) {
          if (i === maxRetries) throw err;
          console.warn(`[WARN] Intento ${i} fallido: ${err.message}. Reintentando...`);
          await page.goto("https://www.banxico.org.mx/cep-scl/inicio.do");
          await page.waitForTimeout(2000);
        }
      }

      if (!token) throw new Error("No se pudo obtener el token");

      // Phase 2: Return to main page
      console.log("[INFO] Regresando a página principal...");
      try {
        await page.click('input[type="button"][value="Regresar"]');
        await page.waitForTimeout(2000);
      } catch {
        await page.goto("https://www.banxico.org.mx/cep-scl/");
        await page.waitForTimeout(2000);
      }

      // Phase 3: Query and download
      for (let i = 1; i <= maxRetries; i++) {
        try {
          console.log(`[INFO] Intento ${i}/${maxRetries} de descarga...`);
          finalDownloadPath = await this.attemptQueryAndDownload(page, email, token, pauseSeconds);
          console.log(`[SUCCESS] Archivo descargado en: ${finalDownloadPath}`);
          break;
        } catch (err: any) {
          if (i === maxRetries) throw err;
          console.warn(`[WARN] Intento de descarga ${i} fallido: ${err.message}. Reintentando...`);
          await page.goto("https://www.banxico.org.mx/cep-scl/inicio2.do");
        }
      }

      if (!finalDownloadPath) throw new Error("No se pudo descargar el archivo");

      await this.browser.close();

      return {
        success: true,
        message: `Token: ${token}`,
        token,
        download_path: finalDownloadPath,
      };
    } catch (error: any) {
      if (this.browser) await this.browser.close();
      console.error(`[ERROR] Automatización fallida: ${error.message}`);
      throw error;
    }
  }
}
