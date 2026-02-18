
import React, { useState, useEffect } from 'react';
import AdminApp from './AdminApp';
import ClientApp from './ClientApp';
import LoginScreen from './components/LoginScreen';
import { supabase, isSupabaseConfigured, ENV_DEBUG } from './lib/supabase';
import { Loader2, AlertCircle, RefreshCw, Terminal, ShieldAlert } from 'lucide-react';

type AppView = 'login' | 'client' | 'admin';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Timeout de segurança para o loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const init = async () => {
      try {
        if (!isSupabaseConfigured) {
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }

        // Listener de Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            await fetchUserProfile(session.user.id);
          } else {
            setCurrentView('login');
            setLoading(false);
          }
        });

        return () => subscription.unsubscribe();
      } catch (err: any) {
        console.error("Erro Crítico no App:", err);
        setCriticalError(err.message || "Erro desconhecido na inicialização");
        setLoading(false);
      }
    };

    init();
    return () => clearTimeout(timer);
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        data.role === 'admin' ? setCurrentView('admin') : setCurrentView('client');
      } else {
        setCurrentView('client');
      }
    } catch (err) {
      setCurrentView('client');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentView('login');
    } catch (e) {
      window.location.href = '/'; // Força recarregamento total
    } finally {
      setLoading(false);
    }
  };

  // TELA DE ERRO CRÍTICO
  if (criticalError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md">
          <ShieldAlert size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Erro de Execução</h1>
          <p className="text-slate-400 mb-6">{criticalError}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 rounded-xl font-bold">
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Tá No Posto</h2>
        <p className="text-slate-500 animate-pulse">Iniciando serviços...</p>
      </div>
    );
  }

  if (!isSupabaseConfigured && currentView === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-3 text-center">Configuração Pendente</h1>
          <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed">
            As chaves do Supabase não foram detectadas na Vercel.
          </p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
              <RefreshCw size={18} /> Tentar Novamente
            </button>
            <button onClick={() => setShowDebug(!showDebug)} className="w-full py-3 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm">
              {showDebug ? 'Ocultar Detalhes' : 'Ver Diagnóstico'}
            </button>
          </div>
          {showDebug && (
            <div className="mt-4 bg-slate-900 rounded-2xl p-4 text-[10px] font-mono text-green-400 overflow-hidden">
              <p>URL: {ENV_DEBUG.urlValue}</p>
              <p>KEY: {ENV_DEBUG.keyFound ? 'Detectada' : 'Faltando'}</p>
              <p className="mt-2 text-white">DICA: Verifique as Env Vars na Vercel.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <LoginScreen onClientLogin={() => setCurrentView('client')} onAdminLogin={() => setCurrentView('admin')} />;
  }

  if (currentView === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  return <ClientApp onLogout={handleLogout} />;
};

export default App;
