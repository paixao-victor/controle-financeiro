import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSettings } from '@/contexts/SettingsContext';

interface SettingsProps {
    onNavigate: (tab: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const [fechamento, setFechamento] = useState(5);
    const { theme, toggleTheme } = useTheme();
    const { currentCurrency, setCurrentCurrency } = useTransactions();
    const { 
        primaryColor, setPrimaryColor, 
        savingsGoal, setSavingsGoal,
        isPrivacyMode, setIsPrivacyMode
    } = useSettings();

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const colorOptions = [
        { name: 'Padrão', color: '#47f425' },
        { name: 'Ciano', color: '#06b6d4' },
        { name: 'Violeta', color: '#8b5cf6' },
        { name: 'Rosa', color: '#ec4899' },
        { name: 'Laranja', color: '#f97316' },
        { name: 'Amarelo', color: '#eab308' },
    ];

    return (
        <div className="flex flex-col gap-10 animate-fade-up max-w-4xl mx-auto w-full pb-20 px-4 lg:px-0">
            {/* Título e Botão Voltar (Apenas Mobile, no corpo) */}
            <div className="md:hidden flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-content uppercase tracking-tight">Preferências</h2>
                <button 
                    onClick={() => onNavigate('Perfil')}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Voltar
                </button>
            </div>
            {/* Seção 1: Aparência */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-primary">palette</span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Aparência</h3>
                </div>
                <div className="nm-card p-6 space-y-8">
                    {/* Tema */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-black text-content">Tema do Sistema</p>
                            <p className="text-xs text-dim font-bold mt-1">Alternar entre modo claro e escuro</p>
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
                                 <span className="absolute inset-0 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-[12px] text-primary">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                                 </span>
                             </span>
                        </button>
                    </div>

                    <div className="h-px bg-content/5"></div>

                    {/* Cor de Destaque */}
                    <div className="space-y-4">
                        <div>
                            <p className="font-black text-content">Identidade Visual</p>
                            <p className="text-xs text-dim font-bold mt-1">Escolha a cor principal do aplicativo</p>
                        </div>
                        <div className="flex flex-wrap gap-3 p-3 bg-secondary/5 dark:bg-white/5 rounded-2xl">
                            {colorOptions.map((opt) => (
                                <button
                                    key={opt.color}
                                    onClick={() => setPrimaryColor(opt.color)}
                                    className={`size-10 rounded-xl border-2 transition-all flex items-center justify-center ${primaryColor === opt.color ? 'border-primary bg-primary/10 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                    title={opt.name}
                                >
                                    <div className="size-6 rounded-lg shadow-sm" style={{ backgroundColor: opt.color }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção 2: Financeiro */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-primary">payments</span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Financeiro</h3>
                </div>
                <div className="nm-card p-6 space-y-8">
                    {/* Moeda */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-black text-content">Moeda Padrão</p>
                            <p className="text-xs text-dim font-bold mt-1">Utilizada em todos os cálculos</p>
                        </div>
                        <div className="flex bg-secondary/10 dark:bg-white/5 p-1 rounded-xl">
                            {['BRL', 'USD'].map(curr => (
                                <button 
                                    key={curr}
                                    onClick={() => setCurrentCurrency(curr as any)}
                                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${currentCurrency === curr ? 'bg-primary text-secondary shadow-lg' : 'text-dim hover:text-content'}`}
                                >
                                    {curr}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-content/5"></div>

                    {/* Dia de Fechamento */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-black text-content">Fechamento do Mês</p>
                                <p className="text-xs text-dim font-bold mt-1">Dia de reinício do ciclo financeiro</p>
                            </div>
                            <span className="text-2xl font-black text-primary nm-card size-12 flex items-center justify-center rounded-xl">{fechamento}</span>
                        </div>
                        <input 
                            className="w-full h-2 bg-secondary/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                            max="31" min="1" type="range" 
                            value={fechamento}
                            onChange={(e) => setFechamento(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="h-px bg-content/5"></div>

                    {/* Meta de Economia */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-black text-content">Meta de Economia</p>
                                <p className="text-xs text-dim font-bold mt-1">Porcentagem ideal para guardar</p>
                            </div>
                            <span className="text-2xl font-black text-primary nm-card px-4 h-12 flex items-center justify-center rounded-xl">{savingsGoal}%</span>
                        </div>
                        <input 
                            className="w-full h-2 bg-secondary/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                            max="50" min="5" step="5" type="range" 
                            value={savingsGoal}
                            onChange={(e) => setSavingsGoal(parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </section>

            {/* Seção 3: Privacidade e Segurança */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-primary">security</span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Privacidade</h3>
                </div>
                <div className="nm-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-black text-content">Modo Privacidade</p>
                            <p className="text-xs text-dim font-bold mt-1">Ocultar saldos e valores na interface</p>
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

            {/* Seção 4: Sistema e Dados */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-primary">database</span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Sistema</h3>
                </div>
                <div className="nm-card p-2 space-y-1">
                    <button 
                        onClick={() => onNavigate('Importar Dados')}
                        className="w-full flex items-center justify-between p-4 hover:bg-content/5 rounded-2xl transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">upload_file</span>
                            </div>
                            <div className="text-left">
                                <p className="font-black text-content">Importar / Exportar Dados</p>
                                <p className="text-xs text-dim font-bold">CSV, backup e restauração</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                    
                    <button 
                        className="w-full flex items-center justify-between p-4 hover:bg-content/5 rounded-2xl transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                <span className="material-symbols-outlined">cloud_sync</span>
                            </div>
                            <div className="text-left">
                                <p className="font-black text-content">Sincronização Cloud</p>
                                <p className="text-xs text-dim font-bold">Gerenciar backup automático</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                </div>
            </section>

            <div className="pt-4 flex flex-col items-center gap-4">
                <p className="text-[10px] font-bold text-dim uppercase tracking-widest opacity-40 text-center">
                    Versão 2.4.0 • Controle Financeiro Pro
                </p>
            </div>
        </div>
    );
};

export default Settings;
