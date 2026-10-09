export type StickerRarity = 'común' | 'raro' | 'épico' | 'legendario';

export type StickerCategory = 'Espacio' | 'Naturaleza' | 'Científicos' | 'Historia' | 'Matemáticas';

export interface Sticker {
  id: string;
  title: string;
  category: StickerCategory;
  rarity: StickerRarity;
  funFact: string;
  icon: string;
  costXP: number;
}

export const ALL_STICKERS: Sticker[] = [
  // Espacio
  {
    id: 'space_sun',
    title: 'El Sol Gigante',
    category: 'Espacio',
    rarity: 'común',
    funFact: '¡Dentro del Sol cabrían más de un millón de planetas Tierra!',
    icon: '☀️',
    costXP: 15
  },
  {
    id: 'space_moon',
    title: 'La Luna Plateada',
    category: 'Espacio',
    rarity: 'común',
    funFact: 'La Luna no tiene atmósfera, por eso las huellas de los astronautas durarán millones de años.',
    icon: '🌙',
    costXP: 20
  },
  {
    id: 'space_mars',
    title: 'El Planeta Rojo',
    category: 'Espacio',
    rarity: 'raro',
    funFact: 'Marte tiene el volcán más alto de todo el sistema solar: ¡el Monte Olimpo!',
    icon: '🪐',
    costXP: 40
  },
  {
    id: 'space_astronaut',
    title: 'Astronauta J21',
    category: 'Espacio',
    rarity: 'épico',
    funFact: 'En el espacio los astronautas crecen hasta 5 centímetros debido a la ingravidez.',
    icon: '🧑‍🚀',
    costXP: 60
  },
  {
    id: 'space_telescope',
    title: 'Telescopio James Webb',
    category: 'Espacio',
    rarity: 'legendario',
    funFact: 'Puede ver la luz de las primeras galaxias que nacieron en el universo hace 13.000 millones de años.',
    icon: '🔭',
    costXP: 100
  },

  // Naturaleza
  {
    id: 'nat_lynx',
    title: 'Lince Ibérico',
    category: 'Naturaleza',
    rarity: 'raro',
    funFact: 'Es el felino más amenazado del planeta, pero los biólogos españoles están logrando recuperarlo.',
    icon: '🐱',
    costXP: 35
  },
  {
    id: 'nat_whale',
    title: 'Ballena Azul',
    category: 'Naturaleza',
    rarity: 'épico',
    funFact: 'Su corazón es tan grande como un coche pequeño y su canto viaja cientos de kilómetros bajo el agua.',
    icon: '🐋',
    costXP: 60
  },
  {
    id: 'nat_eagle',
    title: 'Águila Imperial',
    category: 'Naturaleza',
    rarity: 'común',
    funFact: 'Puede avistar un conejo a más de dos kilómetros de distancia mientras planea en el cielo.',
    icon: '🦅',
    costXP: 25
  },

  // Científicos
  {
    id: 'sci_curie',
    title: 'Marie Curie',
    category: 'Científicos',
    rarity: 'legendario',
    funFact: 'Fue la primera persona en ganar dos premios Nobel en dos ciencias distintas: Física y Química.',
    icon: '👩‍🔬',
    costXP: 90
  },
  {
    id: 'sci_einstein',
    title: 'Albert Einstein',
    category: 'Científicos',
    rarity: 'épico',
    funFact: 'Descubrió que el tiempo pasa más despacio cuanto más rápido te mueves por el espacio.',
    icon: '🧠',
    costXP: 75
  },
  {
    id: 'sci_lovelace',
    title: 'Ada Lovelace',
    category: 'Científicos',
    rarity: 'legendario',
    funFact: 'Escribió el primer algoritmo de programación del mundo en el siglo XIX, ¡antes de existir los ordenadores!',
    icon: '💻',
    costXP: 95
  },
  {
    id: 'sci_cajal',
    title: 'Ramón y Cajal',
    category: 'Científicos',
    rarity: 'raro',
    funFact: 'Dibujó a mano las neuronas del cerebro con tanta precisión que aún hoy sus dibujos se usan en medicina.',
    icon: '🔬',
    costXP: 45
  },

  // Matemáticas
  {
    id: 'math_pythagoras',
    title: 'Pitágoras',
    category: 'Matemáticas',
    rarity: 'raro',
    funFact: 'Descubrió que en los triángulos rectángulos los cuadrados de los lados guardan una relación mágica.',
    icon: '📐',
    costXP: 40
  },
  {
    id: 'math_hypatia',
    title: 'Hipatia de Alejandría',
    category: 'Matemáticas',
    rarity: 'épico',
    funFact: 'Fue una de las primeras grandes matemáticas y astrónomas de la historia en la célebre Biblioteca de Alejandría.',
    icon: '📜',
    costXP: 70
  }
];
