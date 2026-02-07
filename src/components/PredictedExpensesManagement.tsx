import React, { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import BottomSheetSelect from './BottomSheetSelect';
import BottomSheetIconSelector from './BottomSheetIconSelector';
import { motion, AnimatePresence } from 'framer-motion';

import type { PredictedExpense } from '@/types';

const PredictedExpensesManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { availableCategories, predictedExpenses: expenses, addPredictedExpense, updatePredictedExpense, deletePredictedExpense, cards, accounts } = useTransactions();
    
    const PREDICTED_COLORS = [
        '#47f425', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
        '#06b6d4', '#10b981', '#f97316', '#a855f7', '#64748b', '#eab308'
    ];

    // Estados de controle
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newExpense, setNewExpense] = useState({ 
        subcategory: '', 
        amount: '0,00', 
        predictedAmount: '0,00',
        category: '', 
        dueDay: '1', 
        icon: 'payments',
        color: PREDICTED_COLORS[0],
        paymentMethod: 'cartao' as 'banco' | 'cartao',
        cardId: '',
        accountId: ''
    });

    // Estados dos Sheets
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);
    const [isDueDaySheetOpen, setIsDueDaySheetOpen] = useState(false);
    const [isIconSheetOpen, setIsIconSheetOpen] = useState(false);
    const [isPaymentMethodSheetOpen, setIsPaymentMethodSheetOpen] = useState(false);
    const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
    
    const DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        label: `Dia ${i + 1}`,
        icon: 'calendar_today'
    }));

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'amount' | 'predictedAmount' = 'amount') => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') value = '0';
        
        if (value.length > 1) {
            value = value.replace(/^0+/, '');
            if (value === '') value = '0';
        }

        const floatValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(floatValue);
        setNewExpense({ ...newExpense, [field]: formatted });
    };

    const handleAdd = () => {
        if (newExpense.subcategory && newExpense.amount && newExpense.category) {
            const numericAmount = parseFloat(newExpense.amount.replace(/\./g, '').replace(',', '.'));
            const numericPredicted = parseFloat(newExpense.predictedAmount.replace(/\./g, '').replace(',', '.'));
            
            if (editingId) {
                updatePredictedExpense({
                    id: editingId,
                    subcategory: newExpense.subcategory,
                    amount: numericAmount,
                    predictedAmount: numericPredicted,
                    category: newExpense.category,
                    dueDay: parseInt(newExpense.dueDay),
                    icon: newExpense.icon,
                    color: newExpense.color,
                    paymentMethod: newExpense.paymentMethod,
                    cardId: newExpense.paymentMethod === 'cartao' ? newExpense.cardId : undefined,
                    accountId: newExpense.paymentMethod === 'banco' ? newExpense.accountId : undefined
                });
                setEditingId(null);
            } else {
                addPredictedExpense({
                    id: Date.now().toString(),
                    subcategory: newExpense.subcategory,
                    amount: numericAmount,
                    predictedAmount: numericPredicted,
                    category: newExpense.category,
                    dueDay: parseInt(newExpense.dueDay),
                    icon: newExpense.icon,
                    color: newExpense.color,
                    paymentMethod: newExpense.paymentMethod,
                    cardId: newExpense.paymentMethod === 'cartao' ? newExpense.cardId : undefined,
                    accountId: newExpense.paymentMethod === 'banco' ? newExpense.accountId : undefined
                });
                setIsAdding(false);
            }
            resetForm();
        }
    };

    const handleEdit = (expense: PredictedExpense) => {
        setNewExpense({
            subcategory: expense.subcategory,
            amount: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(expense.amount),
            predictedAmount: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(expense.predictedAmount || 0),
            category: expense.category,
            dueDay: expense.dueDay.toString(),
            icon: expense.icon,
            color: expense.color || PREDICTED_COLORS[0],
            paymentMethod: expense.paymentMethod || 'cartao',
            cardId: expense.cardId || '',
            accountId: expense.accountId || ''
        });
        setEditingId(expense.id);
        setIsAdding(false);
    };

    const resetForm = () => {
        setNewExpense({ 
            subcategory: '', 
            amount: '0,00', 
            predictedAmount: '0,00', 
            category: '', 
            dueDay: '1', 
            icon: 'payments', 
            color: PREDICTED_COLORS[0],
            paymentMethod: 'cartao',
            cardId: '',
            accountId: ''
        });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta despesa prevista?')) {
            deletePredictedExpense(id);
            if (editingId === id) setEditingId(null);
        }
    };

    // Obter subcategorias disponíveis
    const selectedCategory = availableCategories.expense.find(c => c.label === newExpense.category);
    const availableSubcategories = selectedCategory?.subcategories || [];

    const exportToCSV = () => {
        const headers = ['Subcategoria', 'Valor Atual', 'Valor Previsto', 'Categoria', 'Vencimento', 'Ícone'];
        const rows = expenses.map(e => [
            e.subcategory,
            e.amount.toFixed(2),
            (e.predictedAmount || 0).toFixed(2),
            e.category,
            e.dueDay.toString(),
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
        link.setAttribute('download', `despesas_previstas_${new Date().toISOString().split('T')[0]}.csv`);
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
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Despesas Previstas</h1>
                    <p className="text-dim text-xs font-medium">Gerencie suas despesas recorrentes mensais</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all font-bold"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* Expenses List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 custom-scrollbar">
                {expenses.map(expense => (
                    <div key={expense.id} className="space-y-2">
                        <div 
                            onClick={() => {
                                if (editingId === expense.id) {
                                    setEditingId(null);
                                    resetForm();
                                } else {
                                    handleEdit(expense);
                                }
                            }}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border transition-all cursor-pointer ${
                                editingId === expense.id 
                                ? 'border-primary shadow-lg ring-1 ring-primary' 
                                : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors`}
                                        style={{ backgroundColor: expense.color || '#47f425', color: '#1c2c1c' }}
                                    >
                                        <span className="material-symbols-outlined text-2xl font-bold">{expense.icon}</span>
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${editingId === expense.id ? 'text-primary' : 'text-content'}`}>
                                            {expense.subcategory.split(':')[0].trim()}
                                        </p>
                                        <p className="text-xs text-dim">
                                            {expense.category} • Vence dia {expense.dueDay}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-lg text-content">R$ {expense.amount.toFixed(2)}</p>
                                    {editingId === expense.id ? (
                                        <span className="material-symbols-outlined text-primary">expand_less</span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(expense.id);
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
                            {editingId === expense.id && (
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
                                                    <span className="truncate">{newExpense.category || 'Selecionar'}</span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Subcategoria</label>
                                                <button 
                                                    onClick={() => setIsSubcategorySheetOpen(true)} 
                                                    disabled={!newExpense.category || availableSubcategories.length === 0}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between group disabled:opacity-50"
                                                >
                                                    <span className="truncate">
                                                        {newExpense.subcategory 
                                                            ? newExpense.subcategory.split(':')[0].trim() 
                                                            : 'Nenhuma'}
                                                    </span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Mensal</label>
                                                <input
                                                    inputMode="numeric"
                                                    value={newExpense.amount}
                                                    onChange={(e) => handleAmountChange(e, 'amount')}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Médio Previsto</label>
                                                <input
                                                    inputMode="numeric"
                                                    value={newExpense.predictedAmount}
                                                    onChange={(e) => handleAmountChange(e, 'predictedAmount')}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Vencimento</label>
                                                <button 
                                                    onClick={() => setIsDueDaySheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                >
                                                    <span>Dia {newExpense.dueDay}</span>
                                                    <span className="material-symbols-outlined text-dim">calendar_today</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                                <button 
                                                    onClick={() => setIsIconSheetOpen(true)}
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3"
                                                >
                                                    <span className="material-symbols-outlined text-xl">{newExpense.icon}</span>
                                                    <span className="text-dim">Alterar</span>
                                                    <div className="flex-1" />
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Forma de Pagamento</label>
                                                <button onClick={() => setIsPaymentMethodSheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                                    <span className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary">{newExpense.paymentMethod === 'cartao' ? 'credit_card' : 'account_balance'}</span>
                                                        {newExpense.paymentMethod === 'cartao' ? 'Cartão de Crédito' : 'Conta Bancária'}
                                                    </span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">
                                                    {newExpense.paymentMethod === 'cartao' ? 'Cartão' : 'Conta'}
                                                </label>
                                                <button 
                                                    onClick={() => newExpense.paymentMethod === 'cartao' ? setIsCardSheetOpen(true) : setIsAccountSheetOpen(true)} 
                                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                                >
                                                    <span className="truncate">
                                                        {newExpense.paymentMethod === 'cartao' 
                                                            ? (cards.find(c => c.id === newExpense.cardId)?.alias || 'Selecionar Cartão')
                                                            : (accounts.find(a => a.id === newExpense.accountId)?.name || 'Selecionar Conta')
                                                        }
                                                    </span>
                                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                                </button>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Cor</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PREDICTED_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setNewExpense({ ...newExpense, color })}
                                                            className={`size-6 rounded-full transition-all ${newExpense.color === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
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
                {expenses.length === 0 && !isAdding && (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">payments</span>
                        <p className="font-bold text-content">Nenhuma despesa prevista</p>
                    </div>
                )}

                {/* Add New Expense Form */}
                {isAdding && !editingId && (
                     <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-primary/50 space-y-4 animate-in zoom-in-95 duration-200">
                         <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-primary uppercase tracking-widest">Nova Despesa Prevista</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Categoria</label>
                                <button onClick={() => setIsCategorySheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                    <span className="truncate">{newExpense.category || 'Selecionar'}</span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Subcategoria</label>
                                <button 
                                    onClick={() => setIsSubcategorySheetOpen(true)} 
                                    disabled={!newExpense.category || availableSubcategories.length === 0}
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between disabled:opacity-50"
                                >
                                    <span className="truncate">
                                        {newExpense.subcategory 
                                            ? newExpense.subcategory.split(':')[0].trim() 
                                            : 'Nenhuma'}
                                    </span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>

                             <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Mensal</label>
                                <input
                                    inputMode="numeric"
                                    value={newExpense.amount}
                                    onChange={(e) => handleAmountChange(e, 'amount')}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Valor Médio Previsto</label>
                                <input
                                    inputMode="numeric"
                                    value={newExpense.predictedAmount}
                                    onChange={(e) => handleAmountChange(e, 'predictedAmount')}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Vencimento</label>
                                <button onClick={() => setIsDueDaySheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                    <span>Dia {newExpense.dueDay}</span>
                                    <span className="material-symbols-outlined text-dim">calendar_today</span>
                                </button>
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                <button onClick={() => setIsIconSheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">{newExpense.icon}</span>
                                    <span className="text-dim">Alterar</span>
                                    <div className="flex-1" />
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Forma de Pagamento</label>
                                <button onClick={() => setIsPaymentMethodSheetOpen(true)} className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">{newExpense.paymentMethod === 'cartao' ? 'credit_card' : 'account_balance'}</span>
                                        {newExpense.paymentMethod === 'cartao' ? 'Cartão de Crédito' : 'Conta Bancária'}
                                    </span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">
                                    {newExpense.paymentMethod === 'cartao' ? 'Cartão' : 'Conta'}
                                </label>
                                <button 
                                    onClick={() => newExpense.paymentMethod === 'cartao' ? setIsCardSheetOpen(true) : setIsAccountSheetOpen(true)} 
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center justify-between"
                                >
                                    <span className="truncate">
                                        {newExpense.paymentMethod === 'cartao' 
                                            ? (cards.find(c => c.id === newExpense.cardId)?.alias || 'Selecionar Cartão')
                                            : (accounts.find(a => a.id === newExpense.accountId)?.name || 'Selecionar Conta')
                                        }
                                    </span>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {PREDICTED_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewExpense({ ...newExpense, color })}
                                            className={`size-6 rounded-full transition-all ${newExpense.color === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''}`}
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
                isOpen={isCategorySheetOpen}
                onClose={() => setIsCategorySheetOpen(false)}
                title="Selecionar Categoria"
                selectedValue={newExpense.category}
                options={availableCategories.expense.map(cat => ({ id: cat.id, label: cat.label, icon: cat.icon }))}
                onSelect={(opt) => {
                    const cat = availableCategories.expense.find(c => c.label === opt.label);
                    setNewExpense({ 
                        ...newExpense, 
                        category: opt.label, 
                        subcategory: '',
                        icon: cat?.icon || newExpense.icon
                    });
                }}
            />

            <BottomSheetSelect 
                isOpen={isSubcategorySheetOpen}
                onClose={() => setIsSubcategorySheetOpen(false)}
                title="Selecionar Subcategoria"
                selectedValue={newExpense.subcategory}
                options={availableSubcategories.map((sub, idx) => {
                    const label = typeof sub === 'string' ? sub : sub.label;
                    const icon = typeof sub === 'string' ? 'subdirectory_arrow_right' : sub.icon;
                    
                    let subLabel = label;
                    let subIcon = icon;
                    if (label.includes(':')) {
                        const parts = label.split(':');
                        subLabel = parts[0].trim();
                        subIcon = parts[1].trim();
                    }
                    
                    return { id: idx, label: subLabel, icon: subIcon };
                })}
                onSelect={(opt) => {
                    const originalSub = availableSubcategories[opt.id as number];
                    const rawLabel = typeof originalSub === 'string' ? originalSub : originalSub.label;
                    setNewExpense({ 
                        ...newExpense, 
                        subcategory: rawLabel,
                        icon: opt.icon !== 'subdirectory_arrow_right' ? opt.icon as string : newExpense.icon
                    });
                }}
            />
            
            <BottomSheetSelect 
                isOpen={isDueDaySheetOpen}
                onClose={() => setIsDueDaySheetOpen(false)}
                title="Dia de Vencimento"
                selectedValue={parseInt(newExpense.dueDay) || 1}
                options={DAYS_OPTIONS}
                onSelect={(opt) => setNewExpense({ ...newExpense, dueDay: String(opt.id) })}
            />

            <BottomSheetIconSelector 
                isOpen={isIconSheetOpen}
                onClose={() => setIsIconSheetOpen(false)}
                title="Selecionar Ícone"
                selectedIcon={newExpense.icon}
                onSelect={(icon) => setNewExpense({ ...newExpense, icon })}
            />

            <BottomSheetSelect 
                isOpen={isPaymentMethodSheetOpen}
                onClose={() => setIsPaymentMethodSheetOpen(false)}
                title="Forma de Pagamento"
                selectedValue={newExpense.paymentMethod === 'cartao' ? 'Cartão de Crédito' : 'Conta Bancária'}
                options={[
                    { id: 'cartao', label: 'Cartão de Crédito', icon: 'credit_card' },
                    { id: 'banco', label: 'Conta Bancária', icon: 'account_balance' }
                ]}
                onSelect={(opt) => setNewExpense({ ...newExpense, paymentMethod: opt.id as any })}
            />

            <BottomSheetSelect 
                isOpen={isCardSheetOpen}
                onClose={() => setIsCardSheetOpen(false)}
                title="Selecionar Cartão"
                selectedValue={newExpense.cardId}
                options={cards.map(c => ({ id: c.id, label: c.alias, icon: 'credit_card' }))}
                onSelect={(opt) => setNewExpense({ ...newExpense, cardId: String(opt.id) })}
            />

            <BottomSheetSelect 
                isOpen={isAccountSheetOpen}
                onClose={() => setIsAccountSheetOpen(false)}
                title="Selecionar Conta"
                selectedValue={newExpense.accountId}
                options={accounts.map(a => ({ id: a.id, label: a.name, icon: 'account_balance' }))}
                onSelect={(opt) => setNewExpense({ ...newExpense, accountId: String(opt.id) })}
            />

            {/* Fab button para adicionar */}
            {!isAdding && !editingId && (
                <button 
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="fixed bottom-10 right-10 size-14 bg-primary text-secondary rounded-full shadow-glow flex items-center justify-center active:scale-90 transition-all z-20 hover:scale-110"
                    title="Adicionar Despesa Prevista"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">add</span>
                </button>
            )}
        </div>
    );
};

export default PredictedExpensesManagement;
