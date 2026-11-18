// Módulos de FP: comunes a todos los ciclos y, en detalle, los de los dos títulos de Grado Básico de Informática.
// Los bloques y contenidos de los módulos profesionales de Informática salen de los currículos básicos publicados en el BOE:
//   - Informática y Comunicaciones (IFCB01): Real Decreto 127/2014, anexo IV, y su currículo (BOE núm. 147, 18-06-2014).
//   - Informática de Oficina (IFCB02): Real Decreto 356/2014, anexo VII, y su currículo (BOE núm. 223, 13-09-2014).
//   - Módulos comunes del Grado Básico según el Real Decreto 498/2024; de Grado Medio y Superior, Real Decreto 659/2023.
// Son los contenidos oficiales resumidos en pocas palabras; la Biblioteca y los tests se ciñen a ellos.
import { parseFpGrade, FpLevel } from './fpCatalog';

export interface FpBlock { title: string; contents: string[] }
export interface FpModule { code: string; name: string; source: string; blocks: FpBlock[] }

const RD127 = 'Real Decreto 127/2014, anexo IV (BOE)';
const RD356 = 'Real Decreto 356/2014, anexo VII (BOE)';

const M3029: FpModule = {
  code: '3029', name: 'Montaje y mantenimiento de sistemas y componentes informáticos', source: `${RD127}; ${RD356}`,
  blocks: [
    { title: 'Selección de componentes y herramientas', contents: [
      'Intensidad, tensión y resistencia', 'Ley de Ohm', 'Corriente continua y corriente alterna', 'Magnitudes eléctricas y aparatos de medida',
      'Pilas, baterías, pulsadores e interruptores', 'Resistencias y condensadores', 'Diodos, transistores y LED', 'Herramientas de montaje',
      'Unidades funcionales de un sistema informático', 'Carcasas, fuentes de alimentación, ventiladores y disipadores', 'Placa base: tipos y elementos',
      'Microprocesadores y zócalos', 'Memoria RAM: características y formatos', 'Buses, conectores de datos y de potencia', 'Bahías y tarjetas de expansión (gráfica, sonido, red)',
      'Discos duros y unidades ópticas', 'Puertos: serie, paralelo, USB, Firewire', 'Conexiones inalámbricas: IrDA, Bluetooth, ZigBee', 'Seguridad eléctrica y prevención de riesgos',
    ] },
    { title: 'Ensamblaje de componentes hardware', contents: [
      'Manuales del fabricante y guías de montaje', 'Distribución de elementos en la placa base', 'Instalación y fijación de componentes',
      'Periféricos de entrada y de salida', 'Periféricos básicos: monitor, teclado, ratón, impresora', 'Otros periféricos: altavoces, micrófono, escáner',
      'Técnicas de montaje, sustitución y conexión', 'Seguridad en las operaciones de montaje',
    ] },
    { title: 'Instalación de sistemas operativos', contents: [
      'Software básico de un sistema informático', 'Funciones y elementos del sistema operativo', 'Sistemas operativos actuales',
      'Archivos, directorios y permisos', 'Tipos de particiones y herramientas de gestión', 'Replicación física de particiones y discos',
      'Creación e implantación de imágenes', 'Verificación de imágenes y réplicas',
    ] },
    { title: 'Funcionalidad de los sistemas', contents: [
      'Técnicas de verificación y testeo', 'Software de diagnóstico', 'El POST (autoprueba de arranque)', 'Herramientas de optimización de soportes', 'Conexión de periféricos al sistema',
    ] },
    { title: 'Mantenimiento básico del equipo y periféricos', contents: [
      'Mantenimiento preventivo y periódico', 'Mantenimiento de unidades de almacenamiento', 'Limpieza de soportes y periféricos',
      'Consumibles: sustitución, conservación y reciclaje', 'Seguridad al manipular consumibles',
    ] },
    { title: 'Almacenaje de equipos, periféricos y consumibles', contents: [
      'Etiquetado, embalaje y traslado', 'Normas de almacenamiento y catalogación', 'Prevención de riesgos en transporte y almacenaje', 'Tratamiento y reciclaje de residuos informáticos',
    ] },
  ],
};

const M3030: FpModule = {
  code: '3030', name: 'Operaciones auxiliares para la configuración y la explotación', source: `${RD127}; ${RD356}`,
  blocks: [
    { title: 'Configuración del equipo para un solo usuario', contents: [
      'Requisitos, características y funciones del sistema operativo', 'Interfaz gráfica y escritorio', 'Recursos del sistema',
      'Árbol de directorios y sistema de archivos', 'Atributos y permisos de archivos', 'Nombres, extensiones y comodines', 'Explorar y buscar archivos',
      'Arranque, parada y sesiones', 'Preferencias de escritorio', 'Perfiles de usuario y contraseñas', 'Compartir recursos', 'Configuración de periféricos',
    ] },
    { title: 'Configuración del equipo en red', contents: [
      'Cuentas y grupos de usuarios', 'Tipos de perfiles de usuario', 'Usuarios y grupos predeterminados', 'Permisos y derechos sobre recursos compartidos',
      'Compartir archivos y carpetas en red', 'Impresoras compartidas en red', 'Acceso a recursos compartidos', 'Dispositivos inalámbricos de red',
    ] },
    { title: 'Aplicaciones de un paquete ofimático', contents: [
      'Procesador de textos: funciones', 'Formato: negrita, cursiva, subrayado, fuentes', 'Numeración, viñetas, tabulaciones y alineación',
      'Insertar imágenes y objetos', 'Configuración de página y corrector ortográfico', 'Hoja de cálculo, base de datos y presentaciones',
      'Software libre ofimático', 'Aplicaciones ofimáticas en la nube', 'Intercambio de información',
    ] },
    { title: 'Aplicaciones de Internet', contents: [
      'Características y usos de Internet', 'Navegadores y su configuración', 'Buscadores', 'Correo electrónico', 'Mensajería instantánea',
      'Videoconferencia', 'Foros', 'Almacenamiento en la nube', 'Servicios P2P',
    ] },
  ],
};

const M3015: FpModule = {
  code: '3015', name: 'Equipos eléctricos y electrónicos', source: RD127,
  blocks: [
    { title: 'Materiales, herramientas y equipos', contents: [
      'Magnitudes eléctricas y su relación', 'Instrumentos de medida', 'Circuitos eléctricos básicos', 'Elementos y protecciones de los circuitos',
      'Conectores y cables: tipos y normalización', 'Fibra óptica: tipos y usos', 'Tipos de equipos eléctricos y electrónicos', 'Herramientas manuales y máquinas herramienta', 'Elementos de ensamblado y sujeción',
    ] },
    { title: 'Proceso de montaje y mantenimiento', contents: [
      'Simbología eléctrica y electrónica', 'Interpretación de planos y esquemas', 'Componentes, conectores y cables comerciales', 'Guías de montaje, desmontaje y conexionado',
      'Secuencia de operaciones y selección de herramientas', 'Órdenes de trabajo e informes', 'Prevención de riesgos y medio ambiente',
    ] },
    { title: 'Montaje y desmontaje de equipos', contents: [
      'Componentes electrónicos y sus funciones', 'Montaje e inserción de componentes', 'Soldadura blanda y sus precauciones', 'Uso seguro de herramientas y máquinas',
      'Montaje de elementos accesorios', 'Desmontaje y sustitución de componentes', 'Etiquetado y control', 'Equipos de protección y normas de seguridad',
    ] },
    { title: 'Técnicas de conexionado', contents: [
      'Técnicas de conexión', 'Soldadura, embornado y fijación de conectores', 'Crimpadora, tenazas y soldador', 'Bridas, cierres y pasacables', 'Normas de seguridad y medioambientales',
    ] },
    { title: 'Sustitución de elementos', contents: [
      'Esquemas y guías', 'Tensión, corriente, resistencia y potencia', 'Corriente alterna y continua', 'Anclajes y sujeciones', 'Mantenimiento preventivo básico', 'Planes de emergencia y actuación ante accidentes',
    ] },
  ],
};

const M3016: FpModule = {
  code: '3016', name: 'Instalación y mantenimiento de redes para transmisión de datos', source: `${RD127}; ${RD356}`,
  blocks: [
    { title: 'Elementos de las redes de voz y datos', contents: [
      'Medios de transmisión: coaxial, par trenzado y fibra óptica', 'Centralitas', 'Hub, switch y router', 'Paneles de parcheo', 'Infraestructuras de telecomunicación en edificios', 'Sistemas de interconexión',
    ] },
    { title: 'Canalizaciones, soportes y armarios', contents: [
      'Tipos de armarios y soportes', 'Tubos rígidos y flexibles', 'Canales y bandejas', 'Preparación y montaje de canalizaciones',
    ] },
    { title: 'Despliegue del cableado', contents: [
      'Recomendaciones para instalar cableado', 'Planos de cableado', 'Tendido de conductores', 'Identificación y etiquetado de conductores',
    ] },
    { title: 'Instalación de elementos de transmisión', contents: [
      'Fijaciones y su montaje', 'Herramientas', 'Fijación en armarios y superficie', 'Conexionado de conductores', 'Conexión de tomas y paneles de parcheo',
    ] },
    { title: 'Configuración básica de redes locales', contents: [
      'Topologías de red: ventajas e inconvenientes', 'Tipos de redes locales', 'Cuartos y armarios de comunicaciones', 'Conectores y tomas de red',
      'Dispositivos de interconexión', 'Adaptadores de red cableada e inalámbrica', 'Configuración básica de dispositivos',
    ] },
    { title: 'Prevención de riesgos y protección ambiental', contents: [
      'Normas y medios de seguridad', 'Identificación de riesgos', 'Medidas de prevención en el montaje', 'Equipos de protección individual', 'Normativa ambiental',
    ] },
  ],
};

const M3031: FpModule = {
  code: '3031', name: 'Ofimática y archivo de documentos', source: RD356,
  blocks: [
    { title: 'Información en línea: Internet, intranet y redes LAN', contents: ['Redes informáticas', 'Búsqueda activa en la red', 'Alojamiento compartido de información', 'Páginas institucionales'] },
    { title: 'Comunicaciones por correo electrónico', contents: [
      'Envío y recepción de mensajes', 'Adjuntar documentos y vínculos', 'Contactos y listas de distribución', 'Convocatorias y avisos', 'Seguridad y confidencialidad', 'Agenda de tareas y recordatorios',
    ] },
    { title: 'Equipos de reprografía', contents: [
      'Tipos y componentes de los equipos', 'Incidencias sencillas', 'Copiadoras, impresoras y escáneres', 'Digitalización de documentos', 'Calidad de las copias', 'Seguridad y eliminación de residuos',
    ] },
    { title: 'Encuadernación funcional', contents: ['Útiles y herramientas', 'Materiales', 'Corte, perforado y encuadernado', 'Uso seguro de los equipos', 'Eliminación de residuos'] },
    { title: 'Procesador de textos', contents: [
      'Estructura y funciones', 'Gestión de documentos', 'Formato', 'Plantillas', 'Textos y tablas', 'Objetos e hipervínculos', 'Configuración e impresión',
    ] },
    { title: 'Hojas de cálculo', contents: [
      'Tipos de datos, celdas, rangos y libros', 'Fórmulas y funciones', 'Gráficos', 'Listas, filtros, ordenación y protección', 'Reglas ergonómicas',
    ] },
    { title: 'Presentaciones', contents: [
      'Diseño y edición de diapositivas', 'Vistas', 'Animaciones y transiciones', 'Sonido y vídeo', 'Plantillas y asistentes', 'Conexión al proyector',
    ] },
  ],
};

/** Módulos profesionales de cada título de Informática de Grado Básico (por nombre del catálogo, en minúsculas) */
const IT_GB: Record<string, FpModule[]> = {
  'informática y comunicaciones': [M3029, M3030, M3015, M3016],
  'informática de oficina': [M3029, M3030, M3031, M3016],
};

export const GB_COMMON = (course: 1 | 2) => [
  course === 1 ? 'Comunicación y Ciencias Sociales I' : 'Comunicación y Ciencias Sociales II',
  course === 1 ? 'Ciencias Aplicadas I' : 'Ciencias Aplicadas II',
  'Itinerario personal para la empleabilidad',
  'Proyecto intermodular de aprendizaje colaborativo',
];
export const GM_GS_COMMON = (level: FpLevel, course: 1 | 2) => [
  course === 1 ? 'Itinerario personal para la empleabilidad I' : 'Itinerario personal para la empleabilidad II',
  `Inglés profesional (${level === 2 ? 'GM' : 'GS'})`,
  `Digitalización aplicada a los sectores productivos (${level === 2 ? 'GM' : 'GS'})`,
  'Sostenibilidad aplicada al sistema productivo',
  'Proyecto intermodular',
];
export const FP_OTHER = 'Módulos profesionales del ciclo';

export const moduleSubject = (m: FpModule) => `${m.code} ${m.name}`;

/** Módulos detallados del curso (solo los títulos de Informática de Grado Básico) */
export function detailedModules(grade: string): FpModule[] {
  const p = parseFpGrade(grade);
  if (!p || p.level !== 1) return [];
  return IT_GB[p.name.toLowerCase()] || [];
}

/** ¿Es un curso de los dos títulos de Informática de Grado Básico? */
export const isItGb = (grade: string) => detailedModules(grade).length > 0;

/** Asignaturas (módulos) de un curso de FP */
export function fpSubjects(grade: string): string[] | null {
  const p = parseFpGrade(grade);
  if (!p) return null;
  const own = detailedModules(grade).map(moduleSubject);
  const common = p.level === 1 ? GB_COMMON(p.course) : GM_GS_COMMON(p.level, p.course);
  return [...own, ...(own.length ? [] : [FP_OTHER]), ...common];
}

export function findModule(grade: string, subject: string): FpModule | null {
  const s = String(subject || '').trim().toLowerCase();
  return detailedModules(grade).find((m) => moduleSubject(m).toLowerCase() === s || m.name.toLowerCase() === s) || null;
}

/** Temario de un módulo detallado: un tema por bloque oficial */
export function moduleSyllabus(grade: string, subject: string) {
  const m = findModule(grade, subject);
  if (!m) return null;
  return m.blocks.map((b, i) => ({ id: `t${i + 1}`, title: b.title, description: b.contents.slice(0, 4).join(' · ') + (b.contents.length > 4 ? '…' : ''), subtopics: b.contents }));
}

/**
 * Contenidos oficiales con los que la IA debe ceñirse al explicar o preguntar un tema de un módulo detallado.
 * Si el tema es un bloque, sus contenidos; si es un contenido suelto, su bloque.
 */
export function officialContents(grade: string, subject: string, topic: string): { module: FpModule; block: FpBlock } | null {
  const m = findModule(grade, subject);
  if (!m) return null;
  const t = String(topic || '').trim().toLowerCase();
  const block = m.blocks.find((b) => b.title.toLowerCase() === t) || m.blocks.find((b) => b.contents.some((c) => c.toLowerCase() === t));
  return block ? { module: m, block } : null;
}

/** Texto para los avisos a la IA: qué es este curso */
export function fpContextLine(grade: string) {
  const p = parseFpGrade(grade);
  if (!p) return '';
  const lvl = p.level === 1 ? 'Grado Básico' : p.level === 2 ? 'Grado Medio' : 'Grado Superior';
  return `Es Formación Profesional de ${lvl}, ${p.course}º curso, título «${p.name}». El alumno puede ser adolescente o adulto: trátalo con respeto y sin infantilizar.`;
}
