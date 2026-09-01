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

export function formatWhatsAppPhone(phone: string): string {
  const digits = normalizeAlgerianPhone(phone).replace(/\D/g, "");

  if (digits.startsWith("213")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `213${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppUrl(
  beneficiaryPhone: string,
  message: string,
): string | null {
  const formattedPhone = formatWhatsAppPhone(beneficiaryPhone);

  if (!formattedPhone) {
    return null;
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
