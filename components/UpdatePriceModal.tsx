import React, { useState } from 'react';
import { FuelType, Station } from '../types';
import { X, ChevronLeft, Check } from 'lucide-react';
import Button from './Button';

interface UpdatePriceModalProps {
  station: Station;
  onClose: () => void;
  onUpdate: (stationId: string, fuelType: FuelType, price: number) => Promise<void>;
}

const UpdatePriceModal: React.FC<UpdatePriceModalProps> = ({ station, onClose, onUpdate }) => {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>(FuelType.GASOLINA_COMUM);
  const [price, setPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    setIsLoading(true);
    await onUpdate(station.id, selectedFuel, parseFloat(price.replace(',', '.')));
    onClose();
    setIsLoading(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Nav */}
      <div className="px-4 py-4 flex items-center border-b border-slate-50 pt-safe-top">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-50 text-slate-600">
            <ChevronLeft size={28} />
        </button>
        <span className="font-bold text-lg text-slate-800 ml-2">Atualizar Preço</span>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900">{station.name}</h3>
            <p className="text-slate-500">{station.address}</p>
        </div>

        <div className="space-y-6 flex-1">
            {/* Horizontal Scroll Fuel Selector */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Combustível</label>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {Object.values(FuelType).map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedFuel(type)}
                            className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                                selectedFuel === type 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' 
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Giant Input */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center justify-center py-10">
                <label className="text-sm font-bold text-slate-400 mb-2">Valor atualizado</label>
                <div className="flex items-center">
                    <span className="text-3xl font-bold text-slate-300 mr-2">R$</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        className="bg-transparent text-6xl font-extrabold text-slate-900 w-48 text-center outline-none placeholder:text-slate-200"
                    />
                </div>
            </div>
        </div>

        <div className="pb-safe pt-4">
            <Button 
                onClick={handleSubmit} 
                fullWidth 
                size="lg" 
                disabled={isLoading || !price}
                className="h-16 rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/20"
            >
                {isLoading ? 'Enviando...' : 'Confirmar Preço'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePriceModal;