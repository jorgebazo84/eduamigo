// Operaciones del reto de cálculo. Lo usan el navegador (para generar y comprobar al momento)
// y el servidor (que vuelve a comprobar cada respuesta antes de guardar y dar puntos).

export type MathOp = '+' | '-' | '×' | '÷' | '^' | '%' | 'de';
export interface MathProblem {
  op: MathOp;
  a: number;
  b: number;
  /** Solo para "de" (fracción de un número): a/b de c */
  c?: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Resultado exacto (redondeado a 3 decimales). null si la operación no es válida. */
export function evaluate(p: MathProblem): number | null {
  const { a, b, c } = p;
  if (![a, b].every(Number.isFinite)) return null;
  switch (p.op) {
    case '+': return round(a + b);
    case '-': return round(a - b);
    case '×': return round(a * b);
    case '÷': return b === 0 ? null : round(a / b);
    case '^': return b >= 0 && b <= 4 ? round(Math.pow(a, b)) : null;
    case '%': return round((a * b) / 100);
    case 'de': return b === 0 || !Number.isFinite(c as number) ? null : round(((c as number) * a) / b);
    default: return null;
  }
}

const fmt = (n: number) => (n < 0 ? `(${String(n).replace('.', ',')})` : String(n).replace('.', ','));

/** Texto para mostrar: "7 × 8", "(-3) + 5", "25 % de 80", "3/4 de 20", "5²" */
export function problemText(p: MathProblem): string {
  if (p.op === '^') return `${fmt(p.a)}${p.b === 2 ? '²' : p.b === 3 ? '³' : '^' + p.b}`;
  if (p.op === '%') return `${p.a} % de ${p.b}`;
  if (p.op === 'de') return `${p.a}/${p.b} de ${p.c}`;
  const first = String(p.a).replace('.', ',');
  return `${first} ${p.op} ${fmt(p.b)}`;
}

/** Interpreta lo que escribe el niño: admite coma o punto y el signo menos. */
export function parseAnswer(s: string): number | null {
  const t = String(s || '').trim().replace(/\s+/g, '').replace(',', '.').replace(/[−–]/g, '-');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export const isCorrect = (p: MathProblem, given: number | null) => {
  const r = evaluate(p);
  return r !== null && given !== null && Math.abs(r - given) < 0.001;
};

/**
 * A qué "hecho" o tipo de operación pertenece, para saber qué se le resiste.
 * Tablas y cálculos pequeños: el hecho concreto ("7×8", "56÷7", "8+7"). El resto: el tipo.
 */
export function factKey(p: MathProblem): { key: string; label: string } {
  const { op, a, b } = p;
  const int = (n: number) => Number.isInteger(n);
  const neg = a < 0 || b < 0;
  if (neg) return { key: 'negativos', label: 'Números negativos' };
  if (!int(a) || !int(b)) return { key: `decimales${op}`, label: op === '+' || op === '-' ? 'Sumas y restas con decimales' : 'Operaciones con decimales' };
  if (op === '×' && a <= 10 && b <= 10) { const [x, y] = [Math.min(a, b), Math.max(a, b)]; return { key: `${x}×${y}`, label: `${x} × ${y}` }; }
  if (op === '÷' && b <= 10 && a / b <= 10) return { key: `${a}÷${b}`, label: `${a} ÷ ${b}` };
  if (op === '+' && a <= 10 && b <= 10) { const [x, y] = [Math.min(a, b), Math.max(a, b)]; return { key: `${x}+${y}`, label: `${x} + ${y}` }; }
  if (op === '-' && a <= 20 && b <= 10) return { key: `${a}-${b}`, label: `${a} − ${b}` };
  if (op === '+') return (a % 10) + (b % 10) >= 10 ? { key: 'suma_llevando', label: 'Sumas llevando' } : { key: 'suma', label: 'Sumas' };
  if (op === '-') return (a % 10) < (b % 10) ? { key: 'resta_llevando', label: 'Restas llevando' } : { key: 'resta', label: 'Restas' };
  if (op === '×') return { key: 'multiplicar', label: 'Multiplicaciones de varias cifras' };
  if (op === '÷') return { key: 'dividir', label: 'Divisiones de varias cifras' };
  if (op === '^') return { key: 'potencias', label: 'Potencias' };
  if (op === '%') return { key: 'porcentajes', label: 'Porcentajes' };
  return { key: 'fracciones', label: 'Fracción de un número' };
}

export const opFamily = (p: MathProblem): 'sumas' | 'restas' | 'multiplicar' | 'dividir' | 'otras' =>
  p.op === '+' ? 'sumas' : p.op === '-' ? 'restas' : p.op === '×' ? 'multiplicar' : p.op === '÷' ? 'dividir' : 'otras';

/** Validación básica de un problema recibido (evita valores absurdos). */
export function isSaneProblem(p: any): p is MathProblem {
  if (!p || typeof p !== 'object') return false;
  if (!['+', '-', '×', '÷', '^', '%', 'de'].includes(p.op)) return false;
  const nums = [p.a, p.b, ...(p.op === 'de' ? [p.c] : [])];
  return nums.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000) && evaluate(p) !== null;
}
