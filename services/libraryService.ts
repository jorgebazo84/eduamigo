// Cliente de la Biblioteca (opción 9): temas con su esquema y libros del cole. Todo en el servidor.

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_library.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; e.data = data; throw e; }
  return data;
};

export interface Scheme { central: string; branches: { title: string; points: string[] }[] }
export interface LibraryTopic {
  title: string; intro: string; sections: { heading: string; text: string }[]; keyIdeas: string[];
  example: string; glossary: { term: string; definition: string }[]; scheme: Scheme;
}
export interface IsbnResult {
  found: boolean; isbn: string; title?: string; publisher?: string; topics?: string[]; sourceUrl?: string; reason?: string;
  meta?: { title: string; publisher: string; year: string } | null; cached?: boolean;
}

export const libraryService = {
  topic: (childId: string, subject: string, topic: string, grade?: string): Promise<{ topic: LibraryTopic; cached: boolean }> => call('topic', { childId, subject, topic, grade }),
  lookupIsbn: (childId: string, isbn: string, subject: string, grade: string): Promise<IsbnResult> => call('lookup_isbn', { childId, isbn, subject, grade }),
  scanIndex: (childId: string, images: string[]): Promise<{ title: string; topics: string[]; pages: number }> => call('scan_index', { childId, images }),
};

/** Lee un texto en voz alta con la voz del dispositivo (no se envía a ningún sitio) */
export function speakSpanish(text: string) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES'; u.rate = 0.95;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith('es-ES')) || window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith('es'));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
  return true;
}
