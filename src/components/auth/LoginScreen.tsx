import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LoginScreen: React.FC = () => {
    const { login, loginWithGoogle } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(username, password);
        } catch (error: any) {
            alert(error.message || 'Erro ao fazer login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="font-sans antialiased overflow-hidden min-h-screen bg-[#F8FAFC]">
            <div className="fixed top-0 left-0 w-full h-[45%] bg-[#47F425] z-0 rounded-b-[28px] overflow-hidden">
                <div className="absolute inset-0 opacity-35 pointer-events-none animate-bg-float flex items-center justify-center">
                    <div className="grid size-120 grid-cols-4 gap-12 p-2 max-w-lg mx-auto place-items-center">
                        {['payments', 'trending_up', 'account_balance', 'currency_exchange', 
                          'receipt_long', 'savings', 'bar_chart', 'credit_card', 
                          'monitoring', 'account_balance_wallet', 'pie_chart', 'universal_currency_alt']
                          .map(icon => (
                            <span key={icon} className="material-symbols-outlined text-white text-4xl sm:text-6xl">{icon}</span>
                        ))}
                    </div>
                </div>
                <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] bg-white/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[200px] h-[200px] bg-black/5 rounded-full blur-2xl"></div>
                <div className="relative h-full flex flex-col items-center justify-center px-6 text-center z-10 pb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-lg mb-6 animate-scale-in">
                        <span className="material-symbols-outlined text-4xl text-[#3bd91d]">account_balance_wallet</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight animate-fade-in">Bem-vindo!</h1>
                    <p className="text-slate-800 text-lg font-medium opacity-70 animate-fade-in delay-200">Gerencie suas finanças com inteligência.</p>
                </div>
            </div>

            <main className="fixed top-[40%] left-0 w-full h-[60%] z-10 animate-slide-up-half">
                <div className="max-w-md mx-auto px-6 h-full flex flex-col">
                    <div className="bg-white rounded-[32px] shadow-[12px_12px_30px_rgba(0,0,0,0.05),-12px_-12px_30px_rgba(255,255,255,0.9)] p-8 flex-1 overflow-y-auto mb-10">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1" htmlFor="username">Usuário</label>
                                <div className="relative group rounded-2xl transition-all duration-300 bg-gray-50/50 border border-gray-100 shadow-inner focus-within:ring-2 focus-within:ring-[#47F425]">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <span className="material-symbols-outlined text-xl">person</span>
                                    </span>
                                    <input 
                                        className="w-full py-4 pl-12 pr-4 bg-transparent border-none rounded-2xl text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-base" 
                                        id="username" 
                                        placeholder="Seu nome de usuário" 
                                        required 
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="password">Senha</label>
                                    <a className="text-xs font-bold text-[#3bd91d] hover:opacity-80" href="#">Esqueceu?</a>
                                </div>
                                <div className="relative group rounded-2xl transition-all duration-300 bg-gray-50/50 border border-gray-100 shadow-inner focus-within:ring-2 focus-within:ring-[#47F425]">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <span className="material-symbols-outlined text-xl">lock_open</span>
                                    </span>
                                    <input 
                                        className="w-full py-4 pl-12 pr-12 bg-transparent border-none rounded-2xl text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-base" 
                                        id="password" 
                                        placeholder="••••••••" 
                                        required 
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                                        <span className="material-symbols-outlined text-xl">visibility_off</span>
                                    </button>
                                </div>
                            </div>
                            <button 
                                className="w-full bg-[#47F425] text-slate-900 hover:brightness-105 active:scale-[0.98] transition-all duration-300 py-4 rounded-2xl font-extrabold text-lg shadow-[0_8px_20px_-4px_rgba(71,244,37,0.4)] flex items-center justify-center gap-2 mt-4 animate-scale-in" 
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        Entrar
                                        <span className="material-symbols-outlined">east</span>
                                    </>
                                )}
                            </button>
                        </form>
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-gray-400">
                                <span className="px-4 bg-white">Ou entrar com</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1">
                            <button 
                                onClick={async () => {
                                    const emailInput = prompt('// Em Construção// Digite seu e-mail do Google (simulado):');
                                    if (emailInput) {
                                        setIsLoading(true);
                                        try {
                                            // Simulação: Se for a primeira vez, podemos pedir o nome
                                            // Em uma integração real, isso viria do token oAuth
                                            await loginWithGoogle(emailInput, emailInput.split('@')[0]); 
                                        } catch (e: any) {
                                            alert(e.message || 'Erro ao entrar com Google');
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-50 hover:bg-gray-50 text-slate-700 py-4 rounded-2xl font-bold transition-all duration-200 active:scale-[0.98] shadow-lg" 
                                type="button"
                                disabled={isLoading}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                                Google
                            </button>
                        </div>
                        <p className="text-center mt-8 text-slate-500 text-sm font-medium animate-fade-in delay-400">
                            Não tem uma conta? <a className="font-extrabold text-[#3bd91d] hover:underline" href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('auth-switch', { detail: 'register' })); }}>Cadastre-se</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginScreen;
