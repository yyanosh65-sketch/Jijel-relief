export function parseDataUrl(
  dataUrl: string,
): { buffer: Buffer; mediaType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    return null;
  }

  return {
    mediaType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export function assertGeminiConfigured(): void {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY للتحليل الصوتي/البصري.",
    );
  }
}
