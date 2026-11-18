import { worksheetService } from '../services/worksheetService';
import React, { useEffect, useState } from 'react';
import { Child, Country } from '../types';
import { tutorService, ParentTutorOverview, TutorMessage } from '../services/tutorService';

interface ParentTutorPanelProps {
  children: Child[];
  isDemo: boolean;
  onAlertsSeen?: () => void;
}

const COUNTRIES: Country[] = ['España', 'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador',
  'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela'];

const ALERT_TEXT: Record<string, { title: string; help: string }> = {
  autolesion: {
    title: 'Ha escrito algo sobre hacerse daño o no querer vivir',
    help: 'Habla con calma con tu hijo hoy mismo. Si crees que hay riesgo, llama al 024 (línea de atención a la conducta suicida) o al 112. La Fundación ANAR (900 20 20 10) también orienta a familias.',
  },
  acoso: {
    title: 'Ha contado que se ríen de él/ella, le insultan o le pegan',
    help: 'Pregúntale con tranquilidad qué está pasando y habla con su tutor del colegio. La Fundación ANAR (900 20 20 10) orienta a familias sobre acoso escolar.',
  },
};

const fmt = (ms: number) => new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Pestaña "Tutor" del panel de padres: avisos, conversaciones, señales y ajustes.
const ParentTutorPanel: React.FC<ParentTutorPanelProps> = ({ children, isDemo, onAlertsSeen }) => {
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [data, setData] = useState<ParentTutorOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<{ id: string; title: string; messages: TutorMessage[] } | null>(null);
  const [limit, setLimit] = useState(30);
  const [country, setCountry] = useState('España');
  const [saveMsg, setSaveMsg] = useState('');
  const [photoLimit, setPhotoLimit] = useState(10);
  const [photoUsed, setPhotoUsed] = useState<number | null>(null);

  const load = async (id: string) => {
    if (!id || isDemo) return;
    setLoading(true);
    const d = await tutorService.parentOverview(id);
    setLoading(false);
    setData(d);
    if (d) { setLimit(d.settings.dailyLimit); setCountry(d.settings.country || 'España'); }
    const u = await worksheetService.usage(id);
    if (u) { setPhotoLimit(u.limit); setPhotoUsed(u.used); }
  };

  useEffect(() => { setOpen(null); setSaveMsg(''); load(childId); }, [childId]);

  if (isDemo) {
    return <div className="bg-white rounded-[2rem] p-8 border border-blue-50 text-blue-500 font-bold">En el modo demostración el tutor no guarda conversaciones. Con una cuenta, aquí verás lo que pregunta cada hijo, dónde se atasca y los avisos importantes.</div>;
  }
  if (!children.length) {
    return <div className="bg-white rounded-[2rem] p-8 border border-blue-50 text-blue-500 font-bold">Añade un hijo en la pestaña Hijos para ver su actividad con el tutor.</div>;
  }

  const child = children.find(c => c.id === childId);
  const unseen = data?.alerts.filter(a => !a.seen) || [];

  const openConversation = async (id: string) => {
    const c = await tutorService.parentConversation(childId, id);
    if (c) setOpen({ id, title: c.title, messages: c.messages });
  };

  const save = async () => {
    setSaveMsg('');
    const r = await tutorService.setSettings(childId, limit, country);
    if (!r.ok) { setSaveMsg(r.error || 'No se ha podido guardar'); return; }
    try {
      await worksheetService.setCorrectionLimit(childId, photoLimit);
      setSaveMsg('Guardado');
    } catch (e: any) {
      setSaveMsg(e?.message || 'No se ha podido guardar el límite de fotos');
    }
    if (r.ok) load(childId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Hijo">
        {children.map(c => (
          <button key={c.id} role="tab" aria-selected={c.id === childId} onClick={() => setChildId(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${c.id === childId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100'}`}>
            {c.avatar} {c.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-blue-400 font-bold animate-pulse">Cargando…</p>}

      {data && (
        <>
          {/* Avisos importantes */}
          {data.alerts.length > 0 && (
            <section className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-6 space-y-4" aria-labelledby="tutor-alerts">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="tutor-alerts" className="text-lg font-black text-rose-800">⚠️ Avisos {unseen.length > 0 && <span className="text-sm">({unseen.length} sin ver)</span>}</h3>
                {unseen.length > 0 && (
                  <button onClick={async () => { await tutorService.markAlertsSeen(childId); onAlertsSeen?.(); load(childId); }}
                    className="text-xs font-black bg-white text-rose-600 border-2 border-rose-100 px-3 py-2 rounded-xl">Marcar como vistos</button>
                )}
              </div>
              {data.alerts.map(a => (
                <div key={a.id} className={`bg-white rounded-2xl p-4 ${a.seen ? 'opacity-60' : ''}`}>
                  <p className="text-sm font-black text-rose-900">{ALERT_TEXT[a.kind]?.title || 'Aviso'}</p>
                  <p className="text-xs text-rose-700 mt-1">{ALERT_TEXT[a.kind]?.help}</p>
                  <div className="flex gap-3 mt-2 text-[11px] font-bold text-rose-400">
                    <span>{fmt(a.createdAt)}</span>
                    <button onClick={() => openConversation(a.conversationId)} className="underline text-rose-600">Ver la conversación</button>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-rose-500">El tutor no da consejos en estos casos: responde con un mensaje fijo, anima a hablar con un adulto de confianza y muestra el teléfono de la Fundación ANAR.</p>
            </section>
          )}

          {/* Uso y ajustes */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] p-6 border border-blue-50">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-3">Uso</h3>
              <p className="text-3xl font-black text-blue-600">{data.usage.today}<span className="text-base text-blue-300"> / {data.settings.dailyLimit} hoy</span></p>
              <p className="text-sm font-bold text-blue-400 mt-1">{data.usage.week} preguntas en los últimos 7 días</p>
              {photoUsed !== null && (
                <p className="text-sm font-bold text-emerald-500 mt-3">📸 {photoUsed} / {photoLimit} fotos corregidas hoy</p>
              )}
            </div>
            <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">Ajustes del tutor y de las fotos</h3>
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-blue-800">
                Preguntas al día
                <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-20 bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-1.5 text-center" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-blue-800">
                Fotos corregidas al día
                <input type="number" min={1} max={50} value={photoLimit} onChange={(e) => setPhotoLimit(Number(e.target.value))}
                  aria-label="Fotos corregidas al día"
                  className="w-20 bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-1.5 text-center" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-blue-800">
                Ejemplos de su país
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-1.5">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c === 'España' ? 'España (por defecto)' : c}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={save} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl">Guardar</button>
                {saveMsg && <span className="text-xs font-bold text-blue-500" role="status">{saveMsg}</span>}
              </div>
            </div>
          </section>

          {/* Conversaciones */}
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">Conversaciones de {child?.name}</h3>
            {data.conversations.length === 0 && <p className="text-sm text-blue-400 italic">Todavía no ha preguntado nada al tutor.</p>}
            {data.conversations.map(c => (
              <button key={c.id} onClick={() => openConversation(c.id)}
                className="w-full text-left p-4 rounded-2xl border border-blue-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase text-blue-400">{c.subject || 'Duda'}</span>
                  <span className="text-[10px] text-gray-400">{fmt(c.updatedAt)}</span>
                  {c.stuck && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Se atascó</span>}
                  {c.solvedWithHints && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">Avanzó con pistas</span>}
                </div>
                <p className="text-sm font-bold text-blue-900">{c.title}</p>
                <p className="text-[11px] text-blue-400 mt-1">{c.turns} {c.turns === 1 ? 'mensaje' : 'mensajes'} de {child?.name} · pidió la explicación completa {c.explainRequests} {c.explainRequests === 1 ? 'vez' : 'veces'} · otra explicación {c.otherWayRequests} {c.otherWayRequests === 1 ? 'vez' : 'veces'}</p>
              </button>
            ))}
          </section>

          {data.reports.length > 0 && (
            <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">Respuestas marcadas como incorrectas</h3>
              {data.reports.map(r => (
                <div key={r.id} className="text-sm bg-slate-50 rounded-2xl p-4">
                  <p className="text-slate-700 line-clamp-3">{r.content}</p>
                  {r.reason && <p className="text-xs font-bold text-rose-500 mt-1">Motivo: {r.reason}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{fmt(r.createdAt)}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="conv-title">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-blue-50">
              <h3 id="conv-title" className="font-black text-blue-900 line-clamp-1">{open.title}</h3>
              <button onClick={() => setOpen(null)} className="text-blue-400 font-black text-sm">Cerrar</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {open.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : m.safety ? 'bg-rose-50 text-rose-900' : 'bg-blue-50 text-blue-900'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentTutorPanel;
