import { GoogleGenAI, Type } from "@google/genai";
import { EnglishLevel, EnglishLesson, EnglishEvaluation } from "../types/english";

// Usamos la variable de entorno proporcionada por la plataforma
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export const englishService = {
  /**
   * Genera una lección diaria personalizada basada en el nivel de Cambridge.
   */
  async generateDailyLesson(level: EnglishLevel, childName: string, grade: string): Promise<EnglishLesson> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Actúa como un profesor experto de Cambridge English. Genera una lección diaria para ${childName}, que está en ${grade} y tiene un nivel ${level}.
      La lección debe incluir:
      1. Listening: Un guion para un audio (que luego convertiremos a voz) y 3 preguntas de opción múltiple.
      2. Reading: Un texto corto adecuado al nivel y 3 preguntas de opción múltiple.
      3. Writing: Un prompt para que el niño escriba algo (mínimo de palabras según el nivel).
      4. Speaking: Un tema de conversación y 3 frases sugeridas.
      
      Devuelve el resultado en JSON siguiendo la estructura de EnglishLesson.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            level: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            skills: {
              type: Type.OBJECT,
              properties: {
                listening: {
                  type: Type.OBJECT,
                  properties: {
                    audioPrompt: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          correctIndex: { type: Type.NUMBER }
                        },
                        required: ["question", "options", "correctIndex"]
                      }
                    }
                  },
                  required: ["audioPrompt", "questions"]
                },
                reading: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          correctIndex: { type: Type.NUMBER }
                        },
                        required: ["question", "options", "correctIndex"]
                      }
                    }
                  },
                  required: ["text", "questions"]
                },
                writing: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING },
                    minWords: { type: Type.NUMBER }
                  },
                  required: ["prompt", "minWords"]
                },
                speaking: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["topic", "suggestedPhrases"]
                }
              },
              required: ["listening", "reading", "writing", "speaking"]
            }
          },
          required: ["id", "level", "title", "description", "skills"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{}') as EnglishLesson;
  },

  /**
   * Evalúa el trabajo de escritura del estudiante.
   */
  async evaluateWriting(text: string, prompt: string, level: EnglishLevel): Promise<EnglishEvaluation> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evalúa este texto escrito por un estudiante de nivel ${level} para el siguiente prompt: "${prompt}".
      Texto del estudiante: "${text}".
      
      Proporciona una puntuación del 0 al 100, feedback motivador, correcciones específicas (original vs corrección con explicación) y pasos a seguir.
      Devuelve el resultado en JSON siguiendo la estructura de EnglishEvaluation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["original", "correction", "explanation"]
              }
            },
            nextSteps: { type: Type.STRING }
          },
          required: ["score", "feedback", "corrections", "nextSteps"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{}') as EnglishEvaluation;
  },

  /**
   * Genera una prueba de nivel oficial (estilo Escuela de Idiomas).
   */
  async generateOfficialPlacementTest(grade: string): Promise<any> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Actúa como un examinador de la Escuela Oficial de Idiomas (EOI). Genera una prueba de nivel completa para un estudiante de ${grade}.
      La prueba debe tener 4 secciones:
      1. Use of English (10 preguntas de gramática/vocabulario de niveles variados).
      2. Reading Comprehension (Un texto de unas 200 palabras y 5 preguntas).
      3. Listening Comprehension (Un guion de audio y 5 preguntas).
      4. Writing (Un prompt para una redacción).
      
      Devuelve el resultado en JSON siguiendo la estructura de PlacementTest.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  text: { type: Type.STRING, description: "Opcional, para Reading/Listening" },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.NUMBER },
                        level: { type: Type.STRING }
                      },
                      required: ["id", "question", "options", "correctIndex", "level"]
                    }
                  }
                },
                required: ["id", "title", "instructions", "questions"]
              }
            },
            writingPrompt: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                minWords: { type: Type.NUMBER }
              },
              required: ["prompt", "minWords"]
            }
          },
          required: ["id", "sections", "writingPrompt"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{}');
  },

  /**
   * Genera preguntas para una prueba de nivel inicial.
   */
  async generatePlacementQuestions(grade: string): Promise<{ question: string; options: string[]; correctIndex: number; level: EnglishLevel }[]> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera 10 preguntas de opción múltiple para determinar el nivel de inglés de un estudiante que está en ${grade}.
      Las preguntas deben cubrir diferentes niveles de Cambridge (desde Pre-A1 hasta B2) para poder evaluar correctamente.
      Devuelve un array de objetos JSON con: question, options (4 opciones), correctIndex y el nivel que evalúa esa pregunta.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.NUMBER },
              level: { type: Type.STRING }
            },
            required: ["question", "options", "correctIndex", "level"]
          }
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '[]') as any[];
  },

  /**
   * Realiza una prueba de nivel inicial (deprecated, use generatePlacementQuestions instead).
   */
  async performPlacementTest(grade: string): Promise<{ level: EnglishLevel; explanation: string }> {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Basado en que un estudiante está en ${grade}, determina cuál sería su nivel inicial de Cambridge English más probable (Pre-A1 Starters, A1 Movers, A2 Flyers, A2 Key, B1 Preliminary, B2 First).
      Devuelve el nivel y una breve explicación de por qué.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["level", "explanation"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text || '{}') as { level: EnglishLevel; explanation: string };
  }
};
