import React from 'react';
import { Station, FuelType, Brand } from '../types';
import { Navigation, Heart, AlertTriangle, Clock, Check, X, Share2, MapPin } from 'lucide-react';
import Button from './Button';
import { BRAND_COLORS } from '../constants';

interface StationDetailProps {
  station: Station;
  onClose: () => void;
  onUpdatePrice: () => void;
  isLoggedIn: boolean;
  userLocation: { lat: number, lng: number };
  onToggleFavorite: () => void;
  onReport: (reason: string) => void;
}

const StationDetail: React.FC<StationDetailProps> = ({ 
  station, onClose, onUpdatePrice, isLoggedIn, userLocation, onToggleFavorite, onReport
}) => {
  
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Sem info';
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return '1d+';
  };

  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.coordinates.lat},${station.coordinates.lng}`, '_blank');
  };

  return (
    <div 
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 h-[80%] flex flex-col animate-in slide-in-from-bottom duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
    >
      {/* Handle */}
      <div className="w-full flex justify-center pt-3 pb-1" onTouchEnd={onClose}>
        <div className="w-14 h-1.5 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between">
         <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{station.name}</h2>
            <div className="flex items-center text-slate-500 text-sm font-medium">
               <span className={`mr-2 px-2 py-0.5 rounded-md bg-slate-100 text-xs uppercase tracking-wide font-bold ${BRAND_COLORS[station.brand]}`}>
                 {station.brand}
               </span>
               <MapPin size={14} className="mr-1 inline" /> {station.distance ? station.distance.toFixed(1) + 'km' : ''}
            </div>
         </div>
         <div className="flex gap-2">
            {isLoggedIn && (
                <button onClick={onToggleFavorite} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${station.isFavorite ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                    <Heart size={20} fill={station.isFavorite ? "currentColor" : "none"} />
                </button>
            )}
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100">
                <X size={20} />
            </button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 hide-scrollbar">
         
         <div className="grid grid-cols-2 gap-3 mb-6">
            <Button variant="primary" className="h-14 rounded-2xl shadow-lg shadow-blue-500/20 text-base font-bold" onClick={openNavigation}>
                <Navigation size={20} className="mr-2" /> Ir agora
            </Button>
            <Button variant="secondary" className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50" onClick={onUpdatePrice} disabled={!isLoggedIn}>
                Atualizar
            </Button>
         </div>

         <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preços Recentes</h3>
            {Object.values(FuelType).map((fuel) => {
                const priceInfo = station.prices[fuel];
                if (!priceInfo) return null;
                const isFresh = (new Date().getTime() - new Date(priceInfo.updatedAt).getTime()) < 3600000; // 1 hour

                return (
                    <div key={fuel} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{fuel}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${isFresh ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                    <Clock size={10} className="mr-1" /> {getRelativeTime(priceInfo.updatedAt)}
                                </span>
                                {priceInfo.confirmations > 0 && <span className="text-[10px] text-green-600 font-bold flex items-center"><Check size={10} className="mr-0.5"/> {priceInfo.confirmations}</span>}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                <span className="text-sm text-slate-400 mr-0.5 font-medium">R$</span>{priceInfo.value.toFixed(2)}
                             </div>
                        </div>
                    </div>
                );
            })}
         </div>

         <button onClick={() => onReport("Dados incorretos")} className="w-full mt-8 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wide flex items-center justify-center hover:text-slate-600 transition-colors">
            <AlertTriangle size={14} className="mr-2" /> Reportar Problema
         </button>
      </div>
    </div>
  );
};

export default StationDetail;