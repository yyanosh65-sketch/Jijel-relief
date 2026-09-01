export function normalizeAlgerianPhone(value: string): string {
  return value.replace(/[\s.-]/g, "");
}

export function isValidAlgerianPhone(value: string): boolean {
  const normalized = normalizeAlgerianPhone(value);
  return /^(?:\+213|0)(?:5|6|7)\d{8}$/.test(normalized);
}

export function formatAlgerianPhoneHint(): string {
  return "05/06/07 XX XX XX XX or +213 5XX XX XX XX";
}
