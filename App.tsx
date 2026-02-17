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
    // 1. Safety Valve: If nothing happens in 8 seconds, stop loading.
    // This fixes the "infinite loading" on devices that block localStorage or have bad network.
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth check timed out. Defaulting to login.");
          return false;
        }
        return prev;
      });
    }, 8000);

    // If no config, stop loading immediately
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured. Running in UI-only mode.");
      setLoading(false);
      clearTimeout(safetyTimeout);
      return;
    }

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        // Only force login view if we are not already there/loading
        setCurrentView('login');
        setLoading(false);
      }
    });

    // 3. Initial Session Check
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
        // fetchUserProfile will handle setting loading to false
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
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
        console.error('Error fetching profile:', error);
        // Fallback to client if profile fails (e.g. network error but auth is okay)
        setCurrentView('client');
      } else if (data) {
        if (data.role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('client');
        }
      }
    } catch (err) {
      console.error(err);
      setCurrentView('client');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) {
      setCurrentView('login');
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
      setCurrentView('login');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-400 animate-pulse font-medium">Carregando...</p>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <LoginScreen 
        onClientLogin={() => {}} 
        onAdminLogin={() => {}} 
      />
    );
  }

  if (currentView === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  // Default to Client
  return <ClientApp onLogout={handleLogout} />;
};

export default App;