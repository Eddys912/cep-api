import { writeFile } from "fs/promises";
import { ElectronicPayment } from "../types/cep.types";
import { FileManager } from "./file-manager";

export async function generateTxt(payments: ElectronicPayment[], cepId: string): Promise<string> {
  const filepath = FileManager.getOutputPath(cepId);

  const lines = payments.map((payment) => {
    const paymentDate = payment.fecha_pago.split("T")[0];

    let amountStr = String(payment.monto).trim();
    amountStr = amountStr.replace(/,/g, "");

    if (!/^-?\d+(\.\d+)?$/.test(amountStr)) {
      throw new Error(`Formato de monto inválido: "${payment.monto}" para clave_rastreo ${payment.clave_rastreo}`);
    }

    return `${paymentDate},${payment.clave_rastreo},${payment.clave_institucion_emisora},${payment.clave_institucion_receptora},${payment.cuenta_beneficiario},${amountStr}`;
  });

  const content = lines.join("\n") + "\n";
  await writeFile(filepath, content, "utf8");

  return filepath;
}
