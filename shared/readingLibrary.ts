// Biblioteca de lecturas de EduAmigo (opción 6).
// - Textos originales de EduAmigo, adaptaciones de obras clásicas de dominio público y poemas originales
//   de autores fallecidos hace más de 80 años (dominio público en España), publicados antes de 1929.
// - Ligados a lo que se trabaja en cada curso (literatura y Ciencias / Sociales).
// - Cada lectura tiene 4 preguntas: literal, inferencial, vocabulario e interpretación (una sola respuesta buena).

export type QuestionType = 'literal' | 'inferencial' | 'vocabulario' | 'interpretacion';
export interface ReadingQuestion { type: QuestionType; q: string; options: string[]; correct: number; explanation: string }
export interface LibraryText {
  id: string;
  /** Nivel: 1–6 = 1º–6º de Primaria; 7 = 1º–2º de ESO; 9 = 3º–4º de ESO */
  level: number;
  course: string;
  title: string;
  author: string;
  /** Texto de EduAmigo, adaptación o texto original */
  source: string;
  genre: 'cuento' | 'fábula' | 'poema' | 'leyenda' | 'novela' | 'teatro' | 'ciencias' | 'sociales' | 'noticia' | 'instrucciones' | 'mito' | 'epopeya';
  /** Con qué se relaciona en clase */
  link: string;
  text: string;
  questions: ReadingQuestion[];
}

export const QUESTION_LABELS: Record<QuestionType, string> = {
  literal: 'Lo que dice el texto',
  inferencial: 'Lo que se deduce',
  vocabulario: 'Vocabulario',
  interpretacion: 'Interpretación',
};

export const READING_LIBRARY: LibraryText[] = [
  // ======================================================================= 1º PRIMARIA
  {
    id: 'p1-liebre-tortuga', level: 1, course: '1º Primaria', title: 'La liebre y la tortuga', author: 'Esopo', source: 'Adaptación de la fábula de Esopo',
    genre: 'fábula', link: 'Lengua: fábulas',
    text: 'Una liebre se reía de una tortuga porque era muy lenta. La tortuga le dijo: «Te reto a una carrera». La liebre corrió mucho y se paró a dormir debajo de un árbol. La tortuga no se paró nunca. Paso a paso, llegó a la meta. Cuando la liebre despertó, la tortuga ya había ganado.',
    questions: [
      { type: 'literal', q: '¿Dónde se paró a dormir la liebre?', options: ['En su casa', 'Debajo de un árbol', 'Junto al río', 'En la meta'], correct: 1, explanation: 'El texto dice que se paró a dormir debajo de un árbol.' },
      { type: 'inferencial', q: '¿Por qué ganó la tortuga?', options: ['Porque corría más que la liebre', 'Porque no se paró nunca', 'Porque la liebre se perdió', 'Porque hizo trampas'], correct: 1, explanation: 'La tortuga siguió paso a paso sin pararse, mientras la liebre dormía.' },
      { type: 'vocabulario', q: '¿Qué significa «meta» en la carrera?', options: ['El lugar donde empieza', 'El lugar donde termina', 'Un premio', 'Un árbol'], correct: 1, explanation: 'La meta es el final de la carrera.' },
      { type: 'interpretacion', q: '¿Qué nos enseña esta fábula?', options: ['Que hay que correr mucho', 'Que es bueno dormir la siesta', 'Que con constancia se llega lejos', 'Que las tortugas son rápidas'], correct: 2, explanation: 'La moraleja es que el esfuerzo constante vale más que ser rápido y confiarse.' },
    ],
  },
  {
    id: 'p1-ratones', level: 1, course: '1º Primaria', title: 'El ratón de campo y el ratón de ciudad', author: 'Esopo', source: 'Adaptación de la fábula de Esopo',
    genre: 'fábula', link: 'Lengua: fábulas',
    text: 'Un ratón de ciudad visitó a su primo del campo. Comieron trigo y raíces, y el ratón de ciudad dijo: «Ven a mi casa, allí hay queso y pasteles». En la ciudad comieron mucho, pero llegó un gato y tuvieron que esconderse. El ratón de campo dijo: «Prefiero mi trigo tranquilo a tus pasteles con miedo».',
    questions: [
      { type: 'literal', q: '¿Qué comieron en el campo?', options: ['Queso y pasteles', 'Trigo y raíces', 'Pan y leche', 'Fruta'], correct: 1, explanation: 'En el campo comieron trigo y raíces.' },
      { type: 'inferencial', q: '¿Por qué tuvieron que esconderse en la ciudad?', options: ['Porque llovía', 'Porque llegó un gato', 'Porque se acabó la comida', 'Porque era de noche'], correct: 1, explanation: 'Llegó un gato y tuvieron miedo.' },
      { type: 'vocabulario', q: '¿Qué quiere decir «prefiero»?', options: ['Que me gusta más', 'Que no me gusta nada', 'Que tengo hambre', 'Que tengo miedo'], correct: 0, explanation: '«Preferir» es elegir algo porque nos gusta más.' },
      { type: 'interpretacion', q: '¿Qué valora más el ratón de campo?', options: ['Comer muchos pasteles', 'Vivir tranquilo', 'Tener una casa grande', 'Viajar a la ciudad'], correct: 1, explanation: 'Prefiere su vida sencilla y tranquila a una vida con lujos pero con miedo.' },
    ],
  },
  {
    id: 'p1-animales-crias', level: 1, course: '1º Primaria', title: '¿Cómo nacen los animales?', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: los animales',
    text: 'Algunos animales nacen del vientre de su madre, como el perro, el caballo y las personas. Se llaman vivíparos. Otros animales nacen de huevos, como las gallinas, las tortugas y los peces. Se llaman ovíparos. Las crías de los vivíparos toman leche de su madre. Muchos ovíparos cuidan sus huevos hasta que nacen sus crías.',
    questions: [
      { type: 'literal', q: '¿Cómo nacen los animales ovíparos?', options: ['Del vientre de su madre', 'De huevos', 'De semillas', 'Del agua'], correct: 1, explanation: 'Los ovíparos nacen de huevos.' },
      { type: 'inferencial', q: 'Un gatito nace del vientre de su madre. ¿Qué es el gato?', options: ['Ovíparo', 'Vivíparo', 'Un pez', 'Una planta'], correct: 1, explanation: 'Si nace del vientre de la madre, es vivíparo, como el perro o el caballo.' },
      { type: 'vocabulario', q: '¿Qué es una «cría»?', options: ['Un animal recién nacido o pequeño', 'Un huevo roto', 'Un tipo de comida', 'La madre de un animal'], correct: 0, explanation: 'La cría es el animal pequeño, hijo de otro animal.' },
      { type: 'interpretacion', q: '¿De qué trata sobre todo el texto?', options: ['De cómo comen los peces', 'De las dos formas en que nacen los animales', 'De las granjas', 'De las mascotas'], correct: 1, explanation: 'Explica la diferencia entre animales vivíparos y ovíparos.' },
    ],
  },
  {
    id: 'p1-estaciones', level: 1, course: '1º Primaria', title: 'Las cuatro estaciones', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias: el tiempo y las estaciones',
    text: 'El año tiene cuatro estaciones. En primavera crecen las flores y hace buen tiempo. En verano hace calor y los días son largos. En otoño caen las hojas de muchos árboles. En invierno hace frío y a veces nieva. Cada estación dura unos tres meses.',
    questions: [
      { type: 'literal', q: '¿En qué estación caen las hojas de muchos árboles?', options: ['Primavera', 'Verano', 'Otoño', 'Invierno'], correct: 2, explanation: 'El texto dice que en otoño caen las hojas.' },
      { type: 'inferencial', q: 'Si hoy nieva, ¿en qué estación estamos seguramente?', options: ['En verano', 'En invierno', 'En primavera', 'En otoño'], correct: 1, explanation: 'En invierno hace frío y a veces nieva.' },
      { type: 'vocabulario', q: '¿Qué significa que los días son «largos»?', options: ['Que hay luz durante muchas horas', 'Que hace frío', 'Que llueve mucho', 'Que no hay colegio'], correct: 0, explanation: 'En verano hay luz del sol durante más horas.' },
      { type: 'interpretacion', q: '¿Cuántos meses hay en total en las cuatro estaciones?', options: ['Cuatro', 'Seis', 'Doce', 'Tres'], correct: 2, explanation: 'Cuatro estaciones de unos tres meses cada una suman doce meses: un año.' },
    ],
  },
  {
    id: 'p1-mi-colegio', level: 1, course: '1º Primaria', title: 'Las personas de mi colegio', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Ciencias Sociales: el colegio y sus personas',
    text: 'En mi colegio trabajan muchas personas. La maestra nos enseña a leer y a contar. El conserje abre la puerta por la mañana y cuida el edificio. En el comedor, las cocineras preparan la comida. La directora organiza el colegio. Todos ayudan para que aprendamos y estemos bien.',
    questions: [
      { type: 'literal', q: '¿Quién abre la puerta por la mañana?', options: ['La maestra', 'El conserje', 'La directora', 'Las cocineras'], correct: 1, explanation: 'El conserje abre la puerta y cuida el edificio.' },
      { type: 'inferencial', q: 'Si se rompe una ventana del colegio, ¿quién lo sabrá antes?', options: ['El conserje, que cuida el edificio', 'Las cocineras', 'Los niños de otro colegio', 'Nadie'], correct: 0, explanation: 'El conserje se encarga de cuidar el edificio.' },
      { type: 'vocabulario', q: '¿Qué significa «organiza»?', options: ['Cocina', 'Pone orden y decide cómo se hacen las cosas', 'Juega', 'Limpia'], correct: 1, explanation: 'Organizar es ordenar y planificar las tareas.' },
      { type: 'interpretacion', q: '¿Qué idea quiere transmitir el texto?', options: ['Que solo la maestra es importante', 'Que en el colegio cada persona tiene un trabajo y todas ayudan', 'Que el comedor es lo mejor', 'Que la directora manda en todo'], correct: 1, explanation: 'Todas las personas trabajan juntas para que los niños aprendan y estén bien.' },
    ],
  },

  // ======================================================================= 2º PRIMARIA
  {
    id: 'p2-cancion-tonta', level: 2, course: '2º Primaria', title: 'Canción tonta', author: 'Federico García Lorca', source: 'Texto original (Canciones, 1927)',
    genre: 'poema', link: 'Lengua: poesía y diálogo',
    text: 'Mamá.\nYo quiero ser de plata.\n\nHijo,\ntendrás mucho frío.\n\nMamá.\nYo quiero ser de agua.\n\nHijo,\ntendrás mucho frío.\n\nMamá.\nBórdame en tu almohada.\n\n¡Eso sí!\n¡Ahora mismo!',
    questions: [
      { type: 'literal', q: '¿Qué contesta la madre cuando el niño quiere ser de plata?', options: ['¡Ahora mismo!', 'Tendrás mucho frío', 'Eso no puede ser', 'Vete a dormir'], correct: 1, explanation: 'La madre responde: «Hijo, tendrás mucho frío».' },
      { type: 'inferencial', q: '¿Por qué la madre dice «¡Eso sí!» al final?', options: ['Porque quiere tener al hijo siempre cerca y con cariño', 'Porque le gusta coser', 'Porque tiene frío', 'Porque está enfadada'], correct: 0, explanation: 'Bordarlo en su almohada es tenerlo cerca, con calor y cariño, no lejos y frío como la plata o el agua.' },
      { type: 'vocabulario', q: '¿Qué significa «bordar»?', options: ['Dibujar con lápiz', 'Coser un dibujo con hilo sobre una tela', 'Lavar la ropa', 'Pintar una pared'], correct: 1, explanation: 'Bordar es hacer un dibujo cosiendo con hilo.' },
      { type: 'interpretacion', q: '¿Cómo es el poema?', options: ['Un diálogo entre un niño y su madre', 'Una carta', 'Una noticia', 'Una receta'], correct: 0, explanation: 'Hablan por turnos el niño («Mamá») y la madre («Hijo»).' },
    ],
  },
  {
    id: 'p2-cigarra-hormiga', level: 2, course: '2º Primaria', title: 'La cigarra y la hormiga', author: 'Esopo y Samaniego', source: 'Adaptación libre de la fábula (con final amable)',
    genre: 'fábula', link: 'Lengua: fábulas y moraleja',
    text: 'Durante todo el verano, la cigarra cantaba al sol sin preocuparse de nada. Mientras, la hormiga trabajaba sin parar: llevaba granos de trigo a su hormiguero. «¿Por qué trabajas tanto?», le preguntaba la cigarra. «Porque llegará el invierno», contestaba la hormiga. Cuando llegó el frío, la cigarra no tenía nada que comer y fue a pedir ayuda a la hormiga. La hormiga le dio un poco de trigo y le dijo: «El próximo verano, canta, pero guarda también comida».',
    questions: [
      { type: 'literal', q: '¿Qué hacía la hormiga en verano?', options: ['Cantaba al sol', 'Llevaba granos de trigo al hormiguero', 'Dormía', 'Jugaba con la cigarra'], correct: 1, explanation: 'La hormiga trabajaba llevando trigo a su hormiguero.' },
      { type: 'inferencial', q: '¿Por qué la cigarra no tenía comida en invierno?', options: ['Porque se la robaron', 'Porque no guardó nada en verano', 'Porque no le gusta el trigo', 'Porque estaba enferma'], correct: 1, explanation: 'Pasó el verano cantando sin guardar comida.' },
      { type: 'vocabulario', q: '¿Qué es un «hormiguero»?', options: ['La casa de las hormigas', 'Un tipo de trigo', 'Una canción', 'Un árbol'], correct: 0, explanation: 'El hormiguero es el lugar donde viven las hormigas.' },
      { type: 'interpretacion', q: '¿Qué consejo da la fábula?', options: ['No cantes nunca', 'Diviértete, pero piensa también en el futuro', 'No ayudes a nadie', 'Trabaja solo en invierno'], correct: 1, explanation: 'La hormiga le dice que cante, pero que guarde también comida: hay que prever.' },
    ],
  },
  {
    id: 'p2-partes-planta', level: 2, course: '2º Primaria', title: 'Las partes de una planta', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: las plantas',
    text: 'Las plantas son seres vivos: nacen, crecen, se reproducen y mueren. La raíz está bajo la tierra; sujeta la planta y toma el agua. El tallo sostiene las hojas y lleva el agua hacia arriba. En las hojas, la planta fabrica su alimento con la luz del sol. Las flores producen las semillas, y de cada semilla puede nacer una planta nueva.',
    questions: [
      { type: 'literal', q: '¿Qué parte de la planta toma el agua de la tierra?', options: ['La flor', 'La hoja', 'La raíz', 'La semilla'], correct: 2, explanation: 'La raíz está bajo tierra, sujeta la planta y toma el agua.' },
      { type: 'inferencial', q: 'Si guardamos una planta en un armario oscuro mucho tiempo, ¿qué le pasará?', options: ['Crecerá más rápido', 'No podrá fabricar bien su alimento', 'Le saldrán más flores', 'No le pasará nada'], correct: 1, explanation: 'Las hojas necesitan la luz del sol para fabricar el alimento.' },
      { type: 'vocabulario', q: '¿Qué significa «sostiene»?', options: ['Aguanta, mantiene en pie', 'Rompe', 'Pinta', 'Esconde'], correct: 0, explanation: 'El tallo sostiene: mantiene las hojas arriba.' },
      { type: 'interpretacion', q: '¿Por qué dice el texto que las plantas son seres vivos?', options: ['Porque son verdes', 'Porque nacen, crecen, se reproducen y mueren', 'Porque tienen hojas', 'Porque están en el jardín'], correct: 1, explanation: 'Esas son las funciones de todos los seres vivos.' },
    ],
  },
  {
    id: 'p2-oficios', level: 2, course: '2º Primaria', title: 'Los oficios de mi barrio', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Ciencias Sociales: los trabajos y los servicios',
    text: 'Esta mañana he dado un paseo por mi barrio con mi abuelo. En la panadería, el panadero sacaba barras calientes del horno. En el centro de salud, una enfermera nos saludó desde la puerta. Vimos a una bombera revisar el camión rojo, por si había un fuego. En la biblioteca, el bibliotecario ordenaba los libros nuevos. Mi abuelo me dijo: «Todos estos trabajos son necesarios para que el barrio funcione».',
    questions: [
      { type: 'literal', q: '¿Con quién dio el paseo el niño?', options: ['Con su madre', 'Con su abuelo', 'Con su maestra', 'Solo'], correct: 1, explanation: 'El texto dice «con mi abuelo».' },
      { type: 'inferencial', q: '¿Por qué la bombera revisaba el camión?', options: ['Para lavarlo', 'Para estar preparada si hay un fuego', 'Para venderlo', 'Para pintarlo'], correct: 1, explanation: 'Lo revisaba «por si había un fuego»: así estará lista.' },
      { type: 'vocabulario', q: '¿Qué es un «oficio»?', options: ['Un trabajo o profesión', 'Una tienda', 'Un barrio', 'Un juego'], correct: 0, explanation: 'Un oficio es un trabajo, como el de panadero o enfermera.' },
      { type: 'interpretacion', q: '¿Qué quiere decir el abuelo con su frase?', options: ['Que solo importa el panadero', 'Que cada trabajo ayuda a todos los vecinos', 'Que hay que trabajar mucho', 'Que el barrio es muy grande'], correct: 1, explanation: 'Todos los oficios son necesarios para la vida del barrio.' },
    ],
  },
  {
    id: 'p2-patito-feo', level: 2, course: '2º Primaria', title: 'El patito feo', author: 'Hans Christian Andersen', source: 'Adaptación del cuento de Andersen',
    genre: 'cuento', link: 'Lengua: cuentos clásicos',
    text: 'En una granja nacieron unos patitos. Uno de ellos era más grande y gris que sus hermanos, y todos se burlaban de él llamándolo «patito feo». Triste, se marchó lejos. Pasó un invierno largo y frío escondido entre los juncos de un lago. Cuando llegó la primavera, vio unos cisnes preciosos y se acercó con miedo. Al mirar su reflejo en el agua, descubrió que él también se había convertido en un hermoso cisne.',
    questions: [
      { type: 'literal', q: '¿Dónde pasó el invierno el patito?', options: ['En la granja', 'Entre los juncos de un lago', 'En una casa', 'En un árbol'], correct: 1, explanation: 'Se escondió entre los juncos de un lago.' },
      { type: 'inferencial', q: '¿Por qué era diferente a sus hermanos?', options: ['Porque estaba enfermo', 'Porque en realidad era una cría de cisne', 'Porque era más pequeño', 'Porque no sabía nadar'], correct: 1, explanation: 'Al final descubre que era un cisne, no un pato.' },
      { type: 'vocabulario', q: '¿Qué es un «reflejo»?', options: ['Un ruido', 'La imagen que se ve en el agua o en un espejo', 'Un tipo de pájaro', 'Una pluma'], correct: 1, explanation: 'El reflejo es la imagen que devuelve el agua, como un espejo.' },
      { type: 'interpretacion', q: '¿Qué enseña el cuento?', options: ['Que los cisnes son malos', 'Que no hay que burlarse de quien es diferente', 'Que hay que irse de casa', 'Que el invierno es bonito'], correct: 1, explanation: 'El patito sufrió por ser diferente; las burlas no estaban justificadas.' },
    ],
  },

  // ======================================================================= 3º PRIMARIA
  {
    id: 'p3-soldadito', level: 3, course: '3º Primaria', title: 'El soldadito de plomo', author: 'Hans Christian Andersen', source: 'Adaptación del cuento de Andersen',
    genre: 'cuento', link: 'Lengua: cuentos clásicos',
    text: 'Un niño recibió una caja con veinticinco soldaditos de plomo. Todos eran iguales, menos uno: como se había acabado el plomo al fabricarlo, solo tenía una pierna. Aun así, se mantenía tan firme como los demás. En la mesa había un castillo de papel, y en su puerta una bailarina que levantaba una pierna tan alto que el soldadito pensó que también tenía solo una. «Esa sería una buena esposa para mí», pensó. Un día, una corriente de aire lo tiró por la ventana. Viajó por una alcantarilla en un barquito de papel y un pez se lo tragó. Por casualidad, aquel pez acabó en la cocina de la misma casa, y el soldadito volvió a la mesa, frente a su bailarina. Pero esa misma tarde, un niño lo arrojó a la estufa, y una corriente de aire llevó también a la bailarina hasta el fuego. A la mañana siguiente, entre las cenizas, solo quedaba un pequeño corazón de plomo.',
    questions: [
      { type: 'literal', q: '¿Por qué el soldadito tenía solo una pierna?', options: ['Se la rompió el niño', 'Se acabó el plomo al fabricarlo', 'Se la comió un pez', 'Así eran todos'], correct: 1, explanation: 'Fue el último en fabricarse y no quedó plomo suficiente.' },
      { type: 'inferencial', q: '¿Por qué el soldadito pensó que la bailarina tenía una sola pierna?', options: ['Porque la levantaba tan alto que no se le veía', 'Porque estaba rota', 'Porque el niño se lo dijo', 'Porque era de papel'], correct: 0, explanation: 'Ella levantaba una pierna muy alto y él solo veía la otra.' },
      { type: 'vocabulario', q: '¿Qué significa «firme» en el texto?', options: ['Derecho y sin moverse', 'Triste', 'Pequeño', 'Mojado'], correct: 0, explanation: 'Se mantenía firme: de pie, derecho, sin caerse.' },
      { type: 'interpretacion', q: '¿Cómo es el soldadito?', options: ['Cobarde', 'Valiente y constante aunque es diferente', 'Envidioso', 'Perezoso'], correct: 1, explanation: 'Pese a tener una pierna, se mantiene firme y aguanta las aventuras.' },
    ],
  },
  {
    id: 'p3-ciclo-agua', level: 3, course: '3º Primaria', title: 'El viaje de una gota de agua', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: el ciclo del agua',
    text: 'El agua de la Tierra está siempre viajando. Cuando el sol calienta el mar, los ríos y los lagos, una parte del agua se convierte en vapor y sube al cielo: es la evaporación. Allí arriba hace frío, y el vapor se transforma en gotitas diminutas que forman las nubes: es la condensación. Cuando las gotas se juntan y pesan mucho, caen en forma de lluvia, nieve o granizo: es la precipitación. Esa agua corre por los ríos o se filtra bajo la tierra, y tarde o temprano vuelve al mar. Y el viaje empieza otra vez.',
    questions: [
      { type: 'literal', q: '¿Cómo se llama el paso en el que el vapor forma las nubes?', options: ['Evaporación', 'Condensación', 'Precipitación', 'Filtración'], correct: 1, explanation: 'El vapor se enfría y se convierte en gotitas: condensación.' },
      { type: 'inferencial', q: '¿Por qué se dice que es un «ciclo»?', options: ['Porque se hace en bicicleta', 'Porque el agua vuelve al punto de partida y se repite', 'Porque dura un año', 'Porque solo pasa en el mar'], correct: 1, explanation: 'El agua vuelve al mar y el viaje empieza otra vez: se repite siempre.' },
      { type: 'vocabulario', q: '¿Qué significa «diminutas»?', options: ['Muy grandes', 'Muy pequeñas', 'Muy frías', 'Muy rápidas'], correct: 1, explanation: 'Diminuto quiere decir muy pequeño.' },
      { type: 'interpretacion', q: '¿Qué hace que el agua empiece a subir al cielo?', options: ['El viento', 'El calor del sol', 'La luna', 'Las nubes'], correct: 1, explanation: 'El sol calienta el agua y la evapora.' },
    ],
  },
  {
    id: 'p3-sistema-solar', level: 3, course: '3º Primaria', title: 'Nuestro sistema solar', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Sociales: el universo y el sistema solar',
    text: 'El Sol es una estrella. A su alrededor giran ocho planetas: Mercurio, Venus, la Tierra, Marte, Júpiter, Saturno, Urano y Neptuno. Los cuatro primeros son pequeños y rocosos. Los cuatro últimos son gigantes formados sobre todo por gases y hielo. La Tierra es el único planeta donde sabemos que hay vida, porque tiene agua líquida, aire y una temperatura adecuada. Tarda un año en dar una vuelta completa al Sol y un día en girar sobre sí misma. Alrededor de la Tierra gira la Luna, nuestro satélite.',
    questions: [
      { type: 'literal', q: '¿Cuántos planetas giran alrededor del Sol?', options: ['Siete', 'Ocho', 'Nueve', 'Diez'], correct: 1, explanation: 'El texto nombra ocho planetas.' },
      { type: 'inferencial', q: '¿Cuál de estos planetas es un gigante de gas?', options: ['Marte', 'Mercurio', 'Júpiter', 'La Tierra'], correct: 2, explanation: 'Júpiter es uno de los cuatro últimos, los gigantes.' },
      { type: 'vocabulario', q: '¿Qué es un «satélite»?', options: ['Un cuerpo que gira alrededor de un planeta', 'Una estrella', 'Un planeta rocoso', 'Una nave'], correct: 0, explanation: 'La Luna es un satélite porque gira alrededor de la Tierra.' },
      { type: 'interpretacion', q: 'Según el texto, ¿por qué hay vida en la Tierra?', options: ['Porque está cerca de Júpiter', 'Porque tiene agua líquida, aire y una temperatura adecuada', 'Porque es el planeta más grande', 'Porque tiene la Luna'], correct: 1, explanation: 'Son las tres condiciones que menciona el texto.' },
    ],
  },
  {
    id: 'p3-recuerdo-infantil', level: 3, course: '3º Primaria', title: 'Recuerdo infantil', author: 'Antonio Machado', source: 'Texto original (Soledades, 1907)',
    genre: 'poema', link: 'Lengua: poesía, estrofa y rima',
    text: 'Una tarde parda y fría\nde invierno. Los colegiales\nestudian. Monotonía\nde lluvia tras los cristales.\n\nEs la clase. En un cartel\nse representa a Caín\nfugitivo, y muerto Abel,\njunto a una mancha carmín.\n\nCon timbre sonoro y hueco\ntruena el maestro, un anciano\nmal vestido, enjuto y seco,\nque lleva un libro en la mano.\n\nY todo un coro infantil\nva cantando la lección:\nmil veces ciento, cien mil;\nmil veces mil, un millón.\n\nUna tarde parda y fría\nde invierno. Los colegiales\nestudian. Monotonía\nde la lluvia en los cristales.',
    questions: [
      { type: 'literal', q: '¿Qué lección cantan los niños?', options: ['Los ríos de España', 'Las tablas de multiplicar', 'Un poema', 'Los planetas'], correct: 1, explanation: '«Mil veces ciento, cien mil; mil veces mil, un millón» son multiplicaciones.' },
      { type: 'inferencial', q: '¿Cómo se sienten los niños en esa clase?', options: ['Muy divertidos', 'Aburridos, la clase es monótona', 'Asustados por la tormenta', 'Contentos de jugar'], correct: 1, explanation: 'La «monotonía», la lluvia y la tarde «parda y fría» transmiten aburrimiento.' },
      { type: 'vocabulario', q: '¿Qué significa «enjuto»?', options: ['Delgado, flaco', 'Alegre', 'Joven', 'Gordo'], correct: 0, explanation: 'Enjuto quiere decir delgado y seco de carnes.' },
      { type: 'interpretacion', q: '¿Por qué la primera y la última estrofa son casi iguales?', options: ['Por un error', 'Para mostrar que la tarde se repite igual, sin cambios', 'Porque el poeta se olvidó', 'Para que sea más largo'], correct: 1, explanation: 'Al repetirse, el poema se cierra en círculo, como la clase monótona.' },
    ],
  },
  {
    id: 'p3-lechera', level: 3, course: '3º Primaria', title: 'La lechera', author: 'Félix María Samaniego', source: 'Adaptación en prosa de la fábula de Samaniego',
    genre: 'fábula', link: 'Lengua: fábulas',
    text: 'Una muchacha iba al mercado con un cántaro de leche sobre la cabeza. Mientras caminaba, iba pensando: «Con el dinero de la leche compraré huevos. De los huevos saldrán pollitos. Venderé los pollos y compraré un cerdito. Cuando el cerdito engorde, lo venderé y compraré una vaca con su ternero». Estaba tan contenta imaginando su futuro que dio un salto de alegría. El cántaro cayó al suelo y se rompió. Adiós leche, adiós huevos, adiós pollitos, cerdo, vaca y ternero.',
    questions: [
      { type: 'literal', q: '¿Qué pensaba comprar primero con el dinero de la leche?', options: ['Una vaca', 'Huevos', 'Un cerdito', 'Pollitos'], correct: 1, explanation: 'Su primer plan era comprar huevos.' },
      { type: 'inferencial', q: '¿Por qué se le cayó el cántaro?', options: ['Porque alguien la empujó', 'Porque dio un salto de alegría mientras soñaba', 'Porque pesaba mucho', 'Porque tropezó con una piedra'], correct: 1, explanation: 'Iba tan distraída con sus planes que saltó de alegría.' },
      { type: 'vocabulario', q: '¿Qué es un «cántaro»?', options: ['Una cesta', 'Una vasija grande para llevar líquidos', 'Un tipo de vaca', 'Una moneda'], correct: 1, explanation: 'El cántaro es una vasija de barro para agua o leche.' },
      { type: 'interpretacion', q: '¿Qué enseña la fábula?', options: ['Que la leche es cara', 'Que no hay que ilusionarse tanto con el futuro que descuidemos el presente', 'Que hay que tener animales', 'Que no hay que ir al mercado'], correct: 1, explanation: 'Por soñar con lo que no tenía, perdió lo que sí tenía.' },
    ],
  },

  // ======================================================================= 4º PRIMARIA
  {
    id: 'p4-flautista', level: 4, course: '4º Primaria', title: 'El flautista de Hamelín', author: 'Hermanos Grimm (tradición alemana)', source: 'Adaptación de la leyenda',
    genre: 'leyenda', link: 'Lengua: leyendas',
    text: 'Hace muchos años, la ciudad de Hamelín se llenó de ratas. Estaban en las casas, en los graneros y hasta en las cunas. Un día llegó un hombre con ropa de colores y una flauta. «Si me pagáis mil monedas, os libraré de las ratas», dijo. El alcalde aceptó. El flautista empezó a tocar una melodía y todas las ratas salieron detrás de él hasta el río, donde se ahogaron. Pero cuando pidió su dinero, el alcalde se rió y no quiso pagarle. El flautista se marchó sin decir nada. Unos días después volvió y tocó otra melodía. Esta vez fueron los niños los que salieron de sus casas y lo siguieron hasta desaparecer en una montaña. Solo entonces los habitantes comprendieron lo que vale una promesa.',
    questions: [
      { type: 'literal', q: '¿Cuánto pidió el flautista por su trabajo?', options: ['Cien monedas', 'Mil monedas', 'Una casa', 'Nada'], correct: 1, explanation: 'Pidió mil monedas.' },
      { type: 'inferencial', q: '¿Por qué el flautista se llevó a los niños?', options: ['Porque le gustaban los niños', 'Para castigar a la ciudad por no cumplir su promesa', 'Porque se perdió', 'Porque se lo pidió el alcalde'], correct: 1, explanation: 'Volvió después de que el alcalde se negara a pagarle.' },
      { type: 'vocabulario', q: '¿Qué es un «granero»?', options: ['Un lugar donde se guarda el grano', 'Una granja de animales', 'Un instrumento musical', 'Un tipo de rata'], correct: 0, explanation: 'El granero es el almacén donde se guarda el trigo y otros granos.' },
      { type: 'interpretacion', q: '¿Cuál es la enseñanza de la leyenda?', options: ['Que la música es peligrosa', 'Que hay que cumplir lo que se promete', 'Que las ratas son listas', 'Que no hay que salir de casa'], correct: 1, explanation: 'Los habitantes aprenden «lo que vale una promesa».' },
    ],
  },
  {
    id: 'p4-lagarto', level: 4, course: '4º Primaria', title: 'El lagarto está llorando', author: 'Federico García Lorca', source: 'Texto original (Canciones, 1927)',
    genre: 'poema', link: 'Lengua: poesía, personificación y metáfora',
    text: 'El lagarto está llorando.\nLa lagarta está llorando.\n\nEl lagarto y la lagarta\ncon delantalitos blancos.\n\nHan perdido sin querer\nsu anillo de desposados.\n\n¡Ay, su anillito de plomo,\nay, su anillito plomado!\n\nUn cielo grande y sin gente\nmonta en su globo a los pájaros.\n\nEl sol, capitán redondo,\nlleva un chaleco de raso.\n\n¡Miradlos qué viejos son!\n¡Qué viejos son los lagartos!\n\n¡Ay, cómo lloran y lloran,\n¡ay!, ¡ay!, cómo están llorando!',
    questions: [
      { type: 'literal', q: '¿Por qué lloran los lagartos?', options: ['Porque tienen frío', 'Porque han perdido su anillo de desposados', 'Porque están enfermos', 'Porque se ha ido el sol'], correct: 1, explanation: 'Han perdido sin querer su anillo de boda.' },
      { type: 'inferencial', q: '¿Qué relación hay entre el lagarto y la lagarta?', options: ['Son hermanos', 'Están casados', 'Son enemigos', 'No se conocen'], correct: 1, explanation: 'Tienen un «anillo de desposados»: son marido y mujer.' },
      { type: 'vocabulario', q: '¿Qué significa «desposados»?', options: ['Casados', 'Perdidos', 'Viejos', 'Tristes'], correct: 0, explanation: 'Desposarse es casarse; el anillo de desposados es el de boda.' },
      { type: 'interpretacion', q: 'En «El sol, capitán redondo», el poeta…', options: ['Explica cómo es el sol de verdad', 'Compara el sol con un capitán, como si fuera una persona', 'Habla de un barco', 'Describe un globo'], correct: 1, explanation: 'Es una metáfora y una personificación: el sol se describe como una persona.' },
    ],
  },
  {
    id: 'p4-charca', level: 4, course: '4º Primaria', title: 'La vida en una charca', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: los ecosistemas',
    text: 'Una charca parece pequeña, pero es un ecosistema lleno de vida. En ella hay seres vivos, como algas, juncos, renacuajos, ranas, libélulas y peces pequeños. También hay elementos sin vida que son igual de importantes: el agua, el barro, las piedras, la luz y la temperatura. Todos se relacionan. Las algas y los juncos fabrican su alimento con la luz del sol. Los renacuajos comen algas; las ranas comen insectos, y las garzas que vienen de visita comen ranas y peces. Si la charca se seca o se ensucia, toda esa cadena se rompe. Por eso es tan importante cuidar las zonas húmedas.',
    questions: [
      { type: 'literal', q: '¿Qué comen los renacuajos según el texto?', options: ['Insectos', 'Algas', 'Peces', 'Ranas'], correct: 1, explanation: 'El texto dice que los renacuajos comen algas.' },
      { type: 'inferencial', q: 'Si desaparecieran todas las ranas, ¿a quién afectaría directamente?', options: ['A las piedras', 'A las garzas, que comen ranas', 'Al sol', 'Al barro'], correct: 1, explanation: 'Las garzas se alimentan de ranas: perderían parte de su comida.' },
      { type: 'vocabulario', q: '¿Qué es un «ecosistema»?', options: ['Un tipo de planta', 'El conjunto de seres vivos, el medio en que viven y sus relaciones', 'Un río grande', 'Una granja'], correct: 1, explanation: 'Un ecosistema incluye seres vivos, elementos sin vida y cómo se relacionan.' },
      { type: 'interpretacion', q: '¿Qué quiere decir que «la cadena se rompe»?', options: ['Que se rompe una cadena de metal', 'Que los seres vivos se quedan sin su alimento unos tras otros', 'Que llueve mucho', 'Que llegan más animales'], correct: 1, explanation: 'Se refiere a la cadena alimentaria: si falla un eslabón, afecta a los demás.' },
    ],
  },
  {
    id: 'p4-prehistoria', level: 4, course: '4º Primaria', title: 'De cazadores a agricultores', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Ciencias Sociales: la Prehistoria',
    text: 'La Prehistoria es la etapa más larga de la historia de la humanidad: empieza con los primeros seres humanos y termina cuando se inventa la escritura. En el Paleolítico, las personas eran nómadas: se movían de un lugar a otro siguiendo a los animales que cazaban y buscando frutos. Vivían en cuevas o en cabañas, fabricaban herramientas de piedra tallada y descubrieron cómo hacer fuego. En algunas cuevas, como la de Altamira, en Cantabria, pintaron bisontes y caballos. En el Neolítico todo cambió: aprendieron a cultivar la tierra y a criar animales. Así pudieron quedarse a vivir en el mismo sitio y formaron los primeros poblados. Se habían vuelto sedentarios.',
    questions: [
      { type: 'literal', q: '¿Qué animales se pintaron en la cueva de Altamira?', options: ['Leones y osos', 'Bisontes y caballos', 'Perros y gatos', 'Peces'], correct: 1, explanation: 'El texto menciona bisontes y caballos.' },
      { type: 'inferencial', q: '¿Por qué en el Neolítico la gente pudo quedarse en un mismo lugar?', options: ['Porque ya no había animales', 'Porque cultivaban y criaban animales: tenían comida sin desplazarse', 'Porque hacía más calor', 'Porque inventaron la escritura'], correct: 1, explanation: 'La agricultura y la ganadería les daban alimento en el mismo sitio.' },
      { type: 'vocabulario', q: '¿Qué significa «nómada»?', options: ['Que vive siempre en el mismo sitio', 'Que se desplaza de un lugar a otro', 'Que pinta cuevas', 'Que cultiva la tierra'], correct: 1, explanation: 'Nómada es quien no tiene un lugar fijo de residencia; lo contrario es sedentario.' },
      { type: 'interpretacion', q: '¿Qué hecho marca el final de la Prehistoria?', options: ['El descubrimiento del fuego', 'La invención de la escritura', 'Las pinturas de Altamira', 'La agricultura'], correct: 1, explanation: 'La Prehistoria termina cuando se inventa la escritura.' },
    ],
  },
  {
    id: 'p4-germinador', level: 4, course: '4º Primaria', title: 'Cómo hacer un germinador', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'instrucciones', link: 'Ciencias Naturales: las plantas · Lengua: el texto instructivo',
    text: 'Materiales: un vaso de cristal, algodón, agua y unas lentejas o judías.\nPaso 1. Llena el vaso de algodón sin apretarlo demasiado.\nPaso 2. Coloca tres o cuatro semillas entre el algodón y el cristal, para poder verlas.\nPaso 3. Humedece el algodón con agua. No debe quedar encharcado.\nPaso 4. Pon el vaso en un lugar con luz, pero sin sol directo.\nPaso 5. Cada día, comprueba que el algodón sigue húmedo y anota lo que observas.\nEn pocos días verás cómo la semilla se abre, sale una pequeña raíz hacia abajo y, después, un tallo con hojas hacia arriba. ¡Has visto germinar una planta!',
    questions: [
      { type: 'literal', q: '¿Dónde hay que colocar las semillas?', options: ['En el fondo del vaso', 'Entre el algodón y el cristal', 'Encima del algodón', 'En la tierra'], correct: 1, explanation: 'Así se pueden ver mientras germinan.' },
      { type: 'inferencial', q: '¿Por qué se ponen las semillas pegadas al cristal?', options: ['Para que no se caigan', 'Para poder observar cómo crecen', 'Para que tengan frío', 'Para que no les dé la luz'], correct: 1, explanation: 'El paso 2 dice «para poder verlas».' },
      { type: 'vocabulario', q: '¿Qué significa «germinar»?', options: ['Que una semilla empieza a crecer y a desarrollarse', 'Que una planta muere', 'Que se riega', 'Que florece'], correct: 0, explanation: 'Germinar es el inicio del crecimiento de la semilla.' },
      { type: 'interpretacion', q: '¿Qué tipo de texto es este?', options: ['Un cuento', 'Un texto instructivo, con materiales y pasos', 'Un poema', 'Una noticia'], correct: 1, explanation: 'Explica qué se necesita y cómo hacerlo paso a paso.' },
    ],
  },

  // ======================================================================= 5º PRIMARIA
  {
    id: 'p5-lazarillo-uvas', level: 5, course: '5º Primaria', title: 'El Lazarillo y el racimo de uvas', author: 'Anónimo (1554)', source: 'Adaptación del Lazarillo de Tormes, tratado I',
    genre: 'novela', link: 'Lengua: la novela picaresca',
    text: 'Lázaro era un niño pobre que servía de guía a un ciego. El ciego era muy listo y muy tacaño, y Lázaro pasaba hambre. Un día, en un pueblo, un vendimiador les regaló un racimo de uvas. Se sentaron junto a una cerca y el ciego dijo: «Vamos a comerlo a medias. Yo cogeré una uva y tú otra, y prométeme que no cogerás más de una cada vez». Lázaro aceptó. Pero a la segunda vuelta, el ciego empezó a coger las uvas de dos en dos. Al verlo, Lázaro no solo cogió dos: empezó a comerlas de tres en tres. Cuando terminaron, el ciego le dijo: «Lázaro, me has engañado. Juraría que comías las uvas de tres en tres». «¿Por qué lo sospecháis?», preguntó el muchacho. «Porque yo las comía de dos en dos y tú callabas», contestó el ciego.',
    questions: [
      { type: 'literal', q: '¿Cómo empezó el ciego a coger las uvas a la segunda vuelta?', options: ['De una en una', 'De dos en dos', 'De tres en tres', 'Todas de golpe'], correct: 1, explanation: 'El ciego rompió el trato y las cogió de dos en dos.' },
      { type: 'inferencial', q: '¿Cómo supo el ciego que Lázaro le engañaba?', options: ['Porque lo vio', 'Porque Lázaro no protestó cuando él cogía dos', 'Porque se lo dijo el vendimiador', 'Porque contó las uvas'], correct: 1, explanation: 'Si Lázaro no se quejaba de que él cogiera dos, era porque cogía aún más.' },
      { type: 'vocabulario', q: '¿Qué significa «tacaño»?', options: ['Generoso', 'Que no quiere gastar ni compartir', 'Muy listo', 'Ciego'], correct: 1, explanation: 'Tacaño es quien escatima lo que tiene y no comparte.' },
      { type: 'interpretacion', q: '¿Qué muestra este episodio de los dos personajes?', options: ['Que eran amigos sinceros', 'Que los dos eran astutos y se engañaban mutuamente', 'Que el ciego era tonto', 'Que Lázaro era rico'], correct: 1, explanation: 'Ambos rompen el trato: es típico de la novela picaresca, donde se sobrevive con astucia.' },
    ],
  },
  {
    id: 'p5-caminante', level: 5, course: '5º Primaria', title: 'Caminante, no hay camino', author: 'Antonio Machado', source: 'Texto original («Proverbios y cantares» XXIX, Campos de Castilla, ed. 1917)',
    genre: 'poema', link: 'Lengua: poesía y lenguaje figurado',
    text: 'Caminante, son tus huellas\nel camino, y nada más;\ncaminante, no hay camino,\nse hace camino al andar.\nAl andar se hace camino,\ny al volver la vista atrás\nse ve la senda que nunca\nse ha de volver a pisar.\nCaminante, no hay camino,\nsino estelas en la mar.',
    questions: [
      { type: 'literal', q: 'Según el poema, ¿cómo se hace el camino?', options: ['Con un mapa', 'Al andar', 'Siguiendo a otros', 'Volviendo atrás'], correct: 1, explanation: '«Se hace camino al andar».' },
      { type: 'inferencial', q: '¿Qué significa que la senda «nunca se ha de volver a pisar»?', options: ['Que el camino está roto', 'Que el tiempo pasado no se puede repetir', 'Que está prohibido volver', 'Que hay que correr'], correct: 1, explanation: 'Lo que ya hemos vivido no se puede volver a vivir igual.' },
      { type: 'vocabulario', q: '¿Qué son las «estelas en la mar»?', options: ['Estrellas que se reflejan', 'Las marcas que deja un barco en el agua y que desaparecen', 'Olas grandes', 'Peces'], correct: 1, explanation: 'La estela es el rastro que deja un barco y que pronto se borra.' },
      { type: 'interpretacion', q: '¿De qué habla en realidad el poema?', options: ['De cómo hacer carreteras', 'De la vida: cada uno la construye con lo que hace', 'De un viaje en barco', 'De perderse en el campo'], correct: 1, explanation: 'El camino es una metáfora de la vida, que se construye viviéndola.' },
    ],
  },
  {
    id: 'p5-respiracion', level: 5, course: '5º Primaria', title: 'El viaje del aire', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: el aparato respiratorio',
    text: 'Respiramos unas veinte mil veces al día sin darnos cuenta. Cuando inspiramos, el aire entra por la nariz, donde se calienta y se limpia gracias a los pelillos y a la mucosidad. Después baja por la faringe y la laringe, sigue por la tráquea y se divide en dos bronquios, uno para cada pulmón. Dentro de los pulmones, los bronquios se ramifican como un árbol hasta acabar en millones de saquitos llamados alvéolos. Allí ocurre lo más importante: el oxígeno pasa a la sangre, que lo lleva a todas las células del cuerpo, y el dióxido de carbono que sobra pasa de la sangre al aire. Por último, al espirar, expulsamos ese aire. El diafragma, un músculo situado bajo los pulmones, ayuda a que el aire entre y salga.',
    questions: [
      { type: 'literal', q: '¿Cómo se llaman los saquitos donde termina el aire?', options: ['Bronquios', 'Alvéolos', 'Tráqueas', 'Diafragmas'], correct: 1, explanation: 'Los bronquios terminan en millones de alvéolos.' },
      { type: 'inferencial', q: '¿Por qué es mejor respirar por la nariz que por la boca?', options: ['Porque se respira más rápido', 'Porque en la nariz el aire se calienta y se limpia', 'Porque la boca no tiene aire', 'Porque huele mejor'], correct: 1, explanation: 'El texto dice que en la nariz el aire se calienta y se limpia.' },
      { type: 'vocabulario', q: '¿Qué significa «espirar»?', options: ['Tomar aire', 'Expulsar el aire', 'Toser', 'Dormir'], correct: 1, explanation: 'Inspirar es tomar aire; espirar es echarlo.' },
      { type: 'interpretacion', q: '¿Qué es lo más importante que pasa en los alvéolos?', options: ['El aire se calienta', 'Se intercambian gases: entra oxígeno a la sangre y sale dióxido de carbono', 'Se fabrica la voz', 'Se mueve el diafragma'], correct: 1, explanation: 'Es el intercambio de gases, el objetivo de la respiración.' },
    ],
  },
  {
    id: 'p5-hispania', level: 5, course: '5º Primaria', title: 'Hispania, una provincia de Roma', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Ciencias Sociales: la Hispania romana',
    text: 'Los romanos llegaron a la península ibérica en el año 218 antes de Cristo, durante su guerra contra Cartago. La conquista fue larga: duró unos doscientos años, porque muchos pueblos, como los cántabros y los astures, resistieron con fuerza. Los romanos llamaron Hispania a este territorio y lo transformaron. Construyeron calzadas para unir las ciudades, puentes, acueductos para llevar el agua, teatros, termas y anfiteatros. Fundaron ciudades como Emerita Augusta, la actual Mérida, o Caesaraugusta, la actual Zaragoza. Los habitantes de Hispania adoptaron poco a poco la lengua de Roma, el latín, de la que procede el castellano, y también sus leyes y sus costumbres. A este proceso se le llama romanización.',
    questions: [
      { type: 'literal', q: '¿En qué año llegaron los romanos a la península?', options: ['En el 1492', 'En el 218 antes de Cristo', 'En el año 711', 'En el año 0'], correct: 1, explanation: 'Llegaron en el 218 antes de Cristo.' },
      { type: 'inferencial', q: '¿Por qué la conquista duró tanto tiempo?', options: ['Porque los romanos eran pocos', 'Porque algunos pueblos resistieron con fuerza', 'Porque llovía mucho', 'Porque no querían conquistarla'], correct: 1, explanation: 'Pueblos como cántabros y astures se resistieron.' },
      { type: 'vocabulario', q: '¿Qué es un «acueducto»?', options: ['Un camino de piedra', 'Una construcción para llevar el agua', 'Un teatro', 'Un baño público'], correct: 1, explanation: 'Los acueductos llevaban el agua a las ciudades.' },
      { type: 'interpretacion', q: '¿Qué es la romanización?', options: ['Una batalla', 'El proceso por el que Hispania adoptó la lengua, las leyes y las costumbres de Roma', 'Una ciudad romana', 'Un tipo de calzada'], correct: 1, explanation: 'Así lo define el final del texto.' },
    ],
  },
  {
    id: 'p5-noticia-arboles', level: 5, course: '5º Primaria', title: 'Un colegio planta un bosque', author: 'EduAmigo', source: 'Texto de EduAmigo (noticia inventada)',
    genre: 'noticia', link: 'Lengua: la noticia · Ciencias: el cuidado del medio ambiente',
    text: 'UN COLEGIO PLANTA TRESCIENTOS ÁRBOLES EN UN SOLO DÍA\nLos alumnos de quinto y sexto convierten un terreno abandonado en un pequeño bosque.\n\nEl pasado sábado, ochenta alumnos de quinto y sexto de Primaria del colegio Río Claro plantaron trescientos árboles en un terreno abandonado junto al polideportivo del pueblo. La actividad, organizada por el colegio y el ayuntamiento, empezó a las nueve de la mañana y terminó a las dos de la tarde. Los niños, ayudados por sus familias y por los guardas forestales, plantaron encinas, pinos y fresnos, árboles que resisten bien el clima de la zona. «Queremos que dentro de unos años haya sombra y pájaros donde ahora solo hay escombros», explicó Lucía, una alumna de sexto. Cada clase se encargará de regar y cuidar una parte del bosque durante todo el curso.',
    questions: [
      { type: 'literal', q: '¿Cuántos árboles se plantaron?', options: ['Ochenta', 'Cien', 'Trescientos', 'Mil'], correct: 2, explanation: 'El titular dice trescientos árboles.' },
      { type: 'inferencial', q: '¿Por qué eligieron encinas, pinos y fresnos?', options: ['Porque son los más bonitos', 'Porque resisten bien el clima de la zona', 'Porque eran baratos', 'Porque dan fruta'], correct: 1, explanation: 'La noticia dice que resisten bien el clima.' },
      { type: 'vocabulario', q: '¿Qué son los «escombros»?', options: ['Restos de obras y materiales rotos', 'Flores silvestres', 'Animales pequeños', 'Herramientas'], correct: 0, explanation: 'Los escombros son restos de ladrillos, piedras y materiales de obra.' },
      { type: 'interpretacion', q: '¿Para qué sirve el titular de una noticia?', options: ['Para contar el final', 'Para resumir lo más importante y atraer al lector', 'Para dar la opinión del periodista', 'Para decir la fecha'], correct: 1, explanation: 'El titular resume el hecho principal en pocas palabras.' },
    ],
  },

  // ======================================================================= 6º PRIMARIA
  {
    id: 'p6-molinos', level: 6, course: '6º Primaria', title: 'Don Quijote y los molinos de viento', author: 'Miguel de Cervantes', source: 'Adaptación del Quijote, primera parte, capítulo VIII',
    genre: 'novela', link: 'Lengua: el Quijote y la novela',
    text: 'Don Quijote, un hidalgo que había leído tantos libros de caballerías que creía ser un caballero andante, cabalgaba por el campo de Montiel junto a su escudero, Sancho Panza. De pronto, descubrieron treinta o cuarenta molinos de viento. «La fortuna nos guía mejor de lo que deseábamos», dijo don Quijote. «Mira allí, amigo Sancho: hay treinta o más desaforados gigantes con los que pienso hacer batalla». «¿Qué gigantes?», preguntó Sancho. «Aquellos de los brazos largos». «Mire vuestra merced», respondió Sancho, «que aquellos no son gigantes, sino molinos de viento, y lo que parecen brazos son las aspas». Pero don Quijote no le escuchó. Se encomendó a su amada Dulcinea, picó espuelas a Rocinante y atacó con la lanza al primer molino. En ese momento sopló el viento, el aspa giró con tanta fuerza que rompió la lanza en pedazos y lanzó por el aire a caballo y caballero. Cuando Sancho llegó a socorrerlo, don Quijote, dolorido, aseguró que un mago enemigo había convertido a los gigantes en molinos para quitarle la gloria de vencerlos.',
    questions: [
      { type: 'literal', q: '¿Cómo se llama el caballo de don Quijote?', options: ['Babieca', 'Rocinante', 'Dulcinea', 'Clavileño'], correct: 1, explanation: 'Don Quijote «picó espuelas a Rocinante».' },
      { type: 'inferencial', q: '¿Por qué don Quijote ve gigantes donde hay molinos?', options: ['Porque no ve bien de lejos', 'Porque ha leído tantos libros de caballerías que confunde la realidad con la fantasía', 'Porque Sancho le engaña', 'Porque es de noche'], correct: 1, explanation: 'Sus lecturas le hacen creer que es un caballero que lucha contra gigantes.' },
      { type: 'vocabulario', q: '¿Qué es un «escudero»?', options: ['El que acompaña y sirve a un caballero', 'Un tipo de escudo', 'Un gigante', 'Un molinero'], correct: 0, explanation: 'Sancho Panza es el escudero que acompaña a don Quijote.' },
      { type: 'interpretacion', q: '¿En qué se diferencian don Quijote y Sancho en este episodio?', options: ['Sancho es más valiente', 'Don Quijote vive en su imaginación y Sancho ve la realidad', 'Los dos ven gigantes', 'Sancho quiere luchar y don Quijote no'], correct: 1, explanation: 'Es el gran contraste de la novela: el idealismo de don Quijote frente al realismo de Sancho.' },
    ],
  },
  {
    id: 'p6-rayo-luna', level: 6, course: '6º Primaria', title: 'El rayo de luna', author: 'Gustavo Adolfo Bécquer', source: 'Adaptación de la leyenda de Bécquer',
    genre: 'leyenda', link: 'Lengua: la leyenda y el Romanticismo',
    text: 'Manrique era un joven noble de Soria que prefería la soledad a las fiestas y los torneos. Pasaba las noches junto al río, mirando las estrellas y soñando con una mujer perfecta que no se parecía a ninguna de las que conocía. Una noche de luna, en los claustros de un viejo monasterio en ruinas, creyó ver entre los árboles el borde de un vestido blanco. «¡Es ella!», pensó, y corrió tras la figura. La buscó por calles, plazas y jardines, y no la encontró. Durante semanas recorrió la ciudad convencido de que la volvería a ver. Una noche, en el mismo lugar, vio otra vez aquella blancura que se movía. Se acercó con el corazón acelerado, apartó las ramas y comprendió la verdad: era un rayo de luna que se filtraba entre las hojas. Desde entonces, Manrique dejó de soñar. Cuando alguien le hablaba de amor o de gloria, sonreía con tristeza y pensaba que todo era tan falso como aquel rayo de luna.',
    questions: [
      { type: 'literal', q: '¿Qué era en realidad lo que perseguía Manrique?', options: ['Una mujer vestida de blanco', 'Un rayo de luna entre las hojas', 'Un fantasma', 'Un pájaro blanco'], correct: 1, explanation: 'Al final descubre que era un rayo de luna.' },
      { type: 'inferencial', q: '¿Por qué Manrique deja de soñar al final?', options: ['Porque se casa', 'Porque se desilusiona al descubrir que su sueño no era real', 'Porque se hace mayor', 'Porque se muda de ciudad'], correct: 1, explanation: 'Descubre que lo que buscaba era una ilusión y pierde la esperanza.' },
      { type: 'vocabulario', q: '¿Qué es un «claustro»?', options: ['Una galería con columnas alrededor de un patio, en un monasterio', 'Un río', 'Una fiesta', 'Un tipo de árbol'], correct: 0, explanation: 'Los claustros son galerías porticadas típicas de monasterios.' },
      { type: 'interpretacion', q: '¿Qué rasgo del Romanticismo aparece en la leyenda?', options: ['El gusto por las fiestas', 'La búsqueda de un ideal imposible y la desilusión', 'El interés por la ciencia', 'El humor'], correct: 1, explanation: 'Los románticos persiguen ideales imposibles y acaban desengañados.' },
    ],
  },
  {
    id: 'p6-circuito', level: 6, course: '6º Primaria', title: 'Cómo funciona un circuito eléctrico', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Ciencias Naturales: la electricidad',
    text: 'Cuando encendemos una linterna, la electricidad recorre un camino cerrado llamado circuito eléctrico. Todo circuito sencillo tiene cuatro elementos. El generador, como una pila, proporciona la energía. Los cables, normalmente de cobre, conducen la corriente. El receptor transforma la electricidad en otra forma de energía: una bombilla la convierte en luz; un timbre, en sonido; un motor, en movimiento. Por último, el interruptor abre o cierra el circuito. Si el circuito está cerrado, la corriente circula y la bombilla se enciende. Si está abierto, por ejemplo porque un cable está suelto, la corriente se detiene. Los materiales que dejan pasar la electricidad, como los metales, se llaman conductores. Los que no la dejan pasar, como el plástico, la madera o el vidrio, se llaman aislantes. Por eso los cables llevan una funda de plástico: para que podamos tocarlos sin peligro.',
    questions: [
      { type: 'literal', q: '¿Qué elemento del circuito proporciona la energía?', options: ['El interruptor', 'El generador, como una pila', 'El cable', 'La bombilla'], correct: 1, explanation: 'El generador, por ejemplo una pila, da la energía.' },
      { type: 'inferencial', q: 'Si la bombilla de una linterna no se enciende y la pila está nueva, ¿qué puede pasar?', options: ['Que el circuito esté abierto, por ejemplo por un cable suelto', 'Que haya demasiada luz', 'Que el plástico conduzca', 'Que sea de día'], correct: 0, explanation: 'Si el circuito está abierto, la corriente no circula.' },
      { type: 'vocabulario', q: '¿Qué es un material «aislante»?', options: ['El que deja pasar la electricidad', 'El que no deja pasar la electricidad', 'El que produce electricidad', 'El que da luz'], correct: 1, explanation: 'Los aislantes, como el plástico, no dejan pasar la corriente.' },
      { type: 'interpretacion', q: '¿Por qué los cables llevan funda de plástico?', options: ['Para que sean de colores', 'Porque el plástico es aislante y nos protege', 'Para que pesen menos', 'Para que conduzcan mejor'], correct: 1, explanation: 'El plástico aísla y evita que la corriente pase a nuestro cuerpo.' },
    ],
  },
  {
    id: 'p6-constitucion', level: 6, course: '6º Primaria', title: 'La Constitución, la ley de todos', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Ciencias Sociales: la Constitución y la organización del Estado',
    text: 'La Constitución española es la ley más importante de nuestro país: todas las demás leyes deben respetarla. Fue aprobada por los ciudadanos en un referéndum el 6 de diciembre de 1978, y por eso ese día es festivo. La Constitución establece que España es un Estado social y democrático de derecho y que su forma de gobierno es la monarquía parlamentaria. También reconoce los derechos y deberes de todas las personas, como el derecho a la educación, a la libertad de expresión o a la igualdad ante la ley. Además, separa los tres poderes del Estado para que ninguno tenga todo el poder: las Cortes Generales hacen las leyes, el Gobierno las aplica y los jueces y tribunales juzgan si se cumplen. Por último, organiza el territorio en municipios, provincias y comunidades autónomas.',
    questions: [
      { type: 'literal', q: '¿Cuándo se aprobó la Constitución?', options: ['El 12 de octubre de 1492', 'El 6 de diciembre de 1978', 'El 1 de enero de 2000', 'El 2 de mayo de 1808'], correct: 1, explanation: 'Se aprobó en referéndum el 6 de diciembre de 1978.' },
      { type: 'inferencial', q: '¿Por qué se separan los tres poderes?', options: ['Para que haya más políticos', 'Para que ninguno tenga todo el poder y se controlen entre sí', 'Para que las leyes sean más largas', 'Porque lo pide el rey'], correct: 1, explanation: 'El texto lo dice: para que ninguno tenga todo el poder.' },
      { type: 'vocabulario', q: '¿Qué es un «referéndum»?', options: ['Una votación en la que los ciudadanos aprueban o rechazan algo', 'Un juicio', 'Una fiesta nacional', 'Un libro de leyes'], correct: 0, explanation: 'En un referéndum la ciudadanía vota directamente una propuesta.' },
      { type: 'interpretacion', q: '¿Quién hace las leyes según la Constitución?', options: ['El Gobierno', 'Los jueces', 'Las Cortes Generales', 'Los ayuntamientos'], correct: 2, explanation: 'Las Cortes Generales tienen el poder legislativo.' },
    ],
  },
  {
    id: 'p6-ciclope', level: 6, course: '6º Primaria', title: 'Ulises y el cíclope', author: 'Homero', source: 'Adaptación de la Odisea, canto IX',
    genre: 'mito', link: 'Lengua: mitos y epopeya clásica',
    text: 'Al volver de la guerra de Troya, Ulises y sus compañeros desembarcaron en una isla y entraron en una cueva llena de quesos y corderos. Era la casa de Polifemo, un cíclope gigantesco con un solo ojo en mitad de la frente. Al anochecer, el gigante regresó con su rebaño, tapó la entrada con una roca enorme que ningún hombre podía mover y descubrió a los intrusos. Furioso, los dejó prisioneros. Ulises pensó un plan. Ofreció vino al cíclope y, cuando este le preguntó su nombre, respondió: «Me llamo Nadie». Polifemo bebió hasta dormirse. Entonces Ulises y sus hombres calentaron una gran estaca en el fuego y se la clavaron en el ojo. El gigante gritó pidiendo ayuda a los otros cíclopes: «¡Nadie me ha herido!». Y ellos, al oírle, pensaron que no le pasaba nada y no acudieron. A la mañana siguiente, Polifemo apartó la roca para sacar sus ovejas a pastar, palpando sus lomos para que nadie escapara. Pero los griegos salieron agarrados a la lana de la tripa de los carneros, y así lograron huir.',
    questions: [
      { type: 'literal', q: '¿Qué nombre falso dio Ulises al cíclope?', options: ['Ninguno', 'Nadie', 'Homero', 'Troya'], correct: 1, explanation: 'Ulises dijo llamarse «Nadie».' },
      { type: 'inferencial', q: '¿Por qué los otros cíclopes no ayudaron a Polifemo?', options: ['Porque estaban lejos', 'Porque entendieron que «nadie» le había hecho daño', 'Porque eran enemigos', 'Porque estaban dormidos'], correct: 1, explanation: 'Al gritar «¡Nadie me ha herido!», pensaron que no le pasaba nada.' },
      { type: 'vocabulario', q: '¿Qué significa «palpando»?', options: ['Tocando con las manos para reconocer algo', 'Gritando', 'Mirando', 'Durmiendo'], correct: 0, explanation: 'Polifemo, ya ciego, tocaba los lomos de las ovejas.' },
      { type: 'interpretacion', q: '¿Qué cualidad de Ulises destaca en este episodio?', options: ['Su fuerza', 'Su astucia e ingenio', 'Su riqueza', 'Su miedo'], correct: 1, explanation: 'Vence al gigante con inteligencia, no con fuerza.' },
    ],
  },

  // ======================================================================= 1º–2º ESO
  {
    id: 'e1-mio-cid', level: 7, course: '1º–2º ESO', title: 'El destierro del Cid', author: 'Anónimo (Cantar de mio Cid)', source: 'Adaptación del Cantar de mio Cid, cantar primero',
    genre: 'epopeya', link: 'Lengua y Literatura: la épica medieval',
    text: 'El rey Alfonso VI, enfadado y mal aconsejado, había desterrado a Rodrigo Díaz de Vivar, el Cid. Tenía solo nueve días para abandonar Castilla. Además, el rey había ordenado que nadie le diera alojamiento ni le vendiera comida: quien lo hiciera perdería sus bienes y hasta los ojos de la cara. El Cid entró en Burgos con sus sesenta caballeros y, aunque los vecinos lloraban al verle pasar y decían «¡Dios, qué buen vasallo, si tuviese buen señor!», todas las puertas estaban cerradas. Llegó a la posada en la que solía hospedarse y llamó con fuerza. Nadie respondió. Entonces se asomó una niña de nueve años y le dijo: «Campeador, que en buena hora ceñiste la espada: el rey lo ha prohibido. Si os abrimos, perderemos nuestras casas y los ojos de la cara. Con nuestro mal, vos no ganáis nada. Seguid vuestro camino, y que Dios os proteja». El Cid comprendió el miedo de aquella gente. No quiso causarles daño, dio la vuelta a su caballo y salió de Burgos para acampar a la orilla del río Arlanzón, sobre la arena.',
    questions: [
      { type: 'literal', q: '¿Cuántos días tenía el Cid para salir de Castilla?', options: ['Tres', 'Nueve', 'Treinta', 'Sesenta'], correct: 1, explanation: 'Tenía nueve días.' },
      { type: 'inferencial', q: '¿Por qué los vecinos de Burgos no ayudan al Cid aunque le aprecian?', options: ['Porque no le conocen', 'Por miedo al castigo del rey', 'Porque es de noche', 'Porque no tienen comida'], correct: 1, explanation: 'El rey amenazaba con quitarles sus bienes y los ojos de la cara.' },
      { type: 'vocabulario', q: '¿Qué significa «desterrar»?', options: ['Enterrar a alguien', 'Expulsar a alguien de su tierra', 'Nombrar caballero', 'Construir una muralla'], correct: 1, explanation: 'El destierro es la expulsión de alguien de su territorio.' },
      { type: 'interpretacion', q: '¿Qué virtud del Cid muestra su reacción ante la niña?', options: ['La crueldad', 'La mesura y la prudencia: no quiere perjudicar a los inocentes', 'La avaricia', 'La cobardía'], correct: 1, explanation: 'La mesura es uno de los rasgos del Cid como héroe: actúa con moderación.' },
    ],
  },
  {
    id: 'e1-don-illan', level: 7, course: '1º–2º ESO', title: 'El deán de Santiago y don Illán', author: 'Don Juan Manuel (El conde Lucanor, 1335)', source: 'Adaptación del exemplo XI',
    genre: 'cuento', link: 'Lengua y Literatura: la prosa medieval y el exemplo',
    text: 'El conde Lucanor le contó a su consejero Patronio que un hombre le había pedido ayuda prometiéndole a cambio muchos favores. Patronio respondió con una historia. Un deán de Santiago quería aprender magia y fue a Toledo a buscar a don Illán, el mayor sabio de aquel arte. Don Illán dudaba: «Cuando consigáis cargos importantes, os olvidaréis de mí», le dijo. El deán juró que nunca lo haría. Antes de empezar las lecciones, don Illán pidió a su criada que preparara unas perdices para la cena. Poco después llegaron mensajeros: el deán había sido nombrado arzobispo. Don Illán le pidió el puesto de deán para su hijo, pero el nuevo arzobispo se lo dio a un hermano suyo. Después siguió ascendiendo: fue nombrado cardenal y, al final, papa. Cada vez, don Illán le recordaba su promesa y cada vez recibía una excusa. Por último, el papa lo amenazó con encarcelarlo por hechicero. Entonces don Illán dijo: «Pues como no tengo nada que comer, cenaré yo solo las perdices». Y en ese instante el papa se encontró de nuevo en Toledo, siendo solo deán: todo había sido un encantamiento para probarle.',
    questions: [
      { type: 'literal', q: '¿Qué quería aprender el deán?', options: ['Medicina', 'Magia', 'Latín', 'Música'], correct: 1, explanation: 'Fue a Toledo a aprender magia con don Illán.' },
      { type: 'inferencial', q: '¿Por qué don Illán pidió a la criada que preparara perdices?', options: ['Porque tenía hambre', 'Porque sabía que todo pasaría en el tiempo de preparar la cena: era parte del encantamiento', 'Porque era una fiesta', 'Para el papa'], correct: 1, explanation: 'Los años de cargos ocurren en apenas el tiempo de hacer la cena: era una prueba mágica.' },
      { type: 'vocabulario', q: '¿Qué es un «exemplo» en la literatura medieval?', options: ['Un cuento breve con una enseñanza moral', 'Un poema de amor', 'Un libro de historia', 'Un tipo de oración'], correct: 0, explanation: 'Los exemplos de El conde Lucanor son relatos que terminan en una moraleja.' },
      { type: 'interpretacion', q: '¿Qué consejo le da Patronio al conde con esta historia?', options: ['Que aprenda magia', 'Que desconfíe de quien promete mucho y no cumple cuando ya ha conseguido lo que quería', 'Que viaje a Toledo', 'Que se haga papa'], correct: 1, explanation: 'El deán olvida su promesa cada vez que asciende: es la ingratitud.' },
    ],
  },
  {
    id: 'e1-conde-arnaldos', level: 7, course: '1º–2º ESO', title: 'Romance del conde Arnaldos', author: 'Anónimo (Romancero viejo, siglo XV)', source: 'Texto original (versión tradicional, ortografía modernizada)',
    genre: 'poema', link: 'Lengua y Literatura: el romance y la lírica tradicional',
    text: '¡Quién hubiera tal ventura\nsobre las aguas del mar\ncomo hubo el conde Arnaldos\nla mañana de San Juan!\nAndando a buscar la caza\npara su falcón cebar,\nvio venir una galera\nque a tierra quiere llegar;\nlas velas trae de sedas,\nla jarcia de oro torzal,\náncoras tiene de plata,\ntablas de fino coral.\nMarinero que la guía,\ndiciendo viene un cantar,\nque la mar ponía en calma,\nlos vientos hace amainar;\nlos peces que andan al hondo,\narriba los hace andar;\nlas aves que van volando,\nal mástil vienen posar.\nAllí habló el conde Arnaldos,\nbien oiréis lo que dirá:\n—Por tu vida, el marinero,\ndígasme ora ese cantar.\nRespondiole el marinero,\ntal respuesta le fue a dar:\n—Yo no digo mi canción\nsino a quien conmigo va.',
    questions: [
      { type: 'literal', q: '¿Qué hacía el conde Arnaldos cuando vio la galera?', options: ['Navegaba', 'Buscaba caza para alimentar a su halcón', 'Dormía en la playa', 'Cantaba'], correct: 1, explanation: '«Andando a buscar la caza para su falcón cebar».' },
      { type: 'inferencial', q: '¿Qué poder tiene el canto del marinero?', options: ['Ninguno', 'Calma el mar y el viento y atrae a peces y aves: es mágico', 'Hace llover', 'Asusta a los animales'], correct: 1, explanation: 'Su canto calma el mar, hace subir a los peces y posarse a las aves.' },
      { type: 'vocabulario', q: '¿Qué es una «galera»?', options: ['Un barco antiguo de vela y remo', 'Un tipo de pájaro', 'Un castillo', 'Una canción'], correct: 0, explanation: 'La galera es una embarcación de vela y remos.' },
      { type: 'interpretacion', q: '¿Cómo es el final del romance?', options: ['Feliz y cerrado', 'Abierto y misterioso: no sabemos qué decide el conde', 'Trágico, el conde muere', 'Cómico'], correct: 1, explanation: 'Es un final truncado típico del romancero: deja al lector con el misterio.' },
    ],
  },
  {
    id: 'e1-celula', level: 7, course: '1º–2º ESO', title: 'La célula, la unidad de la vida', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'ciencias', link: 'Biología y Geología: la célula',
    text: 'Todos los seres vivos, desde una bacteria hasta una ballena, están formados por células. La célula es la unidad más pequeña capaz de realizar las funciones vitales: nutrición, relación y reproducción. Algunos organismos, como las bacterias o las amebas, están formados por una sola célula: son unicelulares. Otros, como las plantas y los animales, tienen millones de células: son pluricelulares. Hay dos grandes tipos de células. Las procariotas, como las bacterias, son más sencillas: su material genético está suelto en el citoplasma. Las eucariotas, propias de animales, plantas y hongos, guardan el material genético dentro de un núcleo. Todas tienen una membrana que las separa del exterior y controla lo que entra y sale. Las células vegetales tienen además una pared celular rígida y cloroplastos, los orgánulos donde se realiza la fotosíntesis. Las primeras células se observaron en el siglo XVII gracias a la invención del microscopio.',
    questions: [
      { type: 'literal', q: '¿Dónde guardan el material genético las células eucariotas?', options: ['En la pared celular', 'Dentro de un núcleo', 'Suelto en el citoplasma', 'En los cloroplastos'], correct: 1, explanation: 'Las eucariotas tienen núcleo.' },
      { type: 'inferencial', q: 'Una célula tiene cloroplastos y pared celular. ¿De qué ser vivo procede probablemente?', options: ['De un animal', 'De una planta', 'De una bacteria', 'De un hongo'], correct: 1, explanation: 'Pared celular y cloroplastos son propios de las células vegetales.' },
      { type: 'vocabulario', q: '¿Qué significa «unicelular»?', options: ['Formado por una sola célula', 'Formado por muchas células', 'Sin células', 'Que hace la fotosíntesis'], correct: 0, explanation: 'Uni- significa «uno»: una sola célula.' },
      { type: 'interpretacion', q: '¿Por qué se dice que la célula es la «unidad de la vida»?', options: ['Porque es muy pequeña', 'Porque es lo más pequeño capaz de nutrirse, relacionarse y reproducirse', 'Porque solo hay una', 'Porque se ve al microscopio'], correct: 1, explanation: 'Es la unidad mínima que realiza las funciones vitales.' },
    ],
  },
  {
    id: 'e1-al-andalus', level: 7, course: '1º–2º ESO', title: 'Al-Ándalus', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Geografía e Historia: la Edad Media en la península',
    text: 'En el año 711, un ejército musulmán cruzó el estrecho de Gibraltar y derrotó al rey visigodo don Rodrigo en la batalla de Guadalete. En pocos años dominó casi toda la península, a la que llamó al-Ándalus. Su historia duró casi ocho siglos y pasó por varias etapas. En el año 929, Abderramán III se proclamó califa en Córdoba, que llegó a ser una de las ciudades más grandes y cultas de Europa, con bibliotecas, baños públicos y calles iluminadas. Tras la caída del califato, el territorio se dividió en pequeños reinos llamados taifas, más débiles frente a los reinos cristianos del norte. Al-Ándalus dejó una enorme huella: la Mezquita de Córdoba, la Alhambra de Granada, sistemas de riego, cultivos como el arroz o los cítricos y miles de palabras del castellano, como «aceite», «almohada» o «azúcar». Su historia terminó en 1492, cuando los Reyes Católicos conquistaron el reino nazarí de Granada.',
    questions: [
      { type: 'literal', q: '¿En qué año terminó al-Ándalus con la conquista de Granada?', options: ['En el 711', 'En el 929', 'En el 1492', 'En el 1212'], correct: 2, explanation: 'En 1492 los Reyes Católicos conquistaron Granada.' },
      { type: 'inferencial', q: '¿Por qué las taifas eran más débiles que el califato?', options: ['Porque eran pequeñas y estaban divididas', 'Porque no tenían ejército', 'Porque estaban en el norte', 'Porque no tenían reyes'], correct: 0, explanation: 'Al dividirse en pequeños reinos perdieron fuerza frente a los cristianos.' },
      { type: 'vocabulario', q: '¿Qué es un «califa»?', options: ['Un soldado', 'El máximo jefe político y religioso de un califato', 'Un arquitecto', 'Un campesino'], correct: 1, explanation: 'Abderramán III se proclamó califa: la máxima autoridad.' },
      { type: 'interpretacion', q: '¿Qué idea transmite el final del texto sobre la herencia de al-Ándalus?', options: ['Que no dejó nada', 'Que su influencia sigue presente en monumentos, agricultura y lengua', 'Que solo dejó guerras', 'Que fue muy corto'], correct: 1, explanation: 'Enumera monumentos, técnicas agrícolas y palabras que han llegado hasta hoy.' },
    ],
  },

  // ======================================================================= 3º–4º ESO
  {
    id: 'e3-quijote-inicio', level: 9, course: '3º–4º ESO', title: 'En un lugar de la Mancha', author: 'Miguel de Cervantes', source: 'Texto original (Don Quijote de la Mancha, 1605, capítulo I, fragmento)',
    genre: 'novela', link: 'Lengua y Literatura: el Siglo de Oro y el Quijote',
    text: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres partes de su hacienda. El resto della concluían sayo de velarte, calzas de velludo para las fiestas, con sus pantuflos de lo mesmo, y los días de entresemana se honraba con su vellorí de lo más fino. Tenía en su casa una ama que pasaba de los cuarenta, y una sobrina que no llegaba a los veinte, y un mozo de campo y plaza, que así ensillaba el rocín como tomaba la podadera. Frisaba la edad de nuestro hidalgo con los cincuenta años; era de complexión recia, seco de carnes, enjuto de rostro, gran madrugador y amigo de la caza.',
    questions: [
      { type: 'literal', q: '¿Qué edad tenía aproximadamente el hidalgo?', options: ['Unos veinte años', 'Unos cuarenta años', 'Unos cincuenta años', 'Unos setenta años'], correct: 2, explanation: '«Frisaba la edad de nuestro hidalgo con los cincuenta años».' },
      { type: 'inferencial', q: '¿Qué nos dice la descripción de sus comidas y ropas sobre su economía?', options: ['Que era muy rico', 'Que era un hidalgo modesto que gastaba casi todo en lo básico', 'Que no comía nunca', 'Que era un comerciante'], correct: 1, explanation: 'Comer gastaba «las tres partes de su hacienda»: tenía pocos recursos.' },
      { type: 'vocabulario', q: '¿Qué significa «frisaba» en el texto?', options: ['Se acercaba a', 'Superaba con mucho', 'Celebraba', 'Ocultaba'], correct: 0, explanation: '«Frisar» una edad es estar cerca de ella.' },
      { type: 'interpretacion', q: '¿Qué efecto tiene «de cuyo nombre no quiero acordarme»?', options: ['Indica que el narrador ha olvidado el lugar', 'Crea un tono cercano e irónico, sin precisar el lugar, frente a los libros de caballerías que lo exageraban todo', 'Es un error de Cervantes', 'Significa que el lugar no existe'], correct: 1, explanation: 'El narrador se presenta de forma cercana y quita importancia al origen, parodiando la solemnidad de las novelas de caballerías.' },
    ],
  },
  {
    id: 'e3-vida-sueno', level: 9, course: '3º–4º ESO', title: '¿Qué es la vida?', author: 'Pedro Calderón de la Barca', source: 'Texto original (La vida es sueño, 1635, jornada II, final del monólogo de Segismundo)',
    genre: 'teatro', link: 'Lengua y Literatura: el teatro barroco',
    text: 'Segismundo, príncipe de Polonia, ha vivido encerrado en una torre desde que nació, porque su padre temía una profecía. Tras pasar un solo día en palacio como príncipe, vuelve a despertar encadenado y ya no sabe qué es real y qué ha sido un sueño. Así termina su famoso monólogo:\n\nYo sueño que estoy aquí\ndestas prisiones cargado,\ny soñé que en otro estado\nmás lisonjero me vi.\n¿Qué es la vida? Un frenesí.\n¿Qué es la vida? Una ilusión,\nuna sombra, una ficción,\ny el mayor bien es pequeño;\nque toda la vida es sueño,\ny los sueños, sueños son.',
    questions: [
      { type: 'literal', q: '¿Dónde ha vivido Segismundo desde que nació?', options: ['En palacio', 'Encerrado en una torre', 'En un barco', 'En otro país'], correct: 1, explanation: 'Su padre lo encerró en una torre por miedo a una profecía.' },
      { type: 'inferencial', q: '¿Por qué Segismundo duda de lo que es real?', options: ['Porque está enfermo', 'Porque ha pasado de prisionero a príncipe y de nuevo a prisionero sin saber cómo', 'Porque ha bebido', 'Porque no sabe leer'], correct: 1, explanation: 'El cambio brusco de su situación le hace pensar que todo pudo ser un sueño.' },
      { type: 'vocabulario', q: '¿Qué significa «lisonjero» en el verso «más lisonjero me vi»?', options: ['Más triste', 'Más agradable y favorable', 'Más pobre', 'Más enfadado'], correct: 1, explanation: 'Lisonjero es agradable, halagador; se refiere a su día como príncipe.' },
      { type: 'interpretacion', q: '¿Qué idea barroca expresan los versos finales?', options: ['Que la vida es eterna', 'Que la vida es breve, engañosa y pasajera como un sueño', 'Que hay que dormir mucho', 'Que los sueños se cumplen'], correct: 1, explanation: 'El desengaño barroco: lo terrenal es apariencia y fugacidad.' },
    ],
  },
  {
    id: 'e3-manrique', level: 9, course: '3º–4º ESO', title: 'Recuerde el alma dormida', author: 'Jorge Manrique', source: 'Texto original (Coplas por la muerte de su padre, c. 1477, copla I)',
    genre: 'poema', link: 'Lengua y Literatura: la lírica del siglo XV',
    text: 'Jorge Manrique escribió estas coplas tras la muerte de su padre, don Rodrigo Manrique, y empiezan con una invitación a reflexionar sobre el paso del tiempo:\n\nRecuerde el alma dormida,\navive el seso y despierte\ncontemplando\ncómo se pasa la vida,\ncómo se viene la muerte\ntan callando;\ncuán presto se va el placer,\ncómo, después de acordado,\nda dolor;\ncómo, a nuestro parecer,\ncualquiera tiempo pasado\nfue mejor.',
    questions: [
      { type: 'literal', q: '¿Tras la muerte de quién escribió Manrique las coplas?', options: ['De su hijo', 'De su padre', 'De un rey', 'De un amigo'], correct: 1, explanation: 'Son las «Coplas por la muerte de su padre».' },
      { type: 'inferencial', q: '¿Qué pide el poeta al lector en los primeros versos?', options: ['Que duerma', 'Que despierte y reflexione sobre la vida y la muerte', 'Que olvide el pasado', 'Que se divierta'], correct: 1, explanation: '«Recuerde el alma dormida, avive el seso y despierte».' },
      { type: 'vocabulario', q: 'En este poema, ¿qué significa «recuerde»?', options: ['Que se acuerde de algo', 'Que despierte', 'Que escriba', 'Que llore'], correct: 1, explanation: 'En la lengua de la época, «recordar» significaba también «despertar».' },
      { type: 'interpretacion', q: '¿Qué sugiere «cualquiera tiempo pasado fue mejor»?', options: ['Que el futuro será mejor', 'Que tendemos a idealizar el pasado', 'Que el poeta era más feliz de niño', 'Que hay que vivir en el pasado'], correct: 1, explanation: 'Dice «a nuestro parecer»: es nuestra impresión, idealizamos lo que ya pasó.' },
    ],
  },
  {
    id: 'e3-becquer-rima', level: 9, course: '3º–4º ESO', title: 'Rima XXI', author: 'Gustavo Adolfo Bécquer', source: 'Texto original (Rimas, 1871)',
    genre: 'poema', link: 'Lengua y Literatura: el Romanticismo',
    text: 'Gustavo Adolfo Bécquer es el gran poeta del Romanticismo tardío en España. Sus Rimas, publicadas en 1871, un año después de su muerte, son poemas breves, de lenguaje sencillo y gran intensidad, que hablan de la poesía, del amor y del desengaño. Esta es una de las más conocidas:\n\n¿Qué es poesía?, dices mientras clavas\nen mi pupila tu pupila azul.\n¿Qué es poesía? ¿Y tú me lo preguntas?\nPoesía... eres tú.',
    questions: [
      { type: 'literal', q: '¿En qué año se publicaron las Rimas?', options: ['En 1605', 'En 1871', 'En 1898', 'En 1927'], correct: 1, explanation: 'Se publicaron en 1871, tras la muerte del poeta.' },
      { type: 'inferencial', q: '¿A quién se dirige el poeta?', options: ['A sus lectores en general', 'A la mujer amada', 'A otro poeta', 'A un profesor'], correct: 1, explanation: 'Habla a alguien que le mira a los ojos con «tu pupila azul»: la amada.' },
      { type: 'vocabulario', q: '¿Qué es la «pupila»?', options: ['Una alumna', 'La parte negra y central del ojo', 'Una flor', 'Un verso'], correct: 1, explanation: 'La pupila es el círculo negro en el centro del ojo.' },
      { type: 'interpretacion', q: '¿Qué quiere decir el poeta con «Poesía... eres tú»?', options: ['Que ella escribe poemas', 'Que la poesía no es una definición sino lo que inspira la belleza y el amor que ella representa', 'Que no sabe responder', 'Que la poesía es aburrida'], correct: 1, explanation: 'Identifica la poesía con la amada: la emoción que provoca es la esencia de la poesía.' },
    ],
  },
  {
    id: 'e3-revolucion-industrial', level: 9, course: '3º–4º ESO', title: 'La Revolución Industrial', author: 'EduAmigo', source: 'Texto de EduAmigo',
    genre: 'sociales', link: 'Geografía e Historia: la Revolución Industrial',
    text: 'A mediados del siglo XVIII comenzó en Gran Bretaña un cambio tan profundo que transformó la manera de vivir y de trabajar de la humanidad: la Revolución Industrial. Durante siglos, la mayor parte de la población había vivido del campo y los productos se fabricaban a mano en pequeños talleres. Con la aplicación de la máquina de vapor, perfeccionada por James Watt, la producción se trasladó a grandes fábricas, primero en la industria textil y después en la siderurgia. El ferrocarril y el barco de vapor acortaron las distancias y abarataron el transporte de mercancías y personas. Este proceso tuvo luces y sombras. Aumentó la producción y nacieron nuevas ciudades industriales, pero miles de campesinos emigraron a ellas y vivieron en barrios insalubres. Los obreros, incluidos muchos niños, trabajaban jornadas de doce o catorce horas por salarios muy bajos. Para defender sus derechos, los trabajadores se organizaron en sindicatos y surgieron el movimiento obrero y nuevas ideologías, como el socialismo y el anarquismo. En España, la industrialización fue más tardía y se concentró sobre todo en Cataluña, con la industria textil, y en el País Vasco, con la siderurgia.',
    questions: [
      { type: 'literal', q: '¿En qué país comenzó la Revolución Industrial?', options: ['En Francia', 'En Gran Bretaña', 'En España', 'En Alemania'], correct: 1, explanation: 'Comenzó en Gran Bretaña a mediados del siglo XVIII.' },
      { type: 'inferencial', q: '¿Por qué crecieron tan deprisa las ciudades industriales?', options: ['Porque se construyeron castillos', 'Porque muchos campesinos emigraron a ellas para trabajar en las fábricas', 'Porque había más campos de cultivo', 'Porque bajó la población'], correct: 1, explanation: 'Las fábricas atrajeron a la población rural.' },
      { type: 'vocabulario', q: '¿Qué significa «insalubre»?', options: ['Muy caro', 'Perjudicial para la salud', 'Muy grande', 'Moderno'], correct: 1, explanation: 'Insalubre es lo que daña la salud: sin higiene, sin luz ni ventilación.' },
      { type: 'interpretacion', q: '¿Qué quiere decir que el proceso tuvo «luces y sombras»?', options: ['Que había electricidad', 'Que tuvo consecuencias positivas, como el aumento de la producción, y negativas, como la explotación obrera', 'Que se trabajaba de noche', 'Que fue un error'], correct: 1, explanation: 'El texto enumera ventajas e inconvenientes del proceso.' },
    ],
  },
];

/** Velocidad lectora de referencia por curso (palabras por minuto, lectura en voz alta).
 *  Fuente: criterio de Ripoll et al. (2020) recogido por el Ministerio de Educación en «Creación del mapa lector». */
export const WPM_REFERENCE: Record<number, { course: string; target: number; min: number; max: number }> = {
  1: { course: '1º Primaria', target: 48, min: 25, max: 72 },
  2: { course: '2º Primaria', target: 72, min: 45, max: 101 },
  3: { course: '3º Primaria', target: 84, min: 58, max: 111 },
  4: { course: '4º Primaria', target: 104, min: 75, max: 134 },
  5: { course: '5º Primaria', target: 113, min: 83, max: 145 },
  6: { course: '6º Primaria', target: 124, min: 95, max: 154 },
  7: { course: '1º ESO', target: 134, min: 100, max: 168 },
  8: { course: '2º ESO', target: 135, min: 101, max: 171 },
  9: { course: '3º ESO', target: 143, min: 112, max: 175 },
  10: { course: '4º ESO', target: 164, min: 137, max: 191 },
};

/** Banda de la biblioteca para un nivel de curso (1–10). */
export const bandForLevel = (level: number) => (level <= 6 ? level : level <= 8 ? 7 : 9);

export const wordCount = (text: string) => (String(text).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g) || []).length;
