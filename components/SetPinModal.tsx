import React, { useState } from 'react';
import { authService } from '../services/authService';

interface SetPinModalProps {
  /** true = el adulto no puede cerrarla sin elegir PIN (cuentas antiguas con 1234) */
  mandatory?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}

// Elegir o cambiar el PIN parental. El servidor solo lo acepta con el panel de padres
// desbloqueado (justo tras entrar con contraseña o tras meter el PIN actual).
const SetPinModal: React.FC<SetPinModalProps> = ({ mandatory, onDone, onCancel }) => {
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) return setError('El PIN debe tener 4 cifras.');
    if (pin !== repeat) return setError('Los dos PIN no coinciden.');
    setSaving(true);
    const res = await authService.updatePin(pin);
    setSaving(false);
    if (res.success) onDone();
    else setError(res.code === 'PIN_REQUIRED'
      ? 'Por seguridad, vuelve a entrar en la zona de padres y prueba otra vez.'
      : (res.error || 'No se ha podido guardar el PIN.'));
  };

  const inputClass = 'w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl px-5 py-3.5 focus:border-[#00B4D8] outline-none text-indigo-900 text-lg text-center font-black tracking-[0.5em]';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-blue-900/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="setpin-title">
      <form onSubmit={handleSubmit} className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl border border-blue-50 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 id="setpin-title" className="text-2xl font-bold text-blue-900">
            {mandatory ? 'Elige tu PIN de padres' : 'Cambiar PIN de padres'}
          </h2>
          <p className="text-blue-500 text-sm mt-1">
            {mandatory
              ? 'Tu cuenta tenía un PIN demasiado fácil (como 1234). Elige uno nuevo de 4 cifras para proteger la zona de padres.'
              : 'Elige un PIN nuevo de 4 cifras.'}
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-[10px] font-black text-indigo-800 uppercase ml-1">PIN nuevo</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} autoFocus
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-black text-indigo-800 uppercase ml-1">Repite el PIN</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4}
            value={repeat} onChange={(e) => setRepeat(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </label>
        <p className="text-[10px] text-indigo-400 font-bold ml-1">No uses 1234 ni cifras repetidas, y no se lo digas a tus hijos.</p>
        {error && <p className="text-xs font-bold text-red-500" role="alert">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full bg-[#001220] text-white font-black py-4 rounded-2xl hover:bg-blue-900 transition-all disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar PIN'}
        </button>
        {!mandatory && onCancel && (
          <button type="button" onClick={onCancel} className="w-full text-blue-400 font-bold text-sm">Cancelar</button>
        )}
      </form>
    </div>
  );
};

export default SetPinModal;
