import React, { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import BottomSheetSelect from './BottomSheetSelect';
import { motion, AnimatePresence } from 'framer-motion';

import type { PredictedIncome } from '@/types';

const PredictedIncomesManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { availableCategories, predictedIncomes: incomes, addPredictedIncome, updatePredictedIncome, deletePredictedIncome, accounts } = useTransactions();
    
    const PREDICTED_COLORS = [
        '#47f425', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
        '#06b6d4', '#10b981', '#f97316', '#a855f7', '#64748b', '#eab308'
    ];

    // Estados de controle
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newIncome, setNewIncome] = useState<{
        subcategory: string;
        amount: string;
        predictedAmount: string;
        category: string;
        receiveDay: string;
        icon: string;
        color: string;
        targetAccount: string;
        recurrencePeriod: 'once' | 'monthly' | 'yearly' | 'custom';
        customInterval: number;
        customPeriod: 'days' | 'weeks' | 'months' | 'years';
    }>({ 
        subcategory: '', 
        amount: '0,00', 
        predictedAmount: '0,00',
        category: '', 
        receiveDay: '1', 
        icon: 'attach_money',
        color: PREDICTED_COLORS[0],
        targetAccount: '',
        recurrencePeriod: 'monthly',
        customInterval: 1,
        customPeriod: 'months'
    });

    // Estados dos Sheets
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);
    const [isReceiveDaySheetOpen, setIsReceiveDaySheetOpen] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
    const [isRecurrenceSheetOpen, setIsRecurrenceSheetOpen] = useState(false);
    const [isCustomPeriodSheetOpen, setIsCustomPeriodSheetOpen] = useState(false);
    
    const DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        label: `Dia ${i + 1}`,
        icon: 'calendar_today'
    }));

    const RECURRENCE_OPTIONS = [
        { id: 'once', label: 'Uma vez', icon: 'looks_one' },
        { id: 'monthly', label: 'Mensal', icon: 'calendar_month' },
        { id: 'yearly', label: 'Anual', icon: 'event' },
        { id: 'custom', label: 'Personalizado...', icon: 'settings_backup_restore' }
    ];

    const PERIOD_OPTIONS = [
        { id: 'days', label: 'Dias', icon: 'today' },
        { id: 'weeks', label: 'Semanas', icon: 'date_range' },
        { id: 'months', label: 'Meses', icon: 'calendar_month' },
        { id: 'years', label: 'Anos', icon: 'event' }
    ];

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'amount' | 'predictedAmount' = 'amount') => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') value = '0';
        
        if (value.length > 1) {
            value = value.replace(/^0+/, '');
            if (value === '') value = '0';
        }

        const floatValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(floatValue);
        setNewIncome({ ...newIncome, [field]: formatted });
    };

    const handleAdd = () => {
        if (newIncome.subcategory && newIncome.amount && newIncome.category) {
            const numericAmount = parseFloat(newIncome.amount.replace(/\./g, '').replace(',', '.'));
            const numericPredicted = parseFloat(newIncome.predictedAmount.replace(/\./g, '').replace(',', '.'));
            
            if (editingId) {
                updatePredictedIncome({
                    id: editingId,
                    subcategory: newIncome.subcategory,
                    amount: numericAmount,
                    predictedAmount: numericPredicted,
                    category: newIncome.category,
                    receiveDay: parseInt(newIncome.receiveDay),
                    icon: newIncome.icon,
                    color: newIncome.color,
                    targetAccount: newIncome.targetAccount,
                    recurrencePeriod: newIncome.recurrencePeriod as any,
                    customInterval: newIncome.customInterval,
                    customPeriod: newIncome.customPeriod as any
                });
                setEditingId(null);
            } else {
                addPredictedIncome({
                    id: Date.now().toString(),
                    subcategory: newIncome.subcategory,
                    amount: numericAmount,
                    predictedAmount: numericPredicted,
                    category: newIncome.category,
                    receiveDay: parseInt(newIncome.receiveDay),
                    icon: newIncome.icon,
                    color: newIncome.color,
                    targetAccount: newIncome.targetAccount,
                    recurrencePeriod: newIncome.recurrencePeriod as any,
                    customInterval: newIncome.customInterval,
                    customPeriod: newIncome.customPeriod as any
                });
                setIsAdding(false);
            }
            resetForm();
        }
    };

    const handleEdit = (income: PredictedIncome) => {
        setNewIncome({
            subcategory: income.subcategory,
            amount: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(income.amount),
            predictedAmount: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(income.predictedAmount || 0),
            category: income.category,
            receiveDay: income.receiveDay.toString(),
            icon: income.icon,
            color: income.color || PREDICTED_COLORS[0],
            targetAccount: income.targetAccount || '',
            recurrencePeriod: income.recurrencePeriod || 'monthly',
            customInterval: income.customInterval || 1,
            customPeriod: income.customPeriod || 'months'
        });
        setEditingId(income.id);
        setIsAdding(false);
    };

    const resetForm = () => {
        setNewIncome({ 
            subcategory: '', 
            amount: '0,00', 
            predictedAmount: '0,00', 
            category: '', 
            receiveDay: '1', 
            icon: 'attach_money', 
            color: PREDICTED_COLORS[0],
            targetAccount: '',
            recurrencePeriod: 'monthly',
            customInterval: 1,
            customPeriod: 'months'
        });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta receita prevista?')) {
            deletePredictedIncome(id);
            if (editingId === id) setEditingId(null);
        }
    };

    // Obter subcategorias disponíveis
    const selectedCategory = availableCategories.income.find(c => c.label === newIncome.category);
    const availableSubcategories = selectedCategory?.subcategories || [];

    const exportToCSV = () => {
        const headers = ['Subcategoria', 'Valor Atual', 'Valor Previsto', 'Categoria', 'Recebimento', 'Conta Destino', 'Recorrência', 'Ícone'];
        const rows = incomes.map(e => [
            e.subcategory,
            e.amount.toFixed(2),
            (e.predictedAmount || 0).toFixed(2),
            e.category,
            e.receiveDay.toString(),
            accounts.find(a => String(a.id) === String(e.targetAccount))?.name || 'Sem conta',
            e.recurrencePeriod === 'custom' ? `A cada ${e.customInterval} ${e.customPeriod}` : e.recurrencePeriod,
            e.icon
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `receitas_previstas_${new Date().toISOString().split('T')[0]}.csv`);
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
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Receitas Previstas</h1>
                    <p className="text-dim text-xs font-medium">Gerencie suas receitas recorrentes mensais</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all font-bold"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* Incomes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 custom-scrollbar">
                {incomes.map(income => (
                    <div key={income.id} className="space-y-2">
                        <div 
                            onClick={() => {
                                if (editingId === income.id) {
                                    setEditingId(null);
                                    resetForm();
                                } else {
                                    handleEdit(income);
                                }
                            }}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border transition-all cursor-pointer ${
                                editingId === income.id 
                                ? 'border-primary shadow-lg ring-1 ring-primary' 
                                : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors`}
                                        style={{ backgroundColor: income.color || '#47f425', color: '#1c2c1c' }}
                                    >
                                        <span className="material-symbols-outlined text-2xl font-bold">{income.icon}</span>
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${editingId === income.id ? 'text-primary' : 'text-content'}`}>{income.subcategory}</p>
                                        <p className="text-xs text-dim">
                                            {income.category} • Dia {income.receiveDay} • {accounts.find(a => String(a.id) === String(income.targetAccount))?.name || 'Sem conta'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-lg text-content">R$ {income.amount.toFixed(2)}</p>
                                    {editingId === income.id ? (
                                        <span className="material-symbols-outlined text-primary">expand_less</span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(income.id);
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
                            {editingId === income.id && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-4 mb-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Categoria</label>
                                                <button 
                                                    onClick={() => setIsCategorySheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between group"
                                                >
                                                    <span className="truncate">{newIncome.category || 'Selecionar'}</span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Subcategoria</label>
                                                <button 
                                                    onClick={() => setIsSubcategorySheetOpen(true)}
                                                    disabled={!newIncome.category || availableSubcategories.length === 0}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between group disabled:opacity-50"
                                                >
                                                    <span className="truncate">{newIncome.subcategory || 'Nenhuma'}</span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Mensal</label>
                                                <input
                                                    inputMode="numeric"
                                                    value={newIncome.amount}
                                                    onChange={(e) => handleAmountChange(e, 'amount')}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Médio Previsto</label>
                                                <input
                                                    inputMode="numeric"
                                                    value={newIncome.predictedAmount}
                                                    onChange={(e) => handleAmountChange(e, 'predictedAmount')}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Recebimento</label>
                                                <button 
                                                    onClick={() => setIsReceiveDaySheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                >
                                                    <span>Dia {newIncome.receiveDay}</span>
                                                    <span className="material-symbols-outlined text-dim">calendar_today</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                                <button 
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3"
                                                >
                                                    <span className="material-symbols-outlined text-xl">{newIncome.icon}</span>
                                                    <span className="text-dim">Alterar</span>
                                                    <div className="flex-1" />
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Cor</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PREDICTED_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setNewIncome({ ...newIncome, color })}
                                                            className={`size-6 rounded-full transition-all ${newIncome.color === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Recorrência</label>
                                                <button 
                                                    onClick={() => setIsRecurrenceSheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-xl">
                                                            {RECURRENCE_OPTIONS.find(o => o.id === newIncome.recurrencePeriod)?.icon}
                                                        </span>
                                                        <span>{RECURRENCE_OPTIONS.find(o => o.id === newIncome.recurrencePeriod)?.label}</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            {newIncome.recurrencePeriod === 'custom' && (
                                                <>
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">A cada</label>
                                                        <input
                                                            type="number"
                                                            value={newIncome.customInterval}
                                                            onChange={(e) => setNewIncome({ ...newIncome, customInterval: parseInt(e.target.value) || 1 })}
                                                            className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                        />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Unidade</label>
                                                        <button 
                                                            onClick={() => setIsCustomPeriodSheetOpen(true)}
                                                            className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                        >
                                                            <span>{PERIOD_OPTIONS.find(o => o.id === newIncome.customPeriod)?.label}</span>
                                                            <span className="material-symbols-outlined text-dim">expand_more</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Conta de Destino</label>
                                                <button 
                                                    onClick={() => setIsAccountSheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {newIncome.targetAccount ? (
                                                            <>
                                                                <span className="material-symbols-outlined text-primary">account_balance</span>
                                                                <span>{accounts.find(a => String(a.id) === String(newIncome.targetAccount))?.name || 'Conta desconhecida'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-dim">Selecionar conta...</span>
                                                        )}
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

                {/* Empty State */}
                {incomes.length === 0 && !isAdding && (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">attach_money</span>
                        <p className="font-bold text-content">Nenhuma receita prevista</p>
                    </div>
                )}

                {/* Add New Income Form */}
                {isAdding && !editingId && (
                     <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-primary/50 space-y-4 animate-in zoom-in-95 duration-200">
                         <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-primary uppercase tracking-widest">Nova Receita Prevista</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Categoria</label>
                                <button onClick={() => setIsCategorySheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                    <span className="truncate">{newIncome.category || 'Selecionar'}</span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Subcategoria</label>
                                <button 
                                    onClick={() => setIsSubcategorySheetOpen(true)} 
                                    disabled={!newIncome.category || availableSubcategories.length === 0}
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between disabled:opacity-50"
                                >
                                    <span className="truncate">{newIncome.subcategory || 'Nenhuma'}</span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>

                             <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Mensal</label>
                                <input
                                    inputMode="numeric"
                                    value={newIncome.amount}
                                    onChange={(e) => handleAmountChange(e, 'amount')}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Médio Previsto</label>
                                <input
                                    inputMode="numeric"
                                    value={newIncome.predictedAmount}
                                    onChange={(e) => handleAmountChange(e, 'predictedAmount')}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Recebimento</label>
                                <button onClick={() => setIsReceiveDaySheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                    <span>Dia {newIncome.receiveDay}</span>
                                    <span className="material-symbols-outlined text-dim">calendar_today</span>
                                </button>
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                <button className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">{newIncome.icon}</span>
                                    <span className="text-dim">Alterar</span>
                                    <div className="flex-1" />
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Conta de Destino</label>
                                <button 
                                    onClick={() => setIsAccountSheetOpen(true)}
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        {newIncome.targetAccount ? (
                                            <>
                                                <span className="material-symbols-outlined text-primary">account_balance</span>
                                                <span>{accounts.find(a => String(a.id) === String(newIncome.targetAccount))?.name || 'Conta desconhecida'}</span>
                                            </>
                                        ) : (
                                            <span className="text-dim">Selecionar conta...</span>
                                        )}
                                    </div>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {PREDICTED_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewIncome({ ...newIncome, color })}
                                            className={`size-6 rounded-full transition-all ${newIncome.color === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleAdd} className="flex-1 py-3 bg-primary text-secondary font-black uppercase tracking-widest rounded-xl hover:brightness-110">Salvar</button>
                            <button onClick={resetForm} className="px-6 py-3 text-dim hover:text-content font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        </div>
                     </div>
                )}
            </div>

            {/* Sheets Globais */}
            <BottomSheetSelect 
                isOpen={isAccountSheetOpen}
                onClose={() => setIsAccountSheetOpen(false)}
                title="Selecionar Conta"
                selectedValue={newIncome.targetAccount}
                options={accounts
                    .filter(a => a.status !== 'deleted')
                    .map(acc => ({ id: acc.id, label: acc.name, icon: 'account_balance' }))
                }
                onSelect={(opt: any) => setNewIncome({ ...newIncome, targetAccount: String(opt.id) })}
            />
            <BottomSheetSelect 
                isOpen={isCategorySheetOpen}
                onClose={() => setIsCategorySheetOpen(false)}
                title="Selecionar Categoria"
                selectedValue={newIncome.category}
                options={availableCategories.income.map(cat => ({ id: cat.id, label: cat.label, icon: cat.icon }))}
                onSelect={(opt: any) => setNewIncome({ ...newIncome, category: opt.label, subcategory: '' })}
            />

            <BottomSheetSelect 
                isOpen={isSubcategorySheetOpen}
                onClose={() => setIsSubcategorySheetOpen(false)}
                title="Selecionar Subcategoria"
                selectedValue={newIncome.subcategory}
                options={availableSubcategories.map((sub, idx) => ({ 
                    id: idx, 
                    label: typeof sub === 'string' ? sub : sub.label, 
                    icon: typeof sub === 'string' ? 'subdirectory_arrow_right' : sub.icon 
                }))}
                onSelect={(opt: any) => setNewIncome({ ...newIncome, subcategory: opt.label })}
            />
            
            <BottomSheetSelect 
                isOpen={isReceiveDaySheetOpen}
                onClose={() => setIsReceiveDaySheetOpen(false)}
                title="Dia de Recebimento"
                selectedValue={parseInt(newIncome.receiveDay) || 1}
                options={DAYS_OPTIONS}
                onSelect={(opt: any) => setNewIncome({ ...newIncome, receiveDay: String(opt.id) })}
            />

            <BottomSheetSelect 
                isOpen={isRecurrenceSheetOpen}
                onClose={() => setIsRecurrenceSheetOpen(false)}
                title="Recorrência"
                selectedValue={newIncome.recurrencePeriod}
                options={RECURRENCE_OPTIONS}
                onSelect={(opt: any) => setNewIncome({ ...newIncome, recurrencePeriod: opt.id as any })}
            />

            <BottomSheetSelect 
                isOpen={isCustomPeriodSheetOpen}
                onClose={() => setIsCustomPeriodSheetOpen(false)}
                title="Unidade"
                selectedValue={newIncome.customPeriod}
                options={PERIOD_OPTIONS}
                onSelect={(opt: any) => setNewIncome({ ...newIncome, customPeriod: opt.id as any })}
            />

            {/* Fab button para adicionar */}
            {!isAdding && !editingId && (
                <button 
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="fixed bottom-10 right-10 size-14 bg-primary text-secondary rounded-full shadow-glow flex items-center justify-center active:scale-90 transition-all z-20 hover:scale-110"
                    title="Adicionar Receita Prevista"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">add</span>
                </button>
            )}
        </div>
    );
};

export default PredictedIncomesManagement;
