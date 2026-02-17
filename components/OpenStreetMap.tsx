import React, { useEffect, useRef } from 'react';
import { Station, FuelType, PriceRecord } from '../types';

interface OpenStreetMapProps {
  stations: Station[];
  selectedFuel?: FuelType | 'Todos';
  onStationSelect?: (station: Station) => void;
  userPosition: { lat: number, lng: number };
  onMapClick?: (coords: { lat: number, lng: number }) => void; // New prop for Admin
  interactive?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({ 
  stations, 
  selectedFuel = 'Todos', 
  onStationSelect, 
  userPosition,
  onMapClick,
  interactive = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (!window.L) {
      console.error("Leaflet not loaded");
      return;
    }

    // Create Map
    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false, 
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    }).setView([userPosition.lat, userPosition.lng], 15);

    // Add OpenStreetMap Tile Layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Add Attribution (small, bottom right)
    window.L.control.attribution({
      position: 'bottomright',
      prefix: false
    }).addTo(map);

    // Layer group for station markers
    const markersLayer = window.L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Handle Map Clicks (For Admin Pinning)
    map.on('click', (e: any) => {
      if (onMapClick) {
        onMapClick(e.latlng);
        
        // Show a temporary pin where clicked
        if (clickMarkerRef.current) {
          clickMarkerRef.current.setLatLng(e.latlng);
        } else {
          clickMarkerRef.current = window.L.marker(e.latlng, {
            icon: window.L.divIcon({
              className: 'bg-transparent',
              html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(map);
        }
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Position Marker and View
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Center map on user position whenever it changes (Initial load or "My Location" button)
    map.flyTo([userPosition.lat, userPosition.lng], 15, {
        animate: true,
        duration: 1.5
    });

    // Create custom user icon (Blue Pulse)
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    } else {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon }).addTo(map);
    }
  }, [userPosition]);

  // Update Station Markers based on data and selected fuel
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !window.L) return;

    const L = window.L;
    const markersLayer = markersLayerRef.current;

    // Clear existing markers
    markersLayer.clearLayers();

    stations.forEach(station => {
      let displayPrice: number | undefined;
      
      if (selectedFuel === 'Todos') {
        const prices = Object.values(station.prices)
          .filter((p): p is PriceRecord => !!p)
          .map(p => p.value);
        
        if (prices.length > 0) {
          displayPrice = Math.min(...prices);
        }
      } else {
        displayPrice = station.prices[selectedFuel as FuelType]?.value;
      }
      
      const hasPrice = displayPrice !== undefined;
      
      const htmlContent = `
        <div class="relative flex flex-col items-center group transition-transform hover:scale-110" style="transform-origin: bottom center;">
          <div class="px-2 py-1 rounded-md shadow-md text-xs font-bold mb-1 whitespace-nowrap border ${hasPrice ? 'bg-white text-gray-900 border-gray-200' : 'bg-gray-200 text-gray-500 border-gray-300'}">
            ${hasPrice ? `R$ ${displayPrice?.toFixed(2)}` : '--'}
            ${station.isFavorite ? '<div class="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-white">★</div>' : ''}
          </div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="${hasPrice ? '#2563EB' : '#9CA3AF'}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg filter">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'bg-transparent border-none',
        html: htmlContent,
        iconSize: [60, 60],
        iconAnchor: [30, 58],
      });

      const marker = L.marker([station.coordinates.lat, station.coordinates.lng], { icon: customIcon });

      if (onStationSelect) {
        marker.on('click', () => {
          onStationSelect(station);
        });
      }

      markersLayer.addLayer(marker);
    });

  }, [stations, selectedFuel, onStationSelect]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100 z-0" />
      {/* Disclaimer */}
      <div className="absolute bottom-1 right-1 text-[10px] text-gray-500 bg-white/50 px-1 pointer-events-none z-[400]">
        Dados © OpenStreetMap
      </div>
    </div>
  );
};

export default OpenStreetMap;