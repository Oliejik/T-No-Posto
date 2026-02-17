
export enum FuelType {
  GASOLINA_COMUM = 'Gasolina Comum',
  GASOLINA_ADITIVADA = 'Gasolina Aditivada',
  ETANOL = 'Etanol',
  DIESEL_S10 = 'Diesel S10',
  DIESEL_S500 = 'Diesel S500',
  GNV = 'GNV',
  ARLA_32 = 'Arla 32'
}

export enum Brand {
  PETROBRAS = 'Petrobras',
  SHELL = 'Shell',
  IPIRANGA = 'Ipiranga',
  ALE = 'Ale',
  BRANCA = 'Bandeira Branca'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PriceRecord {
  value: number;
  updatedAt: string; // ISO String
  updatedBy: string; // User ID
  confirmations: number;
}

export interface Station {
  id: string;
  name: string;
  brand: Brand;
  address: string;
  coordinates: Coordinates;
  prices: Partial<Record<FuelType, PriceRecord>>;
  isFavorite?: boolean;
  distance?: number; // Calculated distance in km
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'driver';
  reputation: number;
  contributions: number;
  status: 'active' | 'banned';
  joinedAt: string;
}

export interface Report {
  id: string;
  stationName: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'inactive';
  sentAt?: string;
}
