// Generador del reto de cálculo (sin IA). El nivel sale del curso real y se adapta durante el reto.
import { MathProblem, evaluate } from '../shared/mathOps';
import { academicGrade } from '../shared/grades';

export type ChallengeMode = 'mixed' | 'add_sub' | 'multi' | 'div' | 'tables' | 'mistakes';
export type AnswerStyle = 'choice' | 'typed';

/** 1º Primaria = 1 … 6º Primaria = 6, 1º ESO = 7 … 4º ESO = 10. */
export function gradeLevel(grade: string): number {
  const g = academicGrade(grade).toLowerCase();
  const m = g.match(/(\d)\s*º?/);
  const n = m ? Number(m[1]) : 3;
  if (g.includes('bachiller')) return 10;
  if (g.includes('eso')) return Math.min(10, 6 + Math.max(1, Math.min(4, n)));
  if (g.includes('infantil')) return 1;
  return Math.max(1, Math.min(6, n));
}

/** Estilo de respuesta por defecto: escribir desde 3º de Primaria. */
export const defaultAnswerStyle = (level: number): AnswerStyle => (level >= 3 ? 'typed' : 'choice');

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const dec1 = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

function addSub(d: number): MathProblem {
  const plus = Math.random() < 0.5;
  if (d <= 1) { const a = rnd(1, 9), b = rnd(1, 10 - a); return plus ? { op: '+', a, b } : { op: '-', a: a + b, b }; }
  if (d === 2) { const a = rnd(2, 10), b = rnd(2, 10); return plus ? { op: '+', a, b } : { op: '-', a: a + b, b }; }
  if (d === 3) { const a = rnd(11, 89), b = rnd(5, 99 - a); return plus ? { op: '+', a, b } : { op: '-', a: a + b, b }; }
  if (d <= 5) { const a = rnd(100, 899), b = rnd(20, 999 - a); return plus ? { op: '+', a, b } : { op: '-', a: a + b, b }; }
  if (d === 6) { const a = dec1(1, 50), b = dec1(1, 30); return plus ? { op: '+', a, b: b } : { op: '-', a: Math.round((a + b) * 10) / 10, b }; }
  const a = rnd(-20, 20), b = rnd(-20, 20) || 3;
  return { op: plus ? '+' : '-', a, b };
}

function multi(d: number, table?: number): MathProblem {
  if (table) return { op: '×', a: table, b: rnd(1, 10) };
  if (d <= 2) return { op: '×', a: pick([2, 5, 10]), b: rnd(1, 10) };
  if (d === 3) return { op: '×', a: rnd(2, 10), b: rnd(2, 10) };
  if (d === 4) return { op: '×', a: rnd(11, 30), b: rnd(2, 9) };
  if (d === 5) return Math.random() < 0.3 ? { op: '×', a: rnd(2, 99), b: pick([10, 100]) } : { op: '×', a: rnd(12, 99), b: rnd(3, 9) };
  if (d === 6) return Math.random() < 0.5 ? { op: '×', a: dec1(1, 20), b: pick([10, 100]) } : { op: '×', a: rnd(11, 25), b: rnd(11, 15) };
  if (d === 7) return { op: '×', a: rnd(-10, 10) || -4, b: rnd(-10, 10) || 6 };
  return Math.random() < 0.5 ? { op: '^', a: rnd(2, d >= 9 ? 15 : 10), b: 2 } : { op: '^', a: rnd(2, 5), b: 3 };
}

function div(d: number, table?: number): MathProblem {
  if (table) { const q = rnd(1, 10); return { op: '÷', a: table * q, b: table }; }
  if (d <= 2) { const b = pick([2, 5, 10]), q = rnd(1, 10); return { op: '÷', a: b * q, b }; }
  if (d === 3) { const b = rnd(2, 10), q = rnd(1, 10); return { op: '÷', a: b * q, b }; }
  if (d <= 5) { const b = rnd(2, 9), q = rnd(11, d === 4 ? 30 : 120); return { op: '÷', a: b * q, b }; }
  if (d === 6) { const b = pick([10, 100]), a = rnd(10, 999); return { op: '÷', a, b }; }
  const b = rnd(-9, 9) || 3, q = rnd(-10, 10) || 2;
  return { op: '÷', a: b * q, b };
}

function extra(d: number): MathProblem {
  if (d >= 8 && Math.random() < 0.5) { const p = pick([10, 20, 25, 50, 75]); return { op: '%', a: p, b: pick([20, 40, 60, 80, 100, 120, 200, 400]) }; }
  const [a, b] = pick([[1, 2], [1, 3], [1, 4], [3, 4], [2, 3], [1, 5], [2, 5]]);
  return { op: 'de', a, b, c: b * rnd(2, 12) };
}

/** Un problema nuevo según el modo y la dificultad actual (1–10). */
export function generateProblem(mode: ChallengeMode, difficulty: number, opts: { table?: number; mistakes?: MathProblem[] } = {}): MathProblem {
  const d = Math.max(1, Math.min(10, Math.round(difficulty)));
  if (mode === 'mistakes' && opts.mistakes?.length) return { ...pick(opts.mistakes) };
  if (mode === 'tables') return Math.random() < 0.8 ? multi(d, opts.table || 2) : div(d, opts.table || 2);
  if (mode === 'add_sub') return addSub(d);
  if (mode === 'multi') return multi(d);
  if (mode === 'div') return div(d);
  // Mezcla según el curso: en 1º–2º solo sumas y restas
  if (d <= 2) return Math.random() < 0.8 ? addSub(d) : multi(d);
  const r = Math.random();
  if (d >= 6 && r < 0.2) return extra(d);
  if (r < 0.45) return addSub(d);
  if (r < 0.75) return multi(d);
  return div(d);
}

/** Cuatro opciones: la buena y tres cercanas, sin repetir. */
export function makeOptions(p: MathProblem): number[] {
  const ans = evaluate(p) as number;
  const isDec = !Number.isInteger(ans);
  const set = new Set<number>([ans]);
  let guard = 0;
  while (set.size < 4 && guard++ < 50) {
    const step = isDec ? pick([0.1, 1, 10]) : Math.abs(ans) >= 100 ? pick([1, 10, 100]) : pick([1, 2, 10]);
    const wrong = Math.round((ans + step * (Math.random() < 0.5 ? -1 : 1) * rnd(1, 3)) * 1000) / 1000;
    if (ans >= 0 && wrong < 0) continue;
    set.add(wrong);
  }
  while (set.size < 4) set.add(ans + set.size * 7);
  return [...set].sort(() => Math.random() - 0.5);
}
