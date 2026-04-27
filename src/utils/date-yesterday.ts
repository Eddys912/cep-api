/**
 * Utility function to get yesterday's date in ISO format (YYYY-MM-DD)
 * @returns {string} Yesterday's date in ISO format
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Utility function to get a date N days ago in ISO format (YYYY-MM-DD)
 * @param {number} daysAgo - Number of days to subtract from today
 * @returns {string} Date in ISO format
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

/**
 * Utility function to format a Date object to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object to format
 * @returns {string} Date in ISO format
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
