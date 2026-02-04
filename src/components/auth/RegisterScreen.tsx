import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const RegisterScreen: React.FC = () => {
    const { register, loginWithGoogle } = useAuth();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim() || !username.trim() || !email.trim() || !password) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setIsLoading(true);
        try {
            await register(name.trim(), username.toLowerCase().trim(), email.trim(), password, currency);
        } catch (error: any) {
            alert(error.message || 'Erro ao criar conta');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#EFF2F6] font-sans text-slate-800 min-h-screen flex justify-center items-start md:items-center selection:bg-[#C3F53C] selection:text-slate-900 overflow-auto">
            <main className="w-full max-w-md min-h-screen md:min-h-0 md:my-8 relative flex flex-col p-4 sm:p-6 overflow-x-hidden md:rounded-3xl md:shadow-2xl md:bg-white/50 md:backdrop-blur-sm">
                <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-[#C3F53C]/20 rounded-full blur-[90px] pointer-events-none z-0"></div>
                <div className="absolute top-[20%] left-[-100px] w-64 h-64 bg-blue-400/15 rounded-full blur-[70px] pointer-events-none z-0"></div>
                
                <header className="relative z-10 flex items-center justify-between mb-6 pt-2">
                    <button 
                         onClick={() => window.dispatchEvent(new CustomEvent('auth-switch', { detail: 'login' }))}
                        className="w-12 h-12 rounded-2xl bg-[#EFF2F6] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#FFFFFF] hover:scale-[0.98] active:scale-95 transition-transform flex items-center justify-center text-slate-600"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <button className="w-12 h-12 rounded-2xl bg-[#EFF2F6] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#FFFFFF] hover:scale-[0.98] active:scale-95 transition-transform flex items-center justify-center text-slate-600">
                        <span className="material-symbols-outlined">help_outline</span>
                    </button>
                </header>

                <div className="relative z-10 mb-6 animate-fade-up">
                    <h1 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                        Criar Conta <span className="inline-block animate-bounce">👋</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Organize suas finanças com simplicidade.
                    </p>
                </div>

                <div className="relative z-10 mb-8 animate-fade-up">
                    <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x snap-mandatory px-1">
                        <div className="snap-center shrink-0 w-64 p-5 rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg flex flex-col justify-between h-32 transform transition-transform hover:scale-[1.01]">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 flex items-center justify-center bg-white/60 rounded-xl">
                                    <span className="material-symbols-outlined text-emerald-600">trending_up</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-full border border-emerald-200">+12% a.a.</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Investimentos</p>
                                <p className="text-xs text-slate-600">Rendimento automático</p>
                            </div>
                        </div>
                         {/* Other cards skipped for brevity but can be added */}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 relative z-10 animate-fade-up">
                    <div className="group">
                        <label className="ml-3 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="name">Nome Completo</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C3F53C] transition-colors">person</span>
                            <input 
                                className="w-full bg-[#EFF2F6] rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-semibold text-sm outline-none border-none shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#FFFFFF] focus:ring-2 focus:ring-[#C3F53C]/50 transition-all placeholder:text-slate-400/70" 
                                id="name" 
                                placeholder="Ex: João da Silva" 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="ml-3 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="username">Nome de Usuário</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C3F53C] transition-colors">alternate_email</span>
                            <input 
                                className="w-full bg-[#EFF2F6] rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-semibold text-sm outline-none border-none shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#FFFFFF] focus:ring-2 focus:ring-[#C3F53C]/50 transition-all placeholder:text-slate-400/70" 
                                id="username" 
                                placeholder="Ex: joaosilva" 
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="ml-3 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="email">E-mail</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C3F53C] transition-colors">email</span>
                            <input 
                                className="w-full bg-[#EFF2F6] rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-semibold text-sm outline-none border-none shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#FFFFFF] focus:ring-2 focus:ring-[#C3F53C]/50 transition-all placeholder:text-slate-400/70" 
                                id="email" 
                                placeholder="seu@email.com" 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="ml-3 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="currency">Moeda Principal</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">payments</span>
                            <select 
                                className="w-full bg-[#EFF2F6] rounded-2xl py-4 pl-12 pr-10 text-slate-700 font-semibold text-sm outline-none border-none shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#FFFFFF] focus:ring-2 focus:ring-[#C3F53C]/50 transition-all appearance-none cursor-pointer" 
                                id="currency"
                                value={currency}
                                onChange={e => setCurrency(e.target.value as any)}
                            >
                                <option value="BRL">🇧🇷 Real Brasileiro (BRL)</option>
                                <option value="USD">🇺🇸 Dólar Americano (USD)</option>
                                <option value="EUR">🇪🇺 Euro (EUR)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                    </div>
                    <div className="group">
                        <label className="ml-3 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="password">Senha</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C3F53C] transition-colors">lock</span>
                            <input 
                                className="w-full bg-[#EFF2F6] rounded-2xl py-4 pl-12 pr-12 text-slate-700 font-semibold text-sm outline-none border-none shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#FFFFFF] focus:ring-2 focus:ring-[#C3F53C]/50 transition-all placeholder:text-slate-400/70" 
                                id="password" 
                                placeholder="••••••••" 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1" type="button">
                                <span className="material-symbols-outlined text-xl">visibility_off</span>
                            </button>
                        </div>
                    </div>
                    
                    <button 
                        className="w-full mt-6 py-4 rounded-full bg-[#C3F53C] text-slate-900 font-extrabold text-lg shadow-[0_10px_30px_-10px_rgba(195,245,60,0.6)] hover:shadow-[0_15px_35px_-10px_rgba(195,245,60,0.8)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border border-[#C3F53C]/20"
                        disabled={isLoading}
                    >
                         {isLoading ? 'Criando...' : 'Criar Conta'}
                        {!isLoading && (
                            <span className="bg-black/10 rounded-full p-1 group-hover:bg-black/20 transition-colors">
                                <span className="material-symbols-outlined text-lg align-middle">arrow_forward</span>
                            </span>
                        )}
                    </button>
                    <p className="text-center text-sm text-slate-500 font-medium pb-4 pt-2">
                        Já tem conta? <a className="text-slate-900 font-bold hover:text-[#C3F53C] transition-colors" href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('auth-switch', { detail: 'login' })); }}>Entrar</a>
                    </p>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400">
                            <span className="px-4 bg-[#EFF2F6]">Ou entrar com</span>
                        </div>
                    </div>

                    <div className="pb-8">
                        <button 
                            onClick={async () => {
                                const emailInput = prompt('Digite seu e-mail do Google (simulado):');
                                if (emailInput) {
                                    setIsLoading(true);
                                    try {
                                        await loginWithGoogle(emailInput, emailInput.split('@')[0]); 
                                    } catch (e: any) {
                                        alert(e.message || 'Erro ao entrar com Google');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-white/80 text-slate-700 py-4 rounded-2xl font-bold transition-all duration-200 active:scale-[0.98] shadow-sm shadow-slate-200" 
                            type="button"
                            disabled={isLoading}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            Google
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default RegisterScreen;
