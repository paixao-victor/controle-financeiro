import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTransactions } from '@/contexts/TransactionsContext';
import { format, isToday, addDays, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import EditTransactionModal from './EditTransactionModal';
import Modal from './Modal';
import BottomSheetSelect from './BottomSheetSelect';
import { useDragScroll } from '@/hooks/useDragScroll';
import type { Transaction } from '@/types';

const BANKS = [
    { id: 'nubank', label: 'Nubank', color: '#820ad1', sigla: 'NU' },
    { id: 'itau', label: 'Itaú', color: '#ec7000', sigla: 'IT' },
    { id: 'bnb', label: 'BNB', color: '#ffcc00', sigla: 'BNB' },
    { id: 'bb', label: 'BB', color: '#0038a8', sigla: 'BB' },
];

const AccountsPayable: React.FC = () => {
    const { transactions, currentCurrency, predictedExpenses, predictedIncomes, cards, accounts } = useTransactions();
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
    const [persistentBarIndex, setPersistentBarIndex] = useState<{ index: number; time: number } | null>(null);
    const [billActionMenu, setBillActionMenu] = useState<{ isOpen: boolean; bill: any }>({ isOpen: false, bill: null });
    const [viewType, setViewType] = useState<'sem' | 'mes'>('sem');
    const [selectedBillForDetail, setSelectedBillForDetail] = useState<any>(null); // State for bill details
    const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

    // Infinite Scroll States with Windowing
    const [pastOffset, setPastOffset] = useState(3);
    const [futureOffset, setFutureOffset] = useState(9);
    const MAX_TOTAL_BARS = 18; // Maximum bars to keep in memory
    const LOAD_INCREMENT = 3; // How many to load at once
    const leftSentinelRef = React.useRef<HTMLDivElement>(null);
    const rightSentinelRef = React.useRef<HTMLDivElement>(null);

    // Reset offsets when changing viewType
    useEffect(() => {
        setPastOffset(3);
        setFutureOffset(9);
    }, [viewType]);

    const scrollRef = useDragScroll();

    // Tooltip Persistent Timer & Click Outside
    useEffect(() => {
        if (!persistentBarIndex) return;

        const timer = setTimeout(() => {
            setPersistentBarIndex(null);
        }, 8000);

        const handleClickOutside = () => {
             setPersistentBarIndex(null);
        };

        window.addEventListener('click', handleClickOutside);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [persistentBarIndex]);

    // Infinite Scroll Observer with Windowing
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target === leftSentinelRef.current) {
                        setPastOffset(prev => {
                            const newPast = prev + LOAD_INCREMENT;
                            // If total exceeds max, reduce future offset
                            setFutureOffset(current => {
                                const total = newPast + current;
                                return total > MAX_TOTAL_BARS ? Math.max(3, current - LOAD_INCREMENT) : current;
                            });
                            return newPast;
                        });
                    } else if (entry.target === rightSentinelRef.current) {
                        setFutureOffset(prev => {
                            const newFuture = prev + LOAD_INCREMENT;
                            // If total exceeds max, reduce past offset
                            setPastOffset(current => {
                                const total = current + newFuture;
                                return total > MAX_TOTAL_BARS ? Math.max(3, current - LOAD_INCREMENT) : current;
                            });
                            return newFuture;
                        });
                    }
                }
            });
        }, { threshold: 0.1 });

        if (leftSentinelRef.current) observer.observe(leftSentinelRef.current);
        if (rightSentinelRef.current) observer.observe(rightSentinelRef.current);

        return () => observer.disconnect();
    }, [viewType]); // Recalibrate on view type change





    // Grouping and calculations
    const stats = useMemo(() => {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const monthKey = format(selectedMonth, 'yyyy-MM');

        // Only Consider Paid/Active for selected month etc.
        const filteredTransactions = transactions.filter(t => 
            t.status !== 'deleted' && 
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
        );

        // Map predictions to current selected month bills
        const projectedBills = predictedExpenses.flatMap(p => {
            // Get actual last day of month if dueDay is 31
            const lastDay = endOfMonth(selectedMonth).getDate();
            const safeDueDay = p.dueDay >= 31 ? lastDay : Math.min(p.dueDay, lastDay);
            const billDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), safeDueDay);
            
            // Tenta encontrar a transação real que corresponde a esta previsão
            // Prioridade: predictedExpenseId > (categoria + subcategoria)
            const actualTransaction = filteredTransactions.find((t: any) => 
                (t.predictedExpenseId === p.id) || 
                (t.type === 'expense' && 
                 t.category === p.category && 
                 t.subcategory === p.subcategory)
            );

            const isPaid = !!actualTransaction;
            const [subLabel, subIcon] = (p.subcategory || '').split(':');
                
            return [{
                id: `proj-${p.id}-${monthKey}`,
                // Prioriza descrição/notas da transação real se já estiver paga
                description: actualTransaction?.description || actualTransaction?.notes || p.notes || subLabel || p.category,
                notes: actualTransaction?.notes || p.notes || '',
                amount: actualTransaction?.amount || p.amount,
                date: format(billDate, 'yyyy-MM-dd'),
                category: p.category,
                subcategory: subLabel,
                isPrediction: true,
                status: isPaid ? 'paid' : 'pending',
                icon: p.icon || subIcon, // Use extracted icon if p.icon is missing
                color: p.color
            }];
        });

        // Add card bills for selected month
        const cardBills = cards.filter(c => c.status !== 'deleted' && c.type !== 'debit' && c.type !== 'food').map(card => {
            const isPaid = filteredTransactions.some(t => 
                t.type === 'expense' && 
                t.category === 'Pagamento' && 
                (t.subcategory === 'Fatura' || t.description?.toLowerCase().includes('fatura')) &&
                (t.cardId === card.id || t.description?.toLowerCase().includes(card.alias.toLowerCase()))
            );

            const billTransactions = transactions.filter(t => 
                t.cardId === card.id && 
                t.status !== 'deleted' && 
                t.type === 'expense' &&
                isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
            );
            const amount = billTransactions.reduce((acc, t) => acc + t.amount, 0);
            const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
            const isClosed = card.billStatusOverrides?.[monthKey] === 'closed';

            return {
                id: `card-${card.id}-${monthKey}`,
                description: `Fatura ${card.alias}`,
                amount,
                date: format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), Math.min(card.dueDay || 1, endOfMonth(selectedMonth).getDate())), 'yyyy-MM-dd'),
                category: 'Cartão',
                subcategory: card.alias,
                bank: card.bank,
                alias: card.alias,
                isCard: true,
                status: isPaid ? 'paid' : 'pending',
                isClosed,
                icon: linkedAccount?.icon || 'credit_card',
                color: card.color,
                cardId: card.id,
                transactions: billTransactions
            };
        });

        const soloTransactions = filteredTransactions.filter((t: any) => 
            t.type === 'expense' &&
            !projectedBills.some(p => p.category === t.category && p.subcategory === t.subcategory) &&
            !cardBills.some(c => c.cardId === t.cardId)
        ).map((t: any) => ({ ...t, isPrediction: false, status: 'paid' as any }));

        const allBills = [...projectedBills, ...cardBills, ...soloTransactions];
        
        const paidBills = allBills.filter(b => b.status === 'paid');
        const pendingBills = allBills.filter(b => b.status === 'pending');
        
        const totalPaid = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);
        const totalPending = pendingBills.reduce((acc, b) => acc + (b.amount || 0), 0);

        // Predicted Incomes for selected month
        const incomeByCategory: Record<string, number> = {};
        predictedIncomes.filter(inc => inc.status !== 'deleted').forEach(inc => {
            const catLabel = inc.category || 'Outros';
            incomeByCategory[catLabel] = (incomeByCategory[catLabel] || 0) + inc.amount;
        });

        const totalPredictedIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);

        const COLORS = ['#47f425', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const predictedIncomeCategoryData = Object.entries(incomeByCategory)
            .map(([name, value], index) => ({
                name,
                value,
                color: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        // Chart Data - Extended Timeline
        const today = new Date();
        const rawChartData = viewType === 'sem' 
            ? Array.from({ length: pastOffset + futureOffset }, (_, i) => { 
                const baseDate = startOfMonth(today);
                const weekStart = addDays(baseDate, (i - pastOffset) * 7); 
                const weekEnd = addDays(weekStart, 6);

                const totalExpenseRealized = transactions
                    .filter(t => t.type === 'expense' && t.status !== 'deleted')
                    .filter(t => {
                        const d = parseISO(t.date);
                        return d >= weekStart && d <= weekEnd;
                    })
                    .reduce((acc, t) => acc + t.amount, 0);
                
                const totalIncomeRealized = transactions
                    .filter(t => t.type === 'income' && t.status !== 'deleted')
                    .filter(t => {
                        const d = parseISO(t.date);
                        return d >= weekStart && d <= weekEnd;
                    })
                    .reduce((acc, t) => acc + t.amount, 0);

                const totalIncomeProjected = predictedIncomes
                    .filter(inc => inc.status !== 'deleted')
                    .reduce((acc, inc) => {
                        const day = inc.receiveDay || 1;
                        let matches = false;
                        for (let d = 0; d < 7; d++) {
                             const checkDate = addDays(weekStart, d);
                             if (checkDate.getDate() === day) matches = true;
                        }
                        return matches ? acc + (inc.amount || 0) : acc;
                    }, 0);

                const totalExpenseProjected = predictedExpenses
                    .filter(exp => exp.status !== 'deleted')
                    .reduce((acc, exp) => {
                        const day = exp.dueDay || 1;
                        let matches = false;
                        for (let d = 0; d < 7; d++) {
                             const checkDate = addDays(weekStart, d);
                             if (checkDate.getDate() === day) matches = true;
                        }
                        return matches ? acc + (exp.amount || 0) : acc;
                    }, 0);

                return {
                    day: `S${i + 1}`,
                    date: format(weekStart, 'yyyy-MM-dd'),
                    label: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
                    expenseRealized: totalExpenseRealized,
                    expenseProjected: Math.max(0, totalExpenseProjected - totalExpenseRealized),
                    incomeRealized: totalIncomeRealized,
                    incomeProjected: Math.max(0, totalIncomeProjected - totalIncomeRealized),
                    isCurrent: isWithinInterval(today, { start: weekStart, end: weekEnd }),
                    isFuture: weekStart > today
                };
            })
            : Array.from({ length: pastOffset + futureOffset }, (_, i) => {
                const exactMonth = addMonths(startOfMonth(today), i - pastOffset);
                const targetMonthStart = startOfMonth(exactMonth);
                const targetMonthEnd = endOfMonth(exactMonth);
                
                const totalExpenseRealized = transactions
                    .filter(t => t.type === 'expense' && t.status !== 'deleted' && isWithinInterval(parseISO(t.date), { start: targetMonthStart, end: targetMonthEnd }))
                    .reduce((acc, t) => acc + t.amount, 0);

                const totalIncomeRealized = transactions
                    .filter(t => t.type === 'income' && t.status !== 'deleted' && isWithinInterval(parseISO(t.date), { start: targetMonthStart, end: targetMonthEnd }))
                    .reduce((acc, t) => acc + t.amount, 0);

                const totalIncomeProjected = predictedIncomes
                    .filter(inc => inc.status !== 'deleted')
                    .reduce((acc, inc) => acc + (inc.amount || 0), 0);

                const totalExpenseProjected = predictedExpenses
                    .filter(exp => exp.status !== 'deleted')
                    .reduce((acc, exp) => acc + (exp.amount || 0), 0);

                return {
                    day: format(exactMonth, 'MMM', { locale: ptBR }).toUpperCase(),
                    date: format(exactMonth, 'yyyy-MM-dd'),
                    label: format(exactMonth, 'MMMM yyyy', { locale: ptBR }),
                    expenseRealized: totalExpenseRealized,
                    expenseProjected: Math.max(0, totalExpenseProjected - totalExpenseRealized),
                    incomeRealized: totalIncomeRealized,
                    incomeProjected: Math.max(0, totalIncomeProjected - totalIncomeRealized),
                    isCurrent: isSameMonth(exactMonth, today),
                    isFuture: targetMonthStart > today
                };
            });

        // Calculate max value for scaling to blocks
        const maxVal = Math.max(...rawChartData.map(d => Math.max(d.incomeRealized + d.incomeProjected, d.expenseRealized + d.expenseProjected)), 1000);
        const blockValue = maxVal / 5.5; 

        const chartData = rawChartData.map(d => {
            const totalIncome = d.incomeRealized + d.incomeProjected;
            const totalExpense = d.expenseRealized + d.expenseProjected;
            
            const totalIncomeBlocks = Math.ceil(totalIncome / blockValue);
            const totalExpenseBlocks = Math.ceil(totalExpense / blockValue);
            
            const incomeRealizedBlocks = Math.min(totalIncomeBlocks, Math.ceil(d.incomeRealized / blockValue));
            const expenseRealizedBlocks = Math.min(totalExpenseBlocks, Math.ceil(d.expenseRealized / blockValue));

            return {
                ...d,
                income: totalIncome,
                expense: totalExpense,
                blocksIncome: totalIncomeBlocks,
                blocksExpense: totalExpenseBlocks,
                blocksIncomeRealized: incomeRealizedBlocks,
                blocksExpenseRealized: expenseRealizedBlocks,
                blocksIncomeProjected: totalIncomeBlocks - incomeRealizedBlocks,
                blocksExpenseProjected: totalExpenseBlocks - expenseRealizedBlocks
            };
        });

        return {
            totalPending,
            totalPaid,
            chartData,
            todayBills: allBills.filter(b => isToday(parseISO(b.date)) && b.status === 'pending' && !b.isCard),
            cardBills: allBills.filter(b => b.isCard && b.status === 'pending'),
            thisWeekBills: allBills.filter(b => {
                const d = parseISO(b.date);
                const todayRef = new Date();
                const weekEnd = addDays(todayRef, 7);
                return d > todayRef && d <= weekEnd && b.status === 'pending' && !b.isCard;
            }),
            upcomingBills: allBills.filter(b => {
                const d = parseISO(b.date);
                const todayRef = new Date();
                const weekEnd = addDays(todayRef, 7);
                return d > weekEnd && b.status === 'pending' && !b.isCard;
            }).sort((a, b) => a.date.localeCompare(b.date)),
            totalPredictedIncome,
            predictedIncomeCategoryData
        } as any;
    }, [transactions, predictedExpenses, predictedIncomes, cards, viewType, selectedMonth, accounts, pastOffset, futureOffset]);

    // Observe Individual Bars for Range Indicator
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            setVisibleIndices(prev => {
                const next = new Set(prev);
                entries.forEach(entry => {
                    const index = parseInt(entry.target.getAttribute('data-index') || '-1');
                    if (index === -1) return;
                    
                    if (entry.isIntersecting) {
                        next.add(index);
                    } else {
                        next.delete(index);
                    }
                });
                return next;
            });
        }, { 
            threshold: 0.5,
            root: scrollRef.current 
        });

        const bars = document.querySelectorAll('.bar-item');
        bars.forEach(bar => observer.observe(bar));

        return () => observer.disconnect();
    }, [stats.chartData]);

    // Calculate visible range based on visibleIndices
    const visibleRangeText = useMemo(() => {
        if (!stats.chartData || stats.chartData.length === 0 || visibleIndices.size === 0) return '';
        
        const sortedIndices = Array.from(visibleIndices).sort((a, b) => a - b);
        const firstIdx = sortedIndices[0];
        const lastIdx = sortedIndices[sortedIndices.length - 1];
        
        const firstBar = stats.chartData[firstIdx];
        const lastBar = stats.chartData[lastIdx];
        
        if (!firstBar?.date || !lastBar?.date) return '';
        
        if (viewType === 'sem') {
            return `${format(parseISO(firstBar.date), 'dd/MM')} - ${format(parseISO(lastBar.date), 'dd/MM')}`;
        } else {
            return `${format(parseISO(firstBar.date), 'MM/yy')} - ${format(parseISO(lastBar.date), 'MM/yy')}`;
        }
    }, [stats.chartData, viewType, visibleIndices]);

    // Scroll to Current Month/Week on Load
    useEffect(() => {
        if (scrollRef.current && stats.chartData) {
            const currentIdx = stats.chartData.findIndex((d: any) => d.isCurrent);
            if (currentIdx > -1) {
                const itemWidth = scrollRef.current.scrollWidth / stats.chartData.length;
                scrollRef.current.scrollLeft = (currentIdx * itemWidth) - (scrollRef.current.clientWidth / 2) + (itemWidth / 2);
            }
        }
    }, [viewType, stats.chartData]);


    // Refs para o scroll por arraste (mouse)
    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-32 md:pb-8 transition-all duration-500 animate-in fade-in">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                
                
                {/* Header Context Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-neu border border-white/10 flex items-center gap-2 transition-colors">
                            <button 
                                onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}
                                className="size-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors text-dim"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className="px-4 text-center min-w-[140px]">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{format(selectedMonth, 'yyyy')}</p>
                                <p className="text-sm font-bold text-content uppercase">{format(selectedMonth, 'MMMM', { locale: ptBR })}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                                className="size-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors text-dim"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                        
                        {!isSameMonth(selectedMonth, new Date()) && (
                            <button 
                                onClick={() => setSelectedMonth(new Date())}
                                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95"
                            >
                                Ir para Hoje
                            </button>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-dim uppercase tracking-widest">Saldo Previsto</span>
                            <span className="text-lg font-black text-content">{formatCurrency(stats.totalPredictedIncome - (stats.totalPaid + stats.totalPending), currentCurrency)}</span>
                        </div>
                        <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                    </div>
                </div>

                {/* Header Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                    <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4">
                        {/* Total Pago */}
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-neu border border-white/10 flex flex-col justify-between overflow-hidden relative group transition-colors">
                            <div className="absolute -right-4 -top-4 size-20 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
                            <p className="text-dim text-[10px] md:text-sm font-bold uppercase tracking-wider">Total Pago</p>
                            <div className="flex items-center justify-between mt-2">
                                <div>
                                    <p className="text-primary text-xl md:text-3xl font-extrabold tracking-tight">{formatCurrency(stats.totalPaid, currentCurrency)}</p>
                                    <span className="text-[10px] text-dim font-medium lowercase tracking-tight">neste mês</span>
                                </div>
                                <div className="relative size-12 md:size-16 flex items-center justify-center">
                                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                        <circle className="stroke-gray-100 dark:stroke-white/5" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                                        <circle 
                                            className="stroke-primary transition-all duration-1000" 
                                            cx="18" cy="18" fill="none" r="16" 
                                            strokeDasharray="100" 
                                            strokeDashoffset={100 - (Math.min(1, stats.totalPaid / (stats.totalPaid + stats.totalPending || 1)) * 100)} 
                                            strokeLinecap="round" strokeWidth="3"
                                        ></circle>
                                    </svg>
                                    <span className="absolute text-[10px] font-bold text-content">{Math.round((stats.totalPaid / (stats.totalPaid + stats.totalPending || 1)) * 100)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Pendente */}
                        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 shadow-soft flex flex-col justify-between text-white relative group overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full blur-2xl"></div>
                            <p className="text-white/40 text-[10px] md:text-sm font-bold uppercase tracking-wider">Em Aberto</p>
                            <div>
                                <p className="text-lg md:text-3xl font-extrabold tracking-tight text-white">{formatCurrency(stats.totalPending, currentCurrency)}</p>
                                <div className="flex items-center gap-1 text-primary text-[10px] mt-1">
                                    <span className="material-symbols-outlined text-xs">trending_down</span>
                                    <span className="font-bold">-12% vs mês ant.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fluxo de Caixa / Lego Chart */}
                    <div className="md:col-span-8 p-5 md:p-6 bg-white dark:bg-black/20 rounded-3xl shadow-neu border border-white/10 flex flex-col relative">
                        <div className="flex justify-between items-center mb-0 relative">
                            <div>
                                <h3 className="text-base md:text-lg font-bold text-content">Fluxo de Caixa</h3>
                                <p className="text-[10px] md:text-xs text-dim">Previsão e Histórico</p>
                                
                                {/* New Legend */}
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                    <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full bg-primary"></div>
                                        <span className="text-[8px] font-bold uppercase tracking-tighter text-dim">Pago</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full bg-red-500"></div>
                                        <span className="text-[8px] font-bold uppercase tracking-tighter text-dim">Gasto</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[8px] font-bold uppercase tracking-tighter text-dim">A Receber</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full bg-orange-500"></div>
                                        <span className="text-[8px] font-bold uppercase tracking-tighter text-dim">A Pagar</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className="flex bg-background-light dark:bg-black/20 p-1 rounded-xl shadow-inner z-10 transition-colors">
                                    <button 
                                        onClick={() => setViewType('sem')}
                                        className={`text-[10px] font-black px-4 py-2 rounded-lg transition-all ${viewType === 'sem' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-dim hover:text-content'}`}
                                    >
                                        SEM
                                    </button>
                                    <button 
                                        onClick={() => setViewType('mes')}
                                        className={`text-[10px] font-black px-4 py-2 rounded-lg transition-all ${viewType === 'mes' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-dim hover:text-content'}`}
                                    >
                                        MÊS
                                    </button>
                                </div>
                                
                                {/* Visible Range Indicator */}
                                {visibleRangeText && (
                                    <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60 mr-1">
                                        {visibleRangeText}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing pb-2 snap-x snap-mandatory px-0 h-[280px] md:h-[320px] relative"
                        >
                                <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none py-1 opacity-25">
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                    <div className="w-full h-px border-b border-dashed border-content/50"></div>
                                </div>

                                <div className="flex flex-row items-end h-full gap-2">
                                    <div ref={leftSentinelRef} className="w-4 md:w-8 shrink-0 h-full" />

                                {stats.chartData.map((data: any, i: number) => {
                                    const isShowing = activeBarIndex === i || (persistentBarIndex?.index === i);
                                    const isFirst = i === 0;
                                    const isLast = i === stats.chartData.length - 1;
                                    
                                    const highestBlockCount = Math.max(data.blocksIncome, data.blocksIncomeProjected, data.blocksIncomeRealized, data.blocksExpense, data.blocksExpenseProjected, data.blocksExpenseRealized);

                                    return (
                                        <motion.div 
                                            key={i} 
                                            layout
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPersistentBarIndex(persistentBarIndex?.index === i ? null : { index: i, time: Date.now() });
                                                setActiveBarIndex(null);
                                            }}
                                            onMouseEnter={() => setActiveBarIndex(i)}
                                            onMouseLeave={() => setActiveBarIndex(null)}
                                            style={{
                                                marginLeft: (isShowing && isFirst) ? '80px' : '0px',
                                                marginRight: (isShowing && isLast) ? '80px' : '0px',
                                            }}
                                            data-index={i}
                                            className={`bar-item flex flex-col items-center min-w-[60px] md:min-w-[70px] w-[calc((100vw-30px)/7)] md:w-[80px] h-full justify-end relative group shrink-0 snap-center transition-all duration-300 ${isShowing ? 'z-600' : 'z-10'}`}>
                                            
                                            <AnimatePresence>
                                                {isShowing && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        style={{ 
                                                            bottom: `${(highestBlockCount * 3) + 50}px`,
                                                        }}
                                                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-50"
                                                    >
                                                        <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-2 rounded-2xl shadow-2xl border border-white/10 dark:border-black/5 flex flex-col items-center gap-2 min-w-[160px]">
                                                            <div className="w-full flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{data.label}</span>
                                                                <span className="text-[10px] font-black text-primary">{data.date && format(parseISO(data.date), 'yyyy')}</span>
                                                            </div>
                                                            
                                                            <div className="w-full space-y-2">
                                                                {/* Income Section */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                                        <span className="opacity-60 uppercase tracking-tighter">Receitas</span>
                                                                        <span className="text-primary">{formatCurrency(data.income, currentCurrency)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[8px] font-medium opacity-80">
                                                                        <span className="text-primary italic">Realizado</span>
                                                                        <span>{formatCurrency(data.incomeRealized, currentCurrency)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[8px] font-medium opacity-80">
                                                                        <span className="text-blue-500 italic">Previsto</span>
                                                                        <span>{formatCurrency(data.incomeProjected, currentCurrency)}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="h-px bg-white/10 dark:bg-black/10 w-full"></div>

                                                                {/* Expense Section */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                                        <span className="opacity-60 uppercase tracking-tighter">Despesas</span>
                                                                        <span className="text-red-500">{formatCurrency(data.expense, currentCurrency)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[8px] font-medium opacity-80">
                                                                        <span className="text-red-500 italic">Pago</span>
                                                                        <span>{formatCurrency(data.expenseRealized, currentCurrency)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[8px] font-medium opacity-80">
                                                                        <span className="text-orange-500 italic">A Pagar</span>
                                                                        <span>{formatCurrency(data.expenseProjected, currentCurrency)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Triangle Pointer */}
                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 dark:bg-white rotate-45"></div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="flex gap-px items-end h-full pt-10">
                                                {/* Income Bar */}
                                                <div className="flex flex-col-reverse gap-[3px] items-center">
                                                    {Array.from({ length: 7 }, (_, idx) => {
                                                        const isFilled = idx < data.blocksIncome;
                                                        const isRealized = idx < data.blocksIncomeRealized;
                                                        let colorClass = "bg-gray-200 dark:bg-white/5";
                                                        let shadowClass = "";

                                                        if (isFilled) {
                                                            if (data.isFuture) {
                                                                colorClass = "bg-blue-500";
                                                                shadowClass = "shadow-[0_0_8px_rgba(59,130,246,0.3)]";
                                                            } else if (data.isCurrent || !isRealized) {
                                                                colorClass = isRealized ? "bg-primary" : "bg-blue-500";
                                                                shadowClass = isRealized ? "shadow-[0_0_8px_rgba(71,244,37,0.3)]" : "shadow-[0_0_8px_rgba(59,130,246,0.3)]";
                                                            } else {
                                                                colorClass = "bg-primary";
                                                                shadowClass = "shadow-[0_0_8px_rgba(71,244,37,0.3)]";
                                                            }
                                                        }

                                                        return (
                                                            <motion.div 
                                                                key={`inc-${idx}`}
                                                                initial={{ y: 200, opacity: 0 }}
                                                                animate={{ y: 0, opacity: isFilled ? 1 : 0.3 }}
                                                                transition={{ 
                                                                    type: "tween",
                                                                    damping: 20,
                                                                    stiffness: 100,
                                                                    delay: i * 0.13 + (6 - idx) * 0.02 
                                                                }}
                                                                className={`w-[22px] md:w-[28px] h-[18px] md:h-[25px] rounded-[4px] ${colorClass} ${shadowClass}`}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                                {/* Expense Bar */}
                                                <div className="flex flex-col-reverse gap-[3px] items-center">
                                                    {Array.from({ length: 7 }, (_, idx) => {
                                                        const isFilled = idx < data.blocksExpense;
                                                        const isRealized = idx < data.blocksExpenseRealized;
                                                        let colorClass = "bg-gray-200 dark:bg-white/5";
                                                        let shadowClass = "";

                                                        if (isFilled) {
                                                            if (data.isFuture) {
                                                                colorClass = "bg-orange-500";
                                                                shadowClass = "shadow-[0_0_8px_rgba(249,115,22,0.3)]";
                                                            } else if (data.isCurrent || !isRealized) {
                                                                colorClass = isRealized ? "bg-red-500" : "bg-orange-500";
                                                                shadowClass = isRealized ? "shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "shadow-[0_0_8px_rgba(249,115,22,0.2)]";
                                                            } else {
                                                                colorClass = "bg-red-500";
                                                                shadowClass = "shadow-[0_0_8px_rgba(239,68,68,0.2)]";
                                                            }
                                                        }

                                                        return (
                                                            <motion.div 
                                                                key={`exp-${idx}`}
                                                                initial={{ y: 200, opacity: 0 }}
                                                                animate={{ y: 0, opacity: isFilled ? 1 : 0.3 }}
                                                                transition={{ 
                                                                    type: "tween",
                                                                    damping: 20,
                                                                    stiffness: 100,
                                                                    delay: i * 0.13 + (6 - idx) * 0.02 
                                                                }}
                                                                className={`w-[15px] md:w-[18px] h-[18px] md:h-[25px] rounded-[4px] ${colorClass} ${shadowClass}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center mt-3 relative">
                                                <span className={`text-[12px] font-bold text-center leading-tight ${(data.income + data.expense) > 0 ? 'text-content' : 'text-dim'}`}>
                                                    {data.day}
                                                </span>
                                                <span className="text-[8px] text-dim opacity-50 uppercase tracking-wider scale-125 origin-top mt-0.5">
                                                    {viewType === 'sem' ? 'Semana' : 'Mês'}
                                                </span>
                                                
                                                {/* Highlight Line for current period */}
                                                {data.isCurrent && (
                                                    <motion.div 
                                                        layoutId="current-chart-indicator"
                                                        className="absolute -bottom-3 w-full h-2 bg-primary rounded-[4px] shadow-glow-sm"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                    <div ref={rightSentinelRef} className="w-4 md:w-8 shrink-0 h-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card de Receitas Previstas - NOVO */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-12 bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-neu border border-white/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group transition-colors"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-1000">
                        <span className="material-symbols-outlined text-[120px]">payments</span>
                    </div>

                    {/* Gráfico Mini (Pie) */}
                    <div className="w-full md:w-1/3 h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.predictedIncomeCategoryData}
                                    innerRadius={55}
                                    outerRadius={75}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1500}
                                    stroke="none"
                                >
                                    {stats.predictedIncomeCategoryData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 shadow-2xl">
                                                    {payload[0].name}: {formatCurrency(payload[0].value, currentCurrency)}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Total</span>
                            <span className="text-xl font-black text-content">{formatCurrency(stats.totalPredictedIncome, currentCurrency)}</span>
                        </div>
                    </div>

                    {/* Informações e Legenda */}
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col">
                            <h3 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Receitas Previstas</h3>
                            <p className="text-sm text-dim font-medium">Estimativa total para o mês de {format(selectedMonth, 'MMMM', { locale: ptBR })}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                            {stats.predictedIncomeCategoryData.map((cat: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 group/item cursor-default">
                                    <div className="size-2.5 rounded-full shadow-glow" style={{ backgroundColor: cat.color }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-dim uppercase tracking-wider">{cat.name}</span>
                                        <span className="text-xs font-black text-content">{formatCurrency(cat.value, currentCurrency)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hidden lg:flex flex-col items-end gap-2 text-primary font-black">
                        <div className="flex items-center gap-1 bg-primary/10 px-4 py-2 rounded-2xl">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            <span className="text-xs uppercase tracking-widest">Fluxo Positivo</span>
                        </div>
                    </div>
                </motion.div>

                {/* Listagem Categorizada */}
                <div className="space-y-10 pb-10">
                    {/* Cartões de Crédito - FIRST */}
                    {stats.cardBills.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="w-1.5 h-6 bg-[#820ad1] rounded-full shadow-lg"></div>
                                <h2 className="text-lg md:text-xl font-black text-content uppercase tracking-tight">Faturas de Cartões</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.cardBills.map((bill: any) => (
                                    <div 
                                        key={bill.id} 
                                        onClick={() => setSelectedBillForDetail(bill)}
                                        className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-white/5 flex items-center justify-between group hover:shadow-xl transition-all shadow-sm cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-[#820ad1]/10 text-[#820ad1] flex items-center justify-center font-black text-sm uppercase tracking-tighter" style={{ backgroundColor: `${bill.color}20`, color: bill.color }}>
                                                {bill.alias ? bill.alias.substring(0, 3).toUpperCase() : <span className="material-symbols-outlined text-2xl">{bill.icon}</span>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-content">{bill.description}</p>
                                                <p className="text-[9px] text-dim font-black uppercase tracking-widest">Vencimento dia {format(parseISO(bill.date), 'dd')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-content leading-none">{formatCurrency(bill.amount, currentCurrency)}</p>
                                            <p className="text-[9px] text-orange-500 font-bold uppercase mt-1">
                                                {bill.isClosed ? 'Fechada' : 'Aberta'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vencendo Hoje - SECOND */}
                    {stats.todayBills.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="w-1.5 h-6 bg-red-500 rounded-full shadow-lg"></div>
                                <h2 className="text-lg md:text-xl font-black text-content uppercase tracking-tight">Vencendo Hoje</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {stats.todayBills.map((bill: any) => (
                                    <div key={bill.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 md:p-5 border-l-4 border-red-500 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:translate-x-1 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">{bill.icon || 'priority_high'}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-content">{bill.description || bill.subcategory || bill.category}</p>
                                                <p className="text-[9px] text-red-500/60 font-black uppercase tracking-widest">Ação necessária</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6">
                                            <p className="text-lg font-black text-content">{formatCurrency(bill.amount, currentCurrency)}</p>
                                            <button 
                                                onClick={() => setBillActionMenu({ isOpen: true, bill })}
                                                className="bg-red-500 text-white text-[9px] font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                                            >
                                                OPÇÕES
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vencendo esta Semana - THIRD */}
                    {stats.thisWeekBills.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-glow"></div>
                                <h2 className="text-lg md:text-xl font-black text-content uppercase tracking-tight">Vencendo esta Semana</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.thisWeekBills.map((bill: any) => (
                                    <div key={bill.id} onClick={() => setBillActionMenu({ isOpen: true, bill })} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-white/5 flex items-center gap-4 group hover:translate-y-[-2px] transition-all cursor-pointer">
                                        <div className="size-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <span className="material-symbols-outlined text-xl">{bill.icon || 'event'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-bold text-dim uppercase tracking-wider">{format(parseISO(bill.date), "EEEE, dd/MM", { locale: ptBR })}</p>
                                            <p className="text-sm font-extrabold text-content truncate">{bill.description || bill.subcategory || bill.category}</p>
                                            <p className="text-lg font-black text-content mt-0.5">{formatCurrency(bill.amount, currentCurrency)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Próximos Vencimentos - FOURTH */}
                    {stats.upcomingBills.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                <h2 className="text-lg md:text-xl font-black text-content uppercase tracking-tight">Próximos Vencimentos</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.upcomingBills.map((bill: any) => (
                                    <div key={bill.id} onClick={() => setBillActionMenu({ isOpen: true, bill })} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-sm border border-white/5 flex items-center gap-4 group hover:scale-[1.02] transition-all cursor-pointer opacity-80 hover:opacity-100">
                                        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-lg">{bill.icon || 'calendar_month'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[9px] font-bold text-dim uppercase">{format(parseISO(bill.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                                                <span className="text-[10px] font-black text-content">{formatCurrency(bill.amount, currentCurrency)}</span>
                                            </div>
                                            <p className="text-sm font-bold text-content truncate">{bill.description || bill.subcategory || bill.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {stats.todayBills.length === 0 && stats.cardBills.length === 0 && stats.thisWeekBills.length === 0 && stats.upcomingBills.length === 0 && (
                        <div className="text-center py-20 bg-black/5 dark:bg-white/5 rounded-4xl border-2 border-dashed border-white/5">
                            <span className="material-symbols-outlined text-5xl text-dim mb-4">task_alt</span>
                            <p className="text-sm font-bold text-dim uppercase tracking-widest">Nenhuma conta pendente para os próximos dias</p>
                        </div>
                    )}
                </div>

                {transactionToEdit && (
                    <EditTransactionModal 
                        transaction={transactionToEdit as any}
                        onClose={() => setTransactionToEdit(null)}
                        onSaveSuccess={() => setTransactionToEdit(null)}
                    />
                )}

                <BottomSheetSelect 
                isOpen={billActionMenu.isOpen}
                onClose={() => setBillActionMenu({ isOpen: false, bill: null })}
                title="Ações da Conta"
                options={[
                    { id: 'view', label: 'Ver Detalhes', icon: 'visibility' },
                    { id: 'pay', label: 'Pagar Conta', icon: 'payments' },
                    { id: 'delete', label: 'Excluir este mês', icon: 'delete' }
                ]}
                onSelect={(opt: any) => {
                    const bill = billActionMenu.bill;
                    if (opt.id === 'pay') {
                        // Extrair ID limpo para prever vínculo
                        const rawId = bill.id.replace('pred-', '').replace('circle-', '').replace('proj-', '');
                        
                        window.dispatchEvent(new CustomEvent('open-add-transaction', {
                            detail: {
                                amount: bill.amount,
                                category: bill.category,
                                subcategory: bill.subcategory,
                                notes: bill.description || '',
                                date: bill.date,
                                predictedExpenseId: bill.isPrediction ? rawId : (bill.predictedExpenseId || null)
                            }
                        }));
                    } else if (opt.id === 'view') {
                        setSelectedBillForDetail(bill);
                    } else if (opt.id === 'delete') {
                        if (confirm('Deseja realmente ocultar esta conta este mês?')) {
                            alert('Funcionalidade de exclusão pontual será implementada na sincronização.');
                        }
                    }
                    setBillActionMenu({ isOpen: false, bill: null });
                }}
            />

            <Modal isOpen={!!selectedBillForDetail} onClose={() => setSelectedBillForDetail(null)} className="overflow-visible">
                {selectedBillForDetail && (
                    <>
                        {selectedBillForDetail && selectedBillForDetail.isCard && (
                            <div className="hidden md:flex absolute -top-[270px] left-0 right-0 z-50 items-center justify-center pointer-events-none">
                                <div className="pointer-events-auto w-[60%] max-w-lg animate-in slide-in-from-bottom-8 duration-500">
                                    <div 
                                        className="w-full aspect-[1.586/1] rounded-4xl shadow-2xl overflow-hidden border border-white/20 relative transform hover:scale-105 transition-transform duration-300"
                                        style={{ 
                                            backgroundColor: selectedBillForDetail?.color,
                                            background: `linear-gradient(135deg, ${selectedBillForDetail?.color} 0%, #000 150%)`,
                                        }}
                                    >
                                         <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                        <div className="relative p-7 h-full flex flex-col justify-between text-white">
                                            <div className="flex justify-between items-start">
                                                <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                                    <span className="font-black text-sm">
                                                        {(() => {
                                                            const card = cards.find((c: any) => c.id === selectedBillForDetail?.cardId);
                                                            return card?.initials || BANKS.find((b: any) => b.id === card?.bank)?.sigla || selectedBillForDetail?.subcategory?.slice(0, 2).toUpperCase();
                                                        })()}
                                                    </span>
                                                </div>
                                                <span className="material-symbols-outlined opacity-60 text-3xl">contactless</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase opacity-70 font-medium tracking-widest leading-none text-left">Cartão</span>
                                                    <span className="font-bold tracking-tight text-xl truncate max-w-[220px] text-left">{selectedBillForDetail?.subcategory}</span>
                                                </div>
                                                {cards.find((c: any) => c.id === selectedBillForDetail?.cardId)?.brand === 'MASTER' ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex -space-x-1.5 opacity-90">
                                                            <div className="size-5 rounded-full bg-[#eb001b]" />
                                                            <div className="size-5 rounded-full bg-[#f79e1b]" />
                                                        </div>
                                                        <span className="text-[7px] font-black uppercase tracking-tighter opacity-80 mt-0.5">mastercard</span>
                                                    </div>
                                                ) : (
                                                    <p className="italic font-black text-xl opacity-90 tracking-tighter">VISA</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col h-full max-h-[85vh] p-1 overflow-y-auto custom-scrollbar relative">
                            <div className="flex items-center justify-between p-4 md:p-6 mb-2">
                                <div>
                                    <h3 className="font-bold text-content text-lg uppercase tracking-tight">{selectedBillForDetail?.description || selectedBillForDetail?.subcategory}</h3>
                                    <p className="text-[10px] text-dim font-bold uppercase tracking-widest">
                                        {selectedBillForDetail?.isCard ? `Fatura de ${format(new Date(), 'MMMM', { locale: ptBR })}` : `Vencimento em ${format(parseISO(selectedBillForDetail?.date), 'dd/MM/yyyy')}`}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedBillForDetail(null)}
                                    className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined text-dim">close</span>
                                </button>
                            </div>

                            {selectedBillForDetail?.isCard && (
                                <div className="md:hidden px-6 pb-6">
                                    <div 
                                        className="w-full aspect-[1.586/1] rounded-3xl shadow-lg run-ring border border-white/20 relative overflow-hidden transform transition-transform"
                                        style={{ 
                                            backgroundColor: selectedBillForDetail?.color,
                                            background: `linear-gradient(135deg, ${selectedBillForDetail?.color} 0%, #000 150%)`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                        <div className="relative p-5 h-full flex flex-col justify-between text-white">
                                            <div className="flex justify-between items-start">
                                                <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                                    <span className="font-black text-xs">
                                                        {(() => {
                                                            const card = cards.find((c: any) => c.id === selectedBillForDetail?.cardId);
                                                            return card?.initials || BANKS.find((b: any) => b.id === card?.bank)?.sigla || selectedBillForDetail?.subcategory?.slice(0, 2).toUpperCase();
                                                        })()}
                                                    </span>
                                                </div>
                                                <span className="material-symbols-outlined opacity-60 text-2xl">contactless</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-60 mb-1">{selectedBillForDetail?.subcategory}</p>
                                                    <p className="text-xl font-black tracking-tighter">{formatCurrency(selectedBillForDetail?.amount || 0)}</p>
                                                </div>
                                                {cards.find((c: any) => c.id === selectedBillForDetail?.cardId)?.brand === 'MASTER' ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex -space-x-1 opacity-90">
                                                            <div className="size-4 rounded-full bg-[#eb001b]" />
                                                            <div className="size-4 rounded-full bg-[#f79e1b]" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="italic font-black text-lg opacity-90 tracking-tighter">VISA</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-6 pb-20 md:pb-8 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 rotate-12">
                                            <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-dim uppercase tracking-widest block mb-1">Total Atual</span>
                                        <span className="text-xl font-black text-content tracking-tight">{formatCurrency(selectedBillForDetail?.amount || 0)}</span>
                                    </div>
                                    <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150">
                                            <span className="material-symbols-outlined text-6xl text-primary">analytics</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-dim uppercase tracking-widest block mb-1">Itens na Fatura</span>
                                        <span className="text-xl font-black text-content tracking-tight">{selectedBillForDetail?.transactions?.length || 0}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-dim uppercase tracking-[0.2em] px-1">Lançamentos na Fatura</h4>
                                        {selectedBillForDetail?.transactions?.length === 0 ? (
                                            <div className="text-center py-10 text-dim/40 text-xs font-bold uppercase italic border-2 border-dashed border-white/5 rounded-2xl">Nenhuma transação encontrada</div>
                                        ) : (
                                            selectedBillForDetail?.transactions?.map((t: any, idx: number) => (
                                                <div key={t.id + idx} className="flex items-center justify-between p-4 rounded-2xl bg-background-light dark:bg-black/10">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-content">{t.description || t.subcategory || t.category}</span>
                                                        <span className="text-[9px] text-dim uppercase font-bold">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-content">{formatCurrency(t.amount)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Modal>

        </main>
    );
};

export default AccountsPayable;
