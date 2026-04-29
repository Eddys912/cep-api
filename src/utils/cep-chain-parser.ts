import type { BanxicoTxtRow } from '@defs/cep.types';

/**
 * Extracts a Banxico chain string from an external API row.
 * External contract uses `cadena`.
 */
export function extractChainFromExternalItem(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }
  const o = item as Record<string, unknown>;
  if (typeof o.cadena === 'string' && o.cadena.trim()) {
    return o.cadena.trim();
  }
  return undefined;
}

/**
 * Parses a comma-separated Banxico chain line into the internal TXT row model.
 */
export function parseBanxicoChainToTxtRow(chain: string): BanxicoTxtRow {
  const parts = chain.split(',').map((s) => s.trim());
  if (parts.length < 6) {
    throw new Error(
      `Invalid chain: expected 6 comma-separated fields, got ${parts.length}`
    );
  }
  const [
    paymentDate,
    trackingKey,
    senderInstitutionCode,
    receiverInstitutionCode,
    beneficiaryAccount,
    amount,
  ] = parts;
  return {
    paymentDate,
    trackingKey,
    senderInstitutionCode,
    receiverInstitutionCode,
    beneficiaryAccount,
    amount,
  };
}
