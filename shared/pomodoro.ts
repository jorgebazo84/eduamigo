// Duración de los bloques de estudio según la edad (opción 9): a los 6–9 años 25 minutos es demasiado.
import { academicGrade } from './grades';
export function studyMinutesForGrade(grade: string): number {
  const g = academicGrade(grade);
  if (/ESO|Bach/i.test(g)) return 25;
  if (/^[12]º/.test(g)) return 10;
  if (/^[34]º/.test(g)) return 15;
  return 20;
}
/** Descansos: corto y largo */
export function breakMinutesForGrade(grade: string): { short: number; long: number } {
  const m = studyMinutesForGrade(grade);
  return m <= 15 ? { short: 5, long: 10 } : { short: 5, long: 15 };
}
