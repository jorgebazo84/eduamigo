// Asignaturas por curso (LOMLOE). Lista fija: ya no la inventa la IA.
import { fpSubjects } from './fpCurriculum';
// Las comunidades con lengua cooficial y las optativas se cubren con "Lengua cooficial" y "Otra asignatura".

const PRIMARIA = [
  'Lengua Castellana y Literatura',
  'Matemáticas',
  'Conocimiento del Medio Natural, Social y Cultural',
  'Inglés',
  'Educación Artística (Plástica y Música)',
  'Educación Física',
];
const ESO_COMUNES = ['Lengua Castellana y Literatura', 'Matemáticas', 'Inglés', 'Geografía e Historia', 'Educación Física'];

const BY_COURSE: Record<string, string[]> = {
  '1º Primaria': PRIMARIA,
  '2º Primaria': PRIMARIA,
  '3º Primaria': PRIMARIA,
  '4º Primaria': PRIMARIA,
  '5º Primaria': [...PRIMARIA, 'Educación en Valores Cívicos y Éticos'],
  '6º Primaria': [...PRIMARIA, 'Educación en Valores Cívicos y Éticos'],
  '1º ESO': [...ESO_COMUNES, 'Biología y Geología', 'Educación Plástica, Visual y Audiovisual', 'Música', 'Tecnología y Digitalización', 'Segunda Lengua Extranjera'],
  '2º ESO': [...ESO_COMUNES, 'Física y Química', 'Educación Plástica, Visual y Audiovisual', 'Música', 'Tecnología y Digitalización', 'Segunda Lengua Extranjera'],
  '3º ESO': [...ESO_COMUNES, 'Biología y Geología', 'Física y Química', 'Música', 'Tecnología y Digitalización', 'Educación en Valores Cívicos y Éticos', 'Segunda Lengua Extranjera'],
  '4º ESO': [...ESO_COMUNES, 'Biología y Geología', 'Física y Química', 'Economía y Emprendimiento', 'Latín', 'Tecnología', 'Digitalización', 'Expresión Artística', 'Música', 'Segunda Lengua Extranjera'],
  // Bachillerato: comunes y las de modalidad más habituales
  '1º Bachillerato': ['Lengua Castellana y Literatura', 'Inglés', 'Filosofía', 'Educación Física', 'Matemáticas', 'Matemáticas Aplicadas a las CC. SS.', 'Física y Química', 'Biología, Geología y Ciencias Ambientales', 'Dibujo Técnico', 'Economía', 'Historia del Mundo Contemporáneo', 'Latín', 'Griego', 'Tecnología e Ingeniería'],
  '2º Bachillerato': ['Lengua Castellana y Literatura', 'Inglés', 'Historia de España', 'Historia de la Filosofía', 'Matemáticas', 'Matemáticas Aplicadas a las CC. SS.', 'Física', 'Química', 'Biología', 'Dibujo Técnico', 'Empresa y Diseño de Modelos de Negocio', 'Geografía', 'Historia del Arte', 'Latín', 'Griego', 'Tecnología e Ingeniería'],
};

export const ALWAYS = ['Religión / Atención educativa', 'Lengua cooficial'];

export function subjectsForGrade(grade: string): string[] {
  const fp = fpSubjects(grade);
  if (fp) return fp;
  const g = String(grade || '');
  const key = Object.keys(BY_COURSE).find((k) => g.startsWith(k)) || (/bach/i.test(g) ? '1º Bachillerato' : /eso/i.test(g) ? '1º ESO' : '3º Primaria');
  return [...BY_COURSE[key], ...ALWAYS];
}

export const TERMS = ['1ª evaluación', '2ª evaluación', '3ª evaluación', 'Final', 'Examen', 'Control'];

/** Por debajo de esta nota, el tema pasa a Repasar */
export const LOW_GRADE = 6;
