import React from 'react';
import { SUBSCRIPTION_PRICE } from '../constants';

interface SubscriptionModalProps {
  isOpen: boolean;
  onSubscribe: () => void;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onSubscribe, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Desbloquea InmoInvest Pro</h2>
          <p className="text-blue-100">Accede a proyecciones de IA y análisis detallados.</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <span className="ml-3 text-slate-700">Proyección de valorización a 2 años</span>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <span className="ml-3 text-slate-700">Análisis de riesgo por IA</span>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <span className="ml-3 text-slate-700">Acceso ilimitado al mapa interactivo</span>
            </div>
          </div>

          <div className="flex flex-col items-center border-t border-slate-100 pt-6">
            <span className="text-3xl font-bold text-slate-900">${SUBSCRIPTION_PRICE}<span className="text-sm font-normal text-slate-500">/mes</span></span>
            <p className="text-sm text-slate-500 mb-6">Cancela cuando quieras.</p>
            
            <button 
              onClick={onSubscribe}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Suscribirse Ahora
            </button>
            <button 
              onClick={onClose}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600"
            >
              Quizás más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;