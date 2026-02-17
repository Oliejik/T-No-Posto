import React, { useState } from 'react';
import { MapPin, User, Lock, Mail, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Fuel } from 'lucide-react';
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
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setError('Erro de Configuração: Backend do Supabase não configurado.');
      setIsLoading(false);
      return;
    }

    if (!email || !password) {
      setError('Preencha todos os campos.');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name) {
            setError('Por favor, informe seu nome.');
            setIsLoading(false);
            return;
        }

        // 1. Criar Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Criar Perfil
          const role = email.toLowerCase().includes('admin') ? 'admin' : 'driver';
          
          const { error: profileError } = await supabase.from('profiles').insert([{ 
              id: authData.user.id, 
              name: name,
              email: email,
              role: role,
              status: 'active'
          }]);

          if (profileError) {
             console.error("Erro ao criar perfil:", profileError);
          }
          
          if (!authData.session) {
             setError('Verifique seu e-mail para confirmar o cadastro antes de entrar.');
             setIsLoading(false);
             return;
          }
          
          if (role === 'admin') onAdminLogin();
          else onClientLogin();
        }
      } else {
        // LOGIN
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
            // Verificar Role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', data.user.id)
                .single();
            
            if (profileError) {
                console.error(profileError);
                onClientLogin(); 
                return;
            }

            if (profile.status === 'banned') {
                await supabase.auth.signOut();
                setError('Esta conta foi suspensa. Entre em contato com o suporte.');
                setIsLoading(false);
                return;
            }

            if (profile.role === 'admin') {
                onAdminLogin();
            } else {
                onClientLogin();
            }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Invalid login credentials') setError('E-mail ou senha incorretos.');
      else if (err.message === 'User already registered') setError('Este e-mail já possui conta. Faça login.');
      else setError(err.message || 'Ocorreu um erro na autenticação.');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col justify-center">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-blue-600 rounded-b-[3rem] shadow-2xl z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-48 h-48 bg-cyan-400 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10 px-6 w-full max-w-md mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-700">
          <div className="bg-white/20 backdrop-blur-md w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 border border-white/30">
            <Fuel size={40} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tá No Posto</h1>
          <p className="text-blue-100 font-medium mt-1">Economize a cada abastecida</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 p-8 animate-in zoom-in-95 duration-500 border border-slate-100">
            
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                    {isRegistering ? 'Criar Conta' : 'Login'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {isRegistering ? 'Preencha seus dados para começar.' : 'Bem-vindo de volta!'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
            
            {isRegistering && (
                <div className="relative group animate-in slide-in-from-left-2">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                </div>
            )}

            <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Seu melhor e-mail"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
            </div>

            <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2 border border-red-100 animate-in shake">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            <Button 
                type="submit"
                fullWidth 
                disabled={isLoading}
                className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-600/30 mt-4 active:scale-[0.98] transition-all"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <span className="flex items-center gap-2">
                        {isRegistering ? 'Cadastrar' : 'Entrar'}
                        <ArrowRight size={20} className="opacity-80" />
                    </span>
                )}
            </Button>

            </form>

            <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm mb-2">
                    {isRegistering ? 'Já tem conta?' : 'Novo por aqui?'}
                </p>
                <button 
                    onClick={toggleMode}
                    className="text-blue-600 font-bold hover:text-blue-700 transition-colors py-2 px-4 rounded-xl hover:bg-blue-50"
                >
                    {isRegistering ? 'Fazer Login' : 'Criar Conta Grátis'}
                </button>
            </div>
        </div>
        
        <div className="mt-8 text-center">
             <p className="text-slate-400 text-xs">
                Ao continuar, você aceita nossos <span className="underline cursor-pointer">Termos de Uso</span> e <span className="underline cursor-pointer">Política de Privacidade</span>.
             </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;