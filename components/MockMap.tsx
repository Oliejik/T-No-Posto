import React from 'react';
import { Station, FuelType, Coordinates } from '../types';
import { MapPin } from 'lucide-react';
import { FUEL_COLORS } from '../constants';

interface MockMapProps {
  stations: Station[];
  selectedFuel: FuelType;
  onStationSelect: (station: Station) => void;
  userPosition: Coordinates;
}

const MockMap: React.FC<MockMapProps> = ({ stations, selectedFuel, onStationSelect, userPosition }) => {
  // Simple projection for mock visualization
  // Centered roughly on the mock data (Av Paulista region)
  const CENTER_LAT = -23.561684;
  const CENTER_LNG = -46.655981;
  const SPAN = 0.04; // degrees coverage for the view

  const getPos = (coords: Coordinates) => {
    const x = 50 + ((coords.lng - CENTER_LNG) / SPAN) * 100;
    const y = 50 - ((coords.lat - CENTER_LAT) / SPAN) * 100; // y axis is inverted in DOM vs Lat
    return { x, y };
  };

  const userPos = getPos(userPosition);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {/* Mock Map Background - visualizing streets */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
         <svg width="100%" height="100%">
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="black" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Random roads */}
            <path d="M 0 50 Q 50 20 100 50" stroke="black" strokeWidth="20" fill="none" />
            <path d="M 50 0 L 50 100" stroke="black" strokeWidth="15" fill="none" />
            <path d="M 20 0 L 80 100" stroke="black" strokeWidth="10" fill="none" />
         </svg>
      </div>

      {/* User Position */}
      <div 
        className="absolute w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg z-10 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
        style={{ left: `${userPos.x}%`, top: `${userPos.y}%` }}
      />

      {/* Station Markers */}
      {stations.map((station) => {
        const priceRecord = station.prices[selectedFuel];
        const hasPrice = !!priceRecord;
        const pos = getPos(station.coordinates);
        
        return (
          <button
            key={station.id}
            onClick={() => onStationSelect(station)}
            className="absolute transform -translate-x-1/2 -translate-y-full group z-20 transition-transform hover:scale-110 focus:outline-none"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className={`relative px-2 py-1 rounded-md shadow-md text-xs font-bold mb-1 whitespace-nowrap ${hasPrice ? 'bg-white text-gray-900 border border-gray-200' : 'bg-gray-200 text-gray-500'}`}>
                {hasPrice ? `R$ ${priceRecord?.value.toFixed(2)}` : '--'}
                {station.isFavorite && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-[10px]">★</span>
                  </div>
                )}
              </div>
              <MapPin 
                className={`w-8 h-8 drop-shadow-lg ${hasPrice ? 'text-blue-600 fill-blue-100' : 'text-gray-400 fill-gray-100'}`} 
              />
            </div>
          </button>
        );
      })}
      
      <div className="absolute bottom-4 left-4 text-[10px] text-gray-400 pointer-events-none">
        * Mapa simulado
      </div>
    </div>
  );
};

export default MockMap;