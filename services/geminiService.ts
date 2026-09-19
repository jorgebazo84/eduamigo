
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GradeLevel, Subject, ExplanationResponse, Region, SyllabusTopic, TopicDetail, ExamResult, Exercise, Country, ChatTurn, StudyPlan, Insight, CalendarEvent, Coordinate, AcademicGrade, ReviewTask } from "../types";
import { FALLBACK_SYLLABUS, FALLBACK_TOPIC_DETAILS, getGenericSyllabus } from "../data/fallbackData";

// Usamos la variable de entorno proporcionada por la plataforma
const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' && (window as any).process?.env?.GEMINI_API_KEY) || '';

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is not defined in the current environment; running in fallback mode.");
} else {
  console.log("✅ GEMINI_API_KEY detected (starts with:", apiKey.substring(0, 5), ")");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "demo_key" });

export class GeminiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || (error?.message?.includes('429') ? 429 : 0);
      
      if (status === 429) {
        // If it's a quota error, we throw early if we've reached max retries or if we want to signal the UI immediately
        if (attempt === maxRetries) {
           throw new GeminiError("Límite de cuota excedido. Por favor, espera un minuto antes de intentarlo de nuevo.", 429);
        }
        // Exponential backoff for 429
        const delay = 2000 * Math.pow(2, attempt); 
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (attempt < maxRetries && (status >= 500 && status <= 599)) {
        const delay = 1000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const getChatExplanation = async (
  grade: GradeLevel, 
  subject: Subject, 
  history: ChatTurn[], 
  region: Region,
  isSocratic: boolean = false
): Promise<string> => {
  return await executeWithRetry(async () => {
    const systemPrompt = isSocratic 
      ? `Eres un tutor pedagógico que NO da respuestas directas. Guía al estudiante de ${grade} mediante preguntas y pistas para que él mismo descubra la solución.` 
      : `Eres un tutor experto en el sistema educativo LOMLOE de ${region}. Explica conceptos a un nivel de ${grade}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    return response.text || "Lo siento, no he podido procesar tu duda.";
  });
};

export const analyzeSentiment = async (text: string): Promise<string> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el sentimiento de este mensaje de un niño: "${text}". Responde solo con una palabra: "positivo", "neutral", "frustrado", "triste" o "entusiasmado".`,
    });
    return response.text?.trim().toLowerCase() || "neutral";
  });
};

export const analyzeWorksheet = async (imageBase64: string, grade: GradeLevel): Promise<string> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } },
          { text: `Analiza este ejercicio de clase para un nivel de ${grade}. Explica los conceptos necesarios para resolverlo paso a paso.` }
        ]
      },
      config: {
        systemInstruction: "Eres un tutor visual. Describe el ejercicio y explica la teoría detrás de él sin dar la solución final de inmediato."
      }
    });
    return response.text || "No he podido analizar la imagen.";
  });
};

export const processSchoolCircular = async (imageBase64: string): Promise<Partial<CalendarEvent>> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } },
          { text: "Extrae cualquier fecha, evento o tarea de esta circular escolar. Devuelve solo un JSON con 'title', 'date' (YYYY-MM-DD) y 'description'." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};

export const generateStudyPlan = async (grade: GradeLevel, events: CalendarEvent[], examResults: ExamResult[]): Promise<StudyPlan> => {
  return await executeWithRetry(async () => {
    const context = `Eventos próximos: ${JSON.stringify(events)}. Resultados recientes: ${JSON.stringify(examResults)}.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Crea un plan de estudio personalizado para hoy para un nivel de ${grade}. Contexto: ${context}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  recommendation: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN }
                },
                required: ["id", "topic", "durationMinutes", "recommendation", "completed"]
              }
            }
          },
          required: ["date", "sessions"]
        }
      }
    });
    const plan = JSON.parse(response.text || '{"sessions": []}');
    plan.sessions = plan.sessions.map((s: any, idx: number) => ({
      ...s,
      id: s.id || `session-${Date.now()}-${idx}`,
      completed: s.completed || false
    }));
    return plan;
  });
};

export const getOfficialSubjects = async (grade: GradeLevel, region: Region): Promise<string[]> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Enumera todas las asignaturas oficiales (troncales, específicas y de libre configuración) para ${grade} en la comunidad autónoma de ${region} según la LOMLOE. Incluye también asignaturas como Educación Física, Religión/Valores, y Educación Plástica. Devuelve solo un array de strings en JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  });
};

export const generateReinforcementPlan = async (
  grade: GradeLevel, 
  region: Region, 
  grades: AcademicGrade[]
): Promise<StudyPlan> => {
  return await executeWithRetry(async () => {
    const gradesContext = grades.map(g => `${g.subject} (${g.term}): ${g.value}`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Genera un plan de refuerzo académico para un alumno de ${grade} en ${region}. 
      Notas actuales: ${gradesContext}. 
      Identifica las asignaturas con mayor necesidad de mejora y propón sesiones de estudio específicas con temas del currículo oficial.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  recommendation: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN }
                },
                required: ["id", "topic", "durationMinutes", "recommendation", "completed"]
              }
            }
          },
          required: ["date", "sessions"]
        }
      }
    });
    const plan = JSON.parse(response.text || '{"sessions": []}');
    plan.sessions = plan.sessions.map((s: any, idx: number) => ({
      ...s,
      id: s.id || `session-${Date.now()}-${idx}`,
      completed: s.completed || false
    }));
    return plan;
  });
};

export const getExplanation = async (grade: GradeLevel, subject: Subject, question: string, region: Region): Promise<ExplanationResponse> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explica: "${question}" para ${grade} en ${subject} de ${region}.`,
      config: {
        systemInstruction: `Eres un tutor experto LOMLOE. Formato JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            funFact: { type: Type.STRING },
          },
          required: ["explanation", "examples", "funFact"],
        },
      },
    });
    return JSON.parse(response.text || '{}') as ExplanationResponse;
  });
};

export const getSOSExplanation = async (grade: GradeLevel, subject: Subject, question: string, country: Country): Promise<ExplanationResponse> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SOCORRO: No entiendo "${question}". Explícamelo para mi nivel (${grade}) pero usa ejemplos de mi país: ${country}.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `Eres un tutor local de ${country}. Debes usar expresiones típicas, jerga cariñosa de ese país y ejemplos culturales (comida, lugares, hitos). Tu tono debe ser extremadamente cercano, como un tío o hermano mayor ayudando. Formato JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            funFact: { type: Type.STRING },
          },
          required: ["explanation", "examples", "funFact"],
        },
      },
    });
    const data = JSON.parse(response.text || '{}') as ExplanationResponse;
    return { ...data, isSOS: true, country };
  });
};

export const getSyllabus = async (region: Region, grade: GradeLevel, subject: Subject): Promise<SyllabusTopic[]> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Temario oficial LOMLOE ${subject} ${grade} ${region}.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["id", "title", "description", "subtopics"],
            },
          },
        },
      });
      return JSON.parse(response.text || '[]');
    });
  } catch (e) { 
    return FALLBACK_SYLLABUS[grade]?.[subject] || getGenericSyllabus(subject); 
  }
};

export const getTopicDetail = async (region: Region, grade: GradeLevel, subject: Subject, topic: string, subtopic: string): Promise<TopicDetail> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Desarrolla el tema "${subtopic}" para ${grade} en ${region}.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              examples: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation"],
                }
              }
            },
            required: ["title", "content", "keyPoints", "examples", "summary", "exercises"],
          },
        },
      });
      return JSON.parse(response.text || '{}');
    });
  } catch (e) { 
    return FALLBACK_TOPIC_DETAILS[subtopic] || { title: subtopic, content: "Error de conexión.", keyPoints: [], examples: [], summary: "...", exercises: [] }; 
  }
};

export const generateExam = async (grade: GradeLevel, subject: Subject, topic: string): Promise<Exercise[]> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera un examen de 10 preguntas sobre "${topic}" para ${grade} en ${subject}.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `Eres un evaluador LOMLOE. Genera 10 preguntas de opción múltiple con 3 opciones cada una. Formato JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
              },
              required: ["id", "question", "options", "correctIndex", "explanation"],
            },
          },
        },
      });
      return JSON.parse(response.text || '[]') as Exercise[];
    });
  } catch (e) {
    return [];
  }
};

export const analyzeExamResults = async (grade: GradeLevel, subject: Subject, topic: string, questions: Exercise[], answers: number[]): Promise<Partial<ExamResult>> => {
  try {
    const score = answers.filter((ans, idx) => ans === questions[idx].correctIndex).length;
    const performanceData = questions.map((q, idx) => ({
      question: q.question,
      correct: answers[idx] === q.correctIndex,
      explanation: q.explanation
    }));

    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza este resultado de examen de ${grade}: ${JSON.stringify(performanceData)} sobre ${topic}.`,
        config: {
          systemInstruction: `Como tutor pedagógico, identifica 3 fortalezas y 3 debilidades basadas en los fallos. 
          Genera también una guía de estudio descargable con explicaciones breves de los puntos fallados. Formato JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              studyGuideContent: { type: Type.STRING, description: "Markdown text for a reinforcement document" },
            },
            required: ["strengths", "weaknesses", "studyGuideContent"],
          },
        },
      });
      const analysis = JSON.parse(response.text || '{}');
      return { ...analysis, score, totalQuestions: questions.length };
    });
  } catch (e) {
    return { strengths: ["No analizado"], weaknesses: ["Revisar manualmente"], studyGuideContent: "Error en el análisis automático." };
  }
};

export const generateSpeech = async (text: string): Promise<void> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch (e) { console.error("TTS error", e); }
};

export const searchAddressViaGemini = async (address: string): Promise<{address: string, coord: Coordinate} | null> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Busca la ubicación exacta de: "${address}". Necesito la dirección normalizada y las coordenadas GPS.`,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      // Intentamos extraer información de las fuentes de Maps
      const title = chunks[0].maps?.title || address;
      // Como no tenemos geocodificación directa por API en este tool, 
      // simulamos una coordenada cercana al centro de España si no hay datos precisos
      // En una app real, usaríamos la API de Geocoding de Google Maps.
      return {
        address: title,
        coord: { lat: 40.4168, lng: -3.7038 } 
      };
    }
    return null;
  });
};

export const reverseGeocodeViaGemini = async (coord: Coordinate): Promise<string> => {
  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `¿Qué hay en las coordenadas lat: ${coord.lat}, lng: ${coord.lng}? Dame la dirección o nombre del lugar.`,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });
    return response.text || "Dirección desconocida";
  });
};
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const generateReviewTasks = async (
  grade: GradeLevel,
  topics: string[],
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<Omit<ReviewTask, 'id' | 'completed'>[]> => {
  return await executeWithRetry(async () => {
    const prompt = `Genera un plan de repaso educativo para un alumno de ${grade}.
    Los temas estudiados hoy son: ${topics.join(', ')}.
    Nivel de dificultad solicitado: ${difficulty}.
    
    Dificultad Fácil: 3 tareas de opción múltiple o conceptos básicos.
    Dificultad Media: 4 tareas que incluyan relacionar conceptos y explicaciones cortas.
    Dificultad Difícil: 5 tareas con casos prácticos, resolución de problemas y explicaciones detalladas.
    
    Devuelve un array JSON de objetos con:
    - title: Título de la tarea.
    - description: Instrucciones claras para el niño.
    - difficulty: "${difficulty}".
    - conceptsToReinforce: Lista de conceptos clave que se evalúan en esta tarea.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              conceptsToReinforce: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "difficulty", "conceptsToReinforce"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  });
};

export const evaluateReviewTask = async (
  grade: GradeLevel,
  task: ReviewTask,
  answer: string
): Promise<{ aiFeedback: string; score: number; conceptsToReinforce: string[] }> => {
  return await executeWithRetry(async () => {
    const prompt = `Evalúa la respuesta de un alumno de ${grade} a la siguiente tarea de repaso:
    Tarea: ${task.title}
    Descripción: ${task.description}
    Respuesta del alumno: ${answer}
    
    Proporciona:
    1. Feedback constructivo y educativo (aiFeedback).
    2. Una puntuación del 0 al 100 (score).
    3. Conceptos que el niño aún no domina o necesita reforzar (conceptsToReinforce).
    
    Devuelve el resultado en formato JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiFeedback: { type: Type.STRING },
            score: { type: Type.NUMBER },
            conceptsToReinforce: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["aiFeedback", "score", "conceptsToReinforce"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  });
};
