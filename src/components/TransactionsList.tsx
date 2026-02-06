import React, { useState, useMemo, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { Transaction } from '@/types';
import { useTransactions } from '@/contexts/TransactionsContext';
import { format, isToday, isYesterday, isSameMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportModal } from './ExportModal';
import { capitalize, removeAccents } from '@/utils/formatters';
import TransactionDetailModal from './TransactionDetailModal';
import { useDragScroll } from '@/hooks/useDragScroll';
import { SavingsEvolutionChart } from './SavingsEvolutionChart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import EditTransactionModal from './EditTransactionModal';
import Modal from './Modal';

// Helper to fix timezone issues (treat UTC dates as Local dates)
const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Remove 'Z' to force parsing as local time, preventing -3h shift
    return parseISO(dateStr.replace(/Z$/, ''));
};

interface TransactionsListProps {
    searchQuery?: string;
}

const TransactionsList: React.FC<TransactionsListProps> = ({ searchQuery = '' }) => {
    const { transactions, deleteTransaction, currentCurrency, isEditMode, availableCategories } = useTransactions();
    const { lastFilterPeriod, setLastFilterPeriod, savingsGoal, formatValue } = useSettings();
    const [filterPeriod, setFilterPeriod] = useState<'today' | 'last5' | 'this_month' | 'last_30' | 'last_60' | 'custom'>((lastFilterPeriod as any) || 'last5');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [isManualFilterOpen, setManualFilterOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isSavingsDetailOpen, setSavingsDetailOpen] = useState(false);
    const savingsReportRef = React.useRef<HTMLDivElement>(null);
    
    const getSubcategoryIcon = (categoryName: string, subName: string | null | undefined, type: 'income' | 'expense') => {
        if (!subName) return null;
        const cat = availableCategories[type].find(c => c.label === categoryName);
        if (!cat) return null;
        
        const sub = cat.subcategories.find(s => (typeof s === 'string' ? s : s.label) === subName);
        if (typeof sub === 'object') return sub.icon;
        return null;
    };

    // Sync filter change to persistence
    useEffect(() => {
        if (filterPeriod !== 'custom') {
            setLastFilterPeriod(filterPeriod);
        }
    }, [filterPeriod, setLastFilterPeriod]);



    const exportSavingsPDF = async () => {
        if (!savingsReportRef.current) return;
        
        try {
            // Workaround para erro de oklch no html2canvas
            // O html2canvas falha ao tentar parsear cores oklch do Tailwind v4.
            // Injetamos um estilo que força as cores principais para HEX/RGB no clone.
            const canvas = await html2canvas(savingsReportRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        * { 
                            --color-primary: #47f425 !important;
                            --color-background: #ffffff !important;
                            --color-surface: #f8fafc !important;
                            --color-content: #0f172a !important;
                            --text-main: #0f172a !important;
                            --text-dim: #64748b !important;
                            color: #0f172a !important;
                            background: transparent !important;
                        }
                        /* Forçar todas as cores para HEX/RGB */
                        .text-primary { color: #47f425 !important; }
                        .text-green-600 { color: #16a34a !important; }
                        .text-green-500 { color: #22c55e !important; }
                        .text-red-600 { color: #dc2626 !important; }
                        .text-red-500 { color: #ef4444 !important; }
                        .text-content { color: #0f172a !important; }
                        .text-dim { color: #64748b !important; }
                        .text-gray-600 { color: #4b5563 !important; }
                        .text-gray-500 { color: #6b7280 !important; }
                        .bg-surface { background-color: #ffffff !important; }
                        .bg-background { background-color: #f8fafc !important; }
                        .bg-primary { background-color: #47f425 !important; }
                        .bg-primary\\/10 { background-color: rgba(71, 244, 37, 0.1) !important; }
                        .bg-primary\\/20 { background-color: rgba(71, 244, 37, 0.2) !important; }
                        .bg-white { background-color: #ffffff !important; }
                        .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05) !important; }
                        .border-primary { border-color: #47f425 !important; }
                        .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1) !important; }
                        .border-gray-100 { border-color: #f3f4f6 !important; }
                        /* Remover todas as funções de cor modernas */
                        [style*="oklch"], [style*="oklab"], [style*="lab"], [style*="lch"] {
                            color: #0f172a !important;
                            background-color: transparent !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`relatorio-economias-${format(new Date(), 'MMM-yyyy')}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
        }
    };
    
    // Drag Scroll Ref
    const listDragRef = useDragScroll({ enabled: true });

    // Efeito Flutuante e Inclinação 3D para o Gráfico de Economia
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    
    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });
    const rotateXSpring = useSpring(rotateX, { stiffness: 150, damping: 15 });
    const rotateYSpring = useSpring(rotateY, { stiffness: 150, damping: 15 });
    
    // Parallax: O texto se move 50% mais que o gráfico para dar profundidade maior
    const textX = useTransform(mouseXSpring, (val) => val * 1.5);
    const textY = useTransform(mouseYSpring, (val) => val * 1.5);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Intensidade de inclinação de 35 (maior que a da Home)
        rotateX.set((mouseY / height - 0.5) * -35);
        rotateY.set((mouseX / width - 0.5) * 35);
        
        // Intensidade de translação (velocidade 7, mais rápido que 10)
        x.set((mouseX - width / 2) / 7);
        y.set((mouseY - height / 2) / 7);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const touch = e.touches[0];
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        
        rotateX.set((mouseY / height - 0.5) * -35);
        rotateY.set((mouseX / width - 0.5) * 35);
        
        x.set((mouseX - width / 2) / 7);
        y.set((mouseY - height / 2) / 7);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        rotateX.set(0);
        rotateY.set(0);
    };

    // Estado para Scroll Infinito
    const [visibleCount, setVisibleCount] = useState(20);
    const observerTarget = React.useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Cálculos de Resumo (SEMPRE DO MÊS ATUAL ou GERAL - seguindo o padrão de extrato)
    const summary = useMemo(() => {
        const now = new Date();
        const thisMonthTransactions = transactions.filter(t => isSameMonth(parseDate(t.date), now));

        const income = thisMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const total = income - expense;
        
        // Dados do mês anterior para comparação
        const lastMonth = subMonths(now, 1);
        const lastMonthTransactions = transactions.filter(t => isSameMonth(parseDate(t.date), lastMonth));
        const lastMonthIncome = lastMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const lastMonthExpense = lastMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const lastMonthSavingsAmount = lastMonthIncome - lastMonthExpense;
        const lastMonthSavingsPercent = lastMonthIncome > 0 
            ? (lastMonthSavingsAmount / lastMonthIncome) * 100 
            : (lastMonthExpense > 0 ? -100 : 0);

        // Cálculo real de economia: (Receitas - Despesas) / Receitas * 100
        // Se a renda for zero e houver despesa, a economia é -100% (déficit total)
        // Se ambos forem zero, a economia é 0%
        const savingsPercent = income > 0 
            ? ((income - expense) / income) * 100 
            : (expense > 0 ? -100 : 0);
        
        const savingsAmount = income - expense;
        
        // Diferença entre meses
        const comparison = savingsPercent - lastMonthSavingsPercent;
        const savingsDiff = savingsAmount - lastMonthSavingsAmount;
        
        return { 
            income, 
            expense, 
            total, 
            savingsPercent, 
            savingsAmount,
            lastMonthSavingsPercent,
            comparison,
            savingsDiff
        };
    }, [transactions]);

    const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);

    // Filtragem e Agrupamento (Com Paginação)
    const sortedFilteredTransactions = useMemo(() => {
        let filtered = transactions.filter(t => t.status !== 'deleted');

        // Apply Search (accent-insensitive)
        if (searchQuery) {
            filtered = filtered.filter(t => {
                const searchNorm = removeAccents(searchQuery.toLowerCase());
                const dateStr = format(parseDate(t.date), 'dd/MM/yyyy', { locale: ptBR });
                return (
                    removeAccents(t.category.toLowerCase()).includes(searchNorm) ||
                    (t.subcategory && removeAccents(t.subcategory.toLowerCase()).includes(searchNorm)) ||
                    (t.description && removeAccents(t.description.toLowerCase()).includes(searchNorm)) ||
                    dateStr.includes(searchQuery)
                );
            });
        }

        // Apply Time Filter
        const now = new Date();
        if (!searchQuery) { // Only apply rigid time filters if NOT searching
            if (filterPeriod === 'today') {
                filtered = filtered.filter(t => isToday(parseDate(t.date)));
            } else if (filterPeriod === 'last5') {
                // Will slice after sorting
            } else if (filterPeriod === 'this_month') {
                filtered = filtered.filter(t => isSameMonth(parseDate(t.date), now));
            } else if (filterPeriod === 'last_30') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filtered = filtered.filter(t => parseDate(t.date) >= thirtyDaysAgo);
            } else if (filterPeriod === 'last_60') {
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                filtered = filtered.filter(t => parseDate(t.date) >= sixtyDaysAgo);
            } else if (filterPeriod === 'custom' && customRange.start && customRange.end) {
                const start = new Date(customRange.start);
                const end = new Date(customRange.end);
                // Set end time to end of day
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(t => {
                    const d = parseDate(t.date);
                    return d >= start && d <= end;
                });
            }
        }

        const sorted = [...filtered].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

        // Keep a reference to sorted/filtered data BEFORE grouping for export
        return sorted;
    }, [transactions, filterPeriod, searchQuery, customRange]);

    // Grouping for Display
    const groupedTransactions = useMemo(() => {
        const sorted = sortedFilteredTransactions;
        // Apply Limit for 'last5'
        let finalData = sorted;
        if (!searchQuery && filterPeriod === 'last5') {
            finalData = sorted.slice(0, 5);
        } else {
            // Aplica o slice para scroll infinito se não for limited view
            finalData = sorted.slice(0, visibleCount);
        }

        const groups: Record<string, typeof transactions> = {};

        finalData.forEach(t => {
            const date = parseDate(t.date);
            let key = format(date, "dd 'de' MMMM", { locale: ptBR });

            if (isToday(date)) key = `Hoje, ${key}`;
            else if (isYesterday(date)) key = `Ontem, ${key}`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        return groups;
    }, [sortedFilteredTransactions, filterPeriod, searchQuery, visibleCount]);

    // Observer para carregar mais itens
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + 10, transactions.length));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [transactions.length]);

    // Detectar scroll para mostrar botão de voltar ao topo
    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                const scrollTop = scrollContainerRef.current.scrollTop;
                setShowScrollTop(scrollTop > 300);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const scrollToTop = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const formatCurrency = (val: number) => {
        const locale = currentCurrency === 'BRL' ? 'pt-BR' : 'en-US';
        const currency = currentCurrency;
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTransactionToDelete(id);
    };

    const handleConfirmDelete = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete);
            setTransactionToDelete(null);
        }
    };

    const handleEditClick = (t: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setTransactionToEdit(t);
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden" ref={listDragRef}>
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 pt-6 pb-32 md:pb-8 bg-background">
                <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
                    {/* Cards Header */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
                        {/* Card Saldo Grande */}
                        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-surface p-6 lg:p-8 shadow-xl group border border-gray-100 dark:border-white/5">
                            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl transition-all duration-700 group-hover:bg-primary/20"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>account_balance_wallet</span>
                                        <p className="text-gray-600 dark:text-dim text-xs lg:text-sm font-bold uppercase tracking-wider">Saldo Total Disponível</p>
                                    </div>
                                    <h3 className="text-content text-3xl lg:text-4xl font-extrabold tracking-tight">{formatValue(summary.total, formatCurrency)}</h3>
                                </div>
                                <div className="flex md:hidden items-center justify-between mt-8 border-t border-gray-100 dark:border-white/10 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-green-500 uppercase font-bold tracking-widest">Entradas</span>
                                        <span className="text-content text-lg font-bold tracking-tight">{formatValue(summary.income, formatCurrency)}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-red-500 uppercase font-bold tracking-widest">Saídas</span>
                                        <span className="text-content text-lg font-bold tracking-tight">{formatValue(summary.expense, formatCurrency)}</span>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-6 mt-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 dark:text-dim uppercase font-bold">Entradas</span>
                                        <span className="text-content text-sm font-black">{formatValue(summary.income, formatCurrency)}</span>
                                    </div>
                                    <div className="flex flex-col border-l border-gray-100 dark:border-white/10 pl-6">
                                        <span className="text-[10px] text-gray-500 dark:text-dim uppercase font-bold">Saídas</span>
                                        <span className="text-content text-sm font-black">{formatValue(summary.expense, formatCurrency)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Entradas */}
                        <div className="hidden md:flex flex-col justify-between rounded-3xl bg-surface p-6 shadow-soft border border-gray-100 dark:border-white/5 hover:border-primary/40 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="size-10 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-500" style={{ fontSize: '24px' }}>south_west</span>
                                </div>
                                <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-lg">Receitas</span>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-dim text-xs font-bold uppercase tracking-wider mb-1">Entradas</p>
                                <h3 className="text-content text-2xl font-extrabold">{formatCurrency(summary.income)}</h3>
                            </div>
                        </div>

                        {/* Card Saídas */}
                        <div className="hidden md:flex flex-col justify-between rounded-3xl bg-surface p-6 shadow-soft border border-gray-100 dark:border-white/5 hover:border-red-400/40 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="size-10 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: '24px' }}>north_east</span>
                                </div>
                                <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">Despesas</span>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-dim text-xs font-bold uppercase tracking-wider mb-1">Saídas</p>
                                <h3 className="text-content text-2xl font-extrabold">{formatCurrency(summary.expense)}</h3>
                            </div>
                        </div>
                    </div>

                    
                    {/* Lista Principal */}
                    <div className="grid grid-cols-12 gap-6 lg:gap-8">
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-black text-secondary">Transações Recentes</h4>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] lg:text-xs">
                                    <button
                                        onClick={() => setFilterPeriod('today')}
                                        className={`px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${filterPeriod === 'today' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        Hoje
                                    </button>
                                    <button
                                        onClick={() => setFilterPeriod('last_30')}
                                        className={`px-3 py-1.5 rounded-full border transition-colors ${filterPeriod === 'last_30' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        30 dias
                                    </button>
                                    <button
                                        onClick={() => setFilterPeriod('last_60')}
                                        className={`px-3 py-1.5 rounded-full border transition-colors ${filterPeriod === 'last_60' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        60 dias
                                    </button>
                                    <button
                                        onClick={() => setFilterPeriod('this_month')}
                                        className={`px-3 py-1.5 rounded-full border transition-colors ${filterPeriod === 'this_month' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        Mês
                                    </button>
                                    <button
                                        onClick={() => setFilterPeriod('last5')}
                                        className={`px-3 py-1.5 rounded-full border transition-colors ${filterPeriod === 'last5' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        Últimas 5
                                    </button>
                                    <button
                                        onClick={() => setManualFilterOpen(true)}
                                        className={`px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${filterPeriod === 'custom' ? 'bg-primary text-secondary border-primary font-bold' : 'bg-surface border-gray-200 dark:border-white/10 text-gray-600 dark:text-dim hover:text-primary font-bold'}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                        Personalizar
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(groupedTransactions).length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Nenhuma transação encontrada neste período.
                                    </div>
                                ) : (
                                    Object.entries(groupedTransactions).map(([dateLabel, trans]) => (
                                        <div key={dateLabel} className="bg-white/70 dark:bg-zinc-900/40 rounded-3xl p-2 border border-gray-100 dark:border-white/5 shadow-soft">
                                            <div className="px-4 lg:px-6 py-3 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                                                <span className="text-[10px] lg:text-xs font-bold text-zinc-600 dark:text-gray-400 uppercase tracking-widest">{dateLabel}</span>
                                            </div>
                                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                {trans.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => setSelectedTransaction(t)}
                                                        className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 hover:border-primary/40 dark:hover:border-primary/40 transition-all group cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3 lg:gap-4">
                                                            <div className={`size-10 lg:size-12 rounded-2xl flex items-center justify-center ${t.type === 'income' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                                                    {(() => {
                                                                        const subIcon = t.subcategory?.includes(':') ? t.subcategory.split(':')[1].trim() : getSubcategoryIcon(t.category, t.subcategory, t.type as any);
                                                                        return subIcon || (t.type === 'income' ? 'arrow_upward' : 'shopping_bag');
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-xs lg:text-base text-zinc-900 dark:text-white">
                                                                    {t.subcategory ? capitalize(t.subcategory.split(':')[0].trim()) : capitalize(t.category)}
                                                                </p>
                                                                <p className="text-[10px] lg:text-xs text-zinc-600 dark:text-gray-300 font-medium">
                                                                    {t.subcategory ? capitalize(t.category) : ''} {t.subcategory ? '•' : ''} {format(new Date(t.date), 'HH:mm')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <p className={`font-extrabold text-xs lg:text-base ${t.type === 'income' ? 'text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded' : 'text-zinc-900 dark:text-white'}`}>
                                                                            {t.type === 'income' ? '+' : '-'} {formatValue(t.amount, formatCurrency)}
                                                                        </p>
                                                                        <div className={`flex gap-2 transition-opacity ${isEditMode ? 'opacity-100 visible' : 'opacity-0 group-hover:opacity-100'}`}>
                                                                            <button 
                                                                                onClick={(e) => handleEditClick(t, e)}
                                                                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-dim hover:text-primary transition-colors"
                                                                                title="Editar"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => handleDeleteClick(t.id, e)}
                                                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-dim hover:text-red-500 transition-colors"
                                                                                title="Excluir"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                        <div className="flex items-center gap-2 text-xs text-dim mt-1 font-medium">
                                                            <span className="opacity-60">{t.category}</span>
                                                            {t.subcategory && (
                                                                <>
                                                                    <span className="text-[10px] opacity-30">/</span>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFilterSubcategory(t.subcategory!);
                                                                        }}
                                                                        className="flex items-center gap-1.5 bg-green-500/10 dark:bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/20 hover:border-green-500/40 transition-all group/badge"
                                                                    >
                                                                        {(() => {
                                                                            let subLabel = t.subcategory;
                                                                            let subIcon = '';

                                                                            if (t.subcategory.includes(':')) {
                                                                                const parts = t.subcategory.split(':');
                                                                                subLabel = parts[0].trim();
                                                                                subIcon = parts[1]?.trim() || '';
                                                                            } else {
                                                                                subIcon = getSubcategoryIcon(t.category, t.subcategory, t.type) || 'subdirectory_arrow_right';
                                                                            }

                                                                            return (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="material-symbols-outlined text-[14px] text-green-600 dark:text-green-400 font-bold">{subIcon}</span>
                                                                                    <span className="font-bold text-green-600 dark:text-green-400">{subLabel}</span>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Sentinel for Infinite Scroll - Only show if mode supports scrolling */}
                            <div ref={observerTarget} className="py-6 flex justify-center w-full">
                                {filterPeriod !== 'last5' && filterPeriod !== 'today' && visibleCount < sortedFilteredTransactions.length && (
                                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Direita (Meta de Economia) - Visible on All Sizes now, adjusted grid */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-soft border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Economias este mês</h4>
                                <div 
                                    className="relative flex items-center justify-center mb-6 touch-none"
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleMouseLeave}
                                >
                                    <motion.div
                                        style={{ 
                                            x: mouseXSpring, 
                                            y: mouseYSpring,
                                            rotateX: rotateXSpring,
                                            rotateY: rotateYSpring,
                                            perspective: 1000
                                        }}
                                        className="relative flex items-center justify-center"
                                    >
                                        <svg className="size-40 lg:size-48" viewBox="0 0 100 100">
                                            <circle className="text-gray-100 dark:text-white/5" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="10"></circle>
                                            <circle 
                                                className={`${summary.savingsPercent >= 0 ? 'text-primary' : 'text-red-500'} progress-ring__circle`} 
                                                cx="50" 
                                                cy="50" 
                                                fill="transparent" 
                                                r="40" 
                                                stroke="currentColor" 
                                                strokeDasharray="251.2" 
                                                strokeDashoffset={251.2 - (251.2 * Math.min(Math.abs(summary.savingsPercent), 100) / 100)} 
                                                strokeLinecap="round" 
                                                strokeWidth="10" 
                                                style={{ 
                                                    transition: 'stroke-dashoffset 1s ease-out', 
                                                    transform: 'rotate(-90deg)', 
                                                    transformOrigin: '50% 50%' 
                                                }}
                                            ></circle>
                                        </svg>
                                        <motion.div 
                                            style={{ x: textX, y: textY }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-2"
                                        >
                                            <span className={`text-2xl lg:text-3xl font-extrabold ${summary.savingsPercent >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                {summary.savingsPercent.toFixed(0)}%
                                            </span>
                                            <span className="text-[8px] lg:text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                {summary.savingsPercent >= 0 ? 'Economizado' : 'Déficit'}
                                            </span>
                                        </motion.div>
                                    </motion.div>
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-xl lg:text-2xl font-extrabold ${summary.savingsAmount >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                        {summary.savingsAmount >= 0 ? '+' : ''}{formatCurrency(summary.savingsAmount)}
                                    </p>
                                    <p className="text-[10px] lg:text-xs text-gray-500">
                                        {summary.savingsDiff > 0 
                                            ? `Você economizou ${formatCurrency(summary.savingsDiff)} a mais que mês passado!` 
                                            : summary.savingsDiff < 0 
                                                ? `Sua economia foi ${formatCurrency(Math.abs(summary.savingsDiff))} menor que mês passado.`
                                                : summary.income > 0 ? 'Sua economia está igual ao mês passado.' : 'Sem dados para comparação.'}
                                        <br />
                                        <span className="opacity-60">
                                            ({summary.comparison > 0 ? '+' : ''}{summary.comparison.toFixed(0)}% na taxa de economia)
                                        </span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSavingsDetailOpen(true)}
                                    className="w-full mt-8 py-3 rounded-2xl border-2 border-primary/20 text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                                >
                                    Ver Detalhes da Meta
                                </button>
                            </div>
                            {/* Botão Exportar Extrato */}
                            <button
                                onClick={() => setExportModalOpen(true)}
                                className="w-full flex items-center justify-center gap-3 bg-secondary dark:bg-primary text-white dark:text-secondary px-6 py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-base group"
                            >
                                <span className="material-symbols-outlined text-xl group-hover:animate-bounce">download</span>
                                <span>Exportar Extrato</span>
                            </button>

                            <div className="rounded-3xl bg-primary/5 dark:bg-primary/10 p-6 border border-primary/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="material-symbols-outlined text-primary">lightbulb</span>
                                    <h5 className="font-bold text-sm text-content">Dica de hoje</h5>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {(() => {
                                        // Lógica dinâmica de dicas baseada em dados
                                        if (summary.savingsPercent < 0) {
                                            return (
                                                <>
                                                    Suas <b>despesas estão acima das receitas</b> este mês. Considere reduzir gastos não essenciais ou buscar fontes de renda extra.
                                                </>
                                            );
                                        } else if (summary.savingsPercent < 10) {
                                            return (
                                                <>
                                                    Você está economizando <b>{summary.savingsPercent.toFixed(1)}%</b>. Tente aumentar para pelo menos 20% das suas receitas para criar uma reserva sólida!
                                                </>
                                            );
                                        } else if (summary.savingsPercent >= 10 && summary.savingsPercent < 30) {
                                            return (
                                                <>
                                                    Excelente! Você está economizando <b>{summary.savingsPercent.toFixed(1)}%</b> das suas receitas. Continue assim para manter suas finanças saudáveis!
                                                </>
                                            );
                                        } else {
                                            return (
                                                <>
                                                    Parabéns! <b>{summary.savingsPercent.toFixed(1)}%</b> de economia é excepcional. Considere investir esse excedente para fazê-lo crescer ainda mais!
                                                </>
                                            );
                                        }
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isExportModalOpen && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    transactions={transactions}
                    filteredTransactions={sortedFilteredTransactions}
                />
            )}

            {/* Modal de Filtro Manual */}
            <Dialog open={isManualFilterOpen} onOpenChange={setManualFilterOpen}>
                <DialogContent className="sm:max-w-md bg-surface border-border p-6 shadow-xl">
                    <DialogHeader>
                        <DialogTitle>Filtrar Período</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Data Inicial</label>
                                <input
                                    type="date"
                                    value={customRange.start}
                                    onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-content text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Data Final</label>
                                <input
                                    type="date"
                                    value={customRange.end}
                                    onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-content text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => {
                            setManualFilterOpen(false);
                            setCustomRange({ start: '', end: '' });
                            if (filterPeriod === 'custom') setFilterPeriod('last5');
                        }}>Cancelar</Button>
                        <Button onClick={() => {
                            setFilterPeriod('custom');
                            setManualFilterOpen(false);
                        }}>Aplicar Filtro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Savings Detail Modal */}
            <Dialog open={isSavingsDetailOpen} onOpenChange={setSavingsDetailOpen}>
                <DialogContent className="sm:max-w-md bg-surface border-border p-6 shadow-xl">
                    <div ref={savingsReportRef} className="bg-surface p-2">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">savings</span>
                                Detalhes da Economia
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="bg-background rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-dim">Total de Receitas</span>
                                    <span className="text-sm font-bold text-green-600 dark:text-green-500">
                                        {formatCurrency(summary.income)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-dim">Total de Despesas</span>
                                    <span className="text-sm font-bold text-red-600 dark:text-red-500">
                                        {formatCurrency(summary.expense)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-dim">Economia Mês Anterior</span>
                                    <span className="text-sm font-bold text-gray-500">
                                        {summary.lastMonthSavingsPercent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <SavingsEvolutionChart />
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-content">Economia Total</span>
                                    <span className={`text-lg font-extrabold ${summary.savingsAmount >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {summary.savingsAmount >= 0 ? '+' : ''}{formatCurrency(summary.savingsAmount)}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4">
                                <p className="text-xs text-content leading-relaxed">
                                    <span className="font-bold">Cálculo:</span> Você economizou{' '}
                                    <span className={`font-extrabold ${summary.savingsPercent >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {summary.savingsPercent.toFixed(1)}%
                                    </span>{' '}
                                    das suas receitas este mês (Sua meta: {savingsGoal}%).
                                    {summary.savingsPercent >= savingsGoal 
                                        ? ' Parabéns, você atingiu sua meta!' 
                                        : ` Falta pouco para os ${savingsGoal}%.`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center mt-6">
                        <Button 
                            variant="outline" 
                            onClick={exportSavingsPDF}
                            className="rounded-xl flex-1 border-primary text-primary hover:bg-primary/10"
                        >
                            Exportar PDF
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => setSavingsDetailOpen(false)}
                            className="rounded-xl flex-1 bg-zinc-200 dark:bg-white/10"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Transaction Modal */}
            {transactionToEdit && (
                <EditTransactionModal 
                    transaction={transactionToEdit}
                    onClose={() => setTransactionToEdit(null)}
                    onSaveSuccess={() => setTransactionToEdit(null)}
                />
            )}

            {/* Modal de Transações por Subcategoria */}
            <Modal isOpen={!!filterSubcategory} onClose={() => setFilterSubcategory(null)}>
                <div className="flex flex-col h-full max-h-[95vh]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-content/5 flex items-center justify-between bg-surface dark:bg-zinc-900 z-10 sticky top-0">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">
                                    {filterSubcategory?.includes(':') ? filterSubcategory.split(':')[1].trim() : 'receipt_long'}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-content uppercase tracking-wider">
                                    {filterSubcategory?.split(':')[0].trim()}
                                </h2>
                                <p className="text-[10px] font-bold text-dim uppercase tracking-widest">Filtrado por subcategoria</p>
                            </div>
                        </div>
                        <button onClick={() => setFilterSubcategory(null)} className="p-2 hover:bg-content/5 rounded-full transition-colors active:scale-90">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar pb-10">
                        {(() => {
                            const filtered = sortedFilteredTransactions.filter(t => t.subcategory === filterSubcategory);
                            if (filtered.length === 0) {
                                return <div className="text-center py-10 text-dim text-xs font-bold uppercase tracking-widest">Nenhuma transação encontrada.</div>;
                            }
                            return filtered.map(t => (
                                <div key={t.id} className="nm-card p-4 rounded-2xl flex items-center justify-between border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-content/5 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-dim uppercase">
                                                {format(new Date(t.date), 'dd/MM')}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-content">{t.description || t.category}</p>
                                            <p className="text-[10px] font-bold text-dim uppercase tracking-tighter opacity-60">
                                                {format(new Date(t.date), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-sm ${t.type === 'income' ? 'text-primary' : 'text-content'}`}>
                                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                        </p>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-content/5 bg-surface dark:bg-zinc-900 sticky bottom-0 z-20">
                        <button 
                            onClick={() => setFilterSubcategory(null)}
                            className="w-full h-14 nm-card bg-surface text-dim font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl active:scale-95 transition-all"
                        >
                            Fechar Lista
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Logout Confirmation Dialog (App.tsx handles this but keeping local logic if needed) */}
            
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
                <DialogContent className="sm:max-w-[425px] bg-surface border-border p-6 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span>
                            Excluir Transação
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-content text-sm">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTransactionToDelete(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>Confirmar Exclusão</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {
                selectedTransaction && (
                    <TransactionDetailModal
                        transaction={selectedTransaction}
                        onClose={() => setSelectedTransaction(null)}
                    />
                )
            }

            {/* Botão de Voltar ao Topo */}
            {showScrollTop && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToTop}
                    className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 size-12 md:size-14 rounded-full bg-primary hover:bg-primary/90 text-secondary shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    title="Voltar ao topo"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_upward</span>
                </motion.button>
            )}
        </div>
    );
};

export default TransactionsList;
