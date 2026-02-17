import React, { useState } from 'react';
import { MapPin, User, Lock, Mail, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import Button from './Button';

interface LoginScreenProps {
  onClientLogin: () => void;
  onAdminLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onClientLogin, onAdminLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mock Authentication Logic
    setTimeout(() => {
      setIsLoading(false);

      if (!email || !password) {
        setError('Preencha todos os campos.');
        return;
      }

      if (isRegistering && !name) {
        setError('Por favor, informe seu nome.');
        return;
      }

      // Simulating Admin check based on email domain or keyword
      if (email.toLowerCase().includes('admin')) {
        if (isRegistering) {
            setError('Cadastro de administradores apenas via sistema interno.');
            return;
        }
        onAdminLogin();
      } else {
        // Driver Login
        onClientLogin();
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-500">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-3">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tá No Posto</h1>
          <p className="text-blue-200 text-sm">
            {isRegistering ? 'Crie sua conta de motorista' : 'Bem-vindo de volta'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4 w-full">
          
          {isRegistering && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-xs font-bold text-blue-200 ml-1 uppercase">Nome Completo</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                    <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Seu nome"
                    />
                </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-200 ml-1 uppercase">E-mail</label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="exemplo@email.com"
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-200 ml-1 uppercase">Senha</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-200 text-xs">
                <AlertCircle size={14} />
                {error}
            </div>
          )}

          <Button 
            type="submit"
            fullWidth 
            className="h-12 bg-blue-600 text-white hover:bg-blue-500 font-bold text-base shadow-lg hover:shadow-blue-500/30 mt-4 border-none"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
                <span className="flex items-center">
                    {isRegistering ? 'Criar Conta' : 'Entrar'}
                    <ChevronRight size={18} className="ml-1 opacity-70" />
                </span>
            )}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-6 border-t border-white/10 w-full text-center">
          <p className="text-sm text-blue-200/70 mb-2">
            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
          </p>
          <button 
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
            }}
            className="text-white font-bold hover:text-blue-300 transition-colors text-sm"
          >
            {isRegistering ? 'Fazer Login' : 'Cadastre-se Gratuitamente'}
          </button>
        </div>

        <div className="mt-8 text-[10px] text-white/20 text-center">
           Para acessar como Admin, use um e-mail contendo "admin".
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;