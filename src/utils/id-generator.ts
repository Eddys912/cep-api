import { getMexicoDateTimeISO, getMexicoTodayDate } from '@utils/date-yesterday';

/**
 * Generates a unique identifier in the format: YYYYMMDD-HHMMSS-XXX
 * Where YYYYMMDD can be provided, HHMMSS is the current time, and XXX is random.
 * @param {string} [dateStr] - Optional date in YYYY-MM-DD format to use as prefix
 * @returns {string} Unique identifier
 */
export function generateId(dateStr?: string): string {
  const nowMexico = getMexicoDateTimeISO();

  // Use provided date (removing dashes) or current date
  const date = dateStr ? dateStr.replace(/-/g, '') : getMexicoTodayDate().replace(/-/g, '');

  // Use time with hours, minutes, seconds: HHMMSS
  const time = nowMexico.split('T')[1]?.replace(/:/g, '') ?? '000000';

  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${date}-${time}-${random}`;
}

/**
 * Generates a unique identifier with custom prefix
 * @param {string} prefix - Prefix to add to the ID
 * @returns {string} Unique identifier with prefix
 */
export function generateIdWithPrefix(prefix: string): string {
  const id = generateId();
  return `${prefix}-${id}`;
}
