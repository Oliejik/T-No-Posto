import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas no seu arquivo .env
// Exemplo:
// REACT_APP_SUPABASE_URL=https://seuref.supabase.co
// REACT_APP_SUPABASE_ANON_KEY=suachaveanonima

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Check if variables are actually provided
export const isSupabaseConfigured = 
  SUPABASE_URL !== 'https://qcijmsxwmqidnuagbjlt.supabase.co' && 
  SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaWptc3h3bXFpZG51YWdiamx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjE1MjksImV4cCI6MjA4NTY5NzUyOX0.2Ee8XYR0tze8sgv7EYq_NrGZYbpL12grRlxFfNLNlFU' && 
  SUPABASE_URL !== 'https://qcijmsxwmqidnuagbjlt.supabase.co';

// Cria o cliente apenas se as chaves existirem para evitar erros em tempo de execução
// Se as chaves não existirem, usamos valores placeholder que causarão erros de rede se usados,
// por isso usamos isSupabaseConfigured para bloquear chamadas.
export const supabase = createClient(
  SUPABASE_URL || 'https://qcijmsxwmqidnuagbjlt.supabase.co', 
  SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaWptc3h3bXFpZG51YWdiamx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjE1MjksImV4cCI6MjA4NTY5NzUyOX0.2Ee8XYR0tze8sgv7EYq_NrGZYbpL12grRlxFfNLNlFU'
);