import { Type } from "@google/genai";
import { ai } from "./geminiService";
import { ISBNLookupResponse, EvaluationResponse } from "../types/study";

/**
 * Servicio para gestionar la lógica de IA del módulo de estudio reglado.
 */
export const studyService = {
  
  /**
   * Busca los temas de un libro usando su ISBN, asignatura y opcionalmente editorial.
   */
  async lookupBookByISBN(isbn: string, subject: string, grade: string, publisher?: string): Promise<ISBNLookupResponse> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Busca información sobre el libro de texto con ISBN ${isbn} para la asignatura de ${subject} de nivel ${grade}${publisher ? ` de la editorial ${publisher}` : ''}. 
      Si encuentras más de una edición o libro que coincida, devuélvelos todos en una lista.
      Necesito el título exacto del libro, la editorial y la lista de temas o capítulos que componen su índice.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            books: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Título completo del libro" },
                  publisher: { type: Type.STRING, description: "Nombre de la editorial" },
                  topics: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Lista de temas o capítulos del índice"
                  },
                  suggestedGrade: { type: Type.STRING, description: "Nivel educativo confirmado" }
                },
                required: ["title", "publisher", "topics"]
              }
            }
          },
          required: ["books"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{"books": []}') as ISBNLookupResponse;
  },

  /**
   * Sugiere editoriales basadas en una búsqueda parcial.
   */
  async suggestPublishers(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Proporciona una lista de hasta 5 nombres de editoriales de libros de texto en España que comiencen o contengan "${query}". 
      Solo devuelve los nombres de las editoriales.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const response = await model;
    const data = JSON.parse(response.text || '{"suggestions": []}');
    return data.suggestions || [];
  },

  /**
   * Evalúa el resumen de un niño sobre un tema específico.
   */
  async evaluateSummary(
    summary: string, 
    topicTitle: string, 
    bookTitle: string, 
    grade: string
  ): Promise<EvaluationResponse> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Actúa como un tutor pedagógico experto. Un estudiante de ${grade} ha leído el tema "${topicTitle}" del libro "${bookTitle}".
      Este es su resumen: "${summary}".
      
      Evalúa el contenido y genera:
      1. Una puntuación del 1 al 10 basada en la comprensión.
      2. Feedback para el NIÑO: Motívale, corrige errores suavemente y hazle una pregunta para profundizar.
      3. Feedback para la MADRE: Informe técnico sobre qué ha entendido, qué conceptos clave le faltan y una pauta para repasar con él esta tarde.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Puntuación del 1 al 10" },
            feedbackChild: { type: Type.STRING, description: "Mensaje directo para el alumno" },
            feedbackParent: { type: Type.STRING, description: "Informe para el padre/madre" },
            conceptsMissed: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Conceptos clave que no mencionó"
            },
            isPassed: { type: Type.BOOLEAN, description: "Si el resumen es suficiente para dar por superado el tema" }
          },
          required: ["score", "feedbackChild", "feedbackParent", "isPassed"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{}') as EvaluationResponse;
  },

  /**
   * Evalúa rasgos psicológicos y médicos basados en la escritura a mano.
   */
  async evaluateHandwriting(imageData: string): Promise<{ evaluation: string }> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: `Actúa como un experto en grafología y psicología infantil. 
          Analiza esta imagen de escritura a mano de un niño.
          Proporciona una evaluación psicológica y médica breve basada en los trazos (presión, inclinación, regularidad, etc.).
          Enfócate en rasgos como: nivel de concentración, estado emocional (ansiedad, calma), motricidad fina y posibles signos de disgrafía o estrés.
          La respuesta debe ser profesional pero comprensible para un tutor. Máximo 150 palabras.` 
        },
        { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] || imageData } }
      ]
    });

    const response = await model;
    return { evaluation: response.text || "No se pudo realizar la evaluación de la escritura." };
  }
};
