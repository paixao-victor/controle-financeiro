import React, { useState, useMemo, useRef } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { formatCurrency } from '@/utils/formatters';
import type { Transaction, TransactionType, Card } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import BottomSheetSelect from './BottomSheetSelect';
import CircularNumberSelector from './CircularNumberSelector';
import Modal from './Modal'; // Added Modal import

interface AddTransactionProps {
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData?: {
        amount?: number;
        category?: string;
        subcategory?: string;
        notes?: string;
        date?: string;
    };
}

const AddTransaction: React.FC<AddTransactionProps> = ({ onClose, onSaveSuccess, initialData }) => {
    const [amount, setAmount] = useState(initialData?.amount 
        ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(initialData.amount) 
        : '0,00');
    const [type, setType] = useState<TransactionType>('expense');
    const [recurrenceMode, setRecurrenceMode] = useState<'Constante' | 'Parcelado'>('Constante'); // Moved up to use in Credit logic
    const [category, setCategory] = useState(initialData?.category || '');
    const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceMonths, setRecurrenceMonths] = useState('1');
    const [paymentMethod, setPaymentMethod] = useState<'banco' | 'cartao'>('banco');
    const [targetAccount, setTargetAccount] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [cardPaymentOption, setCardPaymentOption] = useState<'debit' | 'credit'>('credit');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const { addTransaction, availableCategories, cards, accounts } = useTransactions();

    // Effect to auto-select linked account for Debit
    React.useEffect(() => {
        if (paymentMethod === 'cartao' && cardPaymentOption === 'debit' && selectedCardId) {
            const card = cards.find(c => c.id === selectedCardId);
            const linkedAcc = accounts.find(a => a.id === card?.linkedAccountId);
            if (linkedAcc) {
                setTargetAccount(linkedAcc.name);
            } else {
                setTargetAccount(''); // Reset if no link, forcing manual selection
            }
        }
    }, [paymentMethod, cardPaymentOption, selectedCardId, cards, accounts]);

    // Estados dos Bottom Sheets
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
    const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
    const [isRecurrenceModeSheetOpen, setIsRecurrenceModeSheetOpen] = useState(false);
    const [isNumberSelectorOpen, setIsNumberSelectorOpen] = useState(false);

    // Installments Logic
    const [customInstallments, setCustomInstallments] = useState<Array<{ number: number; amount: number; date: string }>>([]);

    // Generate installments when months or mode changes (resetting customizations)
    // Only triggering when months actually change to avoid loop with amount updates
    const prevMonthsRef = useRef(recurrenceMonths);
    const prevDateRef = useRef(date);
    
    React.useEffect(() => {
        const months = parseInt(recurrenceMonths);
        if (recurrenceMode === 'Parcelado' && months > 1) {
            const total = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
            const baseAmount = total / months;
            const newInstallments = Array.from({ length: months }, (_, i) => {
                const instDate = new Date(date);
                instDate.setMonth(instDate.getMonth() + i);
                return {
                    number: i + 1,
                    amount: baseAmount,
                    date: instDate.toISOString().split('T')[0]
                };
            });
            
             // Only update if months changed or date changed (to keep date sync) - preserving amounts if only date changes? 
             // Simplification: Reset on months change. Keep amounts on date change?
             // User wants to edit amounts. If total changes, we redistribute? 
             // Let's rely on manual sync for Total -> Installments.
             
             if (prevMonthsRef.current !== recurrenceMonths) {
                 setCustomInstallments(newInstallments);
                 prevMonthsRef.current = recurrenceMonths;
             }
        } else {
            setCustomInstallments([]);
        }
    }, [recurrenceMonths, recurrenceMode]);
    
    // Update dates if main date changes
    React.useEffect(() => {
        if (prevDateRef.current !== date) {
            setCustomInstallments(prev => prev.map((inst, i) => {
                const instDate = new Date(date);
                instDate.setMonth(instDate.getMonth() + i);
                return { ...inst, date: instDate.toISOString().split('T')[0] };
            }));
            prevDateRef.current = date;
        }
    }, [date]);

    // When Total Amount changes manually, redistribute (unless it matches sum of custom)
    const handleAmountBlur = () => {
         const total = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
         const months = parseInt(recurrenceMonths);
         if (recurrenceMode === 'Parcelado' && months > 1) {
             const currentSum = customInstallments.reduce((sum, inst) => sum + inst.amount, 0);
             // If significantly different, redistribute
             if (Math.abs(currentSum - total) > 0.01) {
                 const baseAmount = total / months;
                  setCustomInstallments(prev => prev.map(inst => ({ ...inst, amount: baseAmount })));
             }
         }
    };

    const updateInstallmentAmount = (index: number, newAmount: number) => {
        const newInstallments = [...customInstallments];
        newInstallments[index].amount = newAmount;
        setCustomInstallments(newInstallments);
        
        // Update Total
        const newTotal = newInstallments.reduce((sum, inst) => sum + inst.amount, 0);
        setAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(newTotal));
    };

    const amountInputRef = useRef<HTMLInputElement>(null);

    // Contas filtrando deletadas
    const ACCOUNTS = useMemo(() => {
        const activeAccounts = accounts.filter(acc => acc.status !== 'deleted');
        if (activeAccounts.length > 0) {
            return activeAccounts.map(acc => ({ id: acc.id, label: acc.name }));
        }
        return [
            { id: 'itau', label: 'Banco Itaú' },
            { id: 'nubank', label: 'Nubank' },
        ];
    }, [accounts]);

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

    const handleSave = () => {
        const floatAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        
        if (floatAmount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        if (!category) {
            alert('Por favor, selecione uma categoria.');
            return;
        }

        if (!targetAccount && paymentMethod === 'banco') {
            alert(`Por favor, selecione a conta de ${type === 'income' ? 'destino' : 'origem'}.`);
            return;
        }

        if (paymentMethod === 'cartao' && cardPaymentOption === 'debit' && !targetAccount) {
             alert('Para cartão de débito, selecione a conta de origem.');
             return;
        }

        const baseTransaction: Omit<Transaction, 'id' | 'date' | 'amount' | 'currentInstallment'> = {
            type,
            category,
            subcategory: subcategory || null,
            isRecurring,
            recurrenceRule: isRecurring ? 'monthly' : null,
            paymentMethod,
            cardId: paymentMethod === 'cartao' ? selectedCardId : undefined,
            accountId: (paymentMethod === 'banco' || (paymentMethod === 'cartao' && cardPaymentOption === 'debit')) 
                ? accounts.find(a => a.name === targetAccount)?.id 
                : undefined,
            paymentOption: paymentMethod === 'cartao' ? cardPaymentOption : undefined,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Recurrence Mode Logic for Credit Card Installments (Reuse existing logic but clarify UI)

        if (paymentMethod === 'cartao' && cardPaymentOption === 'credit' && recurrenceMode === 'Parcelado' && parseInt(recurrenceMonths) > 1) {
            const numMonths = parseInt(recurrenceMonths);
            const parentId = uuidv4();
            
            // Use custom installments if valid, otherwise calculate
            const installmentsToSave = customInstallments.length === numMonths ? customInstallments : Array.from({ length: numMonths }, (_, i) => {
                 const installmentAmount = floatAmount / numMonths;
                 const installmentDate = new Date(date);
                 installmentDate.setMonth(installmentDate.getMonth() + i);
                 return {
                     number: i + 1,
                     amount: installmentAmount,
                     date: installmentDate.toISOString().split('T')[0]
                 };
            });

            installmentsToSave.forEach((inst, i) => {
                const installmentTx: Transaction = {
                    ...baseTransaction,
                    id: uuidv4(),
                    parentTransactionId: parentId,
                    amount: inst.amount,
                    date: inst.date,
                    currentInstallment: inst.number,
                    installments: numMonths,
                    description: `${notes || category}${subcategory ? ' - ' + subcategory : ''} (${inst.number}/${numMonths})`,
                } as Transaction;

                addTransaction(installmentTx);
            });
        } else {
            const newTransaction: Transaction = {
                ...baseTransaction,
                id: uuidv4(),
                amount: floatAmount,
                date,
                description: notes || `${category}${subcategory ? ' - ' + subcategory : ''}${targetAccount ? ' (' + targetAccount + ')' : ''}`,
            } as Transaction;

            addTransaction(newTransaction);
        }
        
        onSaveSuccess();
    };

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto pb-20 overflow-visible relative">
            <div className="fixed top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
            <div className="fixed bottom-20 left-10 w-96 h-96 bg-slate-300/20 dark:bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

            <header className="flex items-center justify-between px-6 pt-4 pb-4 sticky top-0 bg-background/80 backdrop-blur-md z-40 md:pt-8">
                <button onClick={onClose} className="flex items-center justify-center w-10 h-10 rounded-full nm-card hover:scale-95 transition-transform active:shadow-nm-inset">
                    <span className="material-symbols-outlined text-dim">close</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-content lg:text-2xl">Adicionar Transação</h1>
                <div className="w-10 md:hidden"></div>
                <button onClick={handleSave} className="hidden md:flex items-center gap-2 px-6 py-2 bg-primary rounded-full text-secondary font-bold shadow-glow hover:brightness-105 active:scale-95 transition-all">
                    <span>Salvar</span>
                    <span className="material-symbols-outlined text-sm">check</span>
                </button>
            </header>

            <div className="flex-1 px-6 pt-4 pb-20 space-y-8 overflow-y-auto custom-scrollbar overflow-x-hidden">
                <div className="flex flex-col lg:flex-row gap-6 opacity-0 animate-fade-up">
                    <div className="lg:flex-3 flex flex-col items-center justify-center py-6 md:py-8 nm-card rounded-3xl relative">
                        <div className="text-[10px] font-bold text-dim uppercase tracking-widest mb-2">Valor Total</div>
                        <div className="relative flex items-baseline justify-center w-full px-10">
                            <span className={`text-2xl lg:text-3xl font-bold mr-1 ${type === 'income' ? 'text-primary' : 'text-red-500'}`}>R$</span>
                            <input 
                                ref={amountInputRef}
                                className="w-full text-center bg-transparent border-none text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-content focus:ring-0 p-0" 
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
                                onBlur={handleAmountBlur}
                            />
                        </div>
                    </div>

                    <div className="lg:flex-1 flex flex-col justify-center gap-4">
                        <div className="text-[10px] font-bold text-dim uppercase tracking-widest lg:text-center">Tipo de Transação</div>
                        <div className="flex flex-row lg:flex-col p-1.5 nm-input rounded-2xl h-fit lg:gap-2">
                            <button onClick={() => setType('expense')} className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-dim hover:text-content'}`}>
                                <span className="material-symbols-outlined text-lg">trending_down</span>
                                Despesa
                            </button>
                            <button onClick={() => { setType('income'); setCategory(''); }} className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-primary text-secondary shadow-lg shadow-primary/20' : 'text-dim hover:text-content'}`}>
                                <span className="material-symbols-outlined text-lg">trending_up</span>
                                Receita
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 overflow-visible">
                    <div className="space-y-4 opacity-0 animate-fade-up delay-100">
                        <div className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">Classificação</div>
                        <div className="nm-card rounded-2xl p-6 h-full flex flex-col gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-4">
                                    {type === 'income' ? 'Categoria da Receita' : 'Categoria da Despesa'}
                                </label>
                                <button onClick={() => setIsCategorySheetOpen(true)} className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group">
                                    <span className={category ? 'text-content' : 'text-dim'}>
                                        {category || 'Selecionar Categoria'}
                                    </span>
                                    <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                </button>
                                <BottomSheetSelect 
                                    isOpen={isCategorySheetOpen}
                                    onClose={() => setIsCategorySheetOpen(false)}
                                    title="Selecionar Categoria"
                                    selectedValue={category}
                                    options={(currentCategories || []).map(cat => ({ id: cat.id, label: cat.label, icon: cat.icon }))}
                                    onSelect={(opt) => { setCategory(opt.label); setSubcategory(''); }}
                                />
                            </div>

                            {category && (() => {
                                const selectedCategory = currentCategories.find(c => c.label === category);
                                const availableSubcategories = selectedCategory?.subcategories || [];
                                if (availableSubcategories.length > 0) {
                                    return (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-4">Subcategoria</label>
                                            <button onClick={() => setIsSubcategorySheetOpen(true)} className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group">
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
                                                options={availableSubcategories.map(sub => ({ id: sub, label: sub, icon: 'subdirectory_arrow_right' }))}
                                                onSelect={(opt) => setSubcategory(opt.label)}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {paymentMethod === 'banco' && (
                                <div className="animate-in fade-in zoom-in-95 duration-200">
                                    <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-4">
                                        {type === 'income' ? 'Conta de Destino' : 'Conta de Origem'}
                                    </label>
                                    <button onClick={() => setIsAccountSheetOpen(true)} className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group">
                                        <span className={targetAccount ? 'text-content' : 'text-dim'}>
                                            {targetAccount || (type === 'income' ? 'Onde o dinheiro entra?' : 'De qual conta sai?')}
                                        </span>
                                        <span className={`material-symbols-outlined text-dim group-hover:${type === 'income' ? 'text-primary' : 'text-red-500'} transition-colors`}>expand_more</span>
                                    </button>
                                    <BottomSheetSelect 
                                        isOpen={isAccountSheetOpen}
                                        onClose={() => setIsAccountSheetOpen(false)}
                                        title={type === 'income' ? "Conta de Destino" : "Conta de Origem"}
                                        selectedValue={targetAccount}
                                        options={ACCOUNTS.map((acc: { id: string; label: string }) => ({ id: acc.id, label: acc.label, icon: 'account_balance_wallet' }))}
                                        onSelect={(opt) => setTargetAccount(opt.label)}
                                    />
                                    <p className={`text-[9px] font-bold mt-2 ml-1 ${type === 'income' ? 'text-primary' : 'text-red-500'}`}>
                                        *O saldo desta conta será atualizado.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 opacity-0 animate-fade-up delay-200">
                        <div className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">Planejamento</div>
                        <div className="nm-card rounded-2xl p-6 h-full">
                            <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-4">Data e Recorrência</label>
                            <div className="relative mb-6">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-dim text-xl">calendar_today</span>
                                <input className="w-full pl-10 pr-4 py-3 nm-input border-none rounded-xl text-content font-semibold text-sm focus:ring-0" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                            <div className="pt-4 border-t border-content/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold text-dim uppercase tracking-widest">REPETIR MENSALMENTE</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                                        <div className="w-10 h-5 bg-background-light dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {isRecurring && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">TIPO DE REPETIÇÃO</span>
                                            <button 
                                                onClick={() => setIsRecurrenceModeSheetOpen(true)}
                                                className="w-full h-14 px-5 nm-input border-none rounded-2xl text-content font-bold text-sm flex items-center justify-between group bg-surface/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary">
                                                        {recurrenceMode === 'Constante' ? 'all_inclusive' : 'layers'}
                                                    </span>
                                                    <span>{recurrenceMode}</span>
                                                </div>
                                                <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                            </button>
                                            <BottomSheetSelect 
                                                isOpen={isRecurrenceModeSheetOpen}
                                                onClose={() => setIsRecurrenceModeSheetOpen(false)}
                                                title="Modo de Recorrência"
                                                selectedValue={recurrenceMode}
                                                options={[
                                                    { id: 'Constante', label: 'Constante', icon: 'all_inclusive' },
                                                    { id: 'Parcelado', label: 'Parcelado', icon: 'layers' }
                                                ]}
                                                onSelect={(opt) => setRecurrenceMode(opt.id as 'Constante' | 'Parcelado')}
                                            />
                                        </div>

                                        {recurrenceMode === 'Parcelado' && (
                                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                                <span className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">DURAÇÃO</span>
                                                <button 
                                                    onClick={() => setIsNumberSelectorOpen(true)}
                                                    className="w-full h-14 px-5 nm-input border-none rounded-2xl text-content font-black text-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">schedule</span>
                                                        <span className="text-3xl font-black text-content">{recurrenceMonths}</span>
                                                        <span className="text-[10px] font-bold text-dim uppercase tracking-widest">meses</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">touch_app</span>
                                                </button>
                                                <CircularNumberSelector 
                                                    isOpen={isNumberSelectorOpen}
                                                    onClose={() => setIsNumberSelectorOpen(false)}
                                                    value={parseInt(String(recurrenceMonths)) || 1}
                                                    max={80}
                                                    onChange={(val) => setRecurrenceMonths(String(val))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 opacity-0 animate-fade-up delay-300 md:col-span-2 lg:col-span-1">
                        <div className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">Método e Detalhes</div>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="relative cursor-pointer">
                                    <input type="radio" name="payment" className="peer sr-only" checked={paymentMethod === 'banco'} onChange={() => setPaymentMethod('banco')} />
                                    <div className="p-3 nm-card rounded-2xl border-2 border-transparent peer-checked:border-primary/30 peer-checked:bg-primary/5 transition-all text-center flex flex-col items-center">
                                        <span className={`material-symbols-outlined mb-1 ${paymentMethod === 'banco' ? 'text-primary' : 'text-dim'}`}>account_balance</span>
                                        <div className="text-[10px] font-extrabold text-content truncate">Banco</div>
                                    </div>
                                </label>
                                <label className="relative cursor-pointer">
                                    <input type="radio" name="payment" className="peer sr-only" checked={paymentMethod === 'cartao'} onChange={() => { setPaymentMethod('cartao'); setTargetAccount(''); }} />
                                    <div className={`p-3 nm-card rounded-2xl border-2 border-transparent peer-checked:bg-opacity-5 transition-all text-center flex flex-col items-center 
                                        ${type === 'income' ? 'peer-checked:border-primary/30 peer-checked:bg-primary' : 'peer-checked:border-red-500/30 peer-checked:bg-red-500'}`}>
                                        <span className={`material-symbols-outlined mb-1 ${paymentMethod === 'cartao' ? (type === 'income' ? 'text-primary' : 'text-red-500') : 'text-dim'}`}>credit_card</span>
                                        <div className="text-[10px] font-extrabold text-content truncate">Cartão</div>
                                    </div>
                                </label>
                            </div>
                            <div className="nm-card rounded-2xl p-4 space-y-4">
                                {paymentMethod === 'cartao' && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div>
                                            <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-2 px-1">Selecionar Cartão</label>
                                            <button onClick={() => setIsCardSheetOpen(true)} className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group">
                                                <span className={selectedCardId ? 'text-content' : 'text-dim'}>
                                                    {selectedCardId 
                                                        ? (() => {
                                                            const c = cards.find(item => String(item.id) === String(selectedCardId));
                                                            return c ? (c.alias || c.name || 'Cartão Selecionado') : 'Cartão não encontrado';
                                                        })()
                                                        : 'Qual cartão?'}
                                                </span>
                                                <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                            </button>
                                            <BottomSheetSelect 
                                                isOpen={isCardSheetOpen}
                                                onClose={() => setIsCardSheetOpen(false)}
                                                title="Meus Cartões"
                                                selectedValue={selectedCardId}
                                                options={cards.map(c => ({ id: c.id, label: c.alias, icon: 'credit_card' }))}
                                                onSelect={(opt) => {
                                                    setSelectedCardId(String(opt.id));
                                                    const card = cards.find(c => c.id === String(opt.id));
                                                    if (card) {
                                                        if (card.type === 'credit') setCardPaymentOption('credit');
                                                        else if (card.type === 'debit') setCardPaymentOption('debit');
                                                    }
                                                }}
                                            />
                                        </div>

                                        {(() => {
                                            const card = cards.find(c => c.id === selectedCardId);
                                            if (card?.type === 'both') {
                                                return (
                                                    <div className="flex p-1.5 nm-input rounded-2xl animate-pulse ring-2 ring-primary/50">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setCardPaymentOption('credit'); }}
                                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${cardPaymentOption === 'credit' ? 'bg-primary text-secondary shadow-md' : 'text-dim hover:bg-white/5'}`}
                                                        >
                                                            Crédito
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setCardPaymentOption('debit'); }}
                                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${cardPaymentOption === 'debit' ? 'bg-primary text-secondary shadow-md' : 'text-dim hover:bg-white/5'}`}
                                                        >
                                                            Débito
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                            <div className="space-y-4 pt-4 border-t border-content/5 mt-4">
                                                {cardPaymentOption === 'credit' ? (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[10px] font-bold text-dim uppercase tracking-wider">Parcelamento</label>
                                                            <div className="flex bg-background-light dark:bg-black/20 p-1 rounded-lg">
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); setRecurrenceMode('Constante'); setRecurrenceMonths('1'); }}
                                                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${recurrenceMode === 'Constante' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-dim'}`}
                                                                >
                                                                    À Vista
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); setRecurrenceMode('Parcelado'); setIsNumberSelectorOpen(true); }}
                                                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${recurrenceMode === 'Parcelado' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-dim'}`}
                                                                >
                                                                    Parcelar
                                                                </button>
                                                            </div>
                                                        </div>

                                                            {recurrenceMode === 'Parcelado' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => setIsNumberSelectorOpen(true)}
                                                                        className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-black text-lg flex items-center justify-between group active:scale-[0.98] transition-all"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="material-symbols-outlined text-primary text-xl">layers</span>
                                                                            <span>{recurrenceMonths}x</span>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-dim">{formatCurrency(parseFloat(amount.replace(/\./g, '').replace(',', '.')) / parseInt(recurrenceMonths))} /mês</span>
                                                                    </button>
                                                                    <CircularNumberSelector 
                                                                        isOpen={isNumberSelectorOpen}
                                                                        onClose={() => setIsNumberSelectorOpen(false)}
                                                                        value={parseInt(recurrenceMonths) || 1}
                                                                        max={75}
                                                                        onChange={(val) => {
                                                                            setRecurrenceMonths(String(val));
                                                                            // Generate installments immediately when number changes
                                                                             const total = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
                                                                             const valPerMonth = total / val;
                                                                             const newInstallments = Array.from({ length: val }, (_, i) => ({
                                                                                 number: i + 1,
                                                                                 date: new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString(),
                                                                                 amount: valPerMonth
                                                                             }));
                                                                             setCustomInstallments(newInstallments);
                                                                        }}
                                                                    />
                                                                </>
                                                            )}

                                                        <p className="text-[9px] text-primary font-bold ml-1 mt-2 animate-pulse">
                                                            *Esta despesa será lançada na fatura.
                                                        </p>
                                                        
                                                        {/* Installments List Editing */}
                                                        {recurrenceMode === 'Parcelado' && customInstallments.length > 0 && (
                                                            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-4">
                                                                <div className="flex items-center justify-between px-1 mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Editar Parcelas</span>
                                                                        {(() => {
                                                                            const originalAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
                                                                            const totalInstallmentsHelper = customInstallments.reduce((acc, curr) => acc + curr.amount, 0);
                                                                            const diff = totalInstallmentsHelper - originalAmount;
                                                                            const interestRate = originalAmount > 0 ? (diff / originalAmount) * 100 : 0;
                                                                            
                                                                            if (diff > 0.05) { // Tolerance for float errors
                                                                                return (
                                                                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-tight bg-red-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                                                                                        *Juros de {interestRate.toFixed(2)}%
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 group">
                                                                        <span className="text-[9px] font-bold text-dim uppercase group-hover:text-primary transition-colors">Valor Fixo:</span>
                                                                        <div className="flex items-center gap-0.5 border-b border-dim/20 group-hover:border-primary/50 transition-colors">
                                                                            <span className="text-[10px] text-dim">R$</span>
                                                                            <input 
                                                                                type="number" 
                                                                                step="0.01"
                                                                                className="w-16 bg-transparent text-right text-[10px] font-bold text-content focus:outline-none p-0"
                                                                                placeholder="Todos"
                                                                                onChange={(e) => {
                                                                                    const val = parseFloat(e.target.value);
                                                                                    if (!isNaN(val)) {
                                                                                        setCustomInstallments(prev => prev.map(p => ({ ...p, amount: val })));
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-background-light dark:bg-black/20 rounded-xl p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                                                                    {customInstallments.map((inst, idx) => (
                                                                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-surface p-2 rounded-lg border border-white/5">
                                                                            <div className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                                                                {inst.number}
                                                                            </div>
                                                                            <div className="flex-1 text-[10px] font-bold text-dim">
                                                                                {format(parseISO(inst.date), "dd 'de' MMM", { locale: ptBR })}
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-xs font-bold text-dim">R$</span>
                                                                                <input 
                                                                                    type="number" 
                                                                                    step="0.01"
                                                                                    className="w-20 bg-transparent border-b border-primary/20 text-right text-sm font-bold text-content focus:outline-none focus:border-primary p-0"
                                                                                    value={inst.amount.toFixed(2)}
                                                                                    onChange={(e) => updateInstallmentAmount(idx, parseFloat(e.target.value) || 0)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                     // Debit Logic - Account Selection
                                                     <div className="animate-in fade-in zoom-in-95 duration-200">
                                                        <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-4">
                                                            Debitar de qual conta?
                                                        </label>
                                                        
                                                        {(() => {
                                                            const card = cards.find(c => c.id === selectedCardId);
                                                            const linkedAcc = accounts.find(a => a.id === card?.linkedAccountId);
                                                            if (linkedAcc) {
                                                                    return (
                                                                    <div className="p-3 bg-primary/10 rounded-xl flex items-center gap-3 border border-primary/20">
                                                                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                                            <span className="material-symbols-outlined text-sm">link</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-primary uppercase">Conta Vinculada</p>
                                                                            <p className="text-sm font-bold text-content">{linkedAcc.name}</p>
                                                                        </div>
                                                                    </div>
                                                                    );
                                                            }
                                                            return (
                                                                <>
                                                                    <button onClick={() => setIsAccountSheetOpen(true)} className="w-full h-12 px-4 nm-input border-none rounded-xl text-content font-bold text-sm flex items-center justify-between group">
                                                                        <span className={targetAccount ? 'text-content' : 'text-dim'}>
                                                                            {targetAccount || 'Selecionar Conta para Débito'}
                                                                        </span>
                                                                        <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                                                    </button>
                                                                    <p className="text-[9px] text-dim mt-2 ml-1">
                                                                        *Este cartão não possui conta vinculada automática.
                                                                    </p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-2 px-1">Notas</label>
                                    <textarea className="w-full p-3 nm-input border-none rounded-xl text-content font-medium text-xs focus:ring-0 resize-none placeholder:text-dim/50" placeholder="Observações..." rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="md:hidden fixed bottom-0 left-0 right-0 p-6 pb-12 bg-linear-to-t from-background via-background/90 to-transparent z-40 opacity-0 animate-fade-up delay-400">
                <button onClick={handleSave} className={`w-full hover:brightness-105 active:scale-[0.97] transition-all text-secondary text-lg font-extrabold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 ${type === 'income' ? 'bg-primary' : 'bg-red-500'}`}>
                    <span>Salvar Transação</span>
                    <span className="material-symbols-outlined font-bold">arrow_forward</span>
                </button>
            </footer>
        </div>
    );
};

export default AddTransaction;
