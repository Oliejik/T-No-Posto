import React, { useEffect, useRef, useState } from 'react';
import { Station, FuelType } from '../types';

interface GoogleMapProps {
  stations: Station[];
  selectedFuel: FuelType;
  onStationSelect: (station: Station) => void;
  userPosition: { lat: number, lng: number };
}

declare global {
  interface Window {
    google: any;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({ stations, selectedFuel, onStationSelect, userPosition }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if google script is loaded
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded. Check index.html");
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: userPosition,
      zoom: 15,
      mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
      disableDefaultUI: true,
      clickableIcons: false,
    });

    setMapInstance(map);

    return () => {
      // Cleanup
      if (markersRef.current) {
        markersRef.current.forEach(m => m.map = null);
      }
    };
  }, []); // Run once on mount (or when google loads if we handled dynamic loading)

  // Update User Marker
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.position = userPosition;
    } else {
      // Create a blue dot for user
      const pinElement = document.createElement("div");
      pinElement.className = "w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse";
      
      try {
        const { AdvancedMarkerElement } = window.google.maps.marker;
        userMarkerRef.current = new AdvancedMarkerElement({
          map: mapInstance,
          position: userPosition,
          content: pinElement,
          title: "Minha Localização"
        });
      } catch (e) {
        // Fallback for standard marker if AdvancedMarker not available
        userMarkerRef.current = new window.google.maps.Marker({
          map: mapInstance,
          position: userPosition,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 4,
          },
        });
      }
    }
    
    // Optional: Pan to user on significant change? 
    // mapInstance.panTo(userPosition);
  }, [mapInstance, userPosition]);

  // Update Station Markers
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    stations.forEach(station => {
      const priceRecord = station.prices[selectedFuel];
      const hasPrice = !!priceRecord;
      
      // Create content for AdvancedMarker
      const container = document.createElement("div");
      container.className = "group cursor-pointer transform transition-transform hover:scale-110";
      container.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="relative px-2 py-1 rounded-md shadow-md text-xs font-bold mb-1 whitespace-nowrap ${hasPrice ? 'bg-white text-gray-900 border border-gray-200' : 'bg-gray-200 text-gray-500'}">
            ${hasPrice ? `R$ ${priceRecord?.value.toFixed(2)}` : '--'}
            ${station.isFavorite ? '<div class="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">★</div>' : ''}
          </div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="${hasPrice ? '#2563EB' : '#9CA3AF'}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
          </svg>
        </div>
      `;

      // Handle click
      container.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent map click
        onStationSelect(station);
      });

      try {
        const { AdvancedMarkerElement } = window.google.maps.marker;
        const marker = new AdvancedMarkerElement({
          map: mapInstance,
          position: station.coordinates,
          content: container,
          title: station.name,
        });
        markersRef.current.push(marker);
      } catch (e) {
        // Fallback
        const marker = new window.google.maps.Marker({
          map: mapInstance,
          position: station.coordinates,
          label: hasPrice ? { text: `R$ ${priceRecord?.value.toFixed(2)}`, color: "black", fontWeight: "bold", fontSize: "10px" } : null,
        });
        marker.addListener('click', () => onStationSelect(station));
        markersRef.current.push(marker);
      }
    });

  }, [mapInstance, stations, selectedFuel]);

  // Handle errors or missing key visually
  if (!window.google && !window.google?.maps) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center p-8 text-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Google Maps API Required</h3>
          <p className="text-gray-600">Please add your API Key to the index.html file to view the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-200" />
  );
};

export default GoogleMap;