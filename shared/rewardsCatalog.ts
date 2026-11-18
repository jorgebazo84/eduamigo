// Opción 7 — Catálogo de cromos y medallas (compartido por servidor y navegador).
// Los cromos normales se compran eligiéndolos (sin sobres sorpresa). Los "especiales" no se compran:
// se ganan con las medallas y la racha. Las curiosidades están comprobadas y relacionadas con lo que se estudia.

export type StickerRarity = 'común' | 'raro' | 'épico' | 'legendario' | 'especial';
export type StickerCategory =
  | 'Espacio' | 'Naturaleza' | 'Científicos' | 'Historia' | 'Matemáticas' | 'Geografía' | 'Escritores' | 'Especiales';

export interface Sticker {
  id: string;
  title: string;
  category: StickerCategory;
  rarity: StickerRarity;
  icon: string;
  funFact: string;
  /** 0 = no se compra (especial) */
  cost: number;
}

export const RARITY_COST: Record<Exclude<StickerRarity, 'especial'>, number> = {
  común: 30, raro: 60, épico: 100, legendario: 150,
};

const s = (id: string, title: string, category: StickerCategory, rarity: StickerRarity, icon: string, funFact: string): Sticker =>
  ({ id, title, category, rarity, icon, funFact, cost: rarity === 'especial' ? 0 : RARITY_COST[rarity] });

export const STICKERS: Sticker[] = [
  // ---------------------------------------------------------------- Espacio
  s('space_sun', 'El Sol', 'Espacio', 'común', '☀️', 'Dentro del Sol cabrían más de un millón de planetas como la Tierra.'),
  s('space_moon', 'La Luna', 'Espacio', 'común', '🌙', 'La Luna no tiene aire ni viento, por eso las huellas de los astronautas siguen allí desde 1969.'),
  s('space_mars', 'Marte, el planeta rojo', 'Espacio', 'raro', '🔴', 'En Marte está el Monte Olimpo, el volcán más alto que se conoce en el sistema solar.'),
  s('space_jupiter', 'Júpiter', 'Espacio', 'raro', '🪐', 'Es el planeta más grande: dentro cabrían más de 1.300 Tierras. Su Gran Mancha Roja es una tormenta más grande que nuestro planeta.'),
  s('space_saturn', 'Los anillos de Saturno', 'Espacio', 'raro', '💫', 'Sus anillos están hechos de trozos de hielo y roca: unos son como granos de arena y otros tan grandes como una casa.'),
  s('space_astronaut', 'Astronauta', 'Espacio', 'épico', '🧑‍🚀', 'En el espacio la columna vertebral se estira sin la gravedad y los astronautas pueden crecer unos centímetros. ¡Al volver encogen otra vez!'),
  s('space_milkyway', 'La Vía Láctea', 'Espacio', 'épico', '🌌', 'Nuestra galaxia tiene entre 100.000 y 400.000 millones de estrellas, y el Sol es solo una de ellas.'),
  s('space_telescope', 'Telescopio James Webb', 'Espacio', 'legendario', '🔭', 'Capta luz que salió de algunas de las primeras galaxias hace más de 13.000 millones de años: mirar lejos es mirar al pasado.'),

  // ---------------------------------------------------------------- Naturaleza
  s('nat_eagle', 'Águila imperial ibérica', 'Naturaleza', 'común', '🦅', 'Solo vive en la península ibérica y puede ver un conejo a más de dos kilómetros mientras vuela.'),
  s('nat_bee', 'La abeja', 'Naturaleza', 'común', '🐝', 'Para fabricar un kilo de miel, las abejas tienen que visitar millones de flores.'),
  s('nat_octopus', 'El pulpo', 'Naturaleza', 'común', '🐙', 'Tiene tres corazones y su sangre es azul.'),
  s('nat_posidonia', 'Posidonia oceánica', 'Naturaleza', 'raro', '🌿', 'No es un alga: es una planta con flores. Sus praderas limpian el agua del Mediterráneo y dan refugio a cientos de especies.'),
  s('nat_bear', 'Oso pardo cantábrico', 'Naturaleza', 'raro', '🐻', 'Estuvo a punto de desaparecer de la cordillera Cantábrica y hoy se está recuperando. En invierno hiberna y vive de la grasa que ha acumulado.'),
  s('nat_lynx', 'Lince ibérico', 'Naturaleza', 'épico', '🐈', 'Hace unos 20 años quedaban menos de 100. Gracias a su protección hoy viven más de 2.000 en España y Portugal.'),
  s('nat_dragon_tree', 'El drago canario', 'Naturaleza', 'épico', '🌳', 'Su savia se vuelve roja al secarse y antiguamente la llamaban «sangre de dragón». El Drago Milenario de Icod (Tenerife) es famoso en todo el mundo.'),
  s('nat_whale', 'Ballena azul', 'Naturaleza', 'legendario', '🐋', 'Es el animal más grande que ha existido nunca, más que cualquier dinosaurio. Su corazón pesa unos 180 kilos.'),

  // ---------------------------------------------------------------- Científicos
  s('sci_galileo', 'Galileo Galilei', 'Científicos', 'raro', '🔭', 'En 1610 apuntó su telescopio a Júpiter y descubrió cuatro de sus lunas.'),
  s('sci_cajal', 'Santiago Ramón y Cajal', 'Científicos', 'raro', '🔬', 'Descubrió que el cerebro está formado por neuronas separadas y ganó el Premio Nobel en 1906. Sus dibujos de neuronas aún se usan hoy.'),
  s('sci_darwin', 'Charles Darwin', 'Científicos', 'raro', '🐢', 'Viajó cinco años alrededor del mundo en el barco Beagle y lo que observó le llevó a la teoría de la evolución.'),
  s('sci_newton', 'Isaac Newton', 'Científicos', 'épico', '🍎', 'Explicó la ley de la gravedad y descubrió que la luz blanca está formada por todos los colores del arcoíris.'),
  s('sci_salas', 'Margarita Salas', 'Científicos', 'épico', '🧬', 'Esta bioquímica asturiana descubrió una proteína que copia el ADN y que hoy se usa en laboratorios de todo el mundo.'),
  s('sci_einstein', 'Albert Einstein', 'Científicos', 'épico', '🧠', 'Descubrió que el tiempo pasa más despacio cuanto más deprisa te mueves.'),
  s('sci_lovelace', 'Ada Lovelace', 'Científicos', 'legendario', '💻', 'En 1843 escribió lo que se considera el primer programa de ordenador, ¡más de cien años antes de que existieran los ordenadores modernos!'),
  s('sci_curie', 'Marie Curie', 'Científicos', 'legendario', '⚗️', 'Fue la primera persona en ganar dos Premios Nobel en dos ciencias distintas: Física y Química.'),

  // ---------------------------------------------------------------- Historia
  s('his_atapuerca', 'Atapuerca', 'Historia', 'común', '🦴', 'En esta sierra de Burgos se han encontrado restos humanos de hace más de 800.000 años, de los más antiguos de Europa.'),
  s('his_altamira', 'Cueva de Altamira', 'Historia', 'raro', '🦬', 'Sus bisontes se pintaron hace más de 14.000 años. La llaman «la Capilla Sixtina del arte rupestre».'),
  s('his_aqueduct', 'Acueducto de Segovia', 'Historia', 'raro', '🏛️', 'Los romanos lo construyeron hace unos 2.000 años con bloques de granito colocados sin cemento, y sigue en pie.'),
  s('his_alhambra', 'La Alhambra', 'Historia', 'épico', '🕌', 'Fue palacio de los reyes nazaríes de Granada. Sus paredes están llenas de inscripciones en árabe y mosaicos geométricos.'),
  s('his_printing', 'La imprenta', 'Historia', 'común', '📰', 'Hacia 1450 Gutenberg inventó la imprenta de tipos móviles: los libros dejaron de copiarse a mano y llegaron a mucha más gente.'),
  s('his_1492', 'Las tres carabelas', 'Historia', 'raro', '⛵', 'En 1492 Colón llegó a América con tres barcos: la Pinta, la Niña y la Santa María.'),
  s('his_pepa', 'La Pepa (1812)', 'Historia', 'épico', '📜', 'La primera Constitución española se aprobó en Cádiz el 19 de marzo de 1812, día de San José. Por eso la llamaron «La Pepa».'),
  s('his_steam', 'La máquina de vapor', 'Historia', 'raro', '🚂', 'James Watt la perfeccionó en el siglo XVIII y movió fábricas, trenes y barcos: así empezó la Revolución Industrial.'),

  // ---------------------------------------------------------------- Matemáticas
  s('math_zero', 'El número cero', 'Matemáticas', 'común', '0️⃣', 'Los romanos no tenían cero. Nos llegó desde la India gracias a los matemáticos árabes.'),
  s('math_pi', 'El número π', 'Matemáticas', 'raro', '🥧', 'Indica cuántas veces cabe el diámetro de un círculo en su contorno: un poco más de 3. Sus decimales no se acaban nunca.'),
  s('math_fibonacci', 'La sucesión de Fibonacci', 'Matemáticas', 'raro', '🌻', 'En 1, 1, 2, 3, 5, 8, 13… cada número es la suma de los dos anteriores. Aparece en las espirales de los girasoles y las piñas.'),
  s('math_pythagoras', 'Pitágoras', 'Matemáticas', 'raro', '📐', 'Da nombre al teorema de los triángulos rectángulos: a² + b² = c². ¡Los babilonios ya lo usaban mucho antes!'),
  s('math_euclid', 'Euclides', 'Matemáticas', 'épico', '📏', 'Escribió «Los Elementos», un libro de geometría con el que se aprendieron matemáticas durante más de 2.000 años.'),
  s('math_alkhwarizmi', 'Al-Juarismi', 'Matemáticas', 'épico', '🧮', 'De su nombre viene la palabra «algoritmo», y uno de sus libros dio nombre al «álgebra».'),
  s('math_hypatia', 'Hipatia de Alejandría', 'Matemáticas', 'legendario', '📜', 'Fue matemática, astrónoma y profesora en Alejandría hace unos 1.600 años. Es una de las primeras mujeres científicas que conocemos.'),

  // ---------------------------------------------------------------- Geografía
  s('geo_tajo', 'El río Tajo', 'Geografía', 'común', '🏞️', 'Es el río más largo de la península ibérica: nace en Teruel y desemboca en Lisboa, en el océano Atlántico.'),
  s('geo_donana', 'Doñana', 'Geografía', 'raro', '🦩', 'Es uno de los humedales más importantes de Europa: cada invierno llegan miles de aves desde el norte.'),
  s('geo_teide', 'El Teide', 'Geografía', 'raro', '🌋', 'Con unos 3.715 metros es el pico más alto de España, y es un volcán.'),
  s('geo_pacific', 'El océano Pacífico', 'Geografía', 'común', '🌊', 'Es el océano más grande: todos los continentes juntos cabrían en él.'),
  s('geo_sahara', 'El Sáhara', 'Geografía', 'raro', '🏜️', 'Es el mayor desierto cálido del mundo. Hace miles de años estaba lleno de lagos y hierba.'),
  s('geo_amazon', 'El Amazonas', 'Geografía', 'épico', '🐊', 'Es el río que más agua lleva del mundo y atraviesa la selva tropical más grande del planeta.'),
  s('geo_everest', 'El Everest', 'Geografía', 'épico', '🏔️', 'Con 8.849 metros es la montaña más alta del mundo. Está en el Himalaya, entre Nepal y China.'),
  s('geo_antarctica', 'La Antártida', 'Geografía', 'legendario', '🐧', 'Es el continente más frío, seco y ventoso. En su hielo está la mayor parte del agua dulce del planeta.'),

  // ---------------------------------------------------------------- Escritores (muchos están en la biblioteca de Lectura)
  s('wri_samaniego', 'Félix María Samaniego', 'Escritores', 'común', '🦊', 'Escribió sus fábulas en verso para los alumnos de un colegio del País Vasco. En ellas los animales nos dan lecciones.'),
  s('wri_andersen', 'Hans Christian Andersen', 'Escritores', 'común', '🦢', 'Escribió «El patito feo» y «La sirenita». El día que nació, el 2 de abril, se celebra el Día Internacional del Libro Infantil.'),
  s('wri_machado', 'Antonio Machado', 'Escritores', 'raro', '🌾', 'Fue profesor de francés en Soria, Baeza y Segovia, y escribió poemas sobre los campos de Castilla.'),
  s('wri_rosalia', 'Rosalía de Castro', 'Escritores', 'raro', '🌧️', 'Su libro «Cantares gallegos» se publicó un 17 de mayo de 1863. Por eso ese día es el Día de las Letras Gallegas.'),
  s('wri_lorca', 'Federico García Lorca', 'Escritores', 'épico', '🎭', 'Además de poeta era músico y dibujante. Con el teatro ambulante «La Barraca» llevó obras clásicas a los pueblos de España.'),
  s('wri_becquer', 'Gustavo Adolfo Bécquer', 'Escritores', 'épico', '🕊️', 'Este poeta sevillano escribió las «Rimas» y las «Leyendas». También dibujaba muy bien.'),
  s('wri_pardobazan', 'Emilia Pardo Bazán', 'Escritores', 'épico', '✒️', 'Fue una gran novelista del siglo XIX y defendió que las mujeres pudieran estudiar igual que los hombres.'),
  s('wri_calderon', 'Calderón de la Barca', 'Escritores', 'raro', '🎬', 'En «La vida es sueño» se pregunta si lo que vivimos es real o solo un sueño.'),
  s('wri_cervantes', 'Miguel de Cervantes', 'Escritores', 'legendario', '📖', 'Le llamaban «el manco de Lepanto» porque perdió el movimiento de la mano izquierda en esa batalla. El Quijote es una de las novelas más leídas del mundo.'),

  // ---------------------------------------------------------------- Especiales (no se compran)
  s('sp_streak7', 'Llama constante', 'Especiales', 'especial', '🔥', 'Practicar un poco cada día ayuda a recordar mucho mejor que estudiar todo de golpe. ¡7 días seguidos!'),
  s('sp_streak14', 'Hábito de campeón', 'Especiales', 'especial', '🏅', 'Los hábitos se construyen día a día: un estudio vio que, de media, hacen falta unas diez semanas para que algo salga solo. ¡Ya llevas dos!'),
  s('sp_streak30', 'Ave fénix', 'Especiales', 'especial', '🌟', 'El ave fénix es un ser mitológico que renace de sus cenizas: el símbolo de no rendirse nunca. ¡30 días de racha!'),
  s('sp_math10', 'Ábaco de oro', 'Especiales', 'especial', '🧮', 'El ábaco se usa desde hace miles de años para calcular. En Japón todavía hay campeonatos de cálculo con ábaco.'),
  s('sp_read10', 'Pluma de oro', 'Especiales', 'especial', '🪶', 'Antes de los bolígrafos se escribía con plumas de ave mojadas en tinta, como hacía Cervantes.'),
  s('sp_test10', 'Diana perfecta', 'Especiales', 'especial', '🎯', 'En los Juegos Olímpicos los arqueros disparan a una diana que está a 70 metros. ¡Tú has dado en el centro!'),
  s('sp_mastered', 'Cerebro brillante', 'Especiales', 'especial', '💡', 'Cada vez que repasas algo, las conexiones entre tus neuronas se hacen más fuertes. Por eso repasar funciona.'),
  s('sp_sheets5', 'Lápiz incansable', 'Especiales', 'especial', '✏️', 'Con un lápiz normal se podría trazar una línea de unos 50 kilómetros antes de que se gaste.'),
];

export const STICKER_BY_ID = new Map(STICKERS.map((x) => [x.id, x]));
export const WELCOME_STICKERS = ['space_sun', 'nat_eagle'];
export const STICKER_CATEGORIES: StickerCategory[] = ['Espacio', 'Naturaleza', 'Científicos', 'Historia', 'Matemáticas', 'Geografía', 'Escritores', 'Especiales'];

// ---------------------------------------------------------------- Medallas
// Todas se comprueban en el servidor con lo que el niño ha hecho de verdad.
export type BadgeMetric = 'activities' | 'math' | 'readings' | 'reading_perfect' | 'test10' | 'mastered' | 'sheets' | 'streak' | 'stickers' | 'tutor';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: BadgeMetric;
  target: number;
  /** Cromo especial que regala al conseguirla */
  gift?: string;
}

export const BADGES: Badge[] = [
  { id: 'first_step', title: 'Primer paso', description: 'Has hecho tu primera actividad.', icon: '👣', metric: 'activities', target: 1 },
  { id: 'streak3', title: 'En marcha', description: '3 días de racha.', icon: '🔥', metric: 'streak', target: 3 },
  { id: 'streak7', title: 'Imparable', description: '7 días de racha.', icon: '🚀', metric: 'streak', target: 7, gift: 'sp_streak7' },
  { id: 'streak14', title: 'Constancia de hierro', description: '14 días de racha.', icon: '🛡️', metric: 'streak', target: 14, gift: 'sp_streak14' },
  { id: 'streak30', title: 'Leyenda de la constancia', description: '30 días de racha.', icon: '👑', metric: 'streak', target: 30, gift: 'sp_streak30' },
  { id: 'math10', title: 'Calculadora humana', description: 'Has terminado 10 retos de Mates.', icon: '🔢', metric: 'math', target: 10, gift: 'sp_math10' },
  { id: 'read10', title: 'Devorador de libros', description: 'Has completado 10 lecturas.', icon: '📚', metric: 'readings', target: 10, gift: 'sp_read10' },
  { id: 'read_perfect', title: 'Lo he entendido todo', description: 'Has acertado todas las preguntas de una lectura.', icon: '🧐', metric: 'reading_perfect', target: 1 },
  { id: 'test10', title: 'Maestro del examen', description: 'Has sacado un 10 en un test.', icon: '🎯', metric: 'test10', target: 1, gift: 'sp_test10' },
  { id: 'mastered', title: 'Tema dominado', description: 'Has dominado un tema en Repasar.', icon: '🧠', metric: 'mastered', target: 1, gift: 'sp_mastered' },
  { id: 'sheets5', title: 'Trabajador incansable', description: 'Te han corregido 5 fichas o deberes.', icon: '📝', metric: 'sheets', target: 5, gift: 'sp_sheets5' },
  { id: 'curious10', title: 'Mente curiosa', description: 'Has hecho 10 preguntas al tutor.', icon: '💡', metric: 'tutor', target: 10 },
  { id: 'collector20', title: 'Coleccionista', description: 'Tienes 20 cromos.', icon: '🗂️', metric: 'stickers', target: 20 },
];

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
export const STREAK_MILESTONES = [7, 14, 30];
