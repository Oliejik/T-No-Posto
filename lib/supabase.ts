
import { createClient } from '@supabase/supabase-js';

/**
 * Utilitário para buscar variáveis de ambiente de forma segura.
 * Evita o uso direto de 'process' que pode quebrar o build em alguns ambientes.
 */
const getEnvVar = (key: string): string => {
  const providers = [
    // @ts-ignore - Vite
    () => (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : null),
    // @ts-ignore - Webpack/CRA/Node
    () => (typeof process !== 'undefined' && process.env ? process.env[key] : null),
    // @ts-ignore - Browser Global
    () => (typeof window !== 'undefined' ? (window as any).__ENV__?.[key] : null)
  ];

  for (const get of providers) {
    try {
      const val = get();
      if (val) return val;
    } catch (e) {
      // Ignora erros de referência
    }
  }
  return '';
};

// Tenta encontrar as chaves com diferentes prefixos comuns
const URL = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('REACT_APP_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('REACT_APP_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const ENV_DEBUG = {
  urlFound: !!URL,
  keyFound: !!KEY,
  urlValue: URL ? `${URL.substring(0, 15)}...` : 'não configurada',
};

export const isSupabaseConfigured = !!URL && URL.includes('supabase.co') && !!KEY;

// Inicialização segura: se não houver URL, usamos um domínio falso que não trava o script
export const supabase = createClient(
  URL || 'https://placeholder.supabase.co',
  KEY || 'placeholder-key'
);
