import fs from "fs";
import path from "path";

export class FileManager {
  private static readonly ROOT_DIR = process.cwd();

  public static readonly OUTPUTS_DIR = path.join(FileManager.ROOT_DIR, "outputs");
  public static readonly DOWNLOADS_DIR = path.join(FileManager.ROOT_DIR, "downloads");
  public static readonly SCREENSHOTS_DIR = path.join(FileManager.ROOT_DIR, "screenshots");

  public static initializeDirectories(): void {
    const directories = [FileManager.OUTPUTS_DIR, FileManager.DOWNLOADS_DIR, FileManager.SCREENSHOTS_DIR];

    directories.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Directorio creado: ${dir}`);
        }
      } catch (error) {
        console.error(`Error al crear directorio ${dir}:`, error);
      }
    });
  }

  public static getOutputPath(cepId: string): string {
    return path.join(FileManager.OUTPUTS_DIR, `${cepId}.txt`);
  }

  public static getDownloadPath(cepId: string, filename?: string): string {
    const name = filename || `${cepId}.zip`;
    return path.join(FileManager.DOWNLOADS_DIR, name);
  }

  public static getScreenshotPath(cepId: string, name: string): string {
    return path.join(FileManager.SCREENSHOTS_DIR, `${cepId}_${name}.png`);
  }

  public static existsFile(filepath: string): boolean {
    return fs.existsSync(filepath);
  }

  public static deleteFile(filepath: string): void {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}
