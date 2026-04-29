/**
 * Formats a Date object using Mexico City local date in YYYY-MM-DD.
 */
function formatDateInMexico(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns current date-time in Mexico City timezone as YYYY-MM-DDTHH:mm:ss.
 */
export function getMexicoDateTimeISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Returns current date in Mexico City timezone as YYYY-MM-DD.
 */
export function getMexicoTodayDate(): string {
  return formatDateInMexico(new Date());
}

/**
 * Utility function to get yesterday's date in Mexico City timezone (YYYY-MM-DD)
 */
export function getYesterdayDate(): string {
  const mexicoToday = getMexicoTodayDate();
  const mexicoNow = new Date(`${mexicoToday}T12:00:00-06:00`);
  mexicoNow.setDate(mexicoNow.getDate() - 1);

  // formatDateInMexico ensures the final date string is normalized to Mexico timezone.
  return formatDateInMexico(mexicoNow);
}

/**
 * Utility function to get a date N days ago in ISO format (YYYY-MM-DD)
 * @param {number} daysAgo - Number of days to subtract from today
 * @returns {string} Date in ISO format
 */
export function getDateDaysAgo(daysAgo: number): string {
  const todayMexico = getMexicoTodayDate();
  const base = new Date(`${todayMexico}T12:00:00-06:00`);
  base.setDate(base.getDate() - daysAgo);
  return formatDateInMexico(base);
}

/**
 * Utility function to format a Date object to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object to format
 * @returns {string} Date in ISO format
 */
export function formatDateToISO(date: Date): string {
  return formatDateInMexico(date);
}
