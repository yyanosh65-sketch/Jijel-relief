const FACEBOOK_URL_PATTERN =
  /https?:\/\/(?:www\.|m\.|web\.)?(?:facebook|fb)\.com\/[^\s<>"')\]]+/i;

export function extractFacebookUrl(rawInput: string): string | null {
  const match = rawInput.match(FACEBOOK_URL_PATTERN);
  if (!match?.[0]) return null;

  return match[0].replace(/[),.،؛]+$/, "");
}

export function isFacebookUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return FACEBOOK_URL_PATTERN.test(value);
}
