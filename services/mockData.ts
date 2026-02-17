import { Station, Brand, FuelType } from '../types';

const generatePrice = (base: number): number => {
  return parseFloat((base + (Math.random() * 0.4 - 0.2)).toFixed(2));
};

const now = new Date().toISOString();

// Helper to generate random coordinates within roughly 2-3km of a center point
const getRandomOffset = (coordinate: number) => {
  const offset = (Math.random() - 0.5) * 0.04; // ~4km variance
  return coordinate + offset;
};

export const generateStationsAround = (lat: number, lng: number): Station[] => {
  const stationNames = [
    'Posto Central', 'Auto Posto Shell', 'Posto Ipiranga Express', 
    'Posto do Bairro', 'Posto Ale Top', 'Posto da Avenida', 
    'Auto Posto Rodovia', 'Posto Econômico'
  ];

  return stationNames.map((name, index) => {
    const brandValues = Object.values(Brand);
    const brand = brandValues[index % brandValues.length];
    
    return {
      id: String(index + 1),
      name: name,
      brand: brand,
      address: `Rua Exemplo, ${100 * (index + 1)}`, // Generic address
      coordinates: { 
        lat: getRandomOffset(lat), 
        lng: getRandomOffset(lng) 
      },
      isFavorite: Math.random() > 0.8,
      prices: {
        [FuelType.GASOLINA_COMUM]: { value: generatePrice(5.89), updatedAt: now, updatedBy: 'u1', confirmations: Math.floor(Math.random() * 10) },
        [FuelType.GASOLINA_ADITIVADA]: Math.random() > 0.3 ? { value: generatePrice(6.15), updatedAt: now, updatedBy: 'u3', confirmations: 0 } : undefined,
        [FuelType.ETANOL]: Math.random() > 0.2 ? { value: generatePrice(3.49), updatedAt: now, updatedBy: 'u2', confirmations: Math.floor(Math.random() * 5) } : undefined,
        [FuelType.DIESEL_S10]: Math.random() > 0.4 ? { value: generatePrice(6.10), updatedAt: now, updatedBy: 'u1', confirmations: Math.floor(Math.random() * 8) } : undefined,
        [FuelType.DIESEL_S500]: Math.random() > 0.6 ? { value: generatePrice(5.95), updatedAt: now, updatedBy: 'u3', confirmations: Math.floor(Math.random() * 3) } : undefined,
        [FuelType.GNV]: Math.random() > 0.8 ? { value: generatePrice(4.79), updatedAt: now, updatedBy: 'u1', confirmations: 2 } : undefined,
        [FuelType.ARLA_32]: Math.random() > 0.7 ? { value: generatePrice(4.50), updatedAt: now, updatedBy: 'u4', confirmations: 0 } : undefined,
      },
    };
  });
};

// Keep initial stations for fallback: Cabo de Santo Agostinho, PE
export const INITIAL_STATIONS = generateStationsAround(-8.285816, -35.034964);

// Haversine formula to calculate distance in km
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}