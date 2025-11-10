export function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${date}-${time}-${random}`;
}
