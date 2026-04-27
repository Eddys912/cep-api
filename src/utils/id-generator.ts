/**
 * Generates a unique identifier in the format: YYYYMMDD-HHMMSS-XXX
 * Where YYYYMMDD can be provided, HHMMSS is the current time, and XXX is random.
 * @param {string} [dateStr] - Optional date in YYYY-MM-DD format to use as prefix
 * @returns {string} Unique identifier
 */
export function generateId(dateStr?: string): string {
  const now = new Date();
  
  // Use provided date (removing dashes) or current date
  const date = dateStr ? dateStr.replace(/-/g, "") : now.toISOString().slice(0, 10).replace(/-/g, "");
  
  // Use time with hours, minutes, seconds: HHMMSS
  const time = now.toTimeString().split(' ')[0].replace(/:/g, "");
  
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
