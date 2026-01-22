import fs from "fs";
import path from "path";

export interface DirectoryInitResult {
  success: boolean;
  created: string[];
  errors: Array<{ directory: string; error: string }>;
}

export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
}

export class FileManager {
  private static readonly ROOT_DIR = process.env.NODE_ENV === "production" ? "/tmp" : process.cwd();

  public static readonly OUTPUTS_DIR = path.join(FileManager.ROOT_DIR, "outputs");

  public static initializeDirectories(): DirectoryInitResult {
    const directories = [FileManager.OUTPUTS_DIR];
    const created: string[] = [];
    const errors: Array<{ directory: string; error: string }> = [];

    directories.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          created.push(dir);
        }
      } catch (error) {
        errors.push({
          directory: dir,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  }

  /**
   * Gets the full path for an output TXT file
   * @param {string} cepId - CEP identifier
   * @returns {string} Full path to the output file
   */
  public static getOutputPath(cepId: string): string {
    return path.join(FileManager.OUTPUTS_DIR, `${cepId}.txt`);
  }

  /**
   * Checks if a file exists
   * @param {string} filepath - Path to the file
   * @returns {boolean} True if file exists, false otherwise
   */
  public static existsFile(filepath: string): boolean {
    try {
      return fs.existsSync(filepath);
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file if it exists
   * @param {string} filepath - Path to the file to delete
   * @returns {FileOperationResult} Result of the delete operation
   */
  public static deleteFile(filepath: string): FileOperationResult {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true, path: filepath };
      }
      return { success: true, path: filepath }; // File doesn't exist, consider it success
    } catch (error) {
      return {
        success: false,
        path: filepath,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Deletes multiple files
   * @param {string[]} filepaths - Array of file paths to delete
   * @returns {FileOperationResult[]} Array of results for each file
   */
  public static deleteFiles(filepaths: string[]): FileOperationResult[] {
    return filepaths.map((filepath) => FileManager.deleteFile(filepath));
  }

  /**
   * Gets the size of a file in bytes
   * @param {string} filepath - Path to the file
   * @returns {number | null} File size in bytes, or null if file doesn't exist
   */
  public static getFileSize(filepath: string): number | null {
    try {
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        return stats.size;
      }
      return null;
    } catch {
      return null;
    }
  }
}
