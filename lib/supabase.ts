
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para obter env vars de forma segura no navegador
const getEnv = (key: string): string => {
  try {
    // Tenta acessar via window.process (comum em polyfills de bundlers)
    const win = window as any;
    if (win.process?.env?.[key]) {
      return win.process.env[key];
    }
    
    // Tenta acesso direto via process.env (Vercel/Node environment)
    // Usamos typeof para evitar ReferenceError se 'process' não existir
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key] as string;
    }

    // Tenta acesso via import.meta.env (Padrão Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    console.warn(`Erro ao acessar variável ${key}:`, e);
  }
  return '';
};

const SUPABASE_URL = getEnv('REACT_APP_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('REACT_APP_SUPABASE_ANON_KEY');

// URLs de exemplo para comparação de segurança
const PLACEHOLDER_URL = 'https://qcijmsxwmqidnuagbjlt.supabase.co';

export const isSupabaseConfigured = 
  !!SUPABASE_URL && 
  SUPABASE_URL !== '' && 
  SUPABASE_URL !== PLACEHOLDER_URL &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== '';

// Inicializa o cliente com fallback para não quebrar a execução do script
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'no-key'
);
