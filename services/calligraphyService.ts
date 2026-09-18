import { Type } from "@google/genai";
import { ai } from "./geminiService";
import { CalligraphyAnalysis } from "../types/calligraphy";

/**
 * Servicio para analizar la caligrafía y ortografía de los niños mediante imágenes.
 */
export const calligraphyService = {
  
  /**
   * Analiza una imagen de escritura manual y devuelve una evaluación detallada.
   */
  async analyzeHandwriting(base64Image: string, grade: string): Promise<CalligraphyAnalysis> {
    const prompt = `Analiza esta imagen de escritura manual realizada por un niño de ${grade}. 
    Evalúa los siguientes aspectos:
    1. Legibilidad: ¿Se entiende bien lo que escribe?
    2. Trazo: ¿La presión y forma de las letras es consistente?
    3. Espaciado: ¿Hay buen espacio entre palabras y letras?
    4. Ortografía: Detecta errores ortográficos en el texto escrito.
    5. Rasgos Psicológicos/Grafológicos: Basándote en la presión, inclinación y forma de las letras, identifica posibles rasgos de personalidad o estado emocional (ej: timidez, impulsividad, concentración, orden mental).
    
    Genera una puntuación del 1 al 10 y un plan de ejercicios específicos para mejorar.
    Para cada ejercicio del "practicePlan", genera un campo "printableContent" que contenga el texto o la plantilla exacta que el niño debe practicar. 
    IMPORTANTE: El "printableContent" NO debe estar vacío. Debe contener frases, palabras o letras repetidas para que el niño las calque o las copie. Por ejemplo: "La lluvia en Sevilla es una pura maravilla\nLa lluvia en Sevilla es una pura maravilla..." o "abecedario: a a a b b b c c c...".
    Este contenido se mostrará en una ficha con líneas para que el niño practique sobre ellas.`;

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
            score: { type: Type.NUMBER, description: "Puntuación de 1 a 10" },
            legibility: { type: Type.STRING, description: "Evaluación de la legibilidad" },
            strokeFeedback: { type: Type.STRING, description: "Feedback sobre el trazo" },
            spacingFeedback: { type: Type.STRING, description: "Feedback sobre el espaciado" },
            psychologicalAnalysis: { type: Type.STRING, description: "Análisis grafológico/psicológico para el tutor" },
            spellingErrors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de palabras con errores detectados" 
            },
            generalFeedback: { type: Type.STRING, description: "Resumen motivador para el niño" },
            practicePlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  target: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ["fácil", "medio", "difícil"] },
                  printableContent: { type: Type.STRING, description: "Texto o plantilla para practicar" }
                },
                required: ["title", "description", "target", "difficulty", "printableContent"]
              }
            }
          },
          required: ["score", "legibility", "strokeFeedback", "spacingFeedback", "spellingErrors", "generalFeedback", "practicePlan"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as CalligraphyAnalysis;
  }
};
