import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTransactions } from '@/contexts/TransactionsContext';
import type { Transaction, TransactionType } from '@/types';
import { format } from 'date-fns';
import BottomSheetSelect from './BottomSheetSelect';

interface EditTransactionModalProps {
    transaction: Transaction;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, onSaveSuccess }) => {
    const { updateTransaction, availableCategories } = useTransactions();
    
    // Initial State from Transaction
    const [amount, setAmount] = useState('0,00');
    const [type, setType] = useState<TransactionType>(transaction.type);
    const [category, setCategory] = useState(transaction.category);
    const [subcategory, setSubcategory] = useState(transaction.subcategory || '');
    const [date, setDate] = useState(transaction.date);
    const [description, setDescription] = useState(transaction.description);
    const [paymentMethod] = useState(transaction.paymentMethod);
    const [notes] = useState(transaction.notes || '');

    // Estados dos Bottom Sheets
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);

    // Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Partial<Transaction> | null>(null);

    const amountInputRef = useRef<HTMLInputElement>(null);

    // Initialize formatting
    useEffect(() => {
        setAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(transaction.amount));
    }, [transaction]);

    const currentCategories = type === 'income' ? availableCategories.income : availableCategories.expense;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') value = '0';
        
        if (value.length > 1) {
            value = value.replace(/^0+/, '');
            if (value === '') value = '0';
        }

        const floatValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(floatValue);
        setAmount(formatted);

        setTimeout(() => {
            if (amountInputRef.current) {
                const len = amountInputRef.current.value.length;
                amountInputRef.current.setSelectionRange(len, len);
            }
        }, 0);
    };

    const handlePreSave = () => {
        const floatAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (floatAmount <= 0) {
            alert('Valor inválido');
            return;
        }

        const diffs: any = {};
        if (floatAmount !== transaction.amount) diffs.amount = true;
        if (date !== transaction.date) diffs.date = true;
        if (category !== transaction.category) diffs.category = true;
        if (type !== transaction.type) diffs.type = true;
        
        if (Object.keys(diffs).length === 0 && description === transaction.description && subcategory === (transaction.subcategory || '')) {
            onClose(); // No changes
            return;
        }

        const updates: Partial<Transaction> = {
            amount: floatAmount,
            date,
            category,
            subcategory: subcategory || null,
            type,
            description,
            paymentMethod,
            notes
        };
        setPendingChanges(updates);
        setShowConfirm(true);
    };

    const handleConfirmSave = () => {
        if (!pendingChanges) return;
        
        // Auto-reactivate if it was deleted
        const finalUpdates = transaction.status === 'deleted' 
            ? { ...pendingChanges, status: 'active' as const } 
            : pendingChanges;

        updateTransaction(transaction.id, finalUpdates);
        onSaveSuccess();
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return createPortal(
        <div className="fixed inset-0 z-5000 flex items-end md:items-center justify-center sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className={`relative w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500 ${
                transaction.status === 'deleted' 
                    ? 'bg-red-50 dark:bg-red-950/20 border-4 border-red-500/50' 
                    : 'bg-surface dark:bg-zinc-900 border-none'
            }`}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-content/5 flex items-center justify-between bg-surface dark:bg-zinc-900 z-10 sticky top-0">
                    <h2 className="text-lg font-black text-content uppercase tracking-wider">
                        {showConfirm ? 'Confirmar' : 'Editar Transação'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-content/5 rounded-full transition-colors active:scale-90">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Reactivation Banner */}
                {transaction.status === 'deleted' && !showConfirm && (
                    <div className="bg-gray-100 dark:bg-white/5 px-6 py-2 flex items-center gap-2 border-b border-white/10">
                        <span className="material-symbols-outlined text-sm text-dim">info</span>
                        <p className="text-[10px] font-bold text-dim uppercase tracking-wider">
                            Transação Deletada - Será reativada ao salvar
                        </p>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
                    {!showConfirm ? (
                        <>
                            {/* Amount Input */}
                            <div className="text-center py-6 nm-card rounded-3xl mb-8">
                                <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-2">Valor</p>
                                <div className="relative inline-flex items-baseline justify-center">
                                    <span className="text-2xl font-black text-primary mr-1">R$</span>
                                    <input 
                                        ref={amountInputRef}
                                        type="text" 
                                        inputMode="numeric"
                                        value={amount}
                                        onFocus={() => {
                                            setTimeout(() => {
                                                if (amountInputRef.current) {
                                                    const len = amountInputRef.current.value.length;
                                                    amountInputRef.current.setSelectionRange(len, len);
                                                }
                                            }, 0);
                                        }}
                                        onChange={handleAmountChange}
                                        className="bg-transparent border-none text-4xl font-black text-content focus:ring-0 w-48 text-center p-0"
                                    />
                                </div>
                            </div>

                            {/* Type Toggle */}
                            <div className="flex bg-content/5 p-1.5 rounded-2xl gap-2">
                                <button
                                    onClick={() => setType('expense')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-primary text-secondary shadow-lg' : 'text-dim hover:text-content'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">trending_down</span>
                                    Despesa
                                </button>
                                <button
                                    onClick={() => setType('income')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-primary text-secondary shadow-lg' : 'text-dim hover:text-content'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">trending_up</span>
                                    Receita
                                </button>
                            </div>

                            {/* Category Select */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-dim uppercase tracking-wider px-1">Categoria</label>
                                <button 
                                    onClick={() => setIsCategorySheetOpen(true)}
                                    className="w-full h-14 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group"
                                >
                                    <span className={category ? 'text-content' : 'text-dim'}>
                                        {currentCategories.find(c => c.id === category)?.label || category || 'Selecionar Categoria'}
                                    </span>
                                    <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                </button>
                                <BottomSheetSelect 
                                    isOpen={isCategorySheetOpen}
                                    onClose={() => setIsCategorySheetOpen(false)}
                                    title="Selecionar Categoria"
                                    selectedValue={category}
                                    options={currentCategories.map(cat => ({ id: cat.id, label: cat.label, icon: cat.icon }))}
                                    onSelect={(opt) => {
                                        setCategory(opt.id.toString());
                                        setSubcategory('');
                                    }}
                                />
                            </div>

                            {/* Subcategory */}
                            {(() => {
                                const selectedCategory = currentCategories.find(c => c.id === category || c.label === category);
                                const availableSubcategories = selectedCategory?.subcategories || [];
                                if (availableSubcategories.length > 0) {
                                    return (
                                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                            <label className="text-[10px] font-bold text-dim uppercase tracking-wider px-1">Subcategoria</label>
                                            <button 
                                                onClick={() => setIsSubcategorySheetOpen(true)}
                                                className="w-full h-14 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group"
                                            >
                                                <span className={subcategory ? 'text-content' : 'text-dim'}>
                                                    {subcategory || 'Selecionar Subcategoria'}
                                                </span>
                                                <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                            </button>
                                            <BottomSheetSelect 
                                                isOpen={isSubcategorySheetOpen}
                                                onClose={() => setIsSubcategorySheetOpen(false)}
                                                title="Selecionar Subcategoria"
                                                selectedValue={subcategory}
                                                options={availableSubcategories.map(sub => {
                                                    if (typeof sub === 'string') {
                                                        return { id: sub, label: sub, icon: 'subdirectory_arrow_right' };
                                                    }
                                                    return { id: sub.label, label: sub.label, icon: sub.icon };
                                                })}
                                                onSelect={(opt) => setSubcategory(opt.label)}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Date */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-dim uppercase tracking-wider px-1">Data</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-dim text-xl">calendar_today</span>
                                    <input 
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full h-14 pl-12 px-4 nm-input border-none rounded-xl font-bold text-content focus:ring-0 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-dim uppercase tracking-wider px-1">Descrição</label>
                                <input 
                                    type="text"
                                    value={description || ''}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full h-14 px-4 nm-input border-none rounded-xl font-bold text-content focus:ring-0 outline-none placeholder:font-normal placeholder:text-dim/50"
                                    placeholder="Detalhes opcionais..."
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-primary/10 rounded-4xl p-8 text-center border border-primary/20 nm-card">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Resumo da Alteração</p>
                                
                                {pendingChanges && transaction.amount !== pendingChanges.amount && (
                                    <div className="flex flex-col items-center gap-2 mb-6">
                                        <div className="text-xs font-bold text-dim line-through opacity-50">{formatCurrency(transaction.amount)}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary text-sm">arrow_downward</span>
                                            <div className="text-4xl font-black text-content tracking-tighter">{formatCurrency(pendingChanges.amount!)}</div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-2 pt-4 border-t border-primary/10">
                                    {pendingChanges && transaction.category !== pendingChanges.category && (
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                            <span className="text-dim">{transaction.category}</span>
                                            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                            <span className="text-content uppercase">{pendingChanges.category}</span>
                                        </div>
                                    )}
                                    {pendingChanges && transaction.date !== pendingChanges.date && (
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                            <span className="text-dim">{format(new Date(transaction.date), 'dd/MM/yyyy')}</span>
                                            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                            <span className="text-content">{format(new Date(pendingChanges.date!), 'dd/MM/yyyy')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-center text-xs font-bold text-dim uppercase tracking-widest leading-loose px-4">
                                Confirmar salvamento permanente destas informações?
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-content/5 bg-surface dark:bg-zinc-900 sticky bottom-0 z-20">
                    {!showConfirm ? (
                        <button 
                            onClick={handlePreSave}
                            className="w-full h-14 bg-primary text-secondary font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-glow"
                        >
                            Revisar Alteração
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 h-14 nm-card bg-surface text-dim font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl active:scale-95 transition-all"
                            >
                                Voltar
                            </button>
                            <button 
                                onClick={handleConfirmSave}
                                className="flex-1 h-14 bg-primary text-secondary font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-glow"
                            >
                                Confirmar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditTransactionModal;
