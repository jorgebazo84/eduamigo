// Contenido de los juegos y prácticas: bancos revisados a mano y generadores con reglas (sin IA).
// Cada partida es una lista de ejercicios. Lo que ve el alumno va en `pub`; la solución (`key`) se queda en el servidor.

export type ItemType = 'choice' | 'typed' | 'order' | 'match' | 'typing' | 'robot' | 'hangman';
export interface GameItem {
  pub: any;              // lo que se envía al navegador (sin la solución)
  key: any;              // solución, solo en el servidor
  show: string;          // solución para mostrar después de responder
  explain?: string;      // por qué
}

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const sample = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n);
const euros = (cents: number) => (cents % 100 === 0 ? `${cents / 100} €` : `${(cents / 100).toFixed(2).replace('.', ',')} €`);
export const norm = (s: any) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
/** Igual que norm pero respeta tildes (para Ortografía y Spelling) */
const normKeep = (s: any) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Elección: baraja las opciones y guarda cuál es la buena */
function choice(prompt: string, correct: string, wrong: string[], extra: any = {}, explain?: string): GameItem {
  const options = shuffle([correct, ...wrong.filter((w) => w !== correct)]);
  return { pub: { type: 'choice', prompt, options, ...extra }, key: options.indexOf(correct), show: correct, explain };
}
function typed(prompt: string, accepted: (string | number)[], extra: any = {}, explain?: string): GameItem {
  return { pub: { type: 'typed', prompt, ...extra }, key: accepted.map(String), show: String(accepted[0]), explain };
}
const numWrong = (n: number, count = 3, spread = 5) => {
  const s = new Set<number>();
  for (let i = 0; s.size < count && i < 50; i++) { const w = n + rnd(-spread, spread); if (w !== n && w >= 0) s.add(w); }
  return [...s].map(String);
};

// =============================================================================== MATES
function balanza(L: number): GameItem {
  if (L <= 3) {
    const x = rnd(1, 9), a = rnd(1, 9);
    return typed(`En un platillo hay una caja ❓ y ${a} kg. En el otro hay ${a + x} kg. ¿Cuántos kg pesa la caja?`, [x], { numeric: true, unit: 'kg', visual: { kind: 'balance', left: ['❓', `${a} kg`], right: [`${a + x} kg`] } }, `${a + x} − ${a} = ${x}`);
  }
  if (L <= 6) {
    const x = rnd(2, 12), n = rnd(2, 4), a = rnd(0, 10);
    const left = [...Array(n).fill('❓'), ...(a ? [`${a} kg`] : [])];
    return typed(`${n} cajas iguales ❓${a ? ` y ${a} kg` : ''} pesan lo mismo que ${n * x + a} kg. ¿Cuánto pesa cada caja?`, [x], { numeric: true, unit: 'kg', visual: { kind: 'balance', left, right: [`${n * x + a} kg`] } }, `${a ? `${n * x + a} − ${a} = ${n * x}; ` : ''}${n * x} ÷ ${n} = ${x}`);
  }
  // Ecuación de primer grado: a·x + b = c·x + d con solución entera
  const x = rnd(-6, 12), a = rnd(2, 7), c = rnd(1, a - 1), b = rnd(-10, 15), d = (a - c) * x + b;
  const side = (k: number, m: number) => `${k === 1 ? '' : k}x ${m < 0 ? '−' : '+'} ${Math.abs(m)}`;
  return typed(`Resuelve la ecuación: ${side(a, b)} = ${side(c, d)}. ¿Cuánto vale x?`, [x], { numeric: true }, `${a - c}x = ${d - b} → x = ${x}`);
}

const PRODUCTS = [['🍎', 'manzana'], ['🥖', 'barra de pan'], ['🥛', 'cartón de leche'], ['✏️', 'lápiz'], ['📓', 'cuaderno'], ['🧃', 'zumo'], ['🍪', 'paquete de galletas'], ['🎈', 'globo'], ['🧀', 'queso'], ['🍌', 'plátano']];
function tienda(L: number): GameItem {
  const items = sample(PRODUCTS, L <= 2 ? 2 : 3);
  const prices = items.map(() => (L <= 3 ? rnd(1, 5) * 100 : L <= 5 ? rnd(2, 19) * 50 : rnd(55, 995)));
  const total = prices.reduce((a, b) => a + b, 0);
  const bills = [500, 1000, 2000, 5000].filter((b) => b > total);
  const paid = bills[0] || Math.ceil(total / 1000) * 1000;
  const change = paid - total;
  const list = items.map((p, i) => `${p[0]} ${p[1]}: ${euros(prices[i])}`);
  const accepted = [String(change / 100), (change / 100).toFixed(2), (change / 100).toFixed(2).replace('.', ',')];
  return typed(`Compras: ${list.join(' · ')}. Pagas con ${euros(paid)}. ¿Cuánto te devuelven (en euros)?`, accepted, { numeric: true, unit: '€' }, `Total ${euros(total)}; ${euros(paid)} − ${euros(total)} = ${euros(change)}`);
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
function fracciones(L: number): GameItem {
  if (L <= 6 || Math.random() < 0.5) {
    const parts = rnd(2, L <= 4 ? 6 : 10), filled = rnd(1, parts - 1);
    const correct = `${filled}/${parts}`;
    const wrong = new Set<string>([`${parts - filled}/${parts}`, `${filled}/${parts + 1}`, `${parts}/${filled}`, `${filled + 1}/${parts}`].filter((w) => w !== correct));
    return choice('¿Qué fracción de la pizza está coloreada?', correct, [...wrong].slice(0, 3), { visual: { kind: 'fraction', parts, filled } }, `Hay ${parts} partes iguales y ${filled} están coloreadas.`);
  }
  // Fracción equivalente / simplificar
  const den = rnd(2, 9), num = rnd(1, den - 1), k = rnd(2, 5);
  const g = gcd(num, den);
  const correct = `${num / g}/${den / g}`;
  const wrong = new Set<string>([`${num * k}/${den}`, `${num}/${den * k}`, `${num / g + 1}/${den / g}`, `${den / g}/${num / g}`].filter((w) => w !== correct));
  return choice(`¿Qué fracción es equivalente a ${num * k}/${den * k}?`, correct, [...wrong].slice(0, 3), {}, `Divide arriba y abajo entre ${(num * k) / (num / g)}: ${num * k}/${den * k} = ${correct}.`);
}

// =============================================================================== LENGUA
// Palabras con un hueco «_» y la letra que va en él. Revisadas una a una.
const BV: [string, 'b' | 'v'][] = [
  ['ár_ol', 'b'], ['a_uelo', 'b'], ['_lanco', 'b'], ['li_ro', 'b'], ['ca_eza', 'b'], ['_icicleta', 'b'], ['_otella', 'b'], ['canta_a', 'b'],
  ['jugá_amos', 'b'], ['sa_ía', 'b'], ['escri_ir', 'b'], ['reci_ir', 'b'], ['proba_le', 'b'], ['ama_le', 'b'], ['ha_lar', 'b'], ['o_ligar', 'b'],
  ['su_marino', 'b'], ['_ueno', 'b'], ['bom_ero', 'b'], ['_razo', 'b'],
  ['_aca', 'v'], ['nue_e', 'v'], ['lla_e', 'v'], ['nue_o', 'v'], ['in_ierno', 'v'], ['en_iar', 'v'], ['_olar', 'v'], ['_entana', 'v'],
  ['_erde', 'v'], ['octa_o', 'v'], ['acti_o', 'v'], ['ner_ioso', 'v'], ['estu_o', 'v'], ['tu_o', 'v'], ['andu_e', 'v'], ['in_itar', 'v'],
  ['ser_ir', 'v'], ['llo_er', 'v'], ['jo_en', 'v'], ['a_ión', 'v'], ['la_ar', 'v'],
];
const GJ: [string, 'g' | 'j'][] = [
  ['_ente', 'g'], ['_irasol', 'g'], ['co_er', 'g'], ['reco_er', 'g'], ['ele_ir', 'g'], ['má_ico', 'g'], ['pá_ina', 'g'], ['ima_en', 'g'],
  ['ori_en', 'g'], ['_eografía', 'g'], ['biolo_ía', 'g'], ['ener_ía', 'g'], ['_imnasio', 'g'], ['ur_ente', 'g'], ['re_ión', 'g'],
  ['_irafa', 'j'], ['di_e', 'j'], ['tra_e', 'j'], ['via_e', 'j'], ['gara_e', 'j'], ['te_er', 'j'], ['cru_ir', 'j'], ['mu_er', 'j'],
  ['_inete', 'j'], ['a_eno', 'j'], ['extran_ero', 'j'], ['_efe', 'j'], ['paisa_e', 'j'], ['lengua_e', 'j'], ['e_ército', 'j'],
];
const H: [string, boolean][] = [
  ['_ielo', true], ['_ueso', true], ['_uevo', true], ['_ora', true], ['_ermano', true], ['_acer', true], ['_oja', true], ['_elado', true],
  ['a_ora', true], ['zana_oria', true], ['bú_o', true], ['almo_ada', true], ['_ospital', true], ['_ormiga', true], ['_umo', true], ['_istoria', true],
  ['_oso', false], ['_oreja', false], ['_uva', false], ['_ojo', false], ['_abeja', false], ['_elefante', false], ['_isla', false], ['_orilla', false], ['_idea', false],
];
function orto(kind: 'bv' | 'gj' | 'h'): GameItem {
  if (kind === 'h') {
    const [w, has] = pick(H);
    const word = w.replace('_', has ? 'h' : '');
    return choice(`¿Cómo se escribe? ${w.replace('_', '·')}`, has ? 'Con h' : 'Sin h', [has ? 'Sin h' : 'Con h'], { gap: w }, `Se escribe «${word}».`);
  }
  const [w, l] = kind === 'bv' ? pick(BV) : pick(GJ);
  return { pub: { type: 'choice', prompt: `Completa: ${w.replace('_', '·')}`, options: kind === 'bv' ? ['b', 'v'] : ['g', 'j'], gap: w }, key: (kind === 'bv' ? ['b', 'v'] : ['g', 'j']).indexOf(l), show: w.replace('_', l), explain: `Se escribe «${w.replace('_', l)}».` };
}

// Pon la tilde: palabra bien escrita (con o sin tilde)
const TILDE = [
  'canción', 'camión', 'árbol', 'lápiz', 'fácil', 'difícil', 'música', 'médico', 'pájaro', 'teléfono', 'sofá', 'café', 'también', 'después',
  'jamás', 'último', 'rápido', 'número', 'éxito', 'azúcar', 'cárcel', 'mármol', 'árboles', 'jóvenes', 'exámenes', 'imágenes', 'país', 'maíz',
  'baúl', 'día', 'tío', 'río', 'oído', 'examen', 'joven', 'resumen', 'origen', 'imagen', 'reloj', 'pared', 'feliz', 'lunes', 'canciones',
  'camiones', 'ciudad', 'mesa', 'zapato', 'ordenador',
];
const ACC: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const UNACC: Record<string, string> = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
function tilde(): GameItem {
  const word = pick(TILDE);
  const bare = word.split('').map((c) => UNACC[c] || c).join('');
  const variants = new Set<string>();
  if (bare !== word) variants.add(bare);
  const vowels = bare.split('').map((c, i) => (ACC[c] ? i : -1)).filter((i) => i >= 0);
  for (const i of shuffle(vowels)) {
    const v = bare.slice(0, i) + ACC[bare[i]] + bare.slice(i + 1);
    if (v !== word) variants.add(v);
    if (variants.size >= 2) break;
  }
  return choice('¿Cuál está bien escrita?', word, [...variants].slice(0, 2), {}, `Se escribe «${word}».`);
}

// Frases con un solo orden correcto (la mayúscula inicial y el punto final ayudan)
const FRASES: string[][] = [
  ['El perro come pienso.', 'Mi hermana lee un cuento.', 'Los niños juegan en el patio.', 'La gata duerme en el sofá.', 'Mi abuelo tiene un huerto.', 'Ana pinta un dibujo.'],
  ['El tren sale de la estación.', 'Mi madre prepara la cena.', 'Los pájaros construyen su nido.', 'El cartero trae una carta.', 'Pablo guarda sus juguetes en la caja.', 'La profesora explica la lección.'],
  ['Las abejas fabrican miel en la colmena.', 'El volcán expulsó lava y ceniza.', 'Mi equipo ganó el partido del sábado.', 'Los alumnos visitaron el museo de ciencias.', 'El agricultor riega los tomates por la tarde.', 'La biblioteca abre a las nueve.'],
];
function ordena(L: number): GameItem {
  const bank = FRASES[L <= 2 ? 0 : L <= 4 ? 1 : 2];
  const sentence = pick(bank);
  const words = sentence.split(' ');
  let tokens = shuffle(words);
  for (let i = 0; i < 5 && tokens.join(' ') === sentence; i++) tokens = shuffle(words);
  return { pub: { type: 'order', prompt: 'Ordena las palabras para formar la frase.', tokens }, key: words, show: sentence };
}

const AHORCADO: [string, string][] = [
  ['ELEFANTE', 'Animal'], ['JIRAFA', 'Animal'], ['TORTUGA', 'Animal'], ['MARIPOSA', 'Animal'], ['COCODRILO', 'Animal'], ['PINGÜINO', 'Animal'], ['CABALLO', 'Animal'],
  ['MANZANA', 'Fruta'], ['NARANJA', 'Fruta'], ['PLÁTANO', 'Fruta'], ['SANDÍA', 'Fruta'], ['FRESA', 'Fruta'], ['MELOCOTÓN', 'Fruta'],
  ['CUADERNO', 'En el cole'], ['MOCHILA', 'En el cole'], ['PIZARRA', 'En el cole'], ['ESTUCHE', 'En el cole'], ['BIBLIOTECA', 'En el cole'],
  ['MONTAÑA', 'Paisaje'], ['PLAYA', 'Paisaje'], ['BOSQUE', 'Paisaje'], ['DESIERTO', 'Paisaje'], ['VOLCÁN', 'Paisaje'],
  ['TECLADO', 'Informática'], ['PANTALLA', 'Informática'], ['IMPRESORA', 'Informática'], ['PROGRAMA', 'Informática'], ['CONTRASEÑA', 'Informática'],
];
export const hangLetter = (c: string) => (c === 'Ñ' ? 'Ñ' : c.normalize('NFD').replace(/[̀-ͯ]/g, ''));
function ahorcado(): GameItem {
  const [word, hint] = pick(AHORCADO);
  return { pub: { type: 'hangman', prompt: `Pista: ${hint}`, length: word.length, maxErrors: 6 }, key: word, show: word };
}

// =============================================================================== INGLÉS
const MEMORY_EASY: [string, string][] = [
  ['🐶', 'dog'], ['🐱', 'cat'], ['🍎', 'apple'], ['🏠', 'house'], ['☀️', 'sun'], ['🚗', 'car'], ['📚', 'book'], ['🐟', 'fish'], ['🌳', 'tree'],
  ['⭐', 'star'], ['🍌', 'banana'], ['🐦', 'bird'], ['🍞', 'bread'], ['🥛', 'milk'], ['🎈', 'balloon'], ['🌙', 'moon'], ['🐴', 'horse'], ['🐮', 'cow'],
  ['✏️', 'pencil'], ['🔑', 'key'], ['⚽', 'ball'], ['🐭', 'mouse'], ['🐸', 'frog'], ['🐘', 'elephant'], ['🌸', 'flower'], ['🚲', 'bike'],
];
const MEMORY_VERBS: [string, string][] = [
  ['correr', 'run'], ['comer', 'eat'], ['beber', 'drink'], ['dormir', 'sleep'], ['nadar', 'swim'], ['leer', 'read'], ['escribir', 'write'], ['cantar', 'sing'],
  ['bailar', 'dance'], ['abrir', 'open'], ['cerrar', 'close'], ['comprar', 'buy'], ['aprender', 'learn'], ['viajar', 'travel'], ['ayudar', 'help'], ['escuchar', 'listen'],
];
function memory(L: number, style: 'memory' | 'columns' = 'memory'): GameItem {
  const pairs = sample(L <= 4 ? MEMORY_EASY : Math.random() < 0.5 ? MEMORY_EASY : MEMORY_VERBS, 6);
  const right = shuffle(pairs.map((p) => p[1]));
  return {
    pub: { type: 'match', prompt: 'Une cada pareja.', left: pairs.map((p) => p[0]), right, style },
    key: pairs.map((p) => right.indexOf(p[1])),
    show: pairs.map((p) => `${p[0]} = ${p[1]}`).join(' · '),
  };
}

const SPELL: [string, string][][] = [
  [['cat', 'gato'], ['dog', 'perro'], ['red', 'rojo'], ['sun', 'sol'], ['pen', 'bolígrafo'], ['bed', 'cama'], ['fish', 'pez'], ['milk', 'leche'], ['tree', 'árbol'], ['blue', 'azul']],
  [['apple', 'manzana'], ['house', 'casa'], ['green', 'verde'], ['chair', 'silla'], ['water', 'agua'], ['happy', 'feliz'], ['table', 'mesa'], ['horse', 'caballo'], ['mouse', 'ratón'], ['purple', 'morado']],
  [['school', 'colegio'], ['friend', 'amigo'], ['yellow', 'amarillo'], ['orange', 'naranja'], ['family', 'familia'], ['kitchen', 'cocina'], ['brother', 'hermano'], ['sister', 'hermana'], ['teacher', 'profesor'], ['window', 'ventana']],
  [['beautiful', 'bonito'], ['Wednesday', 'miércoles'], ['because', 'porque'], ['people', 'gente'], ['through', 'a través de'], ['different', 'diferente'], ['believe', 'creer'], ['tomorrow', 'mañana'], ['library', 'biblioteca'], ['environment', 'medio ambiente']],
];
function spelling(L: number): GameItem {
  const [w, es] = pick(SPELL[L <= 3 ? 0 : L <= 5 ? 1 : L <= 8 ? 2 : 3]);
  return { pub: { type: 'typed', prompt: `Escucha y escribe en inglés (significa «${es}»).`, speak: w, speakLang: 'en-GB' }, key: [w.toLowerCase()], show: w };
}

// Preguntas y respuestas; las del mismo grupo no salen juntas para que solo haya una forma de unirlas
const QA: { q: string; a: string; g: string }[] = [
  { q: "What's your name?", a: 'My name is Ana.', g: 'name' },
  { q: 'How old are you?', a: "I'm ten.", g: 'age' },
  { q: 'Where do you live?', a: 'I live in Madrid.', g: 'place' },
  { q: 'Where are you from?', a: "I'm from Spain.", g: 'place' },
  { q: "What's the weather like?", a: "It's sunny.", g: 'weather' },
  { q: 'What time is it?', a: "It's five o'clock.", g: 'time' },
  { q: 'Do you like pizza?', a: 'Yes, I do.', g: 'yes' },
  { q: 'Can you swim?', a: 'Yes, I can.', g: 'yes2' },
  { q: 'How are you?', a: "I'm fine, thank you.", g: 'how' },
  { q: 'How many brothers have you got?', a: "I've got two.", g: 'many' },
  { q: 'When is your birthday?', a: "It's in May.", g: 'when' },
  { q: 'What do you do at weekends?', a: 'I play football.', g: 'do' },
  { q: 'Have you ever been to London?', a: "No, I haven't.", g: 'ever' },
  { q: 'What are you doing?', a: "I'm reading a book.", g: 'doing' },
  { q: "What's your favourite food?", a: 'Pasta, of course!', g: 'fav' },
];
function une(): GameItem {
  const chosen: typeof QA = [];
  for (const p of shuffle(QA)) { if (!chosen.some((c) => c.g === p.g)) chosen.push(p); if (chosen.length === 5) break; }
  const right = shuffle(chosen.map((c) => c.a));
  return { pub: { type: 'match', prompt: 'Une cada pregunta con su respuesta.', left: chosen.map((c) => c.q), right, style: 'columns' }, key: chosen.map((c) => right.indexOf(c.a)), show: chosen.map((c) => `${c.q} → ${c.a}`).join(' · ') };
}

// =============================================================================== INFORMÁTICA
const FRASES_TECLADO: string[][] = [
  ['el sol sale por el este', 'mi gato duerme mucho', 'hoy hace buen tiempo', 'me gusta leer cuentos', 'la luna brilla de noche'],
  ['Los delfines son mamíferos marinos.', 'Guarda tus archivos en una carpeta.', 'El teclado sirve para escribir.', 'Mañana tenemos examen de inglés.', 'La impresora está sin papel.'],
  ['Una contraseña segura mezcla letras, números y símbolos.', 'El procesador ejecuta las instrucciones de los programas.', 'Haz una copia de seguridad cada semana.', 'La memoria RAM se borra al apagar el equipo.', 'El router conecta la red de casa con Internet.'],
];
function teclado(L: number): GameItem {
  const text = pick(FRASES_TECLADO[L <= 4 ? 0 : L <= 7 ? 1 : 2]);
  return { pub: { type: 'typing', prompt: 'Copia la frase exactamente igual.', text }, key: text, show: text };
}

function robot(L: number): GameItem {
  const size = L <= 5 ? 5 : 6;
  for (let tries = 0; tries < 200; tries++) {
    const walls = new Set<string>();
    const nWalls = L <= 4 ? rnd(2, 4) : rnd(5, 9);
    while (walls.size < nWalls) walls.add(`${rnd(0, size - 1)},${rnd(0, size - 1)}`);
    const start = { x: 0, y: rnd(0, size - 1) };
    const goal = { x: size - 1, y: rnd(0, size - 1) };
    if (walls.has(`${start.x},${start.y}`) || walls.has(`${goal.x},${goal.y}`)) continue;
    const d = bfs(size, walls, start, goal);
    if (d < 0 || d < size - 1) continue;
    return {
      pub: { type: 'robot', prompt: 'Lleva al robot 🤖 hasta la meta 🏁 sin chocar con los muros. Órdenes: ⬆️ ⬇️ ⬅️ ➡️.', size, start, goal, walls: [...walls].map((w) => w.split(',').map(Number)), maxSteps: 30, best: d },
      key: null, show: `Se puede llegar en ${d} pasos.`,
    };
  }
  return robot(1);
}
function bfs(size: number, walls: Set<string>, s: { x: number; y: number }, g: { x: number; y: number }) {
  const q: [number, number, number][] = [[s.x, s.y, 0]];
  const seen = new Set([`${s.x},${s.y}`]);
  while (q.length) {
    const [x, y, d] = q.shift()!;
    if (x === g.x && y === g.y) return d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || walls.has(k) || seen.has(k)) continue;
      seen.add(k); q.push([nx, ny, d + 1]);
    }
  }
  return -1;
}
/** Ejecuta el programa del robot: ¿llega a la meta sin chocar? */
export function runRobot(pub: any, program: any): { ok: boolean; reason: string } {
  const cmds = Array.isArray(program) ? program.map(String).slice(0, 60) : [];
  if (!cmds.length) return { ok: false, reason: 'No has escrito ninguna orden.' };
  if (cmds.length > pub.maxSteps) return { ok: false, reason: 'Demasiadas órdenes.' };
  const walls = new Set((pub.walls || []).map((w: number[]) => `${w[0]},${w[1]}`));
  let { x, y } = pub.start;
  const MOV: Record<string, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  for (const c of cmds) {
    const m = MOV[c];
    if (!m) return { ok: false, reason: 'Orden desconocida.' };
    x += m[0]; y += m[1];
    if (x < 0 || y < 0 || x >= pub.size || y >= pub.size) return { ok: false, reason: 'El robot se ha salido del tablero.' };
    if (walls.has(`${x},${y}`)) return { ok: false, reason: 'El robot ha chocado con un muro.' };
  }
  if (x === pub.goal.x && y === pub.goal.y) return { ok: true, reason: cmds.length === pub.best ? '¡Por el camino más corto!' : '¡Ha llegado!' };
  return { ok: false, reason: 'El robot no ha llegado a la meta.' };
}

function binario(L: number): GameItem {
  const max = L <= 7 ? 15 : L <= 9 ? 63 : 255;
  const n = rnd(2, max);
  const bin = n.toString(2);
  if (Math.random() < 0.5) return typed(`Pasa a decimal el número binario ${bin}.`, [n], { numeric: true }, bin.split('').map((b, i) => (b === '1' ? 2 ** (bin.length - 1 - i) : 0)).filter(Boolean).join(' + ') + ` = ${n}`);
  return typed(`Pasa a binario el número ${n}.`, [bin, bin.padStart(8, '0')], { mono: true }, `${n} = ${bin} en binario.`);
}

const SEGURO: { s: string; safe: boolean; why: string }[] = [
  { s: 'Te llega un mensaje: «¡Has ganado un móvil! Pulsa aquí y escribe tus datos».', safe: false, why: 'Los premios que no has pedido son un engaño para robar datos (phishing).' },
  { s: 'Tu contraseña es 123456.', safe: false, why: 'Es de las primeras que prueban los atacantes. Usa una larga y difícil de adivinar.' },
  { s: 'Usas una contraseña larga y distinta en cada sitio, y no se la dices a nadie salvo a tus padres.', safe: true, why: 'Así, si roban una, las demás cuentas siguen protegidas.' },
  { s: 'Alguien que conociste en un juego online te pide una foto y que no se lo cuentes a tus padres.', safe: false, why: 'Pedir secretos es una señal de peligro. Cuéntaselo a un adulto de confianza.' },
  { s: 'Antes de instalar una app preguntas en casa y la bajas de la tienda oficial.', safe: true, why: 'Las tiendas oficiales revisan las apps y tus padres saben qué usas.' },
  { s: 'Un correo de «tu banco» te pide la contraseña para verificar la cuenta.', safe: false, why: 'Un banco nunca te pide la contraseña por correo.' },
  { s: 'Cierras la sesión al terminar de usar un ordenador de la biblioteca.', safe: true, why: 'Si no, la siguiente persona podría entrar en tu cuenta.' },
  { s: 'Publicas en una red social tu dirección y el nombre de tu colegio.', safe: false, why: 'Cualquiera podría saber dónde encontrarte. Los datos personales no se publican.' },
  { s: 'Una web te avisa de que tu ordenador tiene virus y te pide llamar ya a un número.', safe: false, why: 'Es un falso servicio técnico: quieren tu dinero o el control del equipo.' },
  { s: 'Activas la verificación en dos pasos en tu cuenta.', safe: true, why: 'Aunque alguien sepa tu contraseña, necesitará también el código.' },
  { s: 'Un desconocido te manda un enlace: «mira esta foto tuya».', safe: false, why: 'Es un cebo para que pulses: puede llevar a una web falsa o a un virus.' },
  { s: 'Instalas las actualizaciones del sistema cuando las ofrecen los ajustes del dispositivo.', safe: true, why: 'Las actualizaciones arreglan fallos de seguridad.' },
  { s: 'Entras en tu banco conectado a una wifi pública abierta.', safe: false, why: 'En una red abierta otros pueden ver o desviar el tráfico. Espera a estar en una red de confianza.' },
  { s: 'Bloqueas y denuncias a quien te insulta en un chat, y se lo cuentas a un adulto.', safe: true, why: 'Es lo correcto: no contestes y pide ayuda.' },
  { s: 'Alguien te pide por chat el código que te acaba de llegar por SMS.', safe: false, why: 'Ese código sirve para entrar en tu cuenta. No se comparte nunca.' },
  { s: 'Haces copia de seguridad de tus archivos importantes.', safe: true, why: 'Si se estropea el equipo o hay un virus, no pierdes tu trabajo.' },
  { s: 'Descargas gratis de una web desconocida un programa que normalmente es de pago.', safe: false, why: 'Las copias piratas suelen traer programas maliciosos.' },
  { s: 'Revisas qué permisos tienen tus apps y quitas los que no necesitan.', safe: true, why: 'Una linterna no necesita tu micrófono ni tus contactos.' },
  { s: 'Un amigo te escribe desde un número nuevo: está en apuros y necesita dinero urgente.', safe: false, why: 'Es un engaño habitual. Llama a tu amigo a su número de siempre para comprobarlo.' },
  { s: 'Antes de reenviar una noticia sorprendente, compruebas si la publican medios fiables.', safe: true, why: 'Así no ayudas a difundir bulos.' },
];
function seguro(): GameItem {
  const it = pick(SEGURO);
  return { pub: { type: 'choice', prompt: it.s, options: ['✅ Seguro', '⚠️ Trampa'] }, key: it.safe ? 0 : 1, show: it.safe ? 'Seguro' : 'Trampa', explain: it.why };
}

// =============================================================================== CIENCIAS
const CLASES: { q: string; groups: string[]; items: [string, string][] }[] = [
  { q: '¿A qué grupo de animales pertenece?', groups: ['Mamífero', 'Ave', 'Reptil', 'Anfibio', 'Pez'], items: [
    ['🐶 Perro', 'Mamífero'], ['🐋 Ballena', 'Mamífero'], ['🦇 Murciélago', 'Mamífero'], ['🐬 Delfín', 'Mamífero'], ['🐄 Vaca', 'Mamífero'],
    ['🦅 Águila', 'Ave'], ['🐧 Pingüino', 'Ave'], ['🐔 Gallina', 'Ave'], ['🦩 Flamenco', 'Ave'],
    ['🐍 Serpiente', 'Reptil'], ['🦎 Lagarto', 'Reptil'], ['🐢 Tortuga', 'Reptil'], ['🐊 Cocodrilo', 'Reptil'],
    ['🐸 Rana', 'Anfibio'], ['Salamandra', 'Anfibio'], ['Tritón', 'Anfibio'], ['Sapo', 'Anfibio'],
    ['🦈 Tiburón', 'Pez'], ['🐟 Sardina', 'Pez'], ['Salmón', 'Pez'], ['Caballito de mar', 'Pez'],
  ] },
  { q: '¿Es vertebrado o invertebrado?', groups: ['Vertebrado', 'Invertebrado'], items: [
    ['🐙 Pulpo', 'Invertebrado'], ['🕷️ Araña', 'Invertebrado'], ['🦋 Mariposa', 'Invertebrado'], ['🪱 Lombriz', 'Invertebrado'], ['🐌 Caracol', 'Invertebrado'], ['Medusa', 'Invertebrado'], ['Estrella de mar', 'Invertebrado'],
    ['🐟 Sardina', 'Vertebrado'], ['🐸 Rana', 'Vertebrado'], ['🦎 Lagarto', 'Vertebrado'], ['🐦 Gorrión', 'Vertebrado'], ['🐱 Gato', 'Vertebrado'],
  ] },
  { q: '¿En qué estado está?', groups: ['Sólido', 'Líquido', 'Gas'], items: [
    ['🧊 Hielo', 'Sólido'], ['🪨 Piedra', 'Sólido'], ['🪵 Madera', 'Sólido'], ['Agua del grifo', 'Líquido'], ['🫒 Aceite', 'Líquido'], ['🥛 Leche', 'Líquido'],
    ['Vapor de agua', 'Gas'], ['Aire', 'Gas'], ['Oxígeno', 'Gas'],
  ] },
  { q: '¿Es una fuente de energía renovable o no renovable?', groups: ['Renovable', 'No renovable'], items: [
    ['☀️ Solar', 'Renovable'], ['🌬️ Eólica', 'Renovable'], ['💧 Hidráulica', 'Renovable'], ['Geotérmica', 'Renovable'], ['Biomasa', 'Renovable'],
    ['🛢️ Petróleo', 'No renovable'], ['Carbón', 'No renovable'], ['Gas natural', 'No renovable'], ['Uranio (nuclear)', 'No renovable'],
  ] },
];
function clasifica(L: number): GameItem {
  const set = L <= 2 ? CLASES[pick([0, 2])] : pick(CLASES);
  const [name, g] = pick(set.items);
  return { pub: { type: 'choice', prompt: `${set.q} ${name}`, options: set.groups }, key: set.groups.indexOf(g), show: g, explain: `${name} → ${g}.` };
}

// Comunidades con capital clara (se omiten Canarias, con capitalidad compartida, y Castilla y León, sin capital fijada en su estatuto)
const CCAA: [string, string][] = [
  ['Andalucía', 'Sevilla'], ['Aragón', 'Zaragoza'], ['Principado de Asturias', 'Oviedo'], ['Illes Balears', 'Palma'], ['Cantabria', 'Santander'],
  ['Castilla-La Mancha', 'Toledo'], ['Cataluña', 'Barcelona'], ['Comunitat Valenciana', 'Valencia'], ['Extremadura', 'Mérida'], ['Galicia', 'Santiago de Compostela'],
  ['La Rioja', 'Logroño'], ['Comunidad de Madrid', 'Madrid'], ['Región de Murcia', 'Murcia'], ['Navarra', 'Pamplona'], ['País Vasco', 'Vitoria-Gasteiz'],
];
const EUROPA: [string, string][] = [
  ['Francia', 'París'], ['Portugal', 'Lisboa'], ['Italia', 'Roma'], ['Alemania', 'Berlín'], ['Reino Unido', 'Londres'], ['Grecia', 'Atenas'],
  ['Bélgica', 'Bruselas'], ['Austria', 'Viena'], ['Suecia', 'Estocolmo'], ['Noruega', 'Oslo'], ['Dinamarca', 'Copenhague'], ['Finlandia', 'Helsinki'],
  ['Polonia', 'Varsovia'], ['Irlanda', 'Dublín'], ['Hungría', 'Budapest'], ['Chequia', 'Praga'], ['Rumanía', 'Bucarest'],
];
function capitales(L: number): GameItem {
  const bank = L <= 6 || Math.random() < 0.5 ? CCAA : EUROPA;
  const [place, cap] = pick(bank);
  const wrong = sample(bank.filter((b) => b[1] !== cap).map((b) => b[1]), 3);
  return choice(`¿Cuál es la capital de ${place}?`, cap, wrong, {}, `La capital de ${place} es ${cap}.`);
}

// =============================================================================== PRÁCTICAS DE FP (Informática)
// Monta un PC — contenidos del módulo 3029 (componentes, periféricos, seguridad, POST, residuos)
const PC_Q: { q: string; ok: string; no: string[]; why: string }[] = [
  { q: '¿Qué componente ejecuta las instrucciones de los programas?', ok: 'El microprocesador', no: ['La fuente de alimentación', 'El disco duro', 'La tarjeta de sonido'], why: 'El microprocesador (CPU) procesa las instrucciones.' },
  { q: '¿Qué memoria se borra al apagar el equipo?', ok: 'La memoria RAM', no: ['El disco SSD', 'El disco duro', 'Un pendrive USB'], why: 'La RAM es volátil: guarda datos solo mientras hay corriente.' },
  { q: '¿Dónde siguen tus archivos después de apagar el ordenador?', ok: 'En el disco duro o SSD', no: ['En la memoria RAM', 'En el ventilador', 'En la tarjeta gráfica'], why: 'El almacenamiento (HDD o SSD) conserva los datos sin corriente.' },
  { q: '¿Qué hace la fuente de alimentación?', ok: 'Convierte la corriente alterna de la red en corriente continua para los componentes', no: ['Guarda los archivos', 'Enfría el procesador', 'Conecta el equipo a Internet'], why: 'Los componentes funcionan con corriente continua a baja tensión.' },
  { q: '¿Qué hay que hacer antes de abrir la carcasa?', ok: 'Apagar el equipo y desconectar el cable de corriente', no: ['Subir el volumen', 'Desconectar solo el ratón', 'Dejarlo encendido para ver si funciona'], why: 'Así se evitan descargas y daños en los componentes.' },
  { q: '¿Para qué sirve la pulsera antiestática?', ok: 'Para descargar la electricidad estática y no dañar los componentes', no: ['Para medir la tensión', 'Para sujetar los cables', 'Para que no se caigan los tornillos'], why: 'Una descarga electrostática puede estropear chips sin que se note.' },
  { q: '¿Dónde se coloca el microprocesador?', ok: 'En el zócalo (socket) de la placa base', no: ['En una bahía de 3,5"', 'En la ranura de la RAM', 'Dentro de la fuente de alimentación'], why: 'Cada procesador va en un zócalo compatible de la placa base.' },
  { q: '¿Para qué se pone pasta térmica entre el procesador y el disipador?', ok: 'Para que el calor pase mejor al disipador', no: ['Para pegar el procesador', 'Para aislar la electricidad', 'Para que haga menos ruido'], why: 'Rellena los huecos microscópicos y mejora la transmisión del calor.' },
  { q: '¿Qué conector usarías para llevar la imagen a un monitor?', ok: 'HDMI', no: ['RJ45', 'Jack de audio de 3,5 mm', 'PS/2'], why: 'HDMI transporta vídeo (y audio). RJ45 es para red.' },
  { q: '¿Qué conector usa el cable de red de par trenzado?', ok: 'RJ45', no: ['HDMI', 'VGA', 'RJ11'], why: 'El RJ45 tiene 8 contactos; el RJ11 es el de teléfono.' },
  { q: '¿Qué es el POST?', ok: 'La autoprueba que hace el equipo al arrancar para comprobar el hardware', no: ['Un tipo de memoria', 'Un sistema operativo', 'Un conector de la placa base'], why: 'Si el POST encuentra un fallo, suele avisar con pitidos o mensajes.' },
  { q: '¿Cuál es un periférico de entrada?', ok: 'El teclado', no: ['El monitor', 'La impresora', 'Los altavoces'], why: 'Los de entrada meten información en el equipo.' },
  { q: '¿Cuál es un periférico de salida?', ok: 'La impresora', no: ['El ratón', 'El escáner', 'El micrófono'], why: 'Los de salida muestran o sacan información del equipo.' },
  { q: '¿Qué ventaja tiene un SSD frente a un disco duro mecánico?', ok: 'No tiene partes móviles y es mucho más rápido', no: ['Siempre es más barato por gigabyte', 'Se borra al apagar', 'Necesita un ventilador propio'], why: 'El SSD usa memoria flash; el HDD, platos que giran y un cabezal.' },
  { q: '¿Qué función tiene la placa base?', ok: 'Conectar y comunicar todos los componentes', no: ['Almacenar los archivos', 'Mostrar la imagen', 'Convertir la corriente'], why: 'Todos los componentes se conectan a ella a través de zócalos, ranuras y buses.' },
  { q: '¿Dónde se llevan los equipos informáticos que ya no sirven?', ok: 'A un punto limpio o gestor autorizado', no: ['Al contenedor amarillo', 'A la basura normal', 'Al contenedor de papel'], why: 'Tienen materiales contaminantes y otros que se pueden reciclar.' },
  { q: '¿Qué es particionar un disco?', ok: 'Dividirlo en partes que el sistema trata como unidades distintas', no: ['Romperlo para reciclarlo', 'Copiarlo a otro disco', 'Limpiarlo por dentro'], why: 'Por ejemplo, una partición para el sistema y otra para los datos.' },
  { q: '¿Qué componente se encarga de generar la imagen en pantalla?', ok: 'La tarjeta gráfica', no: ['La tarjeta de red', 'La fuente de alimentación', 'La memoria RAM'], why: 'Puede ir integrada en el procesador o ser una tarjeta de expansión.' },
];
function montaPc(i: number): GameItem {
  if (i === 0) {
    const pairs: [string, string][] = sample([
      ['Microprocesador', 'Ejecuta las instrucciones'], ['Memoria RAM', 'Guarda datos mientras hay corriente'], ['Disco SSD', 'Guarda los archivos sin corriente'],
      ['Fuente de alimentación', 'Da corriente continua a los componentes'], ['Disipador', 'Evacua el calor del procesador'], ['Placa base', 'Conecta todos los componentes'],
      ['Tarjeta gráfica', 'Genera la imagen'], ['Tarjeta de red', 'Conecta el equipo a la red'],
    ], 5);
    const right = shuffle(pairs.map((p) => p[1]));
    return { pub: { type: 'match', prompt: 'Une cada componente con su función.', left: pairs.map((p) => p[0]), right, style: 'columns' }, key: pairs.map((p) => right.indexOf(p[1])), show: pairs.map((p) => `${p[0]} → ${p[1]}`).join(' · ') };
  }
  const q = pick(PC_Q);
  return choice(q.q, q.ok, q.no, {}, q.why);
}

// Conecta la red — módulos 3016 y 3030 (redes locales, dispositivos, direcciones)
const NET_Q: { q: string; ok: string; no: string[]; why: string }[] = [
  { q: '¿Qué dispositivo conecta los equipos de una misma red local?', ok: 'Switch', no: ['Monitor', 'Impresora', 'Fuente de alimentación'], why: 'El switch reparte el tráfico entre los equipos de la red local.' },
  { q: '¿Qué dispositivo une tu red local con Internet (otra red)?', ok: 'Router', no: ['Switch', 'Panel de parcheo', 'Hub'], why: 'El router encamina el tráfico entre redes distintas.' },
  { q: '¿Qué medio de transmisión lleva la información con luz?', ok: 'La fibra óptica', no: ['El par trenzado', 'El cable coaxial', 'El cable de alimentación'], why: 'La fibra transmite pulsos de luz: más distancia y velocidad.' },
  { q: '¿Para qué sirve un panel de parcheo?', ok: 'Para organizar en el armario las conexiones del cableado de la red', no: ['Para dar Internet sin cables', 'Para enfriar el switch', 'Para medir la tensión'], why: 'Los puntos de red del edificio llegan al panel y desde ahí se latiguean al switch.' },
  { q: '¿Qué topología conecta todos los equipos a un elemento central?', ok: 'En estrella', no: ['En bus', 'En anillo', 'En malla completa'], why: 'Es la más usada hoy, con un switch en el centro.' },
  { q: '¿Cuántos números tiene una dirección IPv4?', ok: 'Cuatro, de 0 a 255, separados por puntos', no: ['Seis, separados por dos puntos', 'Ocho, de 0 a 9', 'Dos, separados por una barra'], why: 'Por ejemplo, 192.168.1.10.' },
];
const ip = (a: number[]) => a.join('.');
function redIp(): GameItem {
  const kind = rnd(0, 5);
  const b = rnd(0, 50), c = rnd(2, 200);
  if (kind === 0) {
    const base = [192, 168, b, c];
    const ok = ip([192, 168, b, (c + rnd(5, 40)) % 254 + 1]);
    const no = [ip([192, 168, b + 1, c]), ip([192, 169, b, c]), ip([10, 168, b, c])];
    return choice(`Con máscara 255.255.255.0, ¿qué equipo está en la misma red que ${ip(base)}?`, ok, no, {}, 'Con /24, los tres primeros números deben coincidir.');
  }
  if (kind === 1) {
    const ok = pick([ip([192, 168, b, c]), ip([10, rnd(0, 255), b, c]), ip([172, rnd(16, 31), b, c])]);
    const no = sample([ip([8, 8, 8, 8]), ip([80, 58, b, c]), ip([172, 32, b, c]), ip([193, 146, b, c]), ip([11, 0, b, c])], 3);
    return choice('¿Cuál es una dirección IP privada?', ok, no, {}, 'Las privadas son 10.x.x.x, 172.16.x.x–172.31.x.x y 192.168.x.x.');
  }
  if (kind === 2) {
    return typed(`Con máscara 255.255.255.0, ¿cuál es la dirección de red de ${ip([192, 168, b, c])}?`, [ip([192, 168, b, 0])], { mono: true }, 'Se pone a 0 la parte de equipo (el último número).');
  }
  if (kind === 3) {
    return typed(`Con máscara 255.255.255.0, ¿cuál es la dirección de difusión (broadcast) de la red de ${ip([192, 168, b, c])}?`, [ip([192, 168, b, 255])], { mono: true }, 'Se pone a 255 la parte de equipo.');
  }
  if (kind === 4) {
    const bad = ip([192, 168, b, rnd(256, 399)]);
    return choice('¿Qué dirección IPv4 NO es válida?', bad, [ip([192, 168, b, c]), ip([10, 0, 0, rnd(1, 254)]), ip([172, 20, b, c])], {}, 'Cada número de una IPv4 va de 0 a 255.');
  }
  const q = pick(NET_Q);
  return choice(q.q, q.ok, q.no, {}, q.why);
}

// Ley de Ohm — módulos 3029 y 3015 (magnitudes, relación entre ellas, potencia)
function ohm(): GameItem {
  const kind = rnd(0, 4);
  if (kind === 0) { const I = rnd(1, 5), R = pick([2, 4, 5, 10, 20, 22, 47, 100]); return typed(`Por una resistencia de ${R} Ω pasan ${I} A. ¿Qué tensión tiene (en V)?`, [I * R], { numeric: true, unit: 'V' }, `V = I · R = ${I} · ${R} = ${I * R} V`); }
  if (kind === 1) { const R = pick([2, 3, 4, 5, 6, 10, 12, 20]), I = rnd(1, 6); return typed(`Una resistencia de ${R} Ω está conectada a ${I * R} V. ¿Qué intensidad pasa (en A)?`, [I], { numeric: true, unit: 'A' }, `I = V / R = ${I * R} / ${R} = ${I} A`); }
  if (kind === 2) { const I = pick([1, 2, 3, 4, 5]), R = rnd(2, 30); return typed(`Con ${I * R} V circulan ${I} A. ¿Cuánto vale la resistencia (en Ω)?`, [R], { numeric: true, unit: 'Ω' }, `R = V / I = ${I * R} / ${I} = ${R} Ω`); }
  if (kind === 3) { const rs = [rnd(1, 50), rnd(1, 50), rnd(1, 50)]; const t = rs.reduce((a, b) => a + b, 0); return typed(`Tres resistencias en serie de ${rs.join(' Ω, ')} Ω. ¿Cuál es la resistencia total (en Ω)?`, [t], { numeric: true, unit: 'Ω' }, `En serie se suman: ${rs.join(' + ')} = ${t} Ω`); }
  const V = pick([5, 12, 24, 230]), I = pick([1, 2, 3, 4]);
  return typed(`Un aparato funciona a ${V} V y consume ${I} A. ¿Qué potencia tiene (en W)?`, [V * I], { numeric: true, unit: 'W' }, `P = V · I = ${V} · ${I} = ${V * I} W`);
}

// Ofimática — módulos 3030 y 3031 (hoja de cálculo: fórmulas, funciones, referencias, rangos)
function ofimatica(): GameItem {
  const kind = rnd(0, 5);
  const vals = [rnd(1, 20), rnd(1, 20), rnd(1, 20), rnd(1, 20)];
  const table = { cells: vals.map((v, i) => ({ ref: `A${i + 1}`, value: v })) };
  if (kind === 0) return typed('¿Qué resultado da =SUMA(A1:A4)?', [vals.reduce((a, b) => a + b, 0)], { numeric: true, sheet: table }, `${vals.join(' + ')} = ${vals.reduce((a, b) => a + b, 0)}`);
  if (kind === 1) { const m = Math.max(...vals); return typed('¿Qué resultado da =MAX(A1:A4)?', [m], { numeric: true, sheet: table }, `El mayor valor es ${m}.`); }
  if (kind === 2) { const m = Math.min(...vals); return typed('¿Qué resultado da =MIN(A1:A4)?', [m], { numeric: true, sheet: table }, `El menor valor es ${m}.`); }
  if (kind === 3) {
    const avg = rnd(3, 15); const v = [avg - 2, avg + 1, avg - 1, avg + 2];
    return typed('¿Qué resultado da =PROMEDIO(A1:A4)?', [avg], { numeric: true, sheet: { cells: v.map((x, i) => ({ ref: `A${i + 1}`, value: x })) } }, `(${v.join(' + ')}) / 4 = ${avg}`);
  }
  if (kind === 4) {
    const r = rnd(2, 9);
    return choice(`En C1 está la fórmula =A1*B1. Si la copias y la pegas en C${r}, ¿cómo queda?`, `=A${r}*B${r}`, [`=A1*B1`, `=A${r}*B1`, `=$A$1*$B$1`], {}, 'Las referencias relativas cambian al copiar la fórmula a otra fila.');
  }
  const r = rnd(2, 9);
  return choice(`En C1 está =A1*$B$1. Si la copias a C${r}, ¿cómo queda?`, `=A${r}*$B$1`, [`=A${r}*$B$${r}`, `=A1*$B$1`, `=A${r}*B${r}`], {}, 'Con $ la referencia es absoluta y no cambia al copiar.');
}

// =============================================================================== partida
/** Crea los ejercicios de una partida */
export function makeRound(gameId: string, L: number): GameItem[] {
  const n = (k: number, f: (i: number) => GameItem) => Array.from({ length: k }, (_, i) => f(i));
  const uniq = (k: number, f: () => GameItem) => {
    const out: GameItem[] = []; const seen = new Set<string>();
    for (let i = 0; out.length < k && i < k * 8; i++) { const it = f(); const sig = JSON.stringify(it.pub); if (!seen.has(sig)) { seen.add(sig); out.push(it); } }
    return out;
  };
  switch (gameId) {
    case 'balanza': return uniq(8, () => balanza(L));
    case 'tienda': return uniq(6, () => tienda(L));
    case 'fracciones': return uniq(8, () => fracciones(L));
    case 'orto_bv': return uniq(10, () => orto('bv'));
    case 'orto_gj': return uniq(10, () => orto('gj'));
    case 'orto_h': return uniq(10, () => orto('h'));
    case 'tilde': return uniq(8, () => tilde());
    case 'ordena': return uniq(5, () => ordena(L));
    case 'ahorcado': return uniq(3, () => ahorcado());
    case 'memory': return n(2, () => memory(L));
    case 'spelling': return uniq(8, () => spelling(L));
    case 'une': return n(2, () => une());
    case 'teclado': return uniq(4, () => teclado(L));
    case 'robot': return n(4, () => robot(L));
    case 'binario': return uniq(8, () => binario(L));
    case 'seguro': return uniq(8, () => seguro());
    case 'clasifica': return uniq(10, () => clasifica(L));
    case 'capitales': return uniq(8, () => capitales(L));
    case 'monta_pc': return [montaPc(0), ...uniq(7, () => montaPc(1))];
    case 'red_ip': return uniq(8, () => redIp());
    case 'ohm': return uniq(8, () => ohm());
    case 'ofimatica': return uniq(8, () => ofimatica());
    default: return [];
  }
}

/** Parecido entre dos textos (0–1), para Teclado veloz */
export function similarity(a: string, b: string) {
  const s = String(a), t = String(b);
  if (!s.length && !t.length) return 1;
  const d: number[] = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (s[i - 1] === t[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[t.length] / Math.max(s.length, t.length);
}

/** Corrige una respuesta (salvo el ahorcado, que va letra a letra) */
export function gradeItem(item: GameItem, answer: any): { correct: boolean; note?: string } {
  const p = item.pub;
  switch (p.type) {
    case 'choice': return { correct: Number(answer) === item.key };
    case 'typed': {
      const a = p.speak ? normKeep(answer) : norm(answer);
      if (p.numeric) {
        const num = Number(String(answer).trim().replace(/\s/g, '').replace('−', '-').replace(',', '.').replace(/[€a-zωΩ]+$/i, ''));
        return { correct: item.key.some((k: string) => Number(k.replace(',', '.')) === num) && String(answer).trim() !== '' };
      }
      return { correct: item.key.some((k: string) => (p.speak ? normKeep(k) : norm(k)) === a) };
    }
    case 'order': return { correct: Array.isArray(answer) && answer.map(String).join(' ') === item.key.join(' ') };
    case 'match': return { correct: Array.isArray(answer) && answer.length === item.key.length && answer.every((x: any, i: number) => Number(x) === item.key[i]) };
    case 'typing': {
      const sim = similarity(String(answer || '').trim(), item.key);
      return { correct: sim >= 0.9, note: `${Math.round(sim * 100)} % igual` };
    }
    case 'robot': { const r = runRobot(p, answer); return { correct: r.ok, note: r.reason }; }
    default: return { correct: false };
  }
}
