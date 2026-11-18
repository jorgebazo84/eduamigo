// =============================================================================
// Llamadas a la IA (Claude, Anthropic) — solo en el servidor
// - TUTOR_MODEL: tutor Pregúntame (por defecto claude-haiku-5-5)
// - VISION_MODEL: corrección de fotos de fichas y deberes (por defecto claude-haiku-5-5;
//   se puede cambiar a claude-sonnet-5-5 si Haiku lee mal la letra de los niños)
// - TUTOR_PROVIDER=mock: respuestas simuladas para pruebas (no gasta saldo ni sale a internet)
// =============================================================================

export type AiImage = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };
export type AiContent = string | ({ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } })[];
export type AiMessage = { role: 'user' | 'assistant'; content: AiContent };
export type AiResult = { text: string; inputTokens: number; outputTokens: number; cacheReadTokens: number };

export class AiUnavailable extends Error {}

export const TUTOR_MODEL = () => process.env.TUTOR_MODEL || 'claude-haiku-5-5';
export const VISION_MODEL = () => process.env.VISION_MODEL || 'claude-haiku-5-5';
/** Modelo para buscar en internet (índices de libros). Debe admitir la búsqueda web. */
export const SEARCH_MODEL = () => process.env.SEARCH_MODEL || process.env.TUTOR_MODEL || 'claude-haiku-5-5';
export const webSearchTool = (maxUses = 4) => ({ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses, user_location: { type: 'approximate', country: 'ES', timezone: 'Europe/Madrid' } });
export const isMock = () => process.env.TUTOR_PROVIDER === 'mock';

/** Construye el contenido de un mensaje con imagen(es) + texto. */
export const withImages = (text: string, images: AiImage[] = []): AiContent =>
  images.length
    ? [
        ...images.map(img => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 } })),
        { type: 'text' as const, text },
      ]
    : text;

type MockHandler = (system: string, messages: AiMessage[]) => string;
const mockHandlers: Record<string, MockHandler> = {};
/** Cada módulo registra cómo responde el modo simulado para su tarea (solo pruebas). */
export const setMockHandler = (task: string, h: MockHandler) => { mockHandlers[task] = h; };

export async function callClaude(opts: {
  system: string;
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  cacheSystem?: boolean;
  /** Nombre de la tarea: solo sirve para el modo simulado */
  task?: string;
  /** Herramientas del servidor de Anthropic (p. ej. búsqueda web) */
  tools?: any[];
}): Promise<AiResult> {
  if (isMock()) {
    const h = opts.task ? mockHandlers[opts.task] : undefined;
    const text = h ? h(opts.system, opts.messages) : 'respuesta simulada';
    return { text, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiUnavailable('Falta ANTHROPIC_API_KEY');
  const model = opts.model || TUTOR_MODEL();
  const system = opts.cacheSystem === false
    ? opts.system
    : [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }];
  let messages: any[] = opts.messages;
  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  let blocks: any[] = [];
  // Con herramientas del servidor (búsqueda web) la API puede pausar el turno: se continúa hasta 3 veces
  for (let round = 0; round < 4; round++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: opts.maxTokens || 700, system, messages, ...(opts.tools ? { tools: opts.tools } : {}) }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[AI] Claude error', res.status, data?.error?.message);
      throw new AiUnavailable(data?.error?.message || `HTTP ${res.status}`);
    }
    usage.inputTokens += data.usage?.input_tokens || 0;
    usage.outputTokens += data.usage?.output_tokens || 0;
    usage.cacheReadTokens += data.usage?.cache_read_input_tokens || 0;
    blocks = data.content || [];
    if (data.stop_reason !== 'pause_turn') break;
    messages = [...messages, { role: 'assistant', content: blocks }];
  }
  // El texto final es el que va después de la última búsqueda
  let lastTool = -1;
  blocks.forEach((b: any, i: number) => { if (b.type !== 'text') lastTool = i; });
  const text = blocks.slice(lastTool + 1).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim()
    || blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
  console.log(`[AI] model=${model} in=${usage.inputTokens} cache=${usage.cacheReadTokens} out=${usage.outputTokens}${opts.tools ? ' (con herramientas)' : ''}`);
  return { text, ...usage };
}

/** Extrae el primer objeto JSON de una respuesta (tolera ```json ... ``` y texto alrededor). */
export function parseJsonObject<T = any>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La IA no devolvió JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

/** Pide a Claude una respuesta en JSON y la valida. Lanza error si no es válida: nunca se inventa nada. */
export async function callClaudeJson<T = any>(opts: {
  system: string;
  prompt: string;
  images?: AiImage[];
  model?: string;
  maxTokens?: number;
  task?: string;
  tools?: any[];
}): Promise<{ data: T; usage: AiResult }> {
  const system = `${opts.system}\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin comentarios.`;
  const result = await callClaude({
    system,
    messages: [{ role: 'user', content: withImages(opts.prompt, opts.images) }],
    model: opts.model,
    maxTokens: opts.maxTokens || 3000,
    cacheSystem: false,
    task: opts.task,
    tools: opts.tools,
  });
  return { data: parseJsonObject<T>(result.text), usage: result };
}
