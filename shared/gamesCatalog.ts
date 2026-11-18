// Zona de juegos (opción 10) y prácticas de FP de Informática (opción 11).
// Juegos sin IA: el contenido sale de bancos revisados o se genera con reglas, y el servidor corrige cada respuesta.
// Los juegos se abren después de estudiar (por defecto 30 min al día y hasta 40 puntos al día; los padres lo cambian).
// Las prácticas de FP cuentan como estudio: no necesitan desbloqueo y no gastan tiempo de juego.

export type GameArea = 'mates' | 'lengua' | 'ingles' | 'informatica' | 'ciencias' | 'practica';

export interface GameInfo {
  id: string;
  title: string;
  emoji: string;
  area: GameArea;
  description: string;
  /** Curso mínimo y máximo (1 = 1º Primaria … 12 = 2º Bachillerato; FP según su equivalencia) */
  min: number;
  max: number;
  /** Práctica de FP de Informática: cuenta como estudio */
  practice?: boolean;
}

export const AREA_LABEL: Record<GameArea, string> = {
  mates: '🔢 Mates', lengua: '📖 Lengua', ingles: '🇬🇧 Inglés', informatica: '💻 Informática', ciencias: '🌍 Ciencias', practica: '🛠️ Prácticas de FP',
};

export const GAMES: GameInfo[] = [
  { id: 'balanza', title: 'La balanza', emoji: '⚖️', area: 'mates', description: 'Averigua cuánto pesa la caja para que la balanza quede equilibrada.', min: 2, max: 12 },
  { id: 'tienda', title: 'La tienda', emoji: '🛒', area: 'mates', description: 'Cobra la compra y calcula la vuelta.', min: 1, max: 8 },
  { id: 'fracciones', title: 'Cazafracciones', emoji: '🍕', area: 'mates', description: '¿Qué fracción está coloreada?', min: 3, max: 10 },
  { id: 'orto_bv', title: '¿B o V?', emoji: '🐝', area: 'lengua', description: 'Completa la palabra con b o con v.', min: 2, max: 10 },
  { id: 'orto_gj', title: '¿G o J?', emoji: '🦒', area: 'lengua', description: 'Completa la palabra con g o con j.', min: 3, max: 10 },
  { id: 'orto_h', title: '¿Con h o sin h?', emoji: '🦉', area: 'lengua', description: 'La h no suena, pero se escribe. ¿Lleva h?', min: 2, max: 10 },
  { id: 'tilde', title: 'Pon la tilde', emoji: '✍️', area: 'lengua', description: 'Elige la palabra bien escrita.', min: 4, max: 12 },
  { id: 'ordena', title: 'Ordena la frase', emoji: '🧩', area: 'lengua', description: 'Coloca las palabras en orden.', min: 1, max: 8 },
  { id: 'ahorcado', title: 'Ahorcado', emoji: '🔤', area: 'lengua', description: 'Adivina la palabra letra a letra.', min: 1, max: 12 },
  { id: 'memory', title: 'Memory', emoji: '🃏', area: 'ingles', description: 'Une cada palabra en inglés con su pareja.', min: 1, max: 8 },
  { id: 'spelling', title: 'Spelling bee', emoji: '🐝', area: 'ingles', description: 'Escucha la palabra y escríbela en inglés.', min: 2, max: 10 },
  { id: 'une', title: 'Une la frase', emoji: '💬', area: 'ingles', description: 'Une cada pregunta con su respuesta.', min: 4, max: 12 },
  { id: 'teclado', title: 'Teclado veloz', emoji: '⌨️', area: 'informatica', description: 'Copia la frase sin fallos.', min: 3, max: 12 },
  { id: 'robot', title: 'Programa al robot', emoji: '🤖', area: 'informatica', description: 'Escribe las órdenes para llevar al robot a la meta.', min: 2, max: 12 },
  { id: 'binario', title: 'Ceros y unos', emoji: '0️⃣', area: 'informatica', description: 'Pasa números de decimal a binario y al revés.', min: 5, max: 12 },
  { id: 'seguro', title: '¿Seguro o trampa?', emoji: '🛡️', area: 'informatica', description: 'Decide si lo que pasa en Internet es seguro o una trampa.', min: 1, max: 12 },
  { id: 'clasifica', title: 'Clasifica', emoji: '🦎', area: 'ciencias', description: 'Pon cada cosa en su grupo.', min: 1, max: 10 },
  { id: 'capitales', title: 'Capitales y comunidades', emoji: '🗺️', area: 'ciencias', description: 'Comunidades autónomas y países de Europa con su capital.', min: 4, max: 12 },
  // Prácticas de FP de Informática (Grado Básico)
  { id: 'monta_pc', title: 'Monta un PC', emoji: '🖥️', area: 'practica', description: 'Componentes, conectores, periféricos y seguridad al montar.', min: 1, max: 12, practice: true },
  { id: 'red_ip', title: 'Conecta la red', emoji: '🌐', area: 'practica', description: 'Direcciones IP, máscaras y dispositivos de red.', min: 1, max: 12, practice: true },
  { id: 'ohm', title: 'Ley de Ohm y circuitos', emoji: '⚡', area: 'practica', description: 'Tensión, intensidad, resistencia y potencia.', min: 1, max: 12, practice: true },
  { id: 'ofimatica', title: 'Ofimática: hoja de cálculo', emoji: '📊', area: 'practica', description: 'Fórmulas, funciones y referencias.', min: 1, max: 12, practice: true },
];

export const GAME_BY_ID: Record<string, GameInfo> = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export const GAMES_DEFAULT_MINUTES = 30;
export const GAMES_DAILY_POINTS = 40;
export const PRACTICE_DAILY_POINTS = 40;
/** Cada partida vale como mucho 10 puntos, según los aciertos */
export const ROUND_MAX_POINTS = 10;
