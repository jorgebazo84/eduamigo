
import { Type } from "@google/genai";
import { ai } from "./geminiService";
import { MathAnalysis } from "../types/math";

export const mathService = {
  async analyzeMathProblem(base64Image: string, grade: string): Promise<MathAnalysis> {
    const prompt = `Analiza esta imagen de una operación matemática (suma, resta, multiplicación o división) realizada por un niño de ${grade}.
    Evalúa:
    1. Tema: Identifica el tema matemático (ej: "Multiplicación por dos cifras", "Fracciones", "Divisiones exactas").
    2. Pasos: Identifica cada paso de la operación.
    3. Errores: Detecta errores lógicos o de cálculo.
    4. Explicación: Explica por qué se cometió el error y cómo corregirlo.
    
    Genera una puntuación del 1 al 10 y un feedback motivador.
    Sugiere 2 ejercicios similares para practicar.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
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
            topic: { type: Type.STRING },
            score: { type: Type.NUMBER },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING }
                },
                required: ["stepNumber", "description", "isCorrect", "explanation"]
              }
            },
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING },
                  errorType: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["location", "errorType", "correction", "explanation"]
              }
            },
            generalFeedback: { type: Type.STRING },
            suggestedExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  problem: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ["fácil", "medio", "difícil"] },
                  solution: { type: Type.STRING }
                },
                required: ["title", "problem", "difficulty"]
              }
            }
          },
          required: ["topic", "score", "steps", "errors", "generalFeedback", "suggestedExercises"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as MathAnalysis;
  }
};
