import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions } from '@/contexts/TransactionsContext';

interface SettingsProps {
    onNavigate: (tab: any) => void;
}

const Settings: React.FC<SettingsProps> = () => {
    const [fechamento, setFechamento] = useState(5);
    const { theme, toggleTheme } = useTheme();
    const { currentCurrency, setCurrentCurrency } = useTransactions();

    return (
        <div className="flex flex-col gap-8 animate-fade-up max-w-4xl mx-auto w-full pb-20 px-4 lg:px-0">
            {/* Seção de Tema */}
            <section>
                <h3 className="text-content/60 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Aparência</h3>
                <div className="nm-card p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                            </div>
                            <div>
                                <p className="font-black text-content leading-none">Tema do Aplicativo</p>
                                <p className="text-xs text-dim font-bold mt-1">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={toggleTheme}
                             className={`
                                relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                                ${theme === 'dark' ? 'bg-primary/30' : 'bg-gray-200'}
                             `}
                        >
                             <span className={`
                                pointer-events-none relative inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}
                             `}>
                             </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Seção de Moeda */}
            <section>
                <h3 className="text-content/60 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Moeda e Localização</h3>
                <div className="nm-card p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <div>
                                <p className="font-black text-content leading-none">Moeda Principal</p>
                                <p className="text-xs text-dim font-bold mt-1">{currentCurrency === 'BRL' ? 'Real Brasileiro (R$)' : 'Dólar Americano (US$)'}</p>
                            </div>
                        </div>
                        <div className="flex bg-secondary/10 dark:bg-white/5 p-1 rounded-xl">
                            <button 
                                onClick={() => setCurrentCurrency('BRL')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentCurrency === 'BRL' ? 'bg-primary text-secondary shadow-md' : 'text-dim hover:text-content'}`}
                            >
                                BRL
                            </button>
                            <button 
                                onClick={() => setCurrentCurrency('USD')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentCurrency === 'USD' ? 'bg-primary text-secondary shadow-md' : 'text-dim hover:text-content'}`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ciclo Financeiro */}
            <section>
                <h3 className="text-content/60 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Ciclo Financeiro</h3>
                <div className="nm-card p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-black text-content leading-none">Dia de Fechamento Padrão</p>
                            <p className="text-xs text-dim font-bold mt-1">Faturas são calculadas neste dia.</p>
                        </div>
                        <span className="text-3xl font-black text-primary">{fechamento.toString().padStart(2, '0')}</span>
                    </div>
                    <input 
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                        max="31" 
                        min="1" 
                        type="range" 
                        value={fechamento}
                        onChange={(e) => setFechamento(parseInt(e.target.value))}
                    />
                </div>
            </section>

            <div className="pt-4 flex justify-center">
                <button className="w-full max-w-sm bg-primary text-secondary font-black text-lg h-14 rounded-full shadow-glow active:scale-95 transition-transform">
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

export default Settings;
