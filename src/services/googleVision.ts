import { apiRequest } from "./api";

/**
 * Extrai texto de uma imagem usando Google Cloud Vision API (via backend)
 * @param imageDataUrl - Imagem em formato data URL (base64)
 * @returns Texto extraído da imagem
 */
export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  const data = await apiRequest<{ text: string }>("/schedules/scan-image", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
  });
  return data.text;
}

