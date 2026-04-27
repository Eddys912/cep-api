import { writeFile } from "fs/promises";
import { ElectronicPayment } from "../types/cep.types";
import { FileManager } from "./file-manager";

export interface TxtGenerationResult {
  success: boolean;
  filepath?: string;
  recordCount?: number;
  error?: string;
}

interface PaymentValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a single payment record
 * @param {ElectronicPayment} payment - Payment record to validate
 * @returns {PaymentValidationResult} Validation result
 */
function validatePayment(payment: ElectronicPayment): PaymentValidationResult {
  const errors: string[] = [];

  if (!payment.fecha_pago) {
    errors.push(`Missing fecha_pago for clave_rastreo ${payment.clave_rastreo}`);
  }

  if (!payment.clave_rastreo) {
    errors.push("Missing clave_rastreo");
  }

  if (!payment.clave_institucion_emisora) {
    errors.push(`Missing clave_institucion_emisora for clave_rastreo ${payment.clave_rastreo}`);
  }

  if (!payment.clave_institucion_receptora) {
    errors.push(`Missing clave_institucion_receptora for clave_rastreo ${payment.clave_rastreo}`);
  }

  if (!payment.cuenta_beneficiario) {
    errors.push(`Missing cuenta_beneficiario for clave_rastreo ${payment.clave_rastreo}`);
  }

  const amountStr = String(payment.monto).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(amountStr)) {
    errors.push(`Invalid amount format: "${payment.monto}" for clave_rastreo ${payment.clave_rastreo}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats a payment record to CSV line
 * @param {ElectronicPayment} payment - Payment record to format
 * @returns {string} Formatted CSV line
 */
function formatPaymentToCSV(payment: ElectronicPayment): string {
  const paymentDate = payment.fecha_pago.split("T")[0];
  const amountStr = String(payment.monto).trim().replace(/,/g, "");

  return `${paymentDate},${payment.clave_rastreo},${payment.clave_institucion_emisora},${payment.clave_institucion_receptora},${payment.cuenta_beneficiario},${amountStr}`;
}

/**
 * Generates a TXT file from payment records in Banxico format
 * @param {ElectronicPayment[]} payments - Array of payment records
 * @param {string} cepId - CEP identifier for the file
 * @returns {Promise<TxtGenerationResult>} Result of the generation operation
 */
export async function generateTxt(payments: ElectronicPayment[], cepId: string): Promise<TxtGenerationResult> {
  try {
    const validationErrors: string[] = [];
    payments.forEach((payment, index) => {
      const validation = validatePayment(payment);
      if (!validation.valid) {
        validationErrors.push(`Record ${index + 1}: ${validation.errors.join(", ")}`);
      }
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation errors: ${validationErrors.join("; ")}`,
      };
    }

    const lines = payments.map(formatPaymentToCSV);
    const content = lines.join("\n") + "\n";

    const filepath = FileManager.getOutputPath(cepId);
    await writeFile(filepath, content, "utf8");

    return {
      success: true,
      filepath,
      recordCount: payments.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error generating TXT file",
    };
  }
}

/**
 * Validates payment records without generating a file
 * @param {ElectronicPayment[]} payments - Array of payment records to validate
 * @returns {PaymentValidationResult} Validation result
 */
export function validatePayments(payments: ElectronicPayment[]): PaymentValidationResult {
  const errors: string[] = [];

  payments.forEach((payment, index) => {
    const validation = validatePayment(payment);
    if (!validation.valid) {
      errors.push(`Record ${index + 1}: ${validation.errors.join(", ")}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
