
export interface StaticLesson {
  id: string;
  title: string;
  subject: string;
  gradeRange: string[];
  description: string;
  diagramUrl: string;
  keyConcepts: string[];
  fullExplanation: string;
}

export const STATIC_LESSONS: StaticLesson[] = [
  {
    id: 'ciclo-agua',
    title: 'El Ciclo del Agua',
    subject: 'Ciencias Naturales',
    gradeRange: ['1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria'],
    description: 'Descubre cómo el agua viaja por todo nuestro planeta en un viaje infinito.',
    diagramUrl: 'https://picsum.photos/seed/watercycle/800/600',
    keyConcepts: ['Evaporación', 'Condensación', 'Precipitación', 'Infiltración'],
    fullExplanation: 'El ciclo del agua es el proceso por el cual el agua se mueve en la Tierra. El sol calienta el agua de los mares (evaporación), se forman nubes (condensación), cae lluvia (precipitación) y vuelve a los ríos y mares.'
  },
  {
    id: 'sistema-solar',
    title: 'El Sistema Solar',
    subject: 'Ciencias Naturales',
    gradeRange: ['3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria'],
    description: 'Un viaje por los planetas que giran alrededor de nuestra estrella, el Sol.',
    diagramUrl: 'https://picsum.photos/seed/solarsystem/800/600',
    keyConcepts: ['Sol', 'Planetas Rocosos', 'Gigantes Gaseosos', 'Órbita'],
    fullExplanation: 'Nuestro sistema solar tiene una estrella central, el Sol, y ocho planetas principales: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno.'
  },
  {
    id: 'fotosintesis',
    title: 'La Fotosíntesis',
    subject: 'Ciencias Naturales',
    gradeRange: ['4º Primaria', '5º Primaria', '6º Primaria'],
    description: 'Cómo las plantas fabrican su propio alimento usando la luz del sol.',
    diagramUrl: 'https://picsum.photos/seed/photosynthesis/800/600',
    keyConcepts: ['Clorofila', 'Dióxido de Carbono', 'Oxígeno', 'Luz Solar'],
    fullExplanation: 'Las plantas absorben agua y sales minerales por las raíces, y dióxido de carbono por las hojas. Con la luz del sol, transforman esto en alimento y liberan oxígeno.'
  },
  {
    id: 'partes-celula',
    title: 'La Célula Animal',
    subject: 'Ciencias Naturales',
    gradeRange: ['5º Primaria', '6º Primaria', '1º ESO'],
    description: 'Explora la unidad básica de la vida y sus componentes internos.',
    diagramUrl: 'https://picsum.photos/seed/cell/800/600',
    keyConcepts: ['Núcleo', 'Citoplasma', 'Membrana', 'Mitocondria'],
    fullExplanation: 'La célula es la unidad más pequeña de vida. El núcleo contiene el ADN, la membrana protege la célula y las mitocondrias producen energía.'
  }
];
