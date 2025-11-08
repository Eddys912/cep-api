import * as fs from "fs";
import { Browser, BrowserContext, chromium, firefox, Page, webkit } from "playwright";
import { BrowserType, FormatType } from "../types/global.types";
import { moveMouseHuman, scrollHuman, simulateHumanActivity, waitForRecaptcha } from "../utils/humanEvents";

class BanxicoAutomation {
  private browser: Browser | null = null;
  private downloadPath: string = "./downloads";

  constructor() {
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

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

  private async uploadFileAndGetToken(
    page: Page,
    filepath: string,
    email: string,
    format: FormatType
  ): Promise<string> {
    console.log("⏳ Llenando formulario y cargando archivo...");
    await simulateHumanActivity(page);

    // 1. Subir Archivo
    await page.waitForSelector('input[type="file"]', { state: "visible", timeout: 15000 });
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const box = await fileInput.boundingBox();
      if (box) {
        await moveMouseHuman(page, box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(Math.random() * 500 + 300);
      }
    }
    await page.setInputFiles('input[type="file"]', filepath);
    await page.waitForTimeout(Math.random() * 2000 + 1500);

    // 2. Llenar Email
    await page.waitForSelector('input[type="email"][name="correo"]', { state: "visible" });
    const emailInput = page.locator('input[type="email"][name="correo"]');
    const emailBox = await emailInput.boundingBox();
    if (emailBox) await moveMouseHuman(page, emailBox.x + emailBox.width / 2, emailBox.y + emailBox.height / 2);
    await emailInput.click();
    await page.waitForTimeout(Math.random() * 500 + 300);

    await emailInput.fill("");
    for (const char of email) {
      await page.keyboard.type(char, { delay: Math.random() * 120 + 60 });
      if (Math.random() > 0.9) {
        await page.waitForTimeout(Math.random() * 400 + 200);
      }
    }
    await page.waitForTimeout(Math.random() * 1500 + 800);
    await scrollHuman(page);

    // 3. Seleccionar Formato
    await page.waitForSelector('select[name="formato"]', { state: "visible" });
    const formatMap = { pdf: "1", xml: "2", ambos: "3" };
    await page.selectOption('select[name="formato"]', formatMap[format]);
    await page.waitForTimeout(Math.random() * 800 + 500);
    await simulateHumanActivity(page);

    // 4. Clic en Cargar archivo (Envío)
    await page.waitForSelector('input[type="button"][value="Cargar archivo"]', { state: "visible" });
    const cargarButton = await page.$('input[type="button"][value="Cargar archivo"]');
    if (cargarButton) {
      const box = await cargarButton.boundingBox();
      if (box) {
        await moveMouseHuman(page, box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(Math.random() * 1000 + 1000);
      }
    }

    await waitForRecaptcha(page, 10000);
    await page.locator('input[type="button"][value="Cargar archivo"]').click({ delay: Math.random() * 50 + 20 });

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(4000);

    // 5. Verificar y Extraer Token
    const content = await page.content();
    const tokenMatch = content.match(/Token:\s*<strong>\s*([A-Za-z0-9]+)\s*<\/strong>/i);

    if (tokenMatch) {
      return tokenMatch[1];
    } else if (content.includes("Ha ocurrido un error al procesar su solicitud")) {
      throw new Error("ERROR_BANXICO_GENERICO");
    } else {
      await page.screenshot({ path: "error_no_token_desconocido.png", fullPage: true });
      throw new Error("Token no encontrado después del envío.");
    }
  }

  private async attemptQueryAndDownload(
    page: Page,
    email: string,
    token: string,
    pauseSeconds: number
  ): Promise<string> {
    console.log("⏳ Iniciando proceso de consulta...");

    // Navegar a consulta
    await scrollHuman(page);
    await page.click('a[href="inicio2.do"]');
    await page.waitForTimeout(Math.random() * 3000 + 1500);

    await simulateHumanActivity(page);
    await scrollHuman(page);

    // Llenar credenciales de consulta
    const emailInputConsulta = page.locator('input[type="email"][name="correo"]');
    await emailInputConsulta.click();
    await emailInputConsulta.fill(email);
    await page.waitForTimeout(600);

    const tokenInput = page.locator('input[type="text"][name="token"]');
    await tokenInput.click();
    await tokenInput.fill(token);
    await page.waitForTimeout(500);

    await scrollHuman(page);

    console.log(`\n⚠️ RESUELVE EL CAPTCHA MANUALMENTE`);
    console.log(`Esperando ${pauseSeconds} segundos para resolver captcha...`);
    await page.waitForTimeout(pauseSeconds * 1000);

    await waitForRecaptcha(page, 5000);

    // Hacer clic en Consultar resultado
    console.log("⏳ Consultando resultado...");
    const consultarButton = await page.$('input[type="button"][value="Consultar resultado"]');
    if (consultarButton) {
      const box = await consultarButton.boundingBox();
      if (box) {
        await moveMouseHuman(page, box.x + box.width / 2, box.y + box.height / 2);
      }
    }
    await page.locator('input[type="button"][value="Consultar resultado"]').click();

    // Esperar respuesta del servidor
    console.log("⏳ Esperando respuesta del servidor...");
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(3000);

    // Verificar si hay error de Banxico
    const htmlAfterQuery = await page.content();
    const pageTitle = await page.title();

    if (pageTitle.includes("ERROR") || htmlAfterQuery.includes("Ha ocurrido un error al procesar su solicitud")) {
      console.log("⚠️ Error detectado en la consulta (página de error de Banxico)");
      await page.screenshot({ path: `error_consulta_${token}_${Date.now()}.png`, fullPage: true });
      throw new Error("ERROR_BANXICO_CONSULTA");
    }

    // Intentar encontrar el botón de descarga
    console.log("⏳ Esperando el botón 'Descargar' después de la consulta (máximo 15 segundos)...");
    try {
      await page.waitForSelector('input[type="button"][value="Descargar"]', { timeout: 15000 });
      console.log("✅ Botón Descargar encontrado. Listo para la descarga.");
    } catch (timeoutError) {
      await page.screenshot({ path: `error_no_descarga_${token}_${Date.now()}.png`, fullPage: true });

      // Si no está el botón de descarga, puede ser un error
      if (htmlAfterQuery.includes("Ha ocurrido un error")) {
        throw new Error("ERROR_BANXICO_CONSULTA");
      } else {
        throw new Error("No se encontró el botón Descargar dentro del tiempo límite (15s).");
      }
    }

    // Descargar archivo
    await scrollHuman(page);
    await page.waitForTimeout(Math.random() * 500 + 300);

    console.log("📥 Descargando archivo...");
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.click('input[type="button"][value="Descargar"]');

    const download = await downloadPromise;
    const finalDownloadPath = `${this.downloadPath}/${download.suggestedFilename()}`;
    await download.saveAs(finalDownloadPath);
    console.log(`\n✅ Archivo descargado exitosamente: ${finalDownloadPath}`);

    return finalDownloadPath;
  }

  public async automate(
    filepath: string,
    email: string,
    format: FormatType = FormatType.BOTH,
    pauseSeconds: number = 20,
    browserType: BrowserType = BrowserType.CHROMIUM,
    useHeadless: boolean = true
  ): Promise<{ success: boolean; message: string; token?: string; downloadPath: string }> {
    const BrowserEngine = this.getBrowserEngine(browserType);
    const maxUploadRetries = 3;
    const maxQueryRetries = 3;
    let context: BrowserContext;
    let page: Page;
    let token: string | undefined;
    let finalDownloadPath: string | undefined;

    try {
      console.log(`🚀 Iniciando navegador ${browserType.toUpperCase()}...`);

      const launchOptions: any = {
        headless: useHeadless,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
          "--disable-features=IsolateOrigins,site-per-process",
          "--lang=es-MX,es",
        ],
      };

      if (browserType === BrowserType.CHROMIUM) {
        launchOptions.args.push(
          "--disable-web-security",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        );
      }

      if (browserType === BrowserType.FIREFOX) {
        launchOptions.channel = "firefox";
        launchOptions.firefoxUserPrefs = {
          "dom.webdriver.enabled": false,
          useAutomationExtension: false,
          "general.useragent.override":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
        };
      }

      this.browser = await BrowserEngine.launch(launchOptions);

      context = await this.browser.newContext({
        userAgent:
          browserType === BrowserType.CHROMIUM
            ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            : browserType === BrowserType.FIREFOX
            ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"
            : undefined,
        viewport: { width: 1366, height: 768 },
        locale: "es-MX",
        timezoneId: "America/Mexico_City",
        acceptDownloads: true,
        extraHTTPHeaders: {
          "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        permissions: ["geolocation"],
        colorScheme: "light",
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        javaScriptEnabled: true,
      });

      page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
        Object.defineProperty(navigator, "languages", { get: () => ["es-MX", "es", "en-US", "en"] });
        (window as any).chrome = { runtime: {}, loadTimes: function () {}, csi: function () {}, app: {} };
        Object.defineProperty(navigator, "plugins", {
          get: () => [
            {
              0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin",
            },
          ],
        });

        const originalQuery = window.navigator.permissions.query;
        (window.navigator.permissions.query as any) = (parameters: any) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: "prompt" } as PermissionStatus)
            : originalQuery(parameters);

        const originalToString = Function.prototype.toString;
        Function.prototype.toString = function () {
          if (this === window.navigator.permissions.query) {
            return "function query() { [native code] }";
          }
          return originalToString.call(this);
        };
      });

      console.log("🌐 Navegando a la página de Banxico...");
      await page.goto("https://www.banxico.org.mx/cep-scl/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // --- FASE 1: Subida del Archivo (con reintentos) ---
      for (let intento = 1; intento <= maxUploadRetries; intento++) {
        try {
          token = await this.uploadFileAndGetToken(page, filepath, email, format);
          console.log(`\n✅ Archivo cargado correctamente en intento ${intento}/${maxUploadRetries}. Token: ${token}`);
          break;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Error desconocido";

          if (intento < maxUploadRetries && errorMsg.includes("ERROR_BANXICO_GENERICO")) {
            console.log(
              `\n🔄 Error en la subida (intento ${intento}/${maxUploadRetries}). Regresando e intentando nuevamente...`
            );

            await page.click('a[href="inicio.do"]');
            await page.waitForTimeout(intento * 5000 + Math.random() * 2000);
            await page.waitForSelector('input[type="file"]', { state: "visible", timeout: 30000 });
            await scrollHuman(page);
            continue;
          }
          throw error;
        }
      }

      if (!token) throw new Error("Falló la subida del archivo después de 3 reintentos internos.");

      // --- FASE 2: Consulta y Descarga (con reintentos) ---
      await page.waitForTimeout(Math.random() * 1000 + 500);
      await page.click('input[type="button"][value="Regresar"]');
      await page.waitForTimeout(2000);

      for (let intento = 1; intento <= maxQueryRetries; intento++) {
        try {
          finalDownloadPath = await this.attemptQueryAndDownload(page, email, token, pauseSeconds);
          console.log(`\n✅ Consulta y descarga exitosas en intento ${intento}/${maxQueryRetries}`);
          break;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Error desconocido";

          if (intento < maxQueryRetries && errorMsg.includes("ERROR_BANXICO_CONSULTA")) {
            console.log(
              `\n🔄 Error en la consulta (intento ${intento}/${maxQueryRetries}). Regresando a inicio y reintentando...`
            );

            try {
              await page.click('a[href="inicio.do"]');
            } catch {
              await page.goto("https://www.banxico.org.mx/cep-scl/inicio.do", {
                waitUntil: "domcontentloaded",
                timeout: 30000,
              });
            }

            const waitTime = intento * 6000 + Math.random() * 3000;
            console.log(`⏳ Esperando ${Math.round(waitTime / 1000)} segundos antes del siguiente intento...`);
            await page.waitForTimeout(waitTime);
            await scrollHuman(page);
            continue;
          }
          throw error;
        }
      }

      if (!finalDownloadPath) {
        throw new Error(
          "Falló la consulta/descarga después de 3 reintentos. Posible detección de bot o error persistente del servidor."
        );
      }

      await this.browser.close();

      return {
        success: true,
        message: `Token: ${token}`,
        token,
        downloadPath: finalDownloadPath,
      };
    } catch (error) {
      if (this.browser) await this.browser.close();
      console.error("⛔ La automatización falló:", (error as Error).message);
      throw error;
    }
  }
}

export async function automateBanxicoWithPause(
  filepath: string,
  email: string,
  format: FormatType = FormatType.BOTH,
  pauseSeconds: number = 25,
  browserType: BrowserType = BrowserType.CHROMIUM,
  useHeadless: boolean = true
): Promise<{ success: boolean; message: string; token?: string; downloadPath: string }> {
  const automation = new BanxicoAutomation();
  return automation.automate(filepath, email, format, pauseSeconds, browserType, useHeadless);
}
