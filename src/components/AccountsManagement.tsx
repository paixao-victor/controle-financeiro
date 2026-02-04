import React, { useState, useRef } from 'react';
import BottomSheetIconSelector from './BottomSheetIconSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions } from '../contexts/TransactionsContext';
import type { Account } from '../types';

const AccountsManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { accounts, addAccount, updateAccount, deleteAccount } = useTransactions();
    
    // Estados de edição e adição
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Estado formulário (unificado para add e edit)
    const [formData, setFormData] = useState({
        name: '',
        icon: 'account_balance',
        balance: '0,00'
    });

    const [isIconSheetOpen, setIsIconSheetOpen] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') value = '0';
        
        if (value.length > 1) {
            value = value.replace(/^0+/, '');
            if (value === '') value = '0';
        }

        const floatValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(floatValue);
        setFormData({ ...formData, balance: formatted });
    };

    const handleAdd = () => {
        if (formData.name.trim()) {
            const numericBalance = parseFloat(formData.balance.replace(/\./g, '').replace(',', '.'));
            
            if (editingId) {
                updateAccount(editingId, {
                    name: formData.name,
                    icon: formData.icon,
                    balance: numericBalance
                });
                setEditingId(null);
            } else {
                const newAccount: Account = {
                    id: Date.now().toString(),
                    name: formData.name,
                    icon: formData.icon,
                    balance: numericBalance
                };
                addAccount(newAccount);
                setIsAdding(false);
            }
            resetForm();
        }
    };

    const handleEdit = (account: Account) => {
        setFormData({
            name: account.name,
            icon: account.icon,
            balance: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(account.balance)
        });
        setEditingId(account.id);
        setIsAdding(false);
    };

    const resetForm = () => {
        setFormData({ name: '', icon: 'account_balance', balance: '0,00' });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            deleteAccount(id);
            if (editingId === id) resetForm();
        }
    };

    const exportToCSV = () => {
        const headers = ['Nome', 'Saldo', 'Ícone'];
        const rows = accounts.map(a => [
            a.name,
            a.balance.toFixed(2),
            a.icon
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `contas_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    return (
        <div className="flex flex-col h-full bg-background p-4 md:p-8 animate-in fade-in duration-300 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack}
                    className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-content">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Gerenciar Contas</h1>
                    <p className="text-dim text-xs font-medium">Adicione e gerencie suas contas bancárias</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all font-bold"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* Accounts List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 custom-scrollbar">
                {accounts.filter(acc => acc.status !== 'deleted').map(account => (
                    <div key={account.id} className="space-y-2">
                        <div 
                            onClick={() => {
                                if (editingId === account.id) {
                                    setEditingId(null);
                                    resetForm();
                                } else {
                                    handleEdit(account);
                                }
                            }}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border transition-all cursor-pointer ${
                                editingId === account.id 
                                ? 'border-primary shadow-lg ring-1 ring-primary' 
                                : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${
                                        editingId === account.id 
                                        ? 'bg-primary text-secondary' 
                                        : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500'
                                    }`}>
                                        <span className="material-symbols-outlined text-2xl font-bold">{account.icon}</span>
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${editingId === account.id ? 'text-primary' : 'text-content'}`}>{account.name}</p>
                                        <p className="text-xs text-dim">Saldo Atual</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-lg text-content">R$ {account.balance.toFixed(2)}</p>
                                    {editingId === account.id ? (
                                        <span className="material-symbols-outlined text-primary">expand_less</span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(account.id);
                                            }}
                                            className="size-8 rounded-full hover:bg-red-500/10 text-dim hover:text-red-500 flex items-center justify-center transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Formulário de Edição Expandido */}
                        <AnimatePresence>
                            {editingId === account.id && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-4 mb-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Nome da Conta</label>
                                                <input
                                                    value={formData.name}
                                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                                    placeholder="Ex: Banco Itaú..."
                                                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/20 rounded-xl px-4 py-3 font-bold text-content outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Saldo Inicial</label>
                                                <input
                                                    inputMode="numeric"
                                                    value={formData.balance}
                                                    onChange={handleAmountChange}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                                <button 
                                                    onClick={() => setIsIconSheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3 justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-xl">{formData.icon}</span>
                                                        <span className="text-dim text-xs">Alterar</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button 
                                                onClick={handleAdd}
                                                className="flex-1 py-3 bg-primary text-secondary font-black uppercase tracking-widest rounded-xl hover:brightness-110"
                                            >
                                                Salvar Alterações
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingId(null);
                                                    resetForm();
                                                }}
                                                className="px-6 py-3 text-dim hover:text-content font-bold uppercase text-[10px] tracking-widest"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {/* Adding New Account Form (Inline) */}
                 {isAdding && !editingId && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-primary/50 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-xs font-black text-primary uppercase tracking-widest">Nova Conta</h3>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Nome da Conta</label>
                                <input
                                    autoFocus
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: Nubank..."
                                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/20 rounded-xl px-4 py-3 font-bold text-content outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Saldo Inicial</label>
                                <input
                                    inputMode="numeric"
                                    value={formData.balance}
                                    onChange={handleAmountChange}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                <button 
                                    onClick={() => setIsIconSheetOpen(true)}
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3 justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xl">{formData.icon}</span>
                                        <span className="text-dim text-xs">Alterar</span>
                                    </div>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                             <button onClick={handleAdd} className="flex-1 py-3 bg-primary text-secondary font-black uppercase tracking-widest rounded-xl hover:brightness-110">Salvar</button>
                             <button onClick={resetForm} className="px-6 py-3 text-dim hover:text-content font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        </div>
                    </div>
                )}
            </div>

             <BottomSheetIconSelector 
                isOpen={isIconSheetOpen}
                onClose={() => setIsIconSheetOpen(false)}
                title="Selecionar Ícone"
                selectedIcon={formData.icon}
                onSelect={(icon) => setFormData({ ...formData, icon })}
            />

            {/* Fab button para adicionar */}
            {!isAdding && !editingId && (
                <button 
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="fixed bottom-10 right-10 size-14 bg-primary text-secondary rounded-full shadow-glow flex items-center justify-center active:scale-90 transition-all z-20 hover:scale-110"
                    title="Adicionar Conta"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">add</span>
                </button>
            )}
        </div>
    );
};

export default AccountsManagement;
