// Catálogo oficial de títulos de FP (grado D: Básico, Medio y Superior), por familias profesionales.
// Fuente: Ministerio de Educación, FP y Deportes — «Catálogo de ofertas formativas de grado D del Sistema de
// Formación Profesional», Madrid 2025 (todofp.es). Un título puede aparecer en dos familias, como en el catálogo.
export type FpLevel = 1 | 2 | 3;
export interface FpTitle { code: string; name: string; level: FpLevel }
export interface FpFamily { name: string; titles: FpTitle[] }

export const FP_FAMILIES: FpFamily[] = [
  { name: "Actividades Físicas y Deportivas", titles: [
    { code: '12342501', name: "Acceso y conservación en instalaciones deportivas", level: 1 },
    { code: '12142501', name: "Actividades ecuestres", level: 2 },
    { code: '12142502', name: "Guía en el medio natural y de tiempo libre", level: 2 },
    { code: '12242501', name: "Acondicionamiento físico", level: 3 },
    { code: '12242502', name: "Enseñanza y animación sociodeportiva", level: 3 },
  ] },
  { name: "Administración y Gestión", titles: [
    { code: '12342002', name: "Informática de oficina", level: 1 },
    { code: '12342101', name: "Servicios administrativos", level: 1 },
    { code: '12142101', name: "Gestión administrativa", level: 2 },
    { code: '12242101', name: "Asistencia a la dirección", level: 3 },
    { code: '12242102', name: "Administración y finanzas", level: 3 },
  ] },
  { name: "Agraria", titles: [
    { code: '12340101', name: "Agrojardinería y composiciones florales", level: 1 },
    { code: '12340102', name: "Actividades agropecuarias", level: 1 },
    { code: '12340103', name: "Aprovechamientos forestales", level: 1 },
    { code: '12140101', name: "Producción agroecológica", level: 2 },
    { code: '12140102', name: "Producción agropecuaria", level: 2 },
    { code: '12140103', name: "Jardinería y floristería", level: 2 },
    { code: '12140104', name: "Aprovechamiento y conservación del medio natural", level: 2 },
    { code: '12142501', name: "Actividades ecuestres", level: 2 },
    { code: '12240101', name: "Gestión forestal y del medio natural", level: 3 },
    { code: '12240102', name: "Paisajismo y medio rural", level: 3 },
    { code: '12240103', name: "Ganadería y asistencia en sanidad animal", level: 3 },
  ] },
  { name: "Artes Gráficas", titles: [
    { code: '12341801', name: "Artes gráficas", level: 1 },
    { code: '12141801', name: "Postimpresión y acabados gráficos", level: 2 },
    { code: '12141802', name: "Preimpresión digital", level: 2 },
    { code: '12141803', name: "Impresión gráfica", level: 2 },
    { code: '12241801', name: "Diseño y gestión de la producción gráfica", level: 3 },
    { code: '12241802', name: "Diseño y edición de publicaciones impresas y multimedia", level: 3 },
  ] },
  { name: "Artes y Artesanías", titles: [
    { code: '12242601', name: "Artista fallero y construcción de escenografía", level: 3 },
    { code: '12242602', name: "Diseño y construcción artesanal de instrumentos musicales de cuerda", level: 3 },
  ] },
  { name: "Comercio y Marketing", titles: [
    { code: '12342201', name: "Servicios comerciales", level: 1 },
    { code: '12142201', name: "Actividades comerciales", level: 2 },
    { code: '12142202', name: "Comercialización de productos alimentarios", level: 2 },
    { code: '12242201', name: "Comercio internacional", level: 3 },
    { code: '12242202', name: "Gestión de ventas y espacios comerciales", level: 3 },
    { code: '12242203', name: "Marketing y publicidad", level: 3 },
    { code: '12242204', name: "Transporte y logística", level: 3 },
  ] },
  { name: "Edificación y Obra Civil", titles: [
    { code: '12341401', name: "Reforma y mantenimiento de edificios", level: 1 },
    { code: '12141401', name: "Construcción", level: 2 },
    { code: '12141402', name: "Obras de interior, decoración y rehabilitación", level: 2 },
    { code: '12241401', name: "Proyectos de edificación", level: 3 },
    { code: '12241402', name: "Proyectos de obra civil", level: 3 },
    { code: '12241403', name: "Organización y control de obras de construcción", level: 3 },
  ] },
  { name: "Electricidad y Electrónica", titles: [
    { code: '12340802', name: "Fabricación de elementos metálicos", level: 1 },
    { code: '12341001', name: "Electricidad y electrónica", level: 1 },
    { code: '12341002', name: "Instalaciones electrotécnicas y mecánica", level: 1 },
    { code: '12141001', name: "Instalaciones eléctricas y automáticas", level: 2 },
    { code: '12141002', name: "Instalaciones de telecomunicaciones", level: 2 },
    { code: '12241001', name: "Sistemas electrotécnicos y automatizados", level: 3 },
    { code: '12241002', name: "Sistemas de telecomunicaciones e informáticos", level: 3 },
    { code: '12241003', name: "Mantenimiento electrónico", level: 3 },
    { code: '12241004', name: "Automatización y robótica industrial", level: 3 },
    { code: '12241005', name: "Electromedicina clínica", level: 3 },
  ] },
  { name: "Energía y Agua", titles: [
    { code: '12141101', name: "Redes y estaciones de tratamiento de aguas", level: 2 },
    { code: '12241101', name: "Eficiencia energética y energía solar térmica", level: 3 },
    { code: '12241102', name: "Energías renovables", level: 3 },
    { code: '12241103', name: "Centrales eléctricas", level: 3 },
    { code: '12241104', name: "Gestión del agua", level: 3 },
  ] },
  { name: "Fabricación Mecánica", titles: [
    { code: '12340801', name: "Fabricación y montaje", level: 1 },
    { code: '12340802', name: "Fabricación de elementos metálicos", level: 1 },
    { code: '12341002', name: "Instalaciones electrotécnicas y mecánica", level: 1 },
    { code: '12101005', name: "Joyería", level: 2 },
    { code: '12140801', name: "Mecanizado", level: 2 },
    { code: '12140802', name: "Soldadura y calderería", level: 2 },
    { code: '12140803', name: "Conformado por moldeo de metales y polímeros", level: 2 },
    { code: '12141206', name: "Montaje de estructuras e instalación de sistemas aeronáuticos", level: 2 },
    { code: '12201055', name: "Óptica de anteojería", level: 3 },
    { code: '12240801', name: "Programación de la producción en fabricación mecánica", level: 3 },
    { code: '12240802', name: "Construcciones metálicas", level: 3 },
    { code: '12240803', name: "Diseño en fabricación mecánica", level: 3 },
    { code: '12240804', name: "Programación de la producción en moldeo de metales y polímeros", level: 3 },
  ] },
  { name: "Hostelería y Turismo", titles: [
    { code: '12342401', name: "Cocina y restauración", level: 1 },
    { code: '12342402', name: "Alojamiento y lavandería", level: 1 },
    { code: '12342403', name: "Actividades de panadería y pastelería", level: 1 },
    { code: '12142202', name: "Comercialización de productos alimentarios", level: 2 },
    { code: '12142401', name: "Cocina y gastronomía", level: 2 },
    { code: '12142402', name: "Servicios en restauración", level: 2 },
    { code: '12242401', name: "Gestión de alojamientos turísticos", level: 3 },
    { code: '12242402', name: "Guía, información y asistencias turísticas", level: 3 },
    { code: '12242403', name: "Agencias de viajes y gestión de eventos", level: 3 },
    { code: '12242404', name: "Dirección de cocina", level: 3 },
    { code: '12242405', name: "Dirección de servicios de restauración", level: 3 },
  ] },
  { name: "Imagen Personal", titles: [
    { code: '12340501', name: "Peluquería y estética", level: 1 },
    { code: '12140501', name: "Estética y belleza", level: 2 },
    { code: '12140502', name: "Peluquería y cosmética capilar", level: 2 },
    { code: '12240501', name: "Estética integral y bienestar", level: 3 },
    { code: '12240502', name: "Estilismo y dirección de peluquería", level: 3 },
    { code: '12240503', name: "Asesoría de imagen personal y corporativa", level: 3 },
    { code: '12240504', name: "Caracterización y maquillaje profesional", level: 3 },
    { code: '12240505', name: "Termalismo y bienestar", level: 3 },
  ] },
  { name: "Imagen y Sonido", titles: [
    { code: '12141901', name: "Vídeo disc-jockey y sonido", level: 2 },
    { code: '12241901', name: "Sonido para audiovisuales y espectáculos", level: 3 },
    { code: '12241902', name: "Producción de audiovisuales y espectáculos", level: 3 },
    { code: '12241903', name: "Realización de proyectos audiovisuales y espectáculos", level: 3 },
    { code: '12241904', name: "Animaciones 3D, juegos y entornos interactivos", level: 3 },
    { code: '12241905', name: "Iluminación, captación y tratamiento de imagen", level: 3 },
  ] },
  { name: "Industrias Alimentarias", titles: [
    { code: '12340301', name: "Industrias alimentarias", level: 1 },
    { code: '12342403', name: "Actividades de panadería y pastelería", level: 1 },
    { code: '12140301', name: "Panadería, repostería y confitería", level: 2 },
    { code: '12140302', name: "Aceites de oliva y vinos", level: 2 },
    { code: '12140303', name: "Elaboración de productos alimenticios", level: 2 },
    { code: '12240301', name: "Vitivinicultura", level: 3 },
    { code: '12240302', name: "Procesos y calidad en la industria alimentaria", level: 3 },
  ] },
  { name: "Industrias Extractivas", titles: [
    { code: '12141301', name: "Piedra natural", level: 2 },
    { code: '12141302', name: "Excavaciones y sondeos", level: 2 },
  ] },
  { name: "Informática y Comunicaciones", titles: [
    { code: '12342001', name: "Informática y comunicaciones", level: 1 },
    { code: '12342002', name: "Informática de oficina", level: 1 },
    { code: '12142001', name: "Sistemas microinformáticos y redes", level: 2 },
    { code: '12242001', name: "Administración de sistemas informáticos en red", level: 3 },
    { code: '12242002', name: "Desarrollo de aplicaciones multiplataforma", level: 3 },
    { code: '12242003', name: "Desarrollo de aplicaciones web", level: 3 },
  ] },
  { name: "Instalación y Mantenimiento", titles: [
    { code: '12340801', name: "Fabricación y montaje", level: 1 },
    { code: '12340901', name: "Mantenimiento de viviendas", level: 1 },
    { code: '12140901', name: "Instalaciones de producción de calor", level: 2 },
    { code: '12140902', name: "Instalaciones frigoríficas y de climatización", level: 2 },
    { code: '12140903', name: "Mantenimiento electromecánico", level: 2 },
    { code: '12240901', name: "Desarrollo de proyectos de instalaciones térmicas y de fluidos", level: 3 },
    { code: '12240902', name: "Mantenimiento de instalaciones térmicas y de fluidos", level: 3 },
    { code: '12240903', name: "Mecatrónica industrial", level: 3 },
  ] },
  { name: "Madera, Mueble y Corcho", titles: [
    { code: '12341601', name: "Carpintería y mueble", level: 1 },
    { code: '12141601', name: "Carpintería y mueble", level: 2 },
    { code: '12141602', name: "Instalación y amueblamiento", level: 2 },
    { code: '12141603', name: "Procesado y transformación de la madera", level: 2 },
    { code: '12241601', name: "Diseño y amueblamiento", level: 3 },
  ] },
  { name: "Marítimo-Pesquera", titles: [
    { code: '12340201', name: "Actividades marítimo-pesqueras", level: 1 },
    { code: '12341202', name: "Mantenimiento de embarcaciones deportivas y de recreo", level: 1 },
    { code: '12140201', name: "Cultivos acuícolas", level: 2 },
    { code: '12140202', name: "Mantenimiento y control de la maquinaria de buques y embarcaciones", level: 2 },
    { code: '12140203', name: "Navegación y pesca de litoral", level: 2 },
    { code: '12140204', name: "Operaciones subacuáticas e hiperbáricas", level: 2 },
    { code: '12240201', name: "Transporte marítimo y pesca de altura", level: 3 },
    { code: '12240202', name: "Acuicultura", level: 3 },
    { code: '12240203', name: "Organización del mantenimiento de maquinaria de buques y embarcaciones", level: 3 },
  ] },
  { name: "Química", titles: [
    { code: '12140401', name: "Planta química", level: 2 },
    { code: '12140402', name: "Operaciones de laboratorio", level: 2 },
    { code: '12240401', name: "Laboratorio de análisis y de control de calidad", level: 3 },
    { code: '12240402', name: "Química industrial", level: 3 },
    { code: '12240403', name: "Fabricación de productos farmacéuticos, biotecnológicos y afines", level: 3 },
  ] },
  { name: "Sanidad", titles: [
    { code: '12101901', name: "Cuidados auxiliares de enfermería", level: 2 },
    { code: '12140601', name: "Emergencias sanitarias", level: 2 },
    { code: '12140602', name: "Farmacia y parafarmacia", level: 2 },
    { code: '12201952', name: "Dietética", level: 3 },
    { code: '12240601', name: "Audiología protésica", level: 3 },
    { code: '12240602', name: "Prótesis dentales", level: 3 },
    { code: '12240603', name: "Ortoprótesis y productos de apoyo", level: 3 },
    { code: '12240604', name: "Anatomía patológica y citodiagnóstico", level: 3 },
    { code: '12240605', name: "Documentación y administración sanitarias", level: 3 },
    { code: '12240606', name: "Higiene bucodental", level: 3 },
    { code: '12240607', name: "Imagen para el diagnóstico y medicina nuclear", level: 3 },
    { code: '12240608', name: "Laboratorio clínico y biomédico", level: 3 },
    { code: '12240609', name: "Radioterapia y dosimetría", level: 3 },
  ] },
  { name: "Seguridad y Medio Ambiente", titles: [
    { code: '12140701', name: "Emergencias y protección civil", level: 2 },
    { code: '12140702', name: "Seguridad", level: 2 },
    { code: '12140703', name: "Sanidad ambiental aplicada", level: 2 },
    { code: '12240701', name: "Educación y control ambiental", level: 3 },
    { code: '12240702', name: "Coordinación de emergencias y protección civil", level: 3 },
    { code: '12240703', name: "Química y salud ambiental", level: 3 },
    { code: '12240704', name: "Prevención de riesgos profesionales", level: 3 },
  ] },
  { name: "Servicios Socioculturales y a la Comunidad", titles: [
    { code: '12342301', name: "Actividades domésticas y limpieza de edificios", level: 1 },
    { code: '12142301', name: "Atención a personas en situación de dependencia", level: 2 },
    { code: '12142302', name: "Servicios funerarios", level: 2 },
    { code: '12242301', name: "Educación infantil", level: 3 },
    { code: '12242302', name: "Animación sociocultural y turística", level: 3 },
    { code: '12242303', name: "Integración social", level: 3 },
    { code: '12242304', name: "Promoción de igualdad de género", level: 3 },
    { code: '12242305', name: "Mediación comunicativa", level: 3 },
    { code: '12242306', name: "Formación para la movilidad segura y sostenible", level: 3 },
  ] },
  { name: "Textil, Confección y Piel", titles: [
    { code: '12341701', name: "Arreglo y reparación de artículos textiles y de piel", level: 1 },
    { code: '12341702', name: "Tapicería y cortinaje", level: 1 },
    { code: '12141701', name: "Confección y moda", level: 2 },
    { code: '12141702', name: "Calzado y complementos de moda", level: 2 },
    { code: '12141703', name: "Fabricación y ennoblecimiento de productos textiles", level: 2 },
    { code: '12241701', name: "Patronaje y moda", level: 3 },
    { code: '12241702', name: "Diseño y producción de calzado y complementos", level: 3 },
    { code: '12241703', name: "Vestuario a medida y de espectáculos", level: 3 },
    { code: '12241704', name: "Diseño técnico en textil y piel", level: 3 },
  ] },
  { name: "Transporte y Mantenimiento de Vehículos", titles: [
    { code: '12341201', name: "Mantenimiento de vehículos", level: 1 },
    { code: '12341202', name: "Mantenimiento de embarcaciones deportivas y de recreo", level: 1 },
    { code: '12141201', name: "Carrocería", level: 2 },
    { code: '12141202', name: "Electromecánica de vehículos automóviles", level: 2 },
    { code: '12141203', name: "Electromecánica de maquinaria", level: 2 },
    { code: '12141204', name: "Conducción de vehículos de transporte por carretera", level: 2 },
    { code: '12141205', name: "Mantenimiento de material rodante ferroviario", level: 2 },
    { code: '12141206', name: "Montaje de estructuras e instalación de sistemas aeronáuticos", level: 2 },
    { code: '12141207', name: "Mantenimiento de estructuras de madera y mobiliario de embarcaciones de recreo", level: 2 },
    { code: '12141208', name: "Mantenimiento de embarcaciones de recreo", level: 2 },
    { code: '12241201', name: "Automoción", level: 3 },
    { code: '12241202', name: "Mantenimiento aeromecánico de aviones con motor de pistón", level: 3 },
    { code: '12241203', name: "Mantenimiento aeromecánico de aviones con motor de turbina", level: 3 },
    { code: '12241204', name: "Mantenimiento aeromecánico de helicópteros con motor de pistón", level: 3 },
    { code: '12241205', name: "Mantenimiento aeromecánico de helicópteros con motor de turbina", level: 3 },
    { code: '12241206', name: "Mantenimiento de sistemas electrónicos y aviónicos en aeronaves", level: 3 },
  ] },
  { name: "Vidrio y Cerámica", titles: [
    { code: '12341501', name: "Vidriería y alfarería", level: 1 },
    { code: '12141501', name: "Fabricación de productos cerámicos", level: 2 },
    { code: '12241501', name: "Desarrollo y fabricación de productos cerámicos", level: 3 },
  ] },
];

export const FP_LEVEL_LABEL: Record<FpLevel, string> = { 1: 'Básico', 2: 'Medio', 3: 'Superior' };
const LEVEL_BY_LABEL: Record<string, FpLevel> = { 'Básico': 1, 'Medio': 2, 'Superior': 3 };

/** Todos los títulos sin repetir (por código) */
export const FP_TITLES: FpTitle[] = (() => {
  const seen = new Map<string, FpTitle>();
  FP_FAMILIES.forEach((f) => f.titles.forEach((t) => { if (!seen.has(t.code)) seen.set(t.code, t); }));
  return [...seen.values()];
})();

/** Familias donde aparece un título */
export const familiesOf = (code: string) => FP_FAMILIES.filter((f) => f.titles.some((t) => t.code === code)).map((f) => f.name);

/** Curso de FP guardado en el perfil: «FP Básico 1º · Informática y comunicaciones» */
export function fpGrade(level: FpLevel, course: 1 | 2, name: string) {
  return `FP ${FP_LEVEL_LABEL[level]} ${course}º · ${name}`;
}

export interface ParsedFp { level: FpLevel; course: 1 | 2; name: string; title: FpTitle | null }
export function parseFpGrade(grade: string): ParsedFp | null {
  const m = String(grade || '').match(/^FP (Básico|Medio|Superior) ([12])º · (.+)$/);
  if (!m) return null;
  const level = LEVEL_BY_LABEL[m[1]];
  const name = m[3].trim();
  const title = FP_TITLES.find((t) => t.level === level && t.name.toLowerCase() === name.toLowerCase()) || null;
  return { level, course: Number(m[2]) as 1 | 2, name, title };
}

export const isFpGrade = (grade: string) => /^FP (Básico|Medio|Superior) /.test(String(grade || ''));

/** Un curso de FP válido es uno del catálogo */
export const isValidFpGrade = (grade: string) => !!parseFpGrade(grade)?.title;
