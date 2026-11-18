// Inglés (opción 9): niveles del Marco Común Europeo, sin nombres de exámenes de marcas.
import { academicGrade } from './grades';
// Prueba de nivel con un banco fijo de preguntas revisadas (no depende de la IA ni cuesta nada).

export type EnglishLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2';
export const ENGLISH_LEVELS: EnglishLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2'];
export const LEVEL_LABEL: Record<EnglishLevel, string> = {
  'Pre-A1': 'Pre-A1 · Primeros pasos',
  A1: 'A1 · Básico',
  A2: 'A2 · Elemental',
  B1: 'B1 · Intermedio',
  B2: 'B2 · Intermedio alto',
};

export interface PlacementQuestion { id: string; level: EnglishLevel; question: string; options: string[]; correct: number }

const q = (id: string, level: EnglishLevel, question: string, options: string[], correct = 0): PlacementQuestion => ({ id, level, question, options, correct });

export const PLACEMENT_BANK: PlacementQuestion[] = [
  q('p1', 'Pre-A1', 'Look: 🐱. It\'s a ___.', ['cat', 'dog', 'fish', 'bird']),
  q('p2', 'Pre-A1', 'How many apples? 🍎🍎🍎', ['three', 'two', 'four', 'five']),
  q('p3', 'Pre-A1', 'What colour is the sky on a sunny day?', ['blue', 'red', 'green', 'black']),
  q('p4', 'Pre-A1', '"Hello! What\'s your name?"', ['My name is Ana.', 'I\'m seven.', 'Yes, I do.', 'It\'s red.']),
  q('p5', 'Pre-A1', 'I ___ a sister.', ['have', 'has', 'am', 'is']),
  q('a1', 'A1', 'She ___ to school every day.', ['walks', 'walk', 'walking', 'is walk']),
  q('a2', 'A1', 'There ___ two books on the table.', ['are', 'is', 'be', 'am']),
  q('a3', 'A1', 'I\'m hungry. Can I have a ___, please?', ['sandwich', 'chair', 'pencil', 'shoe']),
  q('a4', 'A1', 'What time ___ you get up?', ['do', 'does', 'are', 'is']),
  q('a5', 'A1', 'My brother is ___ than me.', ['taller', 'tall', 'tallest', 'more tall']),
  q('b1', 'A2', 'Yesterday we ___ to the beach.', ['went', 'go', 'goes', 'going']),
  q('b2', 'A2', 'I\'ve lived here ___ 2020.', ['since', 'for', 'from', 'at']),
  q('b3', 'A2', 'If it rains tomorrow, we ___ stay at home.', ['will', 'would', 'are', 'did']),
  q('b4', 'A2', 'This is the ___ film I\'ve ever seen.', ['best', 'better', 'good', 'most good']),
  q('b5', 'A2', 'You ___ wear a helmet when you ride a bike. It\'s the rule.', ['must', 'can\'t', 'needn\'t', 'mightn\'t']),
  q('c1', 'B1', 'By the time we arrived, the film ___.', ['had already started', 'already starts', 'has already started', 'was already start']),
  q('c2', 'B1', 'I\'m not used to ___ up so early.', ['getting', 'get', 'got', 'have got']),
  q('c3', 'B1', 'If I ___ more time, I would learn to play the guitar.', ['had', 'have', 'would have', 'will have']),
  q('c4', 'B1', 'The museum, ___ was built in 1900, is closed today.', ['which', 'who', 'what', 'where']),
  q('c5', 'B1', 'She asked me where I ___.', ['lived', 'live', 'do live', 'am living']),
  q('d1', 'B2', 'I wish I ___ to the party last night.', ['had gone', 'went', 'would go', 'have gone']),
  q('d2', 'B2', 'Hardly ___ the house when it started to rain.', ['had we left', 'we had left', 'we left', 'did we leave']),
  q('d3', 'B2', 'He denied ___ the window.', ['breaking', 'to break', 'break', 'to have break']),
  q('d4', 'B2', 'You ___ have told me earlier! I could have helped.', ['should', 'must', 'can', 'will']),
  q('d5', 'B2', 'The report needs ___ before Friday.', ['to be finished', 'to finish', 'finished', 'be finished']),
];

/** Nivel = el más alto en el que acierta al menos 3 de 5, habiendo aprobado también los anteriores. */
export function placementLevel(correctByLevel: Record<EnglishLevel, number>, pass = 3): EnglishLevel {
  let level: EnglishLevel = 'Pre-A1';
  for (const l of ENGLISH_LEVELS) {
    if ((correctByLevel[l] || 0) >= pass) level = l;
    else break;
  }
  return level;
}

/** Nivel con el que empieza si no hace la prueba */
export function defaultLevelForGrade(grade: string): EnglishLevel {
  const g = academicGrade(grade);
  if (/bach/i.test(g)) return 'B1';
  if (/ESO/i.test(g)) return /^[34]/.test(g) ? 'A2' : 'A1';
  if (/^[12]º/.test(g)) return 'Pre-A1';
  if (/^[34]º/.test(g)) return 'Pre-A1';
  return 'A1';
}

/** Temas que van rotando en las lecciones de cada nivel */
export const LESSON_THEMES = [
  'animals', 'my family', 'at school', 'food and drinks', 'sports', 'the weather', 'holidays', 'my town',
  'hobbies', 'clothes', 'the body and health', 'daily routine', 'friendship', 'technology', 'the environment', 'travel',
  'music', 'jobs', 'shopping', 'festivals around the world',
];
