
import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Fuel } from 'lucide-react';
import Button from './Button';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onClientLogin: () => void;
  onAdminLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onClientLogin, onAdminLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isSupabaseConfigured) {
      setError('Configuração incompleta: REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY são obrigatórios na Vercel.');
      return;
    }

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!name) {
            setError('Por favor, informe seu nome.');
            setIsLoading(false);
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const role = email.toLowerCase().includes('admin') ? 'admin' : 'driver';
          await supabase.from('profiles').insert([{ 
              id: authData.user.id, 
              name: name,
              email: email,
              role: role,
              status: 'active'
          }]);

          if (!authData.session) {
             setError('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
             setIsLoading(false);
             return;
          }
          
          role === 'admin' ? onAdminLogin() : onClientLogin();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', data.user.id)
                .single();
            
            if (profile?.status === 'banned') {
                await supabase.auth.signOut();
                setError('Esta conta foi suspensa por violação dos termos.');
                setIsLoading(false);
                return;
            }

            profile?.role === 'admin' ? onAdminLogin() : onClientLogin();
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro na autenticação.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col justify-center font-sans">
      <div className="absolute top-0 left-0 w-full h-[55vh] bg-blue-600 rounded-b-[3.5rem] shadow-2xl z-0" />
      
      <div className="relative z-10 px-6 w-full max-w-md mx-auto">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <div className="bg-white/20 backdrop-blur-md w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-4 border border-white/30 rotate-3">
            <Fuel size={44} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Tá No Posto</h1>
          <p className="text-blue-100 font-medium mt-1">Sua rede colaborativa de combustíveis</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-800">
                    {isRegistering ? 'Criar Conta' : 'Acessar App'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {isRegistering ? 'Preencha os campos abaixo para começar.' : 'Bem-vindo de volta, motorista!'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                  <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input 
                          type="text" 
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                      />
                  </div>
              )}

              <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Seu melhor e-mail"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
              </div>

              <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
              </div>

              {error && (
                  <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-start gap-3 border border-red-100 animate-in shake duration-300">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                  </div>
              )}

              <Button 
                  type="submit"
                  fullWidth 
                  disabled={isLoading}
                  className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-600/30 mt-4 transition-all active:scale-[0.98]"
              >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                      <span className="flex items-center gap-2">
                          {isRegistering ? 'Cadastrar Agora' : 'Entrar no App'}
                          <ArrowRight size={20} />
                      </span>
                  )}
              </Button>
            </form>

            <div className="mt-8 text-center">
                <button 
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="text-blue-600 font-bold py-2 px-4 rounded-xl hover:bg-blue-50 transition-colors"
                >
                    {isRegistering ? 'Já tem conta? Fazer Login' : 'Ainda não tem conta? Criar Conta'}
                </button>
            </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
            &copy; 2025 Tá No Posto - Dados protegidos por RLS.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
