
import React, { useState } from 'react';

interface ParentAuthModalProps {
  correctPin: string;
  onResult: (success: boolean) => void;
  onCancel: () => void;
}

const ParentAuthModal: React.FC<ParentAuthModalProps> = ({ correctPin, onResult, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyClick = (key: string) => {
    if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onResult(true);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-blue-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl border border-blue-50 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-blue-900">Control Parental</h2>
          <p className="text-blue-500 text-sm mt-1">Introduce tu PIN de tutor</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                error ? 'bg-red-500 border-red-500 animate-bounce' : 
                pin.length > i ? 'bg-blue-600 border-blue-600 scale-110' : 'border-blue-200'
              }`}
            ></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyClick(key)}
              className="h-14 bg-gray-50 hover:bg-blue-50 text-blue-900 font-bold text-xl rounded-2xl transition-all active:scale-90"
            >
              {key}
            </button>
          ))}
          <button onClick={onCancel} className="h-14 text-red-500 font-bold text-sm">Cancelar</button>
          <button onClick={() => handleKeyClick('0')} className="h-14 bg-gray-50 text-blue-900 font-bold text-xl rounded-2xl">0</button>
          <button onClick={handleBackspace} className="h-14 flex items-center justify-center text-gray-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19h6.344a2 2 0 002-2V7a2 2 0 00-2-2h-6.344a2 2 0 00-1.414.586L3 12z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentAuthModal;
