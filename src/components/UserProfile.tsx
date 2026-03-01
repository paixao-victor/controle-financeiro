import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import LiquidGauge from './LiquidGauge';
import { useTransactions } from '../contexts/TransactionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import UserAvatar from './UserAvatar';
import { checkConsistency } from '@/utils/consistencyChecker';
import CategoriesManagement from './CategoriesManagement';
import TransactionsManagement from './TransactionsManagement';
import AccountsManagement from './AccountsManagement';
import PredictedExpensesManagement from './PredictedExpensesManagement';
import PredictedIncomesManagement from './PredictedIncomesManagement';
import CardsManagement from './CardsManagement';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';

interface UserProfileProps {
    onNavigate: (tab: any) => void;
    onPhotoClick: () => void;
    profileAction?: any;
    setProfileAction?: any;
    onRequestLogout?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
    onNavigate, 
    onPhotoClick,
    profileAction,
    setProfileAction,
    onRequestLogout
}) => {
    const { addTransaction, calculateCurrentBalance, transactions, cards, accounts, updateAccount, predictedExpenses, predictedIncomes } = useTransactions() as any;
    const { logout, user, login } = useAuth();
    
    // Values from auth
    const userName = user?.name || 'Usuário';
    const userEmail = user?.email || (user?.username ? `${user.username}@finance.com` : '');
    const { addSystemNotification } = useNotifications();

    // UI States
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    const [targetBalance, setTargetBalance] = useState('');
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // Parallax Motion Values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 150 };
    const mouseXSpring = useSpring(mouseX, springConfig);
    const mouseYSpring = useSpring(mouseY, springConfig);

    const rotateX = useTransform(mouseYSpring, [-100, 100], [15, -15]);
    const rotateY = useTransform(mouseXSpring, [-100, 100], [-15, 15]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const currentBalance = calculateCurrentBalance();

    const handleSaveBalance = () => {
        const target = parseFloat(targetBalance.replace(',', '.'));
        if (isNaN(target)) return;

        const current = calculateCurrentBalance();
        const diff = target - current;

        // Create Adjustment Transaction
        if (diff !== 0) {
            const adjustmentTx: any = {
                id: crypto.randomUUID(),
                description: 'Ajuste Manual de Saldo',
                amount: Math.abs(diff),
                date: new Date().toISOString().split('T')[0],
                category: '📈 Ajuste',
                type: diff > 0 ? 'income' : 'expense',
                paymentMethod: 'Outros',
                recurring: false,
                installments: 1,
                isPaid: true,
                createdAt: new Date().toISOString()
            };
            addTransaction(adjustmentTx);

            if (accounts && accounts.length > 0) {
                const mainAccount = accounts[0];
                if (mainAccount) {
                    updateAccount(mainAccount.id, { 
                        balance: (mainAccount.balance || 0) + diff 
                    });
                }
            }
        }

        setIsEditingBalance(false);
        setTargetBalance('');
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-up max-w-5xl mx-auto w-full pb-20 px-4 lg:px-0">
            {/* 1. Header do Perfil */}
            <section className="nm-card p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                
                <motion.div 
                    className="relative group perspective-1000"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d"
                    }}
                >
                    <motion.div 
                        className="absolute -inset-2 rounded-full border-2 border-dashed border-primary/40 pointer-events-none"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        style={{ transformStyle: "preserve-3d" }}
                    />
                    
                    <motion.button 
                        onClick={onPhotoClick}
                        className="size-32 md:size-40 rounded-full p-1 bg-linear-to-tr from-primary/20 to-primary/10 shadow-2xl relative group/avatar"
                        style={{ translateZ: 50 }}
                    >
                        <UserAvatar 
                            size="size-full" 
                            showEditBadge={false}
                            className="border-4 border-background"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-3xl">edit</span>
                        </div>
                    </motion.button>
                    
                    <button 
                        onClick={onPhotoClick}
                        className="absolute bottom-1 right-1 size-10 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary border border-white/10 hover:scale-110 transition-transform z-100"
                        style={{ transform: 'translateZ(150px)', transformStyle: 'preserve-3d' }}
                    >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                    </button>
                </motion.div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h2 className="text-3xl font-black text-content uppercase tracking-tight">{userName}</h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Premium
                        </span>
                    </div>
                    <p className="text-dim font-bold">{userEmail}</p>
                    <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                        <button 
                            onClick={onPhotoClick}
                            className="px-6 py-2.5 bg-primary text-secondary rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-glow"
                        >
                            Editar Perfil
                        </button>
                        <button 
                            onClick={() => onNavigate('Configurações')}
                            className="px-6 py-2.5 bg-surface border border-white/5 rounded-xl font-black text-xs text-dim uppercase tracking-widest hover:text-content transition-all"
                        >
                            Preferências
                        </button>
                    </div>
                </div>
            </section>

            {/* 2. Resumo Financeiro */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                    onClick={() => {
                        setTargetBalance(currentBalance.toFixed(2).replace('.', ','));
                        setIsEditingBalance(true);
                    }}
                    className="nm-card p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/30 transition-all group"
                >
                    <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60">Saldo Consolidado</span>
                    <div className="text-center group-hover:scale-105 transition-transform">
                        <p className="text-3xl font-black text-content">
                            <span className="text-primary text-lg mr-1">R$</span>
                            {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <span className="text-[9px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-xs">edit</span> Ajustar Saldo
                    </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-1 md:grid-cols-2 gap-6 md:contents">
                    <div className="nm-card p-6 flex flex-col items-center justify-center gap-4">
                        <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60 text-center">Uso da Renda</span>
                        <LiquidGauge 
                            value={(() => {
                                const income = (transactions || []).filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
                                if (income <= 0) return 0;
                                return Math.min(100, Math.max(0, (currentBalance / income) * 100));
                            })()} 
                            size={70} 
                        />
                    </div>

                    <div className="nm-card p-6 flex flex-col items-center justify-center gap-4">
                        <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60 text-center">Taxa Economia</span>
                        <div className="text-center">
                            <p className="text-2xl md:text-3xl font-black text-green-500">24%</p>
                            <p className="text-[10px] font-bold text-dim mt-1">Este mês</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Meus Dados</h3>
                        </div>
                        <div className="nm-card p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                            <DataNavItem 
                                icon="category" 
                                label="Categorias" 
                                sub="Personalize seus gastos" 
                                onClick={() => setProfileAction?.('categories')} 
                            />
                            <DataNavItem 
                                icon="payments" 
                                label="Transações" 
                                sub="Histórico e edições" 
                                onClick={() => setProfileAction?.('transactions')} 
                            />
                            <DataNavItem 
                                icon="account_balance" 
                                label="Contas Bancárias" 
                                sub="Gerencie seus bancos" 
                                onClick={() => setProfileAction?.('accounts')} 
                            />
                            <DataNavItem 
                                icon="credit_card" 
                                label="Cartões" 
                                sub="Limites e bandeiras" 
                                onClick={() => setProfileAction?.('cards')} 
                            />
                            <DataNavItem 
                                icon="calendar_clock" 
                                label="Despesas Previstas" 
                                sub="Gastos recorrentes" 
                                onClick={() => setProfileAction?.('recurring')} 
                            />
                            <DataNavItem 
                                icon="trending_up" 
                                label="Receitas Previstas" 
                                sub="Entradas mensais" 
                                onClick={() => setProfileAction?.('recurring_incomes')} 
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">settings</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Preferências Rápidas</h3>
                        </div>
                        <div className="nm-card p-4 space-y-4">
                            <button 
                                onClick={() => onNavigate('Configurações')}
                                className="w-full flex items-center justify-between p-4 bg-content/5 rounded-2xl hover:bg-content/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary">settings</span>
                                    <span className="font-bold text-content">Configurações do Aplicativo</span>
                                </div>
                                <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                            <button 
                                onClick={() => {
                                    const count = checkConsistency(cards, accounts, addSystemNotification, transactions, predictedExpenses, predictedIncomes);
                                    if (count > 0) alert(`Foram encontradas ${count} inconsistências.`);
                                    else alert('Tudo parece certo!');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-content/5 rounded-2xl hover:bg-content/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary">fact_check</span>
                                    <span className="font-bold text-content">Verificar Consistência</span>
                                </div>
                                <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">security</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Segurança</h3>
                        </div>
                        <div className="nm-card p-4 space-y-1">
                            <button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center justify-between p-3 hover:bg-content/5 rounded-xl transition-colors group"
                            >
                                <span className="text-content font-bold text-sm">Alterar Senha</span>
                                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-red-500">account_circle</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-red-500/60">Minha Conta</h3>
                        </div>
                        <div className="nm-card p-4 space-y-4">
                            <button 
                                onClick={() => setShowSwitchConfirm(true)}
                                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all text-red-500 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/10 group top-level-logout-btn"
                            >
                                <span className="material-symbols-outlined text-lg">sync_alt</span>
                                Trocar de Conta
                            </button>
                            <button 
                                onClick={() => onRequestLogout ? onRequestLogout() : logout()}
                                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all text-red-500 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/10"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Sair do App
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {isEditingBalance && (
                 <div 
                    className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsEditingBalance(false)}
                >
                    <div 
                        className="bg-surface dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Editar Saldo</h3>
                            <button 
                                onClick={() => setIsEditingBalance(false)}
                                className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-dim">close</span>
                            </button>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-dim uppercase">Novo Saldo</label>
                            <input
                                autoFocus
                                value={targetBalance}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    value = (parseInt(value) / 100).toFixed(2).replace('.', ',');
                                    if (value === 'NaN') value = '0,00';
                                    setTargetBalance(value);
                                }}
                                className="w-full bg-transparent border-b-2 border-primary py-2 text-3xl font-black text-content outline-none text-center"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditingBalance(false)}
                                className="flex-1 py-3 text-dim font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveBalance}
                                className="flex-1 py-3 bg-primary text-secondary font-bold rounded-xl shadow-glow hover:brightness-110 transition-all"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="nm-card w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Alterar Senha</h3>
                            <p className="text-dim text-xs mt-2 font-bold uppercase tracking-widest">Segurança da Conta</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Senha Atual</label>
                                <input 
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Nova Senha</label>
                                <input 
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                                <input 
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={async () => {
                                    if (!passwords.current || !passwords.new || !passwords.confirm) {
                                        alert('Preencha todos os campos!');
                                        return;
                                    }
                                    
                                    try {
                                        // updateUser logic here
                                        alert('Senha alterada com sucesso!');
                                        setIsPasswordModalOpen(false);
                                    } catch (err: any) {
                                        alert(`Erro ao alterar senha: ${err.message}`);
                                    }
                                }}
                                className="w-full bg-primary text-secondary h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-glow hover:brightness-105 active:scale-95 transition-all"
                            >
                                Confirmar Alteração
                            </button>
                            <button 
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="w-full text-dim font-black py-2 hover:text-content transition-colors uppercase text-[10px] tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showSwitchConfirm}
                onClose={() => setShowSwitchConfirm(false)}
                onConfirm={() => {
                    setShowSwitchConfirm(false);
                    logout();
                }}
                title="Trocar de Conta?"
                message="Você vai sair da conta atual para entrar em outra."
                confirmText="Sim, Trocar Conta"
                cancelText="Manter Logado"
                icon="sync_alt"
                type="warning"
            />

            <Modal isOpen={profileAction === 'categories'} onClose={() => setProfileAction?.(null)}>
                <CategoriesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'transactions'} onClose={() => setProfileAction?.(null)}>
                <TransactionsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'accounts'} onClose={() => setProfileAction?.(null)}>
                <AccountsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'recurring'} onClose={() => setProfileAction?.(null)}>
                <PredictedExpensesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>

            <Modal isOpen={profileAction === 'recurring_incomes'} onClose={() => setProfileAction?.(null)}>
                <PredictedIncomesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>

            <Modal isOpen={profileAction === 'cards'} onClose={() => setProfileAction?.(null)}>
                <CardsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
        </div>
    );
};

const DataNavItem: React.FC<{ icon: string, label: string, sub: string, onClick: () => void }> = ({ icon, label, sub, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center justify-between p-4 hover:bg-content/5 rounded-2xl transition-all group text-left"
    >
        <div className="flex items-center gap-4">
            <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
                <p className="font-black text-content text-sm leading-tight">{label}</p>
                <p className="text-[10px] font-bold text-dim uppercase tracking-widest mt-0.5">{sub}</p>
            </div>
        </div>
        <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
    </button>
);

export default UserProfile;
