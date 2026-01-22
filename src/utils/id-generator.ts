/**
 * Generates a unique identifier in the format: YYYYMMDD-HHMM-XXX
 * Where XXX is a random 3-character alphanumeric string
 * @returns {string} Unique identifier
 */
export function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 5).replace(":", "");
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
