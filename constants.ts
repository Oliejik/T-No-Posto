import { Brand, FuelType, User } from './types';

export const FUEL_COLORS: Record<FuelType, string> = {
  [FuelType.GASOLINA_COMUM]: 'bg-red-500',
  [FuelType.GASOLINA_ADITIVADA]: 'bg-red-600',
  [FuelType.ETANOL]: 'bg-green-500',
  [FuelType.DIESEL_S10]: 'bg-gray-800',
  [FuelType.DIESEL_S500]: 'bg-gray-600',
  [FuelType.GNV]: 'bg-yellow-500',
  [FuelType.ARLA_32]: 'bg-blue-500',
};

export const BRAND_COLORS: Record<Brand, string> = {
  [Brand.PETROBRAS]: 'text-green-600',
  [Brand.SHELL]: 'text-yellow-600',
  [Brand.IPIRANGA]: 'text-blue-600',
  [Brand.ALE]: 'text-red-500',
  [Brand.BRANCA]: 'text-gray-500',
};

// Mock user for "logged in" state
export const MOCK_USER: User = {
  id: 'u123',
  name: 'Motorista Parceiro',
  email: 'motorista@tanoposto.com.br',
  reputation: 98,
  contributions: 42,
  status: 'active',
  joinedAt: '2023-01-15T10:00:00Z'
};