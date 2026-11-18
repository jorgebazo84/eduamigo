// Cursos que se pueden poner en un perfil: Primaria, ESO, Bachillerato y los de FP del catálogo oficial.
// Los ayudantes que dependen de la edad (nivel de mates, lectura, inglés, pomodoro…) usan el curso académico equivalente.
import { parseFpGrade, isValidFpGrade } from './fpCatalog';

export const ACADEMIC_GRADES = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bachillerato', '2º Bachillerato',
] as const;

/** FP Básico 1º ≈ 3º ESO, FP Básico 2º ≈ 4º ESO, Grado Medio ≈ 1º Bachillerato, Grado Superior ≈ 2º Bachillerato */
export function academicGrade(grade: string): string {
  const p = parseFpGrade(grade);
  if (!p) return String(grade || '');
  if (p.level === 1) return p.course === 1 ? '3º ESO' : '4º ESO';
  return p.level === 2 ? '1º Bachillerato' : '2º Bachillerato';
}

export const isValidGrade = (grade: string) => (ACADEMIC_GRADES as readonly string[]).includes(grade) || isValidFpGrade(grade);

/** 1 (1º Primaria) … 12 (2º Bachillerato) */
export function gradeIndex(grade: string): number {
  const i = (ACADEMIC_GRADES as readonly string[]).indexOf(academicGrade(grade));
  return i >= 0 ? i + 1 : 3;
}
