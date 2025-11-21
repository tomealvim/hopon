import { GOOGLE_VISION_API_URL } from "../config/google";

/**
 * Extrai texto de uma imagem usando Google Cloud Vision API
 * @param imageDataUrl - Imagem em formato data URL (base64)
 * @returns Texto extraído da imagem
 */
export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  try {
    // Remover o prefixo "data:image/...;base64," para obter apenas o base64
    const base64Image = imageDataUrl.split(",")[1];

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 1,
            },
          ],
        },
      ],
    };

    const response = await fetch(GOOGLE_VISION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();

    // Extrair o texto completo da resposta
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error("Nenhum texto encontrado na imagem");
    }

    // O primeiro elemento contém todo o texto detectado
    const extractedText = textAnnotations[0].description;

    return extractedText;
  } catch (error) {
    console.error("Erro ao extrair texto com Google Vision:", error);
    throw error;
  }
}

