
import React, { useState, useEffect } from 'react';
import AdminApp from './AdminApp';
import ClientApp from './ClientApp';
import LoginScreen from './components/LoginScreen';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Loader2 } from 'lucide-react';

type AppView = 'login' | 'client' | 'admin';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout de segurança: se após 6 segundos nada carregar, forçamos a saída do loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 6000);

    if (!isSupabaseConfigured) {
      console.warn("Supabase não configurado. Adicione as chaves na Vercel.");
      setLoading(false);
      clearTimeout(safetyTimeout);
      return;
    }

    // Listener de mudança de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        setCurrentView('login');
        setLoading(false);
      }
    });

    // Checagem inicial de sessão
    checkUser();

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro na checagem de auth:", err);
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Perfil não encontrado, assumindo motorista:', error);
        setCurrentView('client');
      } else if (data) {
        data.role === 'admin' ? setCurrentView('admin') : setCurrentView('client');
      }
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
      setCurrentView('client');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    } finally {
      setCurrentView('login');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-6" />
        <h2 className="text-xl font-bold mb-2">Tá No Posto</h2>
        <p className="text-slate-400 font-medium animate-pulse">Iniciando aplicativo...</p>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <LoginScreen 
        onClientLogin={() => setCurrentView('client')} 
        onAdminLogin={() => setCurrentView('admin')} 
      />
    );
  }

  if (currentView === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  return <ClientApp onLogout={handleLogout} />;
};

export default App;
