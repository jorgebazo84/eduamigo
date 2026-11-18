import React, { useEffect, useRef, useState } from 'react';
import { Child, Region } from '../types';
import { tutorService, TutorMessage, TutorMode, speak } from '../services/tutorService';
import { compressPhoto, fileToDataUrl } from '../services/imageUtils';

interface TutorChatProps {
  child: Child;
  region: Region;
  isDemo: boolean;
  /** Conversación a abrir (p. ej. al pulsar una del historial lateral) */
  openConversationId?: string | null;
  /** Avisa al padre de la app de que hay conversaciones nuevas (para refrescar el historial) */
  onConversationsChanged?: () => void;
  /** Para sumar puntos por estudiar con el tutor */
  onActivity?: () => void;
  /** Foto de un ejercicio con la que empezar ("No sé hacer este ejercicio") */
  initialImage?: string | null;
  /** Se llama cuando la foto inicial ya se ha usado */
  onInitialImageUsed?: () => void;
}

const SUBJECTS = ['Matemáticas', 'Lengua', 'Inglés', 'Ciencias', 'Sociales', 'Otra'];

// Muestra **negritas** y saltos de línea sin interpretar HTML (seguro).
const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('\n').map((line, i) => (
      <p key={i} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : <React.Fragment key={j}>{part}</React.Fragment>
        )}
      </p>
    ))}
  </>
);

const TutorChat: React.FC<TutorChatProps> = ({ child, region, isDemo, openConversationId, onConversationsChanged, onActivity, initialImage, onInitialImageUsed }) => {
  const [subject, setSubject] = useState('Matemáticas');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: 'info' | 'error' } | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  // Foto preparada para enviar con una pregunta nueva
  const [photo, setPhoto] = useState<{ image: string; thumb: string; preview: string } | null>(null);

  const preparePhoto = async (dataUrl: string) => {
    try {
      const { image, thumb } = await compressPhoto(dataUrl);
      setPhoto({ image, thumb, preview: thumb });
      setConversationId(null);
      setMessages([]);
      setNotice(null);
    } catch {
      setNotice({ text: 'No se ha podido abrir la foto. Prueba con otra.', kind: 'error' });
    }
  };

  useEffect(() => {
    if (!initialImage) return;
    preparePhoto(initialImage);
    onInitialImageUsed?.();
  }, [initialImage]);

  const limitReached = !!usage && usage.used >= usage.limit;

  useEffect(() => {
    if (isDemo) return;
    tutorService.usage(child.id).then(setUsage);
  }, [child.id, isDemo]);

  // Abrir una conversación del historial
  useEffect(() => {
    if (!openConversationId || isDemo) return;
    tutorService.conversation(child.id, openConversationId).then((c) => {
      if (!c) return;
      setConversationId(c.id);
      setMessages(c.messages);
      if (c.subject) setSubject(c.subject);
      setNotice(null);
    });
  }, [openConversationId, child.id, isDemo]);

  // Al cambiar de niño, se empieza de cero
  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    setNotice(null);
  }, [child.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (mode: TutorMode, text?: string) => {
    if (loading || limitReached) return;
    const message = (text ?? input).trim();
    const withPhoto = mode === 'guided' && !conversationId && photo;
    if (mode === 'guided' && !message && !withPhoto) return;
    setLoading(true);
    setNotice(null);

    if (isDemo) {
      setPhoto(null);
      const userText = mode === 'guided' ? (message || 'No sé hacer este ejercicio. ¿Me ayudas?') : mode === 'explain' ? 'No lo entiendo. ¿Me lo explicas entero?' : '¿Me lo explicas de otra forma?';
      setMessages((m) => [...m,
        { id: crypto.randomUUID(), role: 'user', content: userText },
        { id: crypto.randomUUID(), role: 'assistant', content: 'En el modo demostración el tutor no está conectado. Con una cuenta, aquí te guiaría paso a paso con preguntas y pistas, sin hacerte los deberes. 😊' },
      ]);
      setInput('');
      setLoading(false);
      return;
    }

    const wasNew = !conversationId;
    const res = await tutorService.ask({
      childId: child.id,
      conversationId: mode === 'guided' && !conversationId ? null : conversationId,
      message: mode === 'guided' ? (message || (withPhoto ? 'No sé hacer este ejercicio. ¿Me ayudas?' : '')) : undefined,
      ...(withPhoto ? { image: photo!.image, thumb: photo!.thumb } : {}),
      mode,
      subject: subject === 'Otra' ? '' : subject,
      region,
    });
    setLoading(false);

    if (!res.ok) {
      if (res.code === 'DAILY_LIMIT' && res.limit) setUsage({ used: res.used ?? res.limit, limit: res.limit });
      setNotice({ text: res.error || 'Algo ha fallado. Inténtalo de nuevo.', kind: res.code === 'DAILY_LIMIT' ? 'info' : 'error' });
      return;
    }
    if (withPhoto) setPhoto(null);
    setConversationId(res.conversationId || null);
    setMessages((m) => [...m, res.userMessage!, res.reply!]);
    if (res.used !== undefined && res.limit !== undefined) setUsage({ used: res.used, limit: res.limit });
    if (mode === 'guided') setInput('');
    onConversationsChanged?.();
    // Puntos solo por empezar una pregunta nueva (no por cada mensaje, para no premiar preguntar por preguntar)
    if (wasNew && mode === 'guided') onActivity?.();
  };

  const newQuestion = () => {
    setPhoto(null);
    setConversationId(null);
    setMessages([]);
    setInput('');
    setNotice(null);
  };

  const report = async (id: string) => {
    if (reported[id]) return;
    const ok = isDemo ? true : await tutorService.report(child.id, id);
    if (ok) setReported((r) => ({ ...r, [id]: true }));
  };

  const last = messages[messages.length - 1];
  const canFollowUp = !!conversationId && last?.role === 'assistant' && !last.safety && !loading && !limitReached;
  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border-2 border-blue-100 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl shrink-0" aria-hidden="true">💬</div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-blue-900">Pregúntame, {child.name}</h2>
            <p className="text-blue-500 font-bold text-sm">Te ayudo a pensar paso a paso. No te hago los deberes: ¡los haces tú!</p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg">
            🤖 Hablas con una inteligencia artificial
          </span>
          <span className="text-[10px] font-bold text-blue-300">Tus padres pueden ver estas conversaciones.</span>
          {remaining !== null && (
            <span className="text-[11px] font-bold text-blue-400" aria-live="polite">
              {remaining === 0 ? 'Hoy ya no te quedan preguntas' : `Te quedan ${remaining} preguntas hoy`}
            </span>
          )}
        </div>
      </div>

      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs font-black text-blue-800 uppercase tracking-wider">¿De qué asignatura es tu duda?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Asignatura">
            {SUBJECTS.map((s) => (
              <button key={s} role="radio" aria-checked={subject === s} onClick={() => setSubject(s)}
                className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all ${subject === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100 hover:border-blue-300'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm ${m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : m.safety ? 'bg-rose-50 text-rose-900 border-2 border-rose-100 rounded-bl-md' : 'bg-blue-50 text-blue-900 rounded-bl-md'}`}>
                {m.photoUrl && (
                  <img src={m.photoUrl + '&thumb=1'} alt="Foto del ejercicio" className="mb-2 rounded-2xl max-h-48 border-2 border-white/40" />
                )}
                <RichText text={m.content} />
                {m.role === 'assistant' && (
                  <div className="flex gap-3 mt-3 text-[11px] font-black">
                    <button onClick={() => speak(m.content)} className="text-blue-500 hover:text-blue-700">🔊 Escuchar</button>
                    {!m.safety && (
                      <button onClick={() => report(m.id)} disabled={!!reported[m.id]} className="text-slate-400 hover:text-rose-500 disabled:text-emerald-600">
                        {reported[m.id] ? '✓ Gracias, lo revisaremos' : '🚩 Esto está mal'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-blue-50 text-blue-400 rounded-3xl rounded-bl-md px-5 py-4 text-sm font-bold animate-pulse">Pensando…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {canFollowUp && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => send('guided', 'Dame otra pista, por favor.')} className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:border-emerald-300">💡 Dame otra pista</button>
          <button onClick={() => send('explain')} className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700 border-2 border-indigo-100 hover:border-indigo-300">🤔 No lo entiendo: explícamelo</button>
          <button onClick={() => send('other_way')} className="px-4 py-2 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border-2 border-amber-100 hover:border-amber-300">🔄 Explícamelo de otra forma</button>
        </div>
      )}

      {notice && (
        <p role="alert" className={`text-sm font-bold rounded-2xl px-4 py-3 ${notice.kind === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{notice.text}</p>
      )}

      {photo && (
        <div className="flex items-center gap-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-3" data-testid="tutor-photo">
          <img src={photo.preview} alt="Foto del ejercicio que vas a enviar" className="w-20 h-20 object-cover rounded-xl" />
          <div className="flex-1 text-sm">
            <p className="font-black text-indigo-900">📷 Foto del ejercicio lista</p>
            <p className="text-indigo-600 text-xs">Escribe qué no entiendes (o pulsa Preguntar directamente).</p>
          </div>
          <button type="button" onClick={() => setPhoto(null)} className="text-indigo-400 font-black text-xs">Quitar</button>
        </div>
      )}

      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" data-testid="tutor-photo-input"
        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) preparePhoto(await fileToDataUrl(f)); }} />

      <form onSubmit={(e) => { e.preventDefault(); send('guided'); }} className="space-y-3">
        <label htmlFor="tutor-input" className="sr-only">Escribe tu pregunta o tu respuesta</label>
        <textarea
          id="tutor-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send('guided'); } }}
          placeholder={messages.length ? 'Escribe tu respuesta o tu siguiente duda…' : 'Escribe aquí tu duda. Por ejemplo: ¿cómo se suman fracciones?'}
          rows={3}
          maxLength={1500}
          disabled={limitReached}
          className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-2xl px-5 py-4 focus:border-blue-400 outline-none text-blue-900 text-sm resize-none disabled:opacity-50"
        />
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex flex-wrap items-center gap-3">
            {messages.length > 0
              ? <button type="button" onClick={newQuestion} className="text-sm font-black text-blue-500 hover:text-blue-700">✨ Nueva pregunta</button>
              : <span className="text-[11px] font-bold text-blue-300">No escribas datos personales (dirección, teléfono…).</span>}
            {!limitReached && (
              <button type="button" onClick={() => photoRef.current?.click()} className="text-sm font-black text-indigo-500 hover:text-indigo-700">📷 Foto de un ejercicio</button>
            )}
          </div>
          <button type="submit" disabled={loading || (!input.trim() && !(photo && !conversationId)) || limitReached}
            className="bg-blue-600 text-white font-black px-8 py-3 rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-40 transition-all">
            {loading ? 'Pensando…' : messages.length ? 'Enviar' : 'Preguntar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TutorChat;
