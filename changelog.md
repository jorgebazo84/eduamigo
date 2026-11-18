# Changelog — EduAmigo: Tutor Inteligente J21

Todas las modificaciones, mejoras de funcionalidad, parches de seguridad y correcciones del proyecto EduAmigo quedan registradas en este documento siguiendo el estándar de versionado semántico [SemVer](https://semver.org/).

---

## [3.0.0] - 2026-11-17 — Zona de juegos y Formación Profesional (opciones 10 y 11)

### 🎮 Zona de juegos (sin IA)
- 18 juegos por áreas: Mates (La balanza, La tienda, Cazafracciones), Lengua (¿B o V?, ¿G o J?, ¿Con h o sin h?, Pon la tilde, Ordena la frase, Ahorcado), Inglés (Memory, Spelling bee con la palabra leída en voz alta, Une la frase), Informática (Teclado veloz, Programa al robot, Ceros y unos, ¿Seguro o trampa?) y Ciencias (Clasifica, Capitales y comunidades).
- Cada niño ve los de su curso. El contenido sale de bancos revisados o se genera con reglas; el servidor prepara la partida, guarda las soluciones y corrige cada respuesta con su explicación.
- **Se abren después de estudiar algo ese día.** Tiempo de juego por defecto: 30 minutos al día. Cada partida da hasta 10 puntos según los aciertos, con un máximo de 40 al día. Jugar no cuenta para la racha. Sin sorpresas ni azar en los premios.
- Padres (Progreso → Juegos): minutos al día, si hace falta estudiar antes, apagar los juegos o solo algunos, y aciertos por juego de los últimos 30 días.

### 🎓 Formación Profesional
- Los perfiles admiten cualquier título de FP de Grado Básico, Medio y Superior del catálogo oficial del Ministerio (26 familias), con su curso. Los mayores de edad se dan de alta como un hijo más. El servidor solo acepta cursos que existen.
- Mates, lectura, inglés y Pomodoro usan la equivalencia académica (Básico 1º ≈ 3º ESO, Básico 2º ≈ 4º ESO, Medio ≈ 1º Bachillerato, Superior ≈ 2º Bachillerato).
- Las asignaturas pasan a ser los módulos: comunes del Grado Básico (Comunicación y Ciencias Sociales, Ciencias Aplicadas, Itinerario personal para la empleabilidad, Proyecto intermodular) y de Grado Medio y Superior (Itinerario personal para la empleabilidad I y II, Inglés profesional, Digitalización, Sostenibilidad, Proyecto intermodular). Notas, Mi semana, Libros, Biblioteca y Repasar funcionan por módulo.
- El tutor, la Biblioteca y los tests saben que es FP y tratan al alumno sin infantilizar.

### 💻 FP de Informática a fondo (Informática y Comunicaciones, Informática de Oficina)
- Módulos profesionales con sus bloques y contenidos oficiales del BOE (3029, 3030, 3015, 3016 y 3031). La Biblioteca muestra esos bloques sin IA, y las explicaciones, esquemas y tests se ciñen a sus contenidos.
- Prácticas: Monta un PC, Conecta la red (IP), Ley de Ohm y circuitos, y Ofimática (hoja de cálculo). Cuentan como estudio: no necesitan desbloqueo, no gastan tiempo de juego y dan hasta 40 puntos al día aparte.

### 🔧 Otros
- Arreglado: en Familia → Hijos, el botón de editar quedaba tapado por el avatar al pasar el ratón.

## [2.2.0] - 2026-11-17 — Mi semana, circulares para padres, Pomodoro por edad y adiós a Gemini (opción 9, 2ª entrega)

### 📅 Mi semana (sustituye a Plan)
- Los próximos 14 días en una vista: exámenes y avisos de la agenda, repasos que tocan cada día (hoy, también los atrasados), tareas, fichas pendientes y temas de libros por resumir.
- Plan sin IA: los 3 días antes de cada examen se propone prepararlo.
- **El niño puede apuntar sus exámenes**: quedan en la agenda de los padres («Apuntado por…»), el tema pasa a Repasar y los repasos de esa asignatura se adelantan al día antes. Solo puede borrar los que ha apuntado él.
- Los exámenes que apuntan los padres también adelantan los repasos de la asignatura.

### 📸 Circulares (ahora en Familia → Agenda)
- Foto de una circular o de la fecha de un examen: Claude saca las fechas y los padres las revisan, corrigen y eligen cuáles guardar. Si no encuentra fechas, lo dice.
- Se quita el Escáner escolar de la vista del niño.

### ⏱️ Pomodoro según la edad
- Bloques de 10 min (1º–2º), 15 (3º–4º), 20 (5º–6º) y 25 (ESO); el servidor lo comprueba antes de dar puntos.
- Arreglado: el botón de cerrar el Pomodoro no funcionaba (quedaba tapado).

### 🧭 Barra del niño
- 10 botones sin repeticiones: Pregúntame, Mi semana, Repasar, Deberes y fichas, Lectura, Matemáticas, Inglés, Caligrafía, Biblioteca y Recompensas.
- Fuera el panel técnico de Diagnóstico (mostraba parte de la clave), Chat IA y Foto de un ejercicio (abrían lo mismo que Pregúntame) y el Escáner.

### 🧹 Sin Gemini
- Se borra el servicio de Gemini y la dependencia @google/genai. Ya no hace falta GEMINI_API_KEY: toda la IA va por Claude desde el servidor.
- Se quita el permiso de geolocalización que quedaba en los metadatos.
- El panel de padres recarga los datos al entrar (para ver los exámenes que acaba de apuntar el niño).

---

## [2.1.0] - 2026-11-17 — Inglés, Caligrafía y Biblioteca sin Gemini (opción 9, 1ª entrega)

### 🇬🇧 Inglés (Claude en el servidor)
- Niveles del Marco Común Europeo (Pre-A1, A1, A2, B1, B2), sin nombres de exámenes de marcas.
- **Prueba de nivel** con 25 preguntas fijas y revisadas: el nivel es el más alto aprobado (3 de 5) teniendo aprobados también los anteriores. Ya no se queda en B2 quien acierta una de B2 por suerte.
- **Lección del día** por nivel y tema (vocabulario con audio, gramática, audición, lectura y redacción). Cada lección se genera una vez y se reutiliza para todas las familias.
- Las preguntas las corrige el programa; la redacción, Claude, con correcciones explicadas.
- Puntos: 10 + 3 por acierto + 10 si la redacción llega a 5, máximo 80 al día. Sube de nivel solo tras 5 lecciones con un 80 % y una redacción media de 6.
- Padres: nivel, lecciones, redacciones corregidas y cambio de nivel a mano.

### ✍️ Caligrafía (Claude en el servidor)
- La foto se comprime en el móvil y se guarda 365 días (antes superaba el límite y no se guardaba).
- Nota, lo que ha leído, consejos de legibilidad, trazo y espaciado, faltas de ortografía y **fichas con pauta para imprimir**.
- **Grafología**: se mantiene por decisión de la familia, solo la ven los padres (nunca el niño), con lenguaje neutro, sin diagnósticos, filtrada en el servidor y con el aviso de que no tiene validez científica. Se puede desactivar por hijo.
- Puntos en el servidor: 15 o 5, máximo 30 al día.

### 📚 Biblioteca (Claude en el servidor)
- Asignaturas de su curso y temario; cada tema con explicación, ideas clave, ejemplo, glosario, botón para escucharlo y **esquema visual imprimible** (A4 apaisado).
- El esquema solo contiene lo que dice la explicación: el servidor descarta lo que no aparece en el texto.
- Temas y esquemas se generan una vez y se comparten entre familias. Botón «Repasar este tema».
- **Libros del cole** (Familia → Libros del cole): búsqueda por ISBN con los datos de Google Books y el índice buscado en internet por Claude (con la página de donde sale; si no lo encuentra, lo dice). Si no aparece o no coincide, **fotos del índice de hasta 8 páginas**, en orden, que se juntan en una lista editable.
- Los libros salen en la Biblioteca del niño.

### 🧹 Se quita
- Práctica oral (Live): prometía una conversación que no existía.
- La librería estática con fotos al azar (sus temas están ahora en la Biblioteca con esquemas de verdad).
- La búsqueda de editoriales y de índices inventados con Gemini.

### 🔒 Seguridad
- Libros y tareas de estudio comprueban que el hijo es de la familia.

---

## [2.0.0] - 2026-11-17 — Panel de padres: de 18 pestañas a 5

### 📋 Resumen (nueva portada)
- Una tarjeta por hijo con su semana: días que ha estudiado, racha, lecturas (velocidad y comprensión), retos de Mates, tests, fichas corregidas, preguntas al tutor y puntos ganados.
- **Dónde le cuesta**: la tabla que más falla, el tipo de pregunta de lectura que peor lleva, los temas de Repasar con nota baja y los suspensos apuntados.
- **Lo que viene**: exámenes de la agenda y repasos pendientes.
- Avisos arriba (premios pedidos, conversaciones del tutor que conviene mirar) con un botón que lleva directamente a responder.
- **Informe PDF** rehecho con los datos reales del servidor (últimos 90 días), listo para imprimir o guardar.

### 📈 Progreso
- Lectura, Mates, Repasar, Caligrafía, Inglés y Tutor en una sola pestaña, con un selector de hijo común.

### 👨‍👩‍👧 Familia
- Hijos y PIN, Agenda y exámenes, **Notas del cole** y Avisos de errores.
- Las notas del cole se guardan en el servidor (antes se perdían al recargar). Asignaturas fijas por curso (LOMLOE, de 1º de Primaria a 2º de Bachillerato), ya no las inventa la IA.
- Una nota por debajo de 6 manda el tema a Repasar (o un repaso general de la asignatura si no se indica el tema).

### 🚩 «Esto está mal»
- Botón en las correcciones de fichas y deberes (además del que ya tenía el tutor). Se guarda una copia de la corrección tomada del servidor.
- Los padres ven en Familia los avisos enviados y si ya se han revisado.
- Página privada del equipo en `/admin/avisos`, protegida con `ADMIN_TOKEN`, sin nombres ni datos de las familias.

### 🧹 Se quita
- Stats (sustituida por Resumen), Informes PDF como pestaña (ahora botón), Peticiones (sustituida por los premios), Escuela, Rutas y la ubicación del niño (con sus funciones de geolocalización), y Corrección IA.

### 🔒 Seguridad y vista
- En el panel de padres ya no se ven la barra lateral ni los botones del niño; botón «Volver a la app de mi hijo».
- La agenda comprueba que el hijo es de la familia al crear, marcar o borrar exámenes y tareas.

---

## [1.9.0] - 2026-11-17 — Premios: puntos seguros, racha, medallas, cromos y premios con permiso de los padres

### 🔒 Puntos solo en el servidor
- Cada punto ganado o gastado queda anotado con su motivo (lectura, mates, cromo, premio, padres…). El navegador ya no puede fijar los puntos: se elimina `update_child_points`, que además no comprobaba la familia.
- Los hijos nuevos empiezan con 0 puntos y 0 de racha aunque el navegador mande otra cosa.
- Lo que aún daba puntos sin control pasa al servidor con tope diario: tutor (5 por pregunta nueva, máx. 20 al día), pomodoro (20 o 30 puntos, solo si de verdad han pasado 25 minutos, máx. 3 al día), fichas y deberes (una sola vez por ficha), libros (máx. 100 por tema) y caligrafía (máx. 30 al día, provisional hasta la opción 9).
- Editar o borrar un hijo comprueba ahora que es de la familia.

### 🔥 Racha que funciona
- Cuenta los días (hora de España) con al menos una actividad real. **Un día de descanso por semana** no la rompe; dos días seguidos sin estudiar, sí.
- Barra lateral con los últimos 14 días, la mejor racha y un mensaje que explica cómo va.
- Se quita el multiplicador de puntos. En su lugar, cromos especiales a los 7, 14 y 30 días.

### 🏅 Medallas que se ganan solas
- 13 medallas que el servidor concede comprobando lo que el niño ha hecho (10 retos de Mates, 10 lecturas, un 10 en un test, un tema dominado, 5 fichas corregidas, rachas de 3/7/14/30 días…). 8 de ellas regalan un cromo especial.
- Celebración al entrar con las medallas nuevas, los cromos regalados y las respuestas de los padres.

### 📖 Álbum de 64 cromos
- 56 cromos para elegir (sin sobres sorpresa) en 7 temas del cole: espacio, naturaleza, científicos, historia de España, matemáticas, geografía y escritores de la biblioteca de Lectura. 8 especiales que solo se ganan.
- Cada cromo tiene una curiosidad comprobada. Se guardan en el servidor y no se pierden al cambiar de móvil.
- Confirmación antes de gastar puntos.

### 🎁 Premios de familia con permiso de los padres
- El niño pide un premio y sus puntos quedan reservados (máx. 3 peticiones a la vez). Puede cancelarla y recuperarlos.
- Los padres ven un aviso en la pestaña **Puntos y premios**, aceptan o rechazan con un mensaje opcional, y si rechazan se devuelven los puntos.
- La misma pestaña muestra de dónde salen los puntos de los últimos 7 días, el historial completo, la racha, las medallas, los cromos y permite dar o quitar puntos con un motivo que el niño ve.

### 📱 Navegación
- Botón **🎁 Premios** en la cabecera. La barra inferior ya no se sale de la pantalla en el móvil, y allí la racha y las medallas se ven dentro de Premios.

---

## [1.8.0] - 2026-11-17 — Lectura: biblioteca por curso, velocidad y comprensión

### 📚 Biblioteca por curso (sin IA, sin coste)
- **40 lecturas** relacionadas con lo que se trabaja en clase: 5 por curso de 1º a 6º de Primaria, 5 para 1º–2º de ESO y 5 para 3º–4º de ESO (Quijote, Lazarillo, Calderón, Manrique, Bécquer, Machado, Rubén Darío, Samaniego, Andersen, ciencia e historia…).
- Solo autores fallecidos hace más de 80 años y poemas anteriores a 1929; la prosa va adaptada a cada edad y los poemas conservan el texto original. Los textos de ciencia e historia son de EduAmigo.
- Ve primero las lecturas de su curso, puede elegir «más fáciles» o «un reto», y las ya leídas quedan marcadas.
- **Lecturas nuevas** generadas con Claude cuando termina la biblioteca (3 al día por hijo).

### ⏱️ Velocidad y comprensión
- Cronómetro de lectura: calcula las **palabras por minuto** y las compara con la referencia de su curso (Ripoll et al., 2020, citada por el Ministerio), con un mensaje amable.
- **4 preguntas** por lectura: lo que dice el texto, lo que se deduce, vocabulario e interpretación, con las opciones barajadas y la explicación de cada respuesta.
- El servidor corrige y calcula los puntos: **10 por lectura + 5 por acierto, máximo 100 al día**. Una lectura no cuenta si se pasa en segundos o a una velocidad imposible.
- Botón **Escuchar un ejemplo** (voz del dispositivo) y, en los dispositivos que lo permiten, resaltado de palabras leídas sin enviar la voz a ningún sitio.

### 🎙️ Grabación para los padres
- Casilla «Grabar mi voz para que la escuchen mis padres»: la grabación se guarda 365 días y solo la ve la familia.

### 👨‍👩‍👧 Padres
- Pestaña **Lectura** nueva: evolución de la velocidad frente a la franja de su curso, comprensión por tipo de pregunta, últimas lecturas con su grabación y botón para borrarla (con PIN).
- Se eliminan el antiguo historial de lectura y las rutas que guardaban sesiones sin comprobar.

---

## [1.7.0] - 2026-11-17 — Mates: reto de cálculo a su nivel

### ⚡ Reto de cálculo (sin IA, sin coste)
- **Nivel según el curso real**, de 1º de Primaria a 4º de ESO (antes 1º y 2º de ESO recibían sumas de 1º de Primaria): sumas y restas hasta 10, tablas, llevadas, varias cifras, decimales, negativos, potencias, fracción de un número y porcentajes.
- **Dificultad adaptativa** durante el reto: 4 aciertos seguidos sube, 2 fallos seguidos baja (como mucho 2 niveles por encima o por debajo de su curso).
- Modos: Todo mezclado, Sumas y restas, Multiplicar, Dividir, **Tablas** (del 2 al 10) y **Mis fallos** (repite las operaciones que más falla).
- **Responder escribiendo** (por defecto desde 3º de Primaria) o eligiendo entre 4 opciones; si falla, ve la respuesta correcta.
- Todo se guarda en el servidor: resultados, **récord** por modo y **lo que se le resiste** (lo que falla en más del 30 % de sus últimos 10 intentos; deja de salir cuando lo aprende).
- El servidor vuelve a comprobar cada respuesta y calcula los puntos, con un **máximo de 150 puntos al día** por retos.

### ✏️ Pizarra y fotos
- La **Pizarra** se queda como hoja de sucio, con un botón **Corrígeme** que usa la misma corrección de deberes (comprobación por código, pistas sin solución, límite diario).
- La pestaña «Foto» se sustituye por **Hago una foto de mis cuentas**, que abre el flujo de la opción 3. Mates ya no usa Gemini.
- «Hojas en Papel A4» (copia del centro de fichas) se sustituye por **Mis fichas de mates**, que abre Deberes & Fichas filtrado por Matemáticas.

### 👨‍👩‍👧 Padres
- Pestaña **Mates**: retos y aciertos de la semana, evolución de las últimas 4 semanas, aciertos por tipo de operación, lo que se le resiste, últimos retos, puntos del día y la forma de responder (según el curso, escribiendo o eligiendo).

---

## [1.6.0] - 2026-11-17 — Repasar: test y repaso espaciado

### 🧠 Un solo sistema: «Repasar»
- Sustituye a los tres sistemas que no se hablaban entre sí (repaso espaciado, repaso diario con planes manuales y tareas de libro sueltas).
- Todo lo que el niño estudia o en lo que falla crea un tema para repasar: tests, fichas y deberes corregidos, tareas de libro, «¿Qué has estudiado hoy?» y las fotos de Mates.
- Cada tema vuelve a los **1, 3, 7, 14 y 30 días**. Con un 8 o más avanza; si no, vuelve a empezar. Tras superar el de 30 días queda **dominado**.
- Si hay un **examen** de esa asignatura en la Agenda, el repaso se adelanta al día anterior.
- **Hoy toca repasar**: aviso al entrar y, como mucho, 3 temas al día. Cada repaso es un test corto de 5 preguntas y, al terminar, «Explícalo con tus palabras» (opcional) con un comentario del tutor.
- En el menú, «Test» pasa a ser **Repasar**; desde ahí se hace también un test de cualquier tema.

### 📝 Test en el servidor
- Preguntas creadas por Claude en el servidor (ya no Gemini desde el navegador).
- **La nota la calcula el programa**: el niño no recibe la respuesta buena hasta entregar; después ve sus fallos explicados.
- Puntos fuertes y a reforzar por apartados, sin una segunda llamada a la IA.
- **Temarios fijos**: el de cada curso, asignatura y comunidad se crea una vez y se guarda. Se puede escribir un tema propio.
- **Banco de preguntas por tema**: a partir de 30 preguntas se reutilizan mezcladas (opciones barajadas) y no se gasta IA.
- **10 tests al día** por hijo, ajustable. Los puntos los suma el servidor.

### 👨‍👩‍👧 Padres
- La pestaña «SRS» pasa a ser **Repasos**: esta semana, más adelante, dominados, «se le resisten» (2 o más repasos fallados), historial de tests y límite diario. Se puede quitar un tema.
- Desaparece «Repaso Diario» (el padre ya no tiene que fabricar planes).

### 🛡️ Protección del menor y seguridad
- Se elimina la **evaluación psicológica y médica a partir de la letra** de «Mis tareas de repaso» (ni se pide la foto ni se guarda nada). El resumen lo comenta Claude valorando solo el contenido.
- Las acciones de libros y tareas comprueban que el niño es de esa familia; los puntos de una tarea los fija la tarea guardada y no se pueden cobrar dos veces.

---

## [1.5.1] - 2026-11-17 — Base de datos en Turso

- La base de datos pasa de Supabase (Postgres) a **Turso** (SQLite en la nube). En local se usa el mismo motor y el mismo controlador (libSQL), así que lo que se prueba es lo que funciona en producción.
- Se elimina todo el código de Postgres (y los paquetes `pg` y `better-sqlite3`) y el archivo `supabase_schema.sql`.
- **Copia de seguridad diaria** de toda la base de datos en el almacenamiento de fotos (Cloudflare R2), comprimida, durante 30 días (`BACKUP_RETENTION_DAYS`). Se restaura con `npm run restore -- <archivo>` en una base de datos vacía.
- Corregidas tres consultas que fallaban en Supabase (repasos espaciados y tareas de libros).

---

## [1.5.0] - 2026-11-17 — Deberes y fichas con IA en el servidor

### 📸 Un solo botón: «Hago una foto»
- **Corrígeme:** si la foto es de una ficha de EduAmigo, se reconoce por su **código QR** y se corrige como esa ficha; si no, se corrige como deberes del cole.
- **No sé hacer este ejercicio:** abre Pregúntame con la foto y el tutor guía paso a paso (sustituye a Vision Tutor).
- Pregúntame tiene también el botón **📷 Foto de un ejercicio**; la foto se ve en la conversación (también en la vista de padres).
- Las fotos se comprimen en el dispositivo antes de enviarse.

### 🧠 Corrección y fichas en el servidor
- La IA (Claude, `VISION_MODEL`, por defecto `claude-haiku-5-5`) se llama solo desde el servidor. Ya no se usa Gemini para fichas ni correcciones.
- **Mates comprobadas por código:** la IA solo transcribe lo que ha escrito el niño; acierto o fallo lo decide el programa.
- Más fichas de mates generadas sin IA: sumas con llevadas, restas con préstamo, multiplicaciones, tablas, mezcla de operaciones, además de divisiones y fracciones.
- **Nunca se inventan notas:** si la IA no está disponible, no se guarda ninguna corrección y se avisa.
- El niño ve **en qué ha fallado y una pista**, no la solución. Los padres ven la solución.
- Si la IA duda al leer un número o una letra, pregunta antes de corregir; las aclaraciones reutilizan la foto y no gastan correcciones.
- Límite de **10 fotos corregidas al día** por hijo, ajustable en Padres → Tutor.
- Fichas, deberes y fotos se guardan en el servidor (antes solo en el navegador). Las fotos se guardan **365 días**; después se borra el original y queda la miniatura.

### 👨‍👩‍👧 Panel de padres
- «Deberes & Esfuerzo» y «Fichas Imprimibles» se unen en **Fichas y deberes**, con resumen de esfuerzo, autonomía y comentarios.

### 🐞 Corregido
- Las fichas de «Problemas» y «Fracciones» generaban divisiones.
- La corrección de una ficha sumaba los puntos dos veces.
- Las fichas de operaciones que no son divisiones se imprimían con casillas de cociente y resto.

---

## [1.4.0] - 2026-11-16 — Tutor "Pregúntame" seguro para menores

### 💬 Pregúntame (sustituye a Aprender, Chat y SOS)
- Un único tutor para el niño, en **modo guiado por defecto**: pregunta y da pistas en vez de resolver los deberes. Las dudas de concepto se explican directamente.
- Botones **Dame otra pista**, **No lo entiendo: explícamelo** (explicación completa con un ejemplo parecido) y **Explícamelo de otra forma**.
- **Ejemplos del país del niño** como ajuste de su perfil (sustituye al botón SOS, que no funcionaba).
- **Escuchar** cada respuesta con la voz del propio dispositivo (gratis).
- **Esto está mal** en cada respuesta: queda guardado (tabla `tutor_reports`) y lo ven los padres.
- Aviso visible de que se habla con una IA y de que los padres pueden ver las conversaciones.
- El historial lateral muestra las conversaciones del tutor y, al pulsar una, se vuelve a abrir completa.
- 5 puntos por cada pregunta nueva (no por cada mensaje).

### 🛡️ Protección para menores (en el servidor)
- La IA se llama solo desde el servidor con Claude (Anthropic), cuyas condiciones permiten productos para menores con salvaguardas. Modelo por defecto: `claude-haiku-5-5`.
- Instrucciones del tutor: solo temas escolares, nada de datos personales, contenido adecuado a la edad, sin enlaces.
- Los datos personales (teléfono, email, DNI, dirección, contraseñas) se tapan antes de enviarse a la IA.
- Ante señales de autolesión, acoso o maltrato, la IA no responde: el niño recibe un mensaje fijo que le anima a hablar con un adulto de confianza, con el teléfono de la Fundación ANAR.
- Los padres reciben un aviso en caso de autolesión o acoso. En caso de posible maltrato por un adulto cercano **no** se avisa y esa conversación queda oculta en la vista de padres.
- Se eliminó el análisis de emociones de los mensajes del niño.

### 👨‍👩‍👧 Panel de padres: pestaña Tutor
- Avisos importantes con orientación (024, 112, ANAR) y globo en el botón Padres.
- Conversaciones completas de cada hijo con señales objetivas: "Se atascó" (pidió 2 o más explicaciones) y "Avanzó con pistas".
- Uso de hoy y de la semana. Ajustes por hijo: preguntas al día (30 por defecto) y país para los ejemplos.

### 🐞 Corregido
- La app ya arranca sin clave de Gemini (antes mostraba una pantalla de error en producción).

### ⚙️ Configuración
- Nueva variable `ANTHROPIC_API_KEY` (ver `.env.example`). `TUTOR_PROVIDER=mock` da respuestas simuladas para pruebas sin gastar saldo.
- Se eliminan `StudentInquiry`, `ChatInterface`, `SOSModal`, `ResultDisplay` y `StudyForm` (sustituidos por `TutorChat`).

---

## [1.3.0] - 2026-11-16 — Acceso seguro para que el niño estudie solo

### 👨‍👩‍👧 Perfiles: modo niño de verdad
- Al elegir un niño, todas las pantallas muestran su versión de alumno. Antes, con una cuenta real, la app seguía en modo padre: el niño veía el gestor de libros en vez de sus tareas de repaso, podía crear fichas y darse puntos en "Deberes & Fichas", y el aviso de "Repaso obligatorio" no aparecía nunca.
- Nuevo botón **Cambiar de perfil** en la cabecera: vuelve a "¿Quién va a estudiar hoy?" sin cerrar la sesión. Antes, un hermano tenía que cerrar sesión (y hacía falta la contraseña del padre para volver).

### 🔒 PIN de padres
- El PIN se pide **cada vez** que se entra en la zona de padres y el panel se vuelve a bloquear al salir de él o tras 5 minutos sin uso.
- "Añadir Hijo" (en la pantalla de elegir perfil) y "¿Eres padre? Desbloquear" (en Fichas) ya no se saltan el PIN.
- **Cerrar sesión pide el PIN** en cuentas reales, para que un niño no deje fuera a la familia.
- El PIN se comprueba en el **servidor**, se guarda **cifrado** (scrypt) y ya no se envía ni se guarda en el dispositivo. Tras 5 intentos fallidos se bloquea 15 minutos (también para recuperar la contraseña).
- El PIN se elige al registrarse; se rechazan los fáciles (1234, 0000, cifras repetidas…). Las cuentas antiguas con PIN débil deben elegir uno nuevo al entrar.
- Nuevo botón **Cambiar PIN** en Padres → Hijos.

### 🛡️ Servidor
- Sesiones con cookie httpOnly (180 días: el dispositivo familiar se queda abierto para que el niño entre solo). Todas las rutas de datos exigen sesión y toman el usuario de la sesión, nunca de la URL: una familia ya no puede leer los datos de otra cambiando el identificador.
- Las acciones de adulto (hijos, premios, agenda, libros y tareas de estudio) exigen haber metido el PIN en los últimos 15 minutos.
- Registro: email válido y contraseña de al menos 8 caracteres. El email ya no distingue mayúsculas.
- Migración automática: los PIN guardados en claro pasan a cifrados al arrancar.

### 🐞 Corregido
- Cerrar sesión borraba **todo** el almacenamiento del dispositivo, incluidas las fichas y los cromos del niño. Ahora solo borra los datos de la sesión.
- Los historiales de Caligrafía, Lectura y Mates ya no rompen la página si el servidor responde con un error.

### ⏭️ Pendiente (otras opciones)
- Comprobar en cada acción que el niño o la tarea pertenecen a la familia de la sesión (los identificadores son aleatorios, pero falta la comprobación explícita).
- Recuperar la contraseña por email en lugar de con el PIN.

---

## [1.2.0] - 2026-09-20 — Taller de Matemáticas Interactivo, Álbum de Cromos y Reportes Académicos PDF

### 🔢 Taller de Matemáticas Interactivo y Multimodal (`MathModule.tsx`)
- **Speed Math Arcade (Cálculo Mental contra reloj)**:
  - Partidas de 45 segundos con desafíos aritméticos aleatorios ajustados por curso.
  - Mecánica de rachas consecutivas y combos de puntos.
  - Pantalla de estadísticas finales con precisión y récord personal.
- **Pizarra Digital Táctil (Canvas Scratchpad)**:
  - Lienzo de dibujo fluido con selector de grosores y colores para realizar operaciones intermedias a mano alzada.
  - Botón de borrado rápido y posibilidad de consultar al Tutor IA el paso a paso.
- **Análisis Óptico y Detección de Errores con IA**:
  - Pestaña de subida o foto de problemas manuscritos e impresos.
  - Explicación socrática guiada sin dar directamente la solución.

### 🏆 Sistema de Logros y Álbum de Cromos Educativos (`StickerAlbum.tsx` y `types/stickers.ts`)
- **Catálogo de Cromos Coleccionables**:
  - 12 cromos organizados en 4 series temáticas: Exploración Espacial, Naturaleza y Ecosistemas, Grandes Científicos e Historia, y Matemáticas Mágicas.
  - Sistema de rarezas (Común, Raro, Legendario) con detalles pedagógicos ilustrados.
- **Tienda y Desbloqueo por Esfuerzo**:
  - Desbloqueo de cromos con los puntos (XP) ganados estudiando y resolviendo retos.
  - Persistencia de cromos coleccionados por perfil de estudiante en almacenamiento local.
  - Integración en `RewardsShop.tsx` y resumen en `GamificationCenter.tsx`.

### 📄 Informes Académicos Descargables en PDF (`AcademicReportPDF.tsx`)
- **Generador de Informes Oficiales para Familias y Tutores**:
  - Vista previa interactiva con maquetación en formato DIN A4 y membrete oficial EduAmigo J21.
  - Filtros por alumno y períodos temporales (7 días, 30 días o curso completo).
  - Resumen ejecutivo con medias de exámenes, actividad por competencias (Matemáticas, Lectura, Inglés) y racha de estudio.
  - Botón de exportación e impresión limpia en PDF (`window.print()`) optimizado para evitar elementos de navegación.
  - Función de copiado rápido en formato texto para enviar por WhatsApp o correo electrónico a los docentes del colegio.
  - Integrado de forma accesible en el Panel de Control Parental (`ParentDashboard.tsx`).

### 🚀 Despliegue y Puesta a Punto en Producción (Render & Supabase)
- Eliminación de archivos residuales obsoletos (`bun.lock`).
- Esquema de base de datos PostgreSQL unificado y validado en `supabase_schema.sql`.
- Actualización de versión a 1.2.0 en `version.ts`, `package.json` y `changelog.md`.

---

## [1.1.0] - 2026-09-19 — Reconocimiento de Voz en Vivo y Modo Offline

### 🎙️ Reconocimiento de Voz Nativo por Micrófono (Live Voice Tracking)
- **Seguimiento de Lectura en Tiempo Real (`ReadingModule.tsx`)**:
  - Integración con la Web Speech API nativa del navegador (`SpeechRecognition` / `webkitSpeechRecognition`).
  - Resaltado dinámico palabra a palabra en el texto a medida que el alumno lee en voz alta.
  - Cálculo automático en tiempo real de **Palabras Por Minuto (PPM / WPM)** y porcentaje de precisión.
  - Detección de silencios prolongados (>3.5s) con mensajes amables de aliento (*"¡Vas fenomenal, respira hondo y continúa a tu ritmo!"*).
  - Opción de **Lectura Modelo por Síntesis de Voz**: botón para escuchar cómo suena el texto leído con cadencia infantil adecuada antes de comenzar a leer.
  - Selector de lecturas organizadas por niveles curriculares: Primaria baja (1º-2º), Primaria media (3º-4º) y Primaria alta (5º-6º).

### 📡 Modo Offline y Sincronización Automática
- **Motor de Almacenamiento Local Resiliente (`services/offlineStorageService.ts`)**:
  - Detección de conectividad en tiempo real (`online`/`offline`).
  - Caché de libros de texto, temarios y ejercicios en almacenamiento local para permitir el estudio sin conexión (coche, autobús, zonas de baja cobertura).
  - Cola de actividades offline (`eduamigo_offline_queue_v1`): almacena sesiones de lectura, retos de matemáticas y puntos de experiencia cuando no hay red.
  - Sincronización automática de tareas y progresos acumulados tan pronto como el dispositivo recupera la conexión a Internet.
  - Componente **`OfflineStatusBanner.tsx`**: indicador no invasivo que informa al estudiante de que puede seguir estudiando sin conexión y notifica cuando los datos se sincronizan.

### 🧹 Correcciones de Versionado, Limpieza y Coherencia
- **Fuente Única de Verdad para Versionado (`version.ts`)**:
  - Creación de `APP_VERSION = '1.1.0'` y `APP_YEAR = '2026'`.
  - Eliminación de referencias desincronizadas en el pie de página de la pantalla de bienvenida (`AuthScreen.tsx`), pie de página principal (`App.tsx`), fichas de caligrafía (`CalligraphyModule.tsx`) y caché del Service Worker (`sw.js`).
  - Unificación en un único archivo `changelog.md` oficial para el seguimiento de versiones.
- **Saneamiento del Repositorio y Eliminación de Archivos Obsoletos**:
  - Eliminados 11 scripts `.sql` obsoletos de migraciones MySQL antiguas (`db_updates*.sql`, `db_schema_complete.sql`, etc.), centralizando el esquema en la base de datos nativa y conservando únicamente `supabase_schema.sql` como referencia PostgreSQL.
  - Eliminados los scripts heredados en desuso en `/public` (`api.php`, `auth.php`, `config.php`, `api_study.php`, `api_english.php`, `db_schema.sql`).
  - Eliminado el archivo de bloqueo no utilizado `bun.lock` y el directorio de historial de migración `migrated_prompt_history/`.

---

## [1.0.0] - 2026-09-19 — Versión Base Estable & Homologación PWA Móvil

### 🚀 Módulos y Funcionalidades Incluidas (Features)
- **Tutor Inteligente con Gemini AI (`geminiService.ts`)**:
  - Explicaciones pedagógicas adaptadas por nivel educativo (Primaria, ESO, Bachillerato).
  - Generación de temarios, cuestionarios y exámenes interactivos con retroalimentación inmediata.
  - Modo socrático para resolución de dudas paso a paso sin dar la respuesta directamente.
- **English Academy (`components/english/` y `services/englishService.ts`)**:
  - Módulos organizados por destrezas: Grammar, Vocabulary, Reading Comprehension, Listening y Speaking.
  - Ejercicios interactivos con pronunciación asistida por síntesis de voz (Web Speech API).
- **Caligrafía y Grafomotricidad (`CalligraphyModule.tsx` y `calligraphyService.ts`)**:
  - Lienzo interactivo para trazo de letras y números con detección de dirección y precisión.
  - Historial de intentos y evaluación mediante visión por IA.
- **Taller de Matemáticas (`MathModule.tsx` y `mathService.ts`)**:
  - Generador de retos aritméticos y algebraicos con validación en tiempo real y pizarra digital.
- **Escáner y Visión Escolar (`VisionTutor.tsx` y `SchoolDocumentScanner.tsx`)**:
  - Análisis óptico con IA multimodal de enunciados, problemas de libros de texto y ejercicios manuscritos.
- **Sistema de Repaso Espaciado SRS (`SRSReviewModule.tsx` y `srsService.ts`)**:
  - Algoritmo de intervalos progresivos para afianzar conceptos y memorización duradera.
- **Panel de Padres y Control Parental (`ParentDashboard.tsx` y `ParentReviewManager.tsx`)**:
  - Bloqueo por PIN de seguridad (`1234` por defecto, configurable).
  - Gestión de múltiples perfiles infantiles con avatares independientes.
  - Aprobación de recompensas, historial de actividad, informes diarios y tareas asignadas.
- **Gamificación y Recompensas (`RewardsShop.tsx` y `GamificationCenter.tsx`)**:
  - Puntos de experiencia (XP), rachas de estudio activas y canje de premios parentales.
- **Agenda Escolar y Planificador de Estudio (`AgendaManager.tsx` e `ISBNStudyPlanner.tsx`)**:
  - Programación de fechas de exámenes, entrega de trabajos y temporizador Pomodoro.
- **Seguridad y Ubicación (`LocationHub.tsx` y `SOSModal.tsx`)**:
  - Alerta SOS con geolocalización protegida y radio de seguridad casa/colegio.

### 📱 Homologación PWA Móvil (Progressive Web App)
- **Instalabilidad en Móviles (Android & iOS)**:
  - Creación del componente `PWAInstallButton` con soporte para el evento `beforeinstallprompt` en Android/Chrome.
  - Modal interactivo con instrucciones paso a paso para iOS Safari ("Compartir -> Añadir a pantalla de inicio").
  - Configuración completa de `public/manifest.json` con `id: "/"`, `scope: "/"`, categorías educativas y orientación vertical.
  - Generación de iconos reales PNG de alta resolución: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png` (con margen de seguridad del 15% para launchers de Android) y `apple-touch-icon.png` (180x180 para Apple).
  - Actualización de etiquetas en `index.html`: `viewport-fit=cover`, `apple-mobile-web-app-capable` y enlaces de iconos.
  - Service Worker optimizado (`public/sw.js`): Estrategia `NetworkFirst` para navegación e index HTML, cache de iconos/estáticos y exclusión estricta de llamadas API y desarrollo.

### 🛠️ Correcciones y Estabilidad (Bug Fixes)
- **Corrección de pantalla en blanco por entorno Node en navegador**:
  - Se introdujo el polyfill global de `window.process` y `window.global` para prevenir caídas al instanciar `@google/genai` y la librería interna `google-logging-utils`.
- **Eliminación de colisiones de Service Worker heredado**:
  - Purgado de cachés corruptas que servían versiones desactualizadas de JavaScript.
- **Seguridad en Notificaciones dentro de iFrames**:
  - Verificación `cross-origin` protegida en `services/notificationService.ts` evitando bloqueos de seguridad en previews embebidas.
- **Persistencia y Base de Datos**:
  - Motor híbrido en `server.ts` con SQLite local (`eduamigo.db`) de arranque instantáneo y compatibilidad transparente con PostgreSQL/Supabase en despliegues cloud mediante `DATABASE_URL`.
  - Hashing de contraseñas mediante `bcryptjs` con sal y autenticación de sesión resiliente.
