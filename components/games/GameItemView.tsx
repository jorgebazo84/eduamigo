import React, { useEffect, useRef, useState } from 'react';
import type { AnswerResult } from '../../services/gamesService';

interface Props {
  item: any;
  result: AnswerResult | null;
  busy: boolean;
  onAnswer: (answer: any) => void;
  onGuess: (letter: string) => void;
}

const btn = 'rounded-2xl px-4 py-3 font-black text-sm transition-all disabled:opacity-60';

/** Pizza dividida en partes iguales con algunas coloreadas */
const FractionPie: React.FC<{ parts: number; filled: number }> = ({ parts, filled }) => {
  const r = 70, c = 80;
  const slice = (i: number) => {
    const a0 = (2 * Math.PI * i) / parts - Math.PI / 2, a1 = (2 * Math.PI * (i + 1)) / parts - Math.PI / 2;
    const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
    return `M${c},${c} L${x0},${y0} A${r},${r} 0 ${1 / parts > 0.5 ? 1 : 0} 1 ${x1},${y1} Z`;
  };
  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto" role="img" aria-label={`Pizza con ${parts} partes, ${filled} coloreadas`}>
      {Array.from({ length: parts }, (_, i) => <path key={i} d={slice(i)} fill={i < filled ? '#f59e0b' : '#fef3c7'} stroke="#92400e" strokeWidth="2" />)}
    </svg>
  );
};

const Balance: React.FC<{ left: string[]; right: string[] }> = ({ left, right }) => (
  <div className="flex items-end justify-center gap-6 my-2" aria-label="Balanza equilibrada">
    {[left, right].map((side, k) => (
      <div key={k} className="text-center">
        <div className="flex gap-1 justify-center flex-wrap max-w-[10rem]">{side.map((x, i) => <span key={i} className="bg-amber-100 border border-amber-300 rounded-lg px-2 py-1 font-black text-sm">{x}</span>)}</div>
        <div className="h-2 w-36 bg-slate-500 rounded-full mt-1" />
      </div>
    ))}
  </div>
);

const Sheet: React.FC<{ cells: { ref: string; value: number }[] }> = ({ cells }) => (
  <table className="mx-auto my-2 border border-slate-300 text-sm font-mono">
    <tbody>{cells.map((c) => <tr key={c.ref}><td className="border border-slate-300 bg-slate-100 px-3 py-1 font-black">{c.ref}</td><td className="border border-slate-300 px-6 py-1 text-right">{c.value}</td></tr>)}</tbody>
  </table>
);

const speak = (text: string, lang = 'en-GB') => {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.8;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  } catch { /* el navegador no puede leer en voz alta */ }
};

const Visual: React.FC<{ item: any }> = ({ item }) => (
  <>
    {item.visual?.kind === 'fraction' && <FractionPie parts={item.visual.parts} filled={item.visual.filled} />}
    {item.visual?.kind === 'balance' && <Balance left={item.visual.left} right={item.visual.right} />}
    {item.sheet && <Sheet cells={item.sheet.cells} />}
    {item.gap && <p className="text-4xl font-black text-center tracking-wider text-slate-800 my-3">{String(item.gap).replace('_', '·')}</p>}
  </>
);

// ------------------------------------------------------------------------------------------- tipos de ejercicio
const Choice: React.FC<Props> = ({ item, result, busy, onAnswer }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    {item.options.map((o: string, i: number) => (
      <button key={i} data-testid={`opt-${i}`} disabled={!!result || busy} onClick={() => onAnswer(i)}
        className={`${btn} bg-white border-2 border-indigo-100 hover:border-indigo-400 text-slate-800 text-base`}>{o}</button>
    ))}
  </div>
);

const Typed: React.FC<Props> = ({ item, result, busy, onAnswer }) => {
  const [v, setV] = useState('');
  useEffect(() => { setV(''); if (item.speak) speak(item.speak, item.speakLang); }, [item]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onAnswer(v); }} className="flex flex-col sm:flex-row gap-2 items-stretch">
      {item.speak && <button type="button" onClick={() => speak(item.speak, item.speakLang)} className={`${btn} bg-amber-100 text-amber-800`} data-testid="speak">🔊 Escuchar</button>}
      <input data-testid="typed-input" autoFocus value={v} onChange={(e) => setV(e.target.value)} disabled={!!result || busy} maxLength={40}
        inputMode={item.numeric ? 'decimal' : 'text'} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        className={`flex-1 bg-white border-2 border-indigo-100 rounded-2xl px-4 py-3 text-lg font-black ${item.mono ? 'font-mono' : ''}`} placeholder={item.unit ? `Respuesta en ${item.unit}` : 'Tu respuesta'} />
      <button data-testid="typed-submit" disabled={!!result || busy || !v.trim()} className={`${btn} bg-indigo-600 text-white`}>Comprobar</button>
    </form>
  );
};

const Order: React.FC<Props> = ({ item, result, busy, onAnswer }) => {
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => setPicked([]), [item]);
  const done = picked.length === item.tokens.length;
  return (
    <div className="space-y-3">
      <div className="min-h-[3.5rem] bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-2 flex flex-wrap gap-2" data-testid="order-line">
        {picked.map((ti, k) => <button key={k} disabled={!!result} onClick={() => setPicked(picked.filter((_, j) => j !== k))} className="bg-indigo-600 text-white rounded-xl px-3 py-2 font-black">{item.tokens[ti]}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.tokens.map((t: string, i: number) => !picked.includes(i) && (
          <button key={i} data-testid={`tok-${i}`} disabled={!!result} onClick={() => setPicked([...picked, i])} className="bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl px-3 py-2 font-black">{t}</button>
        ))}
      </div>
      <button data-testid="order-submit" disabled={!done || !!result || busy} onClick={() => onAnswer(picked.map((i) => item.tokens[i]))} className={`${btn} bg-indigo-600 text-white w-full`}>Comprobar</button>
    </div>
  );
};

const PAIR_COLORS = ['bg-rose-200', 'bg-amber-200', 'bg-lime-200', 'bg-sky-200', 'bg-violet-200', 'bg-pink-200', 'bg-teal-200', 'bg-orange-200'];
const Match: React.FC<Props> = ({ item, result, busy, onAnswer }) => {
  const [pairs, setPairs] = useState<(number | null)[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { setPairs(item.left.map(() => null)); setSel(null); }, [item]);
  const rightOwner = (ri: number) => pairs.indexOf(ri);
  const pickRight = (ri: number) => {
    if (sel === null || result) return;
    const next = pairs.map((p) => (p === ri ? null : p));
    next[sel] = ri; setPairs(next); setSel(null);
  };
  const all = pairs.length > 0 && pairs.every((p) => p !== null);
  const big = item.style === 'memory';
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-500">Toca uno de la izquierda y luego su pareja de la derecha.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {item.left.map((l: string, i: number) => (
            <button key={i} data-testid={`left-${i}`} disabled={!!result} onClick={() => setSel(i)}
              className={`w-full rounded-2xl px-3 py-3 font-black border-2 ${big ? 'text-3xl' : 'text-sm text-left'} ${sel === i ? 'border-indigo-600' : 'border-transparent'} ${pairs[i] !== null && pairs[i] !== undefined ? PAIR_COLORS[i % PAIR_COLORS.length] : 'bg-white'}`}>{l}</button>
          ))}
        </div>
        <div className="space-y-2">
          {item.right.map((r: string, ri: number) => {
            const owner = rightOwner(ri);
            return <button key={ri} data-testid={`right-${ri}`} disabled={!!result} onClick={() => pickRight(ri)}
              className={`w-full rounded-2xl px-3 py-3 font-black border-2 border-transparent text-sm text-left ${owner >= 0 ? PAIR_COLORS[owner % PAIR_COLORS.length] : 'bg-white'}`}>{r}</button>;
          })}
        </div>
      </div>
      <button data-testid="match-submit" disabled={!all || !!result || busy} onClick={() => onAnswer(pairs)} className={`${btn} bg-indigo-600 text-white w-full`}>Comprobar</button>
    </div>
  );
};

const Typing: React.FC<Props> = ({ item, result, busy, onAnswer }) => {
  const [v, setV] = useState('');
  const t0 = useRef<number | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  useEffect(() => { setV(''); t0.current = null; setWpm(null); }, [item]);
  const submit = () => {
    if (t0.current) { const min = (Date.now() - t0.current) / 60000; setWpm(Math.round(v.trim().split(/\s+/).length / Math.max(min, 1 / 60))); }
    onAnswer(v);
  };
  return (
    <div className="space-y-3">
      <p className="bg-slate-900 text-emerald-300 font-mono rounded-2xl p-4 text-lg select-none" data-testid="typing-text">{item.text}</p>
      <textarea data-testid="typing-input" value={v} disabled={!!result || busy} rows={2} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onPaste={(e) => e.preventDefault()} onChange={(e) => { if (!t0.current) t0.current = Date.now(); setV(e.target.value); }}
        className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-4 py-3 font-mono text-lg" placeholder="Escribe aquí…" />
      <button data-testid="typing-submit" disabled={!v.trim() || !!result || busy} onClick={submit} className={`${btn} bg-indigo-600 text-white w-full`}>Comprobar</button>
      {wpm !== null && result && <p className="text-sm font-bold text-slate-600 text-center">⏱️ {wpm} palabras por minuto</p>}
    </div>
  );
};

const MOVES: Record<string, [number, number, string]> = { U: [0, -1, '⬆️'], D: [0, 1, '⬇️'], L: [-1, 0, '⬅️'], R: [1, 0, '➡️'] };
const Robot: React.FC<Props> = ({ item, result, busy, onAnswer }) => {
  const [prog, setProg] = useState<string[]>([]);
  const [pos, setPos] = useState(item.start);
  useEffect(() => { setProg([]); setPos(item.start); }, [item]);
  // Al recibir la corrección, el robot recorre el programa
  useEffect(() => {
    if (!result) return;
    let { x, y } = item.start; let k = 0;
    const walls = new Set(item.walls.map((w: number[]) => `${w[0]},${w[1]}`));
    const t = setInterval(() => {
      if (k >= prog.length) { clearInterval(t); return; }
      const m = MOVES[prog[k++]]; const nx = x + m[0], ny = y + m[1];
      if (nx < 0 || ny < 0 || nx >= item.size || ny >= item.size || walls.has(`${nx},${ny}`)) { clearInterval(t); return; }
      x = nx; y = ny; setPos({ x, y });
    }, 280);
    return () => clearInterval(t);
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps
  const walls = new Set(item.walls.map((w: number[]) => `${w[0]},${w[1]}`));
  return (
    <div className="space-y-3">
      <div className="grid gap-1 mx-auto w-fit" style={{ gridTemplateColumns: `repeat(${item.size}, 2.6rem)` }} data-testid="robot-grid">
        {Array.from({ length: item.size * item.size }, (_, i) => {
          const x = i % item.size, y = Math.floor(i / item.size);
          const isR = pos.x === x && pos.y === y, isG = item.goal.x === x && item.goal.y === y, isW = walls.has(`${x},${y}`);
          return <div key={i} className={`h-10 rounded-lg flex items-center justify-center text-xl ${isW ? 'bg-slate-700' : 'bg-emerald-50 border border-emerald-100'}`}>{isR ? '🤖' : isG ? '🏁' : isW ? '🧱' : ''}</div>;
        })}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-2 min-h-[2.75rem] flex flex-wrap gap-1" data-testid="robot-program">
        {prog.length ? prog.map((c, i) => <span key={i} className="text-xl">{MOVES[c][2]}</span>) : <span className="text-sm text-slate-400 p-1">Tu programa aparecerá aquí</span>}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {(['U', 'D', 'L', 'R'] as const).map((c) => <button key={c} data-testid={`cmd-${c}`} disabled={!!result || prog.length >= item.maxSteps} onClick={() => setProg([...prog, c])} className={`${btn} bg-indigo-50 text-2xl`}>{MOVES[c][2]}</button>)}
        <button disabled={!!result || !prog.length} onClick={() => setProg(prog.slice(0, -1))} className={`${btn} bg-slate-100 text-slate-700`}>↩️ Borrar</button>
      </div>
      <button data-testid="robot-run" disabled={!prog.length || !!result || busy} onClick={() => onAnswer(prog)} className={`${btn} bg-indigo-600 text-white w-full`}>▶️ Ejecutar</button>
    </div>
  );
};

const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const Hangman: React.FC<Props> = ({ item, busy, onGuess }) => (
  <div className="space-y-4 text-center">
    <p className="text-sm font-black text-rose-600" data-testid="hang-errors">Fallos: {item.errors} de {item.maxErrors} {'❤️'.repeat(Math.max(0, item.maxErrors - item.errors))}</p>
    <div className="flex flex-wrap justify-center gap-2" data-testid="hang-word">
      {item.revealed.map((c: string | null, i: number) => <span key={i} className="w-9 h-11 border-b-4 border-indigo-400 text-2xl font-black flex items-end justify-center">{c || ''}</span>)}
    </div>
    <div className="flex flex-wrap justify-center gap-1.5">
      {LETTERS.map((l) => <button key={l} data-testid={`letter-${l}`} disabled={busy || item.guessed.includes(l) || item.done} onClick={() => onGuess(l)} className="w-9 h-10 rounded-lg bg-white border border-indigo-200 font-black disabled:opacity-30">{l}</button>)}
    </div>
  </div>
);

const GameItemView: React.FC<Props> = (props) => {
  const { item } = props;
  return (
    <div className="space-y-4">
      <p className="text-lg font-black text-slate-800" data-testid="item-prompt">{item.prompt}</p>
      <Visual item={item} />
      {item.type === 'choice' && <Choice {...props} />}
      {item.type === 'typed' && <Typed {...props} />}
      {item.type === 'order' && <Order {...props} />}
      {item.type === 'match' && <Match {...props} />}
      {item.type === 'typing' && <Typing {...props} />}
      {item.type === 'robot' && <Robot {...props} />}
      {item.type === 'hangman' && <Hangman {...props} />}
    </div>
  );
};

export default GameItemView;
