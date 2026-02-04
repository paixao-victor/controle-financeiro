import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSettings } from '@/contexts/SettingsContext';

interface SettingsProps {
    onNavigate: (tab: any) => void;
}

const Settings: React.FC<SettingsProps> = () => {
    const [fechamento, setFechamento] = useState(5);
    const { theme, toggleTheme } = useTheme();
    const { currentCurrency, setCurrentCurrency } = useTransactions();
    const { 
        primaryColor, setPrimaryColor, 
        savingsGoal, setSavingsGoal,
        isPrivacyMode, setIsPrivacyMode
    } = useSettings();

    const colorOptions = [
        { name: 'Padrão', color: '#47f425' },
        { name: 'Ciano', color: '#06b6d4' },
        { name: 'Violeta', color: '#8b5cf6' },
        { name: 'Rosa', color: '#ec4899' },
        { name: 'Laranja', color: '#f97316' },
        { name: 'Amarelo', color: '#eab308' },
    ];

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

                    <div className="h-px bg-content/5"></div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary transition-colors">
                                <span className="material-symbols-outlined">palette</span>
                            </div>
                            <div>
                                <p className="font-black text-content leading-none">Cor de Destaque</p>
                                <p className="text-xs text-dim font-bold mt-1">Personalize a identidade do app</p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-1 bg-secondary/10 dark:bg-white/5 rounded-2xl">
                            {colorOptions.map((opt) => (
                                <button
                                    key={opt.color}
                                    onClick={() => setPrimaryColor(opt.color)}
                                    className={`size-8 rounded-full border-2 transition-all ${primaryColor === opt.color ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                    style={{ backgroundColor: opt.color }}
                                    title={opt.name}
                                />
                            ))}
                        </div>
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

            {/* Ciclo Financeiro e Metas */}
            <section>
                <h3 className="text-content/60 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Configurações de Dados</h3>
                <div className="nm-card p-6 flex flex-col gap-8">
                    {/* Dia de Fechamento */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">calendar_today</span>
                                <p className="font-black text-content leading-none">Dia de Fechamento Padrão</p>
                            </div>
                            <span className="text-2xl font-black text-primary">{fechamento.toString().padStart(2, '0')}</span>
                        </div>
                        <input 
                            className="w-full h-2 bg-secondary/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                            max="31" 
                            min="1" 
                            type="range" 
                            value={fechamento}
                            onChange={(e) => setFechamento(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="h-px bg-content/5"></div>

                    {/* Meta de Economia */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">savings</span>
                                <p className="font-black text-content leading-none">Meta de Economia Mensal</p>
                            </div>
                            <span className="text-2xl font-black text-primary">{savingsGoal}%</span>
                        </div>
                        <input 
                            className="w-full h-2 bg-secondary/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                            max="50" 
                            min="5" 
                            step="5"
                            type="range" 
                            value={savingsGoal}
                            onChange={(e) => setSavingsGoal(parseInt(e.target.value))}
                        />
                        <p className="text-[10px] text-dim font-medium text-center italic">
                            O app irá te notificar quando você guardar esta porcentagem da sua renda.
                        </p>
                    </div>

                    <div className="h-px bg-content/5"></div>

                    {/* Modo Privacidade */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-primary">visibility_off</span>
                            <div>
                                <p className="font-black text-content leading-none">Modo Privacidade</p>
                                <p className="text-xs text-dim font-bold mt-1">Ocultar valores em locais públicos</p>
                            </div>
                        </div>
                        <button 
                             onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                             className={`
                                relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                                ${isPrivacyMode ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'}
                             `}
                        >
                             <span className={`
                                pointer-events-none relative inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                ${isPrivacyMode ? 'translate-x-5' : 'translate-x-0'}
                             `}>
                             </span>
                        </button>
                    </div>
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
