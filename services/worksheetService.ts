// Servicio de fichas y deberes (v1.5.0)
// Todo se guarda y se corrige en el servidor: las fotos se comprimen aquí antes de subirse.
// Las preguntas del asistente de fichas se calculan aquí mismo (no usan IA).
import { PrintableWorksheet, WorksheetCorrection, WorksheetInquiryQuestion, ScannedHomeworkRecord } from '../types/worksheets';
import { compressPhoto } from './imageUtils';

export class WorksheetError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_worksheets.php?action=${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body),
    });
  } catch {
    throw new WorksheetError('Sin conexión. Revisa internet e inténtalo de nuevo.', 'NETWORK');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) throw new WorksheetError(data.error || 'Algo ha fallado. Inténtalo de nuevo.', data.code);
  return data;
};

export interface WorksheetData { worksheets: PrintableWorksheet[]; homework: ScannedHomeworkRecord[]; view: 'parent' | 'child' }

export const worksheetService = {
  getPedagogicalQuestions(
    grade: string, 
    subject: string, 
    userRequest: string, 
    bookTitle?: string
  ): WorksheetInquiryQuestion[] {
    const sLower = subject.toLowerCase();
    const reqLower = userRequest.toLowerCase();
    const isMath = sLower.includes('matem');
    const isLanguage = sLower.includes('lengua') || sLower.includes('literatura') || sLower.includes('castellano') || sLower.includes('lenguaje');
    const isScience = sLower.includes('cien') || sLower.includes('medio') || sLower.includes('social') || sLower.includes('natural') || sLower.includes('geograf') || sLower.includes('historia');
    const isEnglish = sLower.includes('ingl') || sLower.includes('english');
    const isDivision = isMath && (reqLower.includes('divisi') || reqLower.includes('dividir') || !reqLower.trim() || reqLower.includes('resto') || reqLower.includes('cifra'));

    if (isMath && isDivision) {
      return [
        {
          id: 'divisionsType',
          question: `Para ${grade}${bookTitle ? ` según su libro (${bookTitle})` : ''}, ¿qué nivel de divisiones necesitas repasar?`,
          pedagogicalContext: `En ${grade} el currículo LOMLOE y los libros de texto afianzan divisiones exactas y enteras sin puntos separadores para evitar confusiones con decimales.`,
          options: [
            {
              label: 'Exactas (Resto 0) con 1 divisor',
              description: 'Ideal para consolidar tablas y el algoritmo con números limpios (ej. 8496 ÷ 4).',
              value: 'remainder_zero_single_digit',
              isRecommended: grade.includes('3º') || grade.includes('4º') || userRequest.includes('resto cero') || userRequest.includes('un solo divisor')
            },
            {
              label: 'Enteras con resto y divisor de 1 cifra',
              description: 'Dividendos de 4 a 5 cifras (ej. 3421 ÷ 6) con resto final.',
              value: 'with_remainder_single_digit',
              isRecommended: grade.includes('5º') && !userRequest.includes('resto cero')
            },
            {
              label: 'Divisiones con divisor de 2 cifras',
              description: 'Estándar para 5º y 6º de Primaria según los libros oficiales (ej. 7560 ÷ 24).',
              value: 'two_digits',
              isRecommended: (grade.includes('5º') || grade.includes('6º')) && !userRequest.includes('un solo divisor')
            },
            {
              label: 'Con decimales en el dividendo',
              description: 'Nivel avanzado de 6º Primaria.',
              value: 'decimals',
              isRecommended: false
            }
          ]
        },
        {
          id: 'subtractionsMethod',
          question: '¿Qué método de resolución utiliza el niño en su cuaderno del colegio?',
          pedagogicalContext: 'Determina el espacio vertical necesario. El método con restas escritas hacia abajo requiere cuadrícula amplia para bajar cifras.',
          options: [
            {
              label: 'Tradicional con resta escrita paso a paso',
              description: 'Se escriben todas las restas hacia abajo bajando cada campo del dividendo.',
              value: 'written_subtraction',
              isRecommended: true
            },
            {
              label: 'Cálculo mental directo (solo anota el resto abajo)',
              description: 'El niño hace las restas de memoria y anota el resto parcial abajo.',
              value: 'mental_direct',
              isRecommended: false
            },
            {
              label: 'Algoritmo ABN (por descomposición)',
              description: 'Formato en columnas para colegios que aplican metodología ABN.',
              value: 'abn',
              isRecommended: false
            }
          ]
        },
        {
          id: 'includeZeroInQuotient',
          question: '¿Deseas incluir ejercicios con "cero al cociente"?',
          pedagogicalContext: 'Es el error más común en Primaria cuando la cifra bajada es menor que el divisor (ej. 8124 ÷ 4 = 2031).',
          options: [
            {
              label: 'Sí, incluir casos con cero al cociente',
              description: 'Muy recomendado para detectar si olvida poner el cero antes de bajar la siguiente cifra.',
              value: 'yes',
              isRecommended: true
            },
            {
              label: 'No, solo divisiones directas continuas',
              description: 'Todas las cifras bajadas son mayores o iguales al divisor.',
              value: 'no',
              isRecommended: false
            }
          ]
        },
        {
          id: 'exercisesCount',
          question: '¿Cuántos ejercicios prefieres generar en la hoja?',
          pedagogicalContext: 'Para garantizar que haya espacio de sobra para bajar cifras con letra grande, 4 operaciones es el tamaño perfecto para 1 página A4.',
          options: [
            {
              label: '4 operaciones (Espacio Extra Amplio con cuadrícula generosa)',
              description: 'Cada operación tiene cuadrícula escolar de 5 mm para operar con total comodidad.',
              value: '4',
              isRecommended: true
            },
            {
              label: '6 operaciones (Repaso Estándar)',
              description: 'Formato de 2 columnas x 3 filas con espacio equilibrado.',
              value: '6',
              isRecommended: false
            }
          ]
        }
      ];
    }

    if (isMath && !isDivision) {
      return [
        {
          id: 'activityType',
          question: `Tipo de contenido matemático para ${grade}:`,
          pedagogicalContext: `Alineado con el libro escolar (${bookTitle || 'Matemáticas'}).`,
          options: [
            {
              label: 'Sumas con llevadas',
              description: 'Operaciones en cuadrícula con la solución calculada (sin IA, siempre disponible).',
              value: 'sums_carry',
              isRecommended: false
            },
            {
              label: 'Restas con llevadas',
              description: 'Restas en cuadrícula con la solución calculada (sin IA).',
              value: 'subtractions_borrow',
              isRecommended: false
            },
            {
              label: 'Multiplicaciones',
              description: 'Por una o dos cifras según el curso (sin IA).',
              value: 'multiplications',
              isRecommended: false
            },
            {
              label: 'Tablas de multiplicar',
              description: 'Repaso rápido de las tablas del 2 al 9 (sin IA).',
              value: 'times_tables',
              isRecommended: false
            },
            {
              label: 'Problemas de razonamiento matemático con enunciado',
              description: 'Situaciones reales con espacio de cuadrícula para datos, operaciones y solución.',
              value: 'word_problems',
              isRecommended: true
            },
            {
              label: 'Mezcla de operaciones',
              description: 'Sumas, restas y multiplicaciones con llevadas (sin IA).',
              value: 'mixed_operations',
              isRecommended: false
            },
            {
              label: 'Fracciones y números decimales',
              description: 'Sumas y restas de fracciones con igual denominador y de decimales (sin IA).',
              value: 'fractions_decimals',
              isRecommended: false
            }
          ]
        },
        {
          id: 'exercisesCount',
          question: 'Cantidad de actividades con cuadrícula escolar en la hoja:',
          pedagogicalContext: 'Cuadrícula escolar de 5 mm para planteamiento limpio y ordenado.',
          options: [
            {
              label: '4 ejercicios con cuadrícula amplia',
              description: 'Espacio generoso para desarrollo y operaciones',
              value: '4',
              isRecommended: true
            },
            {
              label: '6 ejercicios estándar',
              description: 'Práctica variada',
              value: '6',
              isRecommended: false
            }
          ]
        }
      ];
    }

    if (isLanguage) {
      return [
        {
          id: 'activityType',
          question: `Tipo de repaso para Lengua Castellana (${grade}):`,
          pedagogicalContext: `Según el currículo de ${grade} y su libro de lectura (${bookTitle || 'Lengua Castellana'}).`,
          options: [
            {
              label: 'Comprensión lectora con texto breve y preguntas de desarrollo',
              description: 'Incluye un texto narrativo/informativo adaptado y 4 preguntas para responder a mano en renglones.',
              value: 'reading_comprehension',
              isRecommended: true
            },
            {
              label: 'Gramática y análisis morfológico',
              description: 'Identificar sustantivos, adjetivos, verbos, pronombres y tiempos verbales con espacio pautado.',
              value: 'grammar',
              isRecommended: false
            },
            {
              label: 'Ortografía, acentuación y signos de puntuación',
              description: 'Reglas de acentuación (agudas, llanas, esdrújulas), uso de b/v, c/z, g/j y redacción.',
              value: 'spelling',
              isRecommended: false
            },
            {
              label: 'Sintaxis y estructura de la oración',
              description: 'Sujeto, predicado y complementos para 5º y 6º de Primaria.',
              value: 'syntax',
              isRecommended: false
            }
          ]
        },
        {
          id: 'rulingType',
          question: 'Formato de pauta para la respuesta escrita en papel:',
          pedagogicalContext: 'Los renglones pautados ayudan a mantener el tamaño homogéneo de letra y la línea recta.',
          options: [
            {
              label: 'Pauta escolar con renglones dobles (espacio caligráfico de Primaria)',
              description: 'Líneas guía suaves para que el alumno no tuerza el renglón al escribir con lápiz.',
              value: 'primary_ruled',
              isRecommended: true
            },
            {
              label: 'Renglones simples con separación amplia (10 mm)',
              description: 'Espacio limpio para respuestas más largas o redacciones.',
              value: 'wide_single',
              isRecommended: false
            }
          ]
        },
        {
          id: 'exercisesCount',
          question: 'Cantidad de preguntas en la hoja A4:',
          pedagogicalContext: 'Para dejar espacio suficiente a respuestas completas con buena caligrafía.',
          options: [
            {
              label: '4 preguntas de desarrollo (3 a 4 renglones por pregunta)',
              description: 'Espacio generoso para que el alumno redacte oraciones completas.',
              value: '4',
              isRecommended: true
            },
            {
              label: '6 preguntas breves de respuesta directa',
              description: 'Para repasos rápidos de conceptos o vocabulario.',
              value: '6',
              isRecommended: false
            }
          ]
        }
      ];
    }

    if (isScience) {
      return [
        {
          id: 'activityType',
          question: `Enfoque pedagógico para ${subject} (${grade}):`,
          pedagogicalContext: `Alineado con el libro de texto escolar (${bookTitle || 'Ciencias'}).`,
          options: [
            {
              label: 'Conceptos clave, definiciones y razonamiento a mano',
              description: 'Preguntas explicativas con renglones de pauta escolar para responder con sus palabras.',
              value: 'concepts_reasoning',
              isRecommended: true
            },
            {
              label: 'Esquemas guiados y clasificación de elementos',
              description: 'Clasificar animales/plantas, partes del cuerpo, etapas de la historia o capas de la atmósfera.',
              value: 'diagrams_classification',
              isRecommended: false
            },
            {
              label: 'Preguntas de relación causa-efecto y experimentos',
              description: 'Explicar por qué ocurren ciertos fenómenos (ej. la fotosíntesis, el relieve, el clima).',
              value: 'cause_effect',
              isRecommended: false
            }
          ]
        },
        {
          id: 'exercisesCount',
          question: 'Número de ejercicios con espacio de redacción:',
          pedagogicalContext: 'Se diseñan con 3 a 5 líneas pautadas por ejercicio para escritura a mano.',
          options: [
            {
              label: '4 preguntas de desarrollo amplio con pauta escolar',
              description: 'Espacio holgado para no apretar la letra al escribir.',
              value: '4',
              isRecommended: true
            },
            {
              label: '5 preguntas mixtas (cortas y de desarrollo)',
              description: 'Variedad de ejercicios en una sola página.',
              value: '5',
              isRecommended: false
            }
          ]
        }
      ];
    }

    if (isEnglish) {
      return [
        {
          id: 'activityType',
          question: `Área de práctica en Inglés (${grade}):`,
          pedagogicalContext: `Adaptado al libro escolar de Inglés (${bookTitle || 'English Book'}).`,
          options: [
            {
              label: 'Reading & Comprehension Questions (Lectura y preguntas escritas)',
              description: 'Texto breve en inglés con preguntas para responder en inglés a lápiz.',
              value: 'reading_comprehension',
              isRecommended: true
            },
            {
              label: 'Grammar Drills & Sentence Building (Tiempos verbales y estructuras)',
              description: 'Present Simple, Continuous, Past Simple, can/must con renglones de escritura.',
              value: 'grammar_drills',
              isRecommended: false
            },
            {
              label: 'Vocabulary & Writing Practice (Vocabulario y redacción de frases)',
              description: 'Uso de palabras en contexto y traducción guiada.',
              value: 'vocabulary_writing',
              isRecommended: false
            }
          ]
        },
        {
          id: 'exercisesCount',
          question: 'Cantidad de actividades:',
          pedagogicalContext: 'Pauta escolar con renglones para escribir en inglés cuidando la ortografía (spelling).',
          options: [
            {
              label: '4 ejercicios con líneas de respuesta holgadas',
              description: 'Recomendado para primaria.',
              value: '4',
              isRecommended: true
            },
            {
              label: '6 ejercicios cortos',
              description: 'Práctica intensiva de oraciones breves.',
              value: '6',
              isRecommended: false
            }
          ]
        }
      ];
    }

    // Default general inquiry
    return [
      {
        id: 'difficultyLevel',
        question: `Nivel y enfoque para ${subject} (${grade}):`,
        pedagogicalContext: `Adaptado al libro de texto escolar (${bookTitle || 'Libro del Alumno'}).`,
        options: [
          { label: 'Refuerzo guiado paso a paso', description: 'Preguntas claras con espacio amplio para responder a lápiz', value: 'basic', isRecommended: true },
          { label: 'Nivel estándar curricular', description: 'Acorde a los exámenes habituales de su libro', value: 'standard', isRecommended: false },
          { label: 'Ampliación y razonamiento', description: 'Preguntas que fomentan la reflexión y vocabulario preciso', value: 'advanced', isRecommended: false }
        ]
      },
      {
        id: 'exercisesCount',
        question: 'Espaciado y volumen de trabajo en papel:',
        pedagogicalContext: 'Dejamos espacio suficiente para que el alumno no amontone la letra en la hoja A4.',
        options: [
          { label: '4 ejercicios amplios con renglones pautados', description: 'Espacio generoso para escribir a mano', value: '4', isRecommended: true },
          { label: '6 ejercicios estándar', description: 'Práctica variada', value: '6', isRecommended: false }
        ]
      }
    ];
  },

  /** Carga fichas y deberes. Con childId: vista de ese niño (sin soluciones salvo con el panel de padres abierto). */
  async load(childId?: string | null): Promise<WorksheetData> {
    return call('list', childId ? { childId } : {});
  },

  async generateWorksheet(params: {
    childId: string; childName?: string; grade: string; subject: string; bookTitle?: string; topic: string;
    divisionsType?: string; subtractionsMethod?: string; includeZeroInQuotient?: boolean;
    exercisesCount?: number; activityType?: string; parentNotes?: string; difficultyLevel?: string;
  }): Promise<PrintableWorksheet> {
    const data = await call('generate', params);
    return data.worksheet;
  },

  /** Corrige la foto de una ficha. Devuelve la ficha con su corrección. */
  async correctWorksheetPhoto(worksheet: PrintableWorksheet, imageDataUrl: string): Promise<{ worksheet: PrintableWorksheet; correction: WorksheetCorrection }> {
    const { image, thumb } = await compressPhoto(imageDataUrl);
    const data = await call('correct_worksheet', { worksheetId: worksheet.id, image, thumb });
    return { worksheet: data.worksheet, correction: data.worksheet.correction };
  },

  /** Corrige deberes del cole. Con homeworkId + clarifications, repite la corrección con la letra aclarada (sin nueva foto). */
  async correctHomeworkPhoto(params: {
    childId: string; subject?: string; bookTitle?: string; notes?: string; imageBase64?: string; homeworkId?: string;
    completedByStudent?: boolean; effortLevel?: 'alto' | 'medio' | 'bajo';
    interestLevel?: 'muy_motivado' | 'positivo' | 'le_cuesta_o_bloqueo'; childSelfReflection?: string;
    userClarifications?: Record<number, string>;
  }): Promise<ScannedHomeworkRecord> {
    const body: any = {
      childId: params.childId, subject: params.subject, bookTitle: params.bookTitle, notes: params.notes,
      completedByStudent: params.completedByStudent, effortLevel: params.effortLevel, interestLevel: params.interestLevel,
      childSelfReflection: params.childSelfReflection, clarifications: params.userClarifications,
    };
    if (params.homeworkId) body.homeworkId = params.homeworkId;
    else if (params.imageBase64) Object.assign(body, await compressPhoto(params.imageBase64));
    const data = await call('correct_homework', body);
    return data.record;
  },

  async usage(childId: string): Promise<{ used: number; limit: number } | null> {
    try { return await call('usage', { childId }); } catch { return null; }
  },

  async deleteWorksheet(id: string): Promise<void> { await call('delete_worksheet', { id }); },
  async deleteHomeworkRecord(id: string): Promise<void> { await call('delete_homework', { id }); },
  async setCorrectionLimit(childId: string, limit: number): Promise<void> { await call('set_limit', { childId, limit }); },

  async saveTutorFeedback(homeworkId: string, feedback: { tutorComment: string; tutorSticker?: string; bonusPoints?: number }): Promise<ScannedHomeworkRecord> {
    const data = await call('feedback', { homeworkId, ...feedback });
    return data.record;
  },
};
