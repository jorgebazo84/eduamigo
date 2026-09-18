
import { GradeLevel, Subject, SyllabusTopic, TopicDetail } from '../types';

/**
 * Temario Troncal de Emergencia (LOMLOE España)
 * Esta base de datos permite que la app funcione sin conexión o sin cuota de API.
 */
export const FALLBACK_SYLLABUS: Record<string, Record<string, SyllabusTopic[]>> = {
  '1º Primaria': {
    'Matemáticas': [
      { id: 'mat1-1', title: 'Números y Conteo', description: 'Aprender los números del 0 al 100.', subtopics: ['Los números hasta el 10', 'Decenas y unidades', 'Comparar números'] },
      { id: 'mat1-2', title: 'Operaciones Básicas', description: 'Iniciación a la suma y la resta.', subtopics: ['La suma sin llevar', 'La resta sencilla', 'Problemas de sumar'] }
    ],
    'Ciencias Naturales': [
      { id: 'cn1-1', title: 'El Cuerpo Humano', description: 'Partes del cuerpo y los sentidos.', subtopics: ['Los cinco sentidos', 'Crecemos y cambiamos', 'Hábitos saludables'] },
      { id: 'cn1-2', title: 'Los Seres Vivos', description: 'Animales y plantas de nuestro entorno.', subtopics: ['Animales domésticos', 'Partes de una planta', 'El ciclo de la vida'] }
    ]
  },
  '6º Primaria': {
    'Matemáticas': [
      { id: 'mat6-1', title: 'Fracciones y Decimales', description: 'Operaciones complejas con números no enteros.', subtopics: ['Suma de fracciones', 'Multiplicar decimales', 'Porcentajes'] },
      { id: 'mat6-2', title: 'Geometría Avanzada', description: 'Áreas, volúmenes y figuras.', subtopics: ['Área del círculo', 'Cuerpos geométricos', 'Teorema de Pitágoras básico'] }
    ],
    'Historia': [
      { id: 'his6-1', title: 'La Edad Contemporánea', description: 'Desde la Revolución Francesa hasta hoy.', subtopics: ['La Revolución Industrial', 'La Guerra Civil Española', 'La Unión Europea'] }
    ]
  },
  '1º ESO': {
    'Geografía': [
      { id: 'geo1-1', title: 'La Tierra en el Universo', description: 'El sistema solar y nuestro planeta.', subtopics: ['El Sistema Solar', 'Rotación y Traslación', 'Las capas de la Tierra'] }
    ],
    'Lengua y Literatura': [
      { id: 'len1-1', title: 'Tipos de Textos', description: 'Narración, descripción y diálogo.', subtopics: ['El texto narrativo', 'Adjetivos descriptivos', 'La comunicación'] }
    ]
  }
};

export const FALLBACK_TOPIC_DETAILS: Record<string, TopicDetail> = {
  'Los cinco sentidos': {
    title: 'Los cinco sentidos',
    content: 'Los seres humanos tenemos cinco sentidos que nos ayudan a conocer el mundo que nos rodea: la vista (ojos), el oído (orejas), el olfato (nariz), el gusto (lengua) y el tacto (piel). Cada uno tiene un órgano especial que envía información al cerebro.',
    keyPoints: ['La vista usa los ojos.', 'El gusto está en la lengua.', 'El cerebro interpreta lo que sentimos.'],
    examples: ['Olemos una flor con la nariz.', 'Saboreamos un helado con la lengua.'],
    summary: 'Los sentidos son nuestras ventanas al mundo.',
    exercises: [
      { id: 'ex-s1', question: '¿Con qué órgano sentimos el tacto?', options: ['Ojos', 'Piel', 'Nariz'], correctIndex: 1, explanation: 'La piel es el órgano más grande del cuerpo y nos permite sentir texturas y temperatura.' }
    ]
  },
  'La Revolución Industrial': {
    title: 'La Revolución Industrial',
    content: 'Fue un periodo de grandes cambios económicos y sociales que comenzó en Gran Bretaña en el siglo XVIII. Se pasó de fabricar cosas a mano en talleres a producirlas masivamente en grandes fábricas usando máquinas como la de vapor.',
    keyPoints: ['Invención de la máquina de vapor.', 'Aparición del ferrocarril.', 'Crecimiento de las ciudades.'],
    examples: ['El tren de vapor sustituyó a las diligencias de caballos.', 'Las fábricas textiles producían mucha más ropa.'],
    summary: 'Cambió la forma en que el mundo producía bienes y se desplazaba.',
    exercises: [
      { id: 'ex-ri1', question: '¿Qué invento fue clave en esta época?', options: ['Internet', 'Máquina de vapor', 'Teléfono'], correctIndex: 1, explanation: 'James Watt perfeccionó la máquina de vapor, permitiendo mover máquinas y trenes.' }
    ]
  }
};

/**
 * Obtiene un temario genérico si el específico falla.
 */
export const getGenericSyllabus = (subject: Subject): SyllabusTopic[] => [
  { id: 'gen-1', title: `Introducción a ${subject}`, description: 'Conceptos básicos fundamentales.', subtopics: ['Conceptos iniciales', 'Importancia de la materia', 'Repaso general'] },
  { id: 'gen-2', title: 'Bloque Temático I', description: 'Desarrollo de los contenidos principales.', subtopics: ['Tema 1.1', 'Tema 1.2'] }
];
