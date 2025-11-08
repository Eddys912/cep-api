import { writeFile } from "fs/promises";
import { join } from "path";
import { PagoElectronico } from "../types/cep.types";

/**
 * Generates a comma-separated TXT file in LF (Unix) line ending format
 * from an array of electronic payments, preserving exact monetary amounts.
 *
 * @param payments - Array of payment records to export
 * @param jobId - Unique identifier for the job (used in filename)
 * @returns Promise resolving to the absolute file path of the generated TXT
 */
export async function generateTxtFile(payments: PagoElectronico[], jobId: string): Promise<string> {
  const filename = `cep_${jobId}.txt`;
  const filepath = join(__dirname, "../..", "outputs", filename);

  const lines = payments.map((payment) => {
    const paymentDate = payment.fecha_pago.split("T")[0];

    let amountStr = String(payment.monto).trim();
    amountStr = amountStr.replace(/,/g, "");

    if (!/^-?\d+(\.\d+)?$/.test(amountStr)) {
      throw new Error(`Invalid amount format: "${payment.monto}" for clave_rastreo ${payment.clave_rastreo}`);
    }

    return `${paymentDate},${payment.clave_rastreo},${payment.clave_institucion_emisora},${payment.clave_institucion_receptora},${payment.cuenta_beneficiario},${amountStr}`;
  });

  const content = lines.join("\n") + "\n";
  await writeFile(filepath, content, "utf8");

  return filepath;
}
