import { writeFile } from 'fs/promises';

import type { BanxicoTxtRow } from '@defs/cep.types';
import { FileManager } from '@utils/file-manager';

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

function validatePayment(payment: BanxicoTxtRow): PaymentValidationResult {
  const errors: string[] = [];
  const ref = payment.trackingKey || '(no tracking key)';

  if (!payment.paymentDate) {
    errors.push(`Missing paymentDate for ${ref}`);
  }

  if (!payment.trackingKey) {
    errors.push('Missing trackingKey');
  }

  if (!payment.senderInstitutionCode) {
    errors.push(`Missing senderInstitutionCode for ${ref}`);
  }

  if (!payment.receiverInstitutionCode) {
    errors.push(`Missing receiverInstitutionCode for ${ref}`);
  }

  if (!payment.beneficiaryAccount) {
    errors.push(`Missing beneficiaryAccount for ${ref}`);
  }

  const amountStr = String(payment.amount).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(amountStr)) {
    errors.push(`Invalid amount format: "${payment.amount}" for ${ref}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function formatPaymentToCSV(payment: BanxicoTxtRow): string {
  const paymentDate = payment.paymentDate.split('T')[0];
  const amountStr = String(payment.amount).trim().replace(/,/g, '');

  return `${paymentDate},${payment.trackingKey},${payment.senderInstitutionCode},${payment.receiverInstitutionCode},${payment.beneficiaryAccount},${amountStr}`;
}

/**
 * Generates a TXT file from payment records in Banxico format
 */
export async function generateTxt(
  payments: BanxicoTxtRow[],
  cepId: string
): Promise<TxtGenerationResult> {
  try {
    const validationErrors: string[] = [];
    payments.forEach((payment, index) => {
      const validation = validatePayment(payment);
      if (!validation.valid) {
        validationErrors.push(`Record ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation errors: ${validationErrors.join('; ')}`,
      };
    }

    const lines = payments.map(formatPaymentToCSV);
    const content = lines.join('\n') + '\n';

    const filepath = FileManager.getOutputPath(cepId);
    await writeFile(filepath, content, 'utf8');

    return {
      success: true,
      filepath,
      recordCount: payments.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating TXT file',
    };
  }
}

export function validatePayments(payments: BanxicoTxtRow[]): PaymentValidationResult {
  const errors: string[] = [];

  payments.forEach((payment, index) => {
    const validation = validatePayment(payment);
    if (!validation.valid) {
      errors.push(`Record ${index + 1}: ${validation.errors.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
