
import { Type } from "@google/genai";
import { ai } from "./geminiService";
import { ReadingAnalysis } from "../types/reading";

export const readingService = {
  async analyzeReading(audioBase64: string, textToRead: string, grade: string): Promise<ReadingAnalysis> {
    const prompt = `Analiza esta grabación de audio de un niño de ${grade} leyendo el siguiente texto: "${textToRead}".
    Evalúa:
    1. Fluidez: ¿Lee con ritmo y sin demasiadas pausas?
    2. Entonación: ¿Respeta signos de puntuación y da sentido a las frases?
    3. Precisión: ¿Pronuncia correctamente todas las palabras?
    4. Comprensión: Basándote en cómo lee, ¿parece entender el texto?
    
    Genera una puntuación del 1 al 10 y un feedback motivador.
    Sugiere 2 ejercicios cortos para mejorar los puntos débiles detectados.
    IMPORTANTE: Proporciona la transcripción exacta de lo que el niño ha dicho.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: audioBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            fluency: { type: Type.STRING },
            intonation: { type: Type.STRING },
            accuracy: { type: Type.STRING },
            comprehensionScore: { type: Type.NUMBER },
            comprehensionFeedback: { type: Type.STRING },
            generalFeedback: { type: Type.STRING },
            transcription: { type: Type.STRING },
            suggestedExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  text: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ["fácil", "medio", "difícil"] }
                },
                required: ["title", "description", "text", "difficulty"]
              }
            }
          },
          required: ["score", "fluency", "intonation", "accuracy", "comprehensionScore", "comprehensionFeedback", "generalFeedback", "suggestedExercises", "transcription"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as ReadingAnalysis;
  }
};
