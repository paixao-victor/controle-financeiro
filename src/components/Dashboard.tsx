import React, { useMemo, useState, useEffect, useCallback } from 'react';


import { useTransactions } from '@/contexts/TransactionsContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, isPast, isToday, isSameMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { useDragScroll } from '@/hooks/useDragScroll';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Sector } from 'recharts';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import BottomSheetSelect from './BottomSheetSelect';
import { useSettings } from '@/contexts/SettingsContext';

const BANKS = [
    { id: 'nubank', label: 'Nubank', color: '#820ad1', sigla: 'NU' },
    { id: 'itau', label: 'Itaú', color: '#ec7000', sigla: 'IT' },
    { id: 'bnb', label: 'BNB', color: '#ffcc00', sigla: 'BNB' },
    { id: 'bb', label: 'BB', color: '#0038a8', sigla: 'BB' },
];

const Dashboard = () => {
    const { 
        transactions, 
        predictedExpenses,
        cards,
        updateCard
    } = useTransactions();
    const { formatValue } = useSettings();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [activeIndex, setActiveIndex] = useState(-1);
    const [clickedIndex, setClickedIndex] = useState(-1);
    const [selectedPrediction, setSelectedPrediction] = useState<any | null>(null);
    const [selectedCardDetail, setSelectedCardDetail] = useState<any | null>(null);
    const [selectedFuelDetail, setSelectedFuelDetail] = useState<any | null>(null);
    const [detailTab, setDetailTab] = useState<'credit' | 'debit'>('credit');
    const [billActionMenu, setBillActionMenu] = useState<{ isOpen: boolean; bill: any }>({ isOpen: false, bill: null });

    // Elastic Chart State
    const [pullState, setPullState] = useState({ active: false, index: -1, y: 0 });
    // AJUSTE MANUAL DE ELASTICIDADE: 
    // Para aumentar a reação, aumente o multiplicador em onMouseMove (-1.5 abaixo)
    // Para suavizar o retorno, aumente o damping (25 acima)
    const pullSpring = useSpring(0, { stiffness: 400, damping: 25 });
    
    useEffect(() => {
        if (!pullState.active) {
            pullSpring.set(0);
        } else {
            pullSpring.set(pullState.y);
        }
    }, [pullState.active, pullState.y]); 

    const handlePayPrediction = (prediction: any) => {
        // Agora ao invés de salvar direto, emitimos um evento para o App.tsx abrir o modal preenchido
        const event = new CustomEvent('open-add-transaction', { 
            detail: {
                amount: prediction.amount,
                category: prediction.category,
                subcategory: prediction.subcategory,
                notes: prediction.notes || '',
                date: prediction.date.split('T')[0]
            }
        });
        window.dispatchEvent(event);
        setSelectedPrediction(null);
        setSelectedPrediction(null);
    };

    const toggleBillStatus = (bill: any) => {
        const card = cards.find(c => c.id === bill.cardId);
        if (!card) return;

        const today = new Date();
        const monthKey = format(selectedMonth, 'yyyy-MM'); // Use selectedMonth to target correct bill
        const currentOverrides = card.billStatusOverrides || {};
        const currentOverride = currentOverrides[monthKey];
        
        let newStatus: 'open' | 'closed';
        let closingDateStr: string | undefined = undefined;

        if (currentOverride === 'closed') {
            newStatus = 'open';
        } else {
            newStatus = 'closed';
            closingDateStr = format(today, "dd/MM 'às' HH:mm");
        }
        
        updateCard(card.id, {
            ...card,
            billStatusOverrides: {
                ...currentOverrides,
                [monthKey]: newStatus,
                [`${monthKey}-date`]: closingDateStr
            }
        } as any);
        
        // Update local selected state to reflect immediate change if needed
        if (selectedCardDetail && selectedCardDetail.cardId === card.id) {
             setSelectedCardDetail((prev: any) => ({ 
                 ...prev, 
                 circleStatus: newStatus === 'closed' ? 'paid' : 'pending',
                 isPaid: newStatus === 'closed'
             }));
        }
    };

    const onPieEnter = useCallback((_: unknown, index: number) => {
        setActiveIndex(index);
    }, []);

    const onPieLeave = useCallback(() => {
        setActiveIndex(-1);
    }, []);

    const onPieClick = useCallback((e: any, index: number) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setClickedIndex((prev: number) => prev === index ? -1 : index);
    }, []);

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ 
                    filter: `drop-shadow(0 0 12px ${fill}66)`,
                    cursor: 'pointer',
                    outline: 'none'
                }}
            />
        );
    };
    
    // Refs para o scroll por arraste (mouse)
    const statusDragRef = useDragScroll({ enabled: true });
    const statusDragRefDesktop = useDragScroll({ enabled: true }); // New hook for desktop status circles
    const billsDragRefDesktop = useDragScroll({ enabled: true });
    const cardBillsDragRefDesktop = useDragScroll({ enabled: true });
    const billsDragRefMobile = useDragScroll({ enabled: true });
    const cardBillsDragRefMobile = useDragScroll({ enabled: true });
    const monthsDragRefDesktop = useDragScroll({ enabled: true });
    const monthsDragRefMobile = useDragScroll({ enabled: true });
    
    const [loadedMonths, setLoadedMonths] = useState(() => {
        const center = startOfMonth(new Date());
        return Array.from({ length: 15 }, (_, i) => addMonths(center, i - 7));
    });

    const [displayYear, setDisplayYear] = useState(selectedMonth.getFullYear());
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    // Efeito Flutuante e Inclinação 3D para o Gráfico (Estilo Prato)
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    
    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });
    const rotateXSpring = useSpring(rotateX, { stiffness: 150, damping: 15 });
    const rotateYSpring = useSpring(rotateY, { stiffness: 150, damping: 15 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calcula a inclinação (até 20 graus)
        rotateX.set((mouseY / height - 0.5) * -40);
        rotateY.set((mouseX / width - 0.5) * 40);
        
        // Pequena transação para acompanhar
        x.set((mouseX - width / 2) / 5);
        y.set((mouseY - height / 2) / 5);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const touch = e.touches[0];
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        
        rotateX.set((mouseY / height - 0.5) * -40);
        rotateY.set((mouseX / width - 0.5) * 40);
        
        x.set((mouseX - width / 2) / 8);
        y.set((mouseY - height / 2) / 8);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        rotateX.set(0);
        rotateY.set(0);
    };

    const CHART_COLORS = ['#47f425', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const stats = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        const recurringDefinitions = predictedExpenses;

        // Helper: Cálculo de média dos últimos 3 meses
        const getSubcategoryAverage = (subcat: string, cat: string) => {
            const threeMonthsAgo = subMonths(startOfMonth(selectedMonth), 3);
            const endDate = subMonths(startOfMonth(selectedMonth), 0);
            
            const relevantTransactions = transactions.filter(t => 
                t.status !== 'deleted' && 
                t.type === 'expense' &&
                (t.subcategory === subcat || (t.category === cat && !t.subcategory)) &&
                isWithinInterval(new Date(t.date), { start: threeMonthsAgo, end: endDate })
            );

            if (relevantTransactions.length === 0) return 0;
            const total = relevantTransactions.reduce((acc, t) => acc + t.amount, 0);
            return total / 3;
        };


        const currentMonthTransactions = transactions.filter(t =>
            t.status !== 'deleted' && isWithinInterval(new Date(t.date), { start, end })
        );

        // Lógica para Média de Custos (Últimos 3 meses de variáveis + Fixas atuais)
        const last3MonthsStart = startOfMonth(subMonths(start, 3));
        const last3MonthsEnd = endOfMonth(subMonths(start, 1));
        const historicalTransactions = transactions.filter(t =>
            t.status !== 'deleted' && t.type === 'expense' && isWithinInterval(new Date(t.date), { start: last3MonthsStart, end: last3MonthsEnd })
        );
        
        // Categorias que não são "Fixas/Moradia" (consideradas variáveis)
        const variableExpenseTotal = historicalTransactions.reduce((acc, t) => acc + t.amount, 0);
        const variableAverage = variableExpenseTotal / 3;

        const fixedExpensesTotal = predictedExpenses.reduce((acc, p) => acc + p.amount, 0);
        const predictedTotalCosts = fixedExpensesTotal + variableAverage;

        // Comparativo com mês anterior para o Total Previsto
        const prevMonthDate = subMonths(start, 1);
        const prevHistoricalStart = startOfMonth(subMonths(prevMonthDate, 3));
        const prevHistoricalEnd = endOfMonth(subMonths(prevMonthDate, 1));
        const prevHistoricalTrans = transactions.filter(t => 
            t.status !== 'deleted' && t.type === 'expense' && isWithinInterval(new Date(t.date), { start: prevHistoricalStart, end: prevHistoricalEnd })
        );
        const prevVariableAverage = prevHistoricalTrans.length > 0 ? (prevHistoricalTrans.reduce((acc, t) => acc + t.amount, 0) / 3) : 0;
        const prevPredictedTotal = fixedExpensesTotal + prevVariableAverage;
        
        const predictedDiff = prevPredictedTotal > 0 ? ((predictedTotalCosts - prevPredictedTotal) / prevPredictedTotal) * 100 : 0;

        const totalIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const totalExpense = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        const balance = totalIncome - totalExpense;

        // Balance Comparison Logic (Month-to-Date vs Previous Month-to-Date)
        let balanceDiff = 0;
        
        // Use selected month comparison
        const startPrevMonth = subMonths(start, 1);
        const endPrevMonth = endOfMonth(startPrevMonth);

        const currentMonthBalance = totalIncome - totalExpense;
        
        const prevMonthTransactions = transactions.filter(t =>
            t.status !== 'deleted' && isWithinInterval(new Date(t.date), { start: startPrevMonth, end: endPrevMonth })
        );

        const prevMonthIncome = prevMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);
        const prevMonthExpense = prevMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
        
        const prevMonthBalance = prevMonthIncome - prevMonthExpense;

        if (prevMonthBalance !== 0) {
            balanceDiff = Math.round(((currentMonthBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100);
        } else if (currentMonthBalance !== 0) {
            balanceDiff = 100;
        }

        // Variable Cost Averages (Projections)
        const variableCategories = ['energia', 'água', 'gás', 'luz', 'internet', 'mercado', 'combustível'];
        const projections: Record<string, number> = {};
        
        variableCategories.forEach(cat => {
            const pastTrans = transactions.filter(t => t.status !== 'deleted' && t.category.toLowerCase().includes(cat));
            if (pastTrans.length > 0) {
                const total = pastTrans.reduce((acc, t) => acc + t.amount, 0);
                projections[cat] = Math.round(total / Math.max(1, pastTrans.length));
            }
        });

        const monthKey = format(today, 'yyyy-MM');

        // Card Bills (Separated) - Improved logic
        const cardBills = cards.filter(c => c.status !== 'deleted' && c.type !== 'debit' && c.type !== 'food').map(card => {
            const billDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), card.dueDay || 10);
            
            // Manual overrides
            const manualStatus = card.billStatusOverrides?.[monthKey];
            const isPaid = manualStatus === 'closed' || currentMonthTransactions.some(t => 
                t.paymentMethod === 'cartao' && t.cardId === card.id && t.category === 'Pagamento' && t.subcategory === 'Fatura'
            );
            
            // Média de 3 meses para este cartão
            const cardHistoricalTransactions = transactions.filter(t => 
                t.status !== 'deleted' && 
                t.paymentMethod === 'cartao' && 
                t.cardId === card.id && 
                t.paymentOption === 'credit' &&
                isWithinInterval(new Date(t.date), { start: last3MonthsStart, end: last3MonthsEnd })
            );
            const cardAverage = (cardHistoricalTransactions.reduce((acc, t) => acc + t.amount, 0) / 3) || 0;

            // Gastos atuais este mês
            const billTransactions = transactions.filter(t => 
                t.status !== 'deleted' && 
                t.paymentMethod === 'cartao' && 
                t.cardId === card.id && 
                t.paymentOption === 'credit' &&
                isSameMonth(new Date(t.date), selectedMonth)
            );
            const currentBillAmount = billTransactions.reduce((acc, t) => acc + t.amount, 0);

            // Valor previsto
            const predictedAmount = Math.max(cardAverage, currentBillAmount);

            const isOverdue = today.getDate() > card.dueDay && !isPaid;
            const isAfterClosing = today.getDate() >= card.closingDay;

            return {
                id: `bill-${card.id}`,
                cardId: card.id,
                category: 'Cartão',
                subcategory: card.alias,
                amount: currentBillAmount,
                averageAmount: cardAverage,
                predictedAmount: predictedAmount,
                date: billDate.toISOString(),
                circleStatus: isPaid ? 'paid' : (isOverdue ? 'delayed' : 'pending'),
                color: card.color || '#3b82f6',
                isCardBill: true,
                transactions: billTransactions,

                isVisible: isPaid || isAfterClosing || isOverdue || currentBillAmount > 0,
                icon: 'credit_card'
            };
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Fuel Grouping Logic
        const fuelTransactions = currentMonthTransactions.filter(t => t.category.toLowerCase() === 'combustível');
        const fuelTotal = fuelTransactions.reduce((acc, t) => acc + t.amount, 0);
        const fuelPrediction = recurringDefinitions.find((rd: any) => rd.category.toLowerCase() === 'combustível');
        
        // Final monthlyPredictions with grouped fuel
        const filteredExpenses = currentMonthTransactions.filter(t => t.type === 'expense' && t.category.toLowerCase() !== 'combustível' && !t.cardId)
            .map(t => {
                const [subLabel, subIcon] = (t.subcategory || '').split(':');
                const cleanDescription = subLabel || t.subcategory || t.description;
                
                return {
                    ...t,
                    // Prioritize parsed subcategory label for clean display
                    description: cleanDescription,
                    subcategory: cleanDescription, // Update subcategory to be clean too if used elsewhere
                    // Use parsed icon if priority icon is missing or to override
                    icon: subIcon || t.icon
                };
            });
        
        const monthlyPredictions = [
            ...filteredExpenses,
            ...(fuelTransactions.length > 0 || fuelPrediction ? [{
                id: 'grouped-fuel',
                category: 'Combustível',
                description: 'Combustível',
                amount: fuelTotal,
                predictedAmount: fuelPrediction?.amount || getSubcategoryAverage('Combustível', 'Combustível') || 0,
                date: (fuelTransactions[0]?.date || new Date().toISOString()),
                isPrediction: fuelTransactions.length === 0,
                transactions: fuelTransactions,
                circleStatus: fuelTransactions.length > 0 ? 'paid' : 'future'
            }] : []),
            ...recurringDefinitions
                .filter((rd: any) => {
                    if (rd.category.toLowerCase() === 'combustível') return false; 
                    return !currentMonthTransactions.some(t => 
                        t.type === 'expense' && 
                        (t.subcategory?.toLowerCase() === (rd.subcategory || '').toLowerCase() || 
                         t.description?.toLowerCase().includes((rd.subcategory || rd.name).toLowerCase()))
                    );
                })
                .map((rd: any) => {
                    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                    const actualDay = Math.min(rd.dueDay, lastDay);
                    
                    const [subLabel, subIcon] = (rd.subcategory || '').split(':'); // Parse Label:Icon

                    return {
                        id: `pred-${rd.id}`,
                        description: rd.notes || subLabel || rd.name,
                        subcategory: subLabel || rd.name,
                        amount: rd.amount,
                        category: rd.category,
                        date: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), actualDay).toISOString(),
                        isPrediction: true,
                        notes: rd.notes || '',
                        color: rd.color,
                        icon: rd.icon || subIcon, // Use parsed icon if priority icon is missing
                        predictedAmount: getSubcategoryAverage(rd.subcategory || rd.name, rd.category) || rd.amount
                    };
                }),
            ...cardBills.filter(bill => {
                const card = cards.find(c => c.id === bill.cardId);
                const closingDay = card?.closingDay || 15;
                const isClosed = today.getDate() >= closingDay || isPast(new Date(bill.date));
                // Include if amount > 0 OR if it is manually marked as paid (closed)
                return (isClosed && bill.amount > 0) || bill.circleStatus === 'paid';
            }).map(bill => ({
                ...bill,
                id: `circle-${bill.id}`,
                description: `Fatura ${bill.subcategory}`,
                amount: bill.amount,
                predictedAmount: bill.predictedAmount,
                isPrediction: false,
                isCardBill: true
            }))
        ].map((t: any) => {
            if (t.id === 'grouped-fuel') return t; 
            const tDate = new Date(t.date);
            const exists = !t.hasOwnProperty('isPrediction');
            const isTodayDate = isToday(tDate);
            const isPastDate = isPast(tDate) && !isTodayDate;
            const daysLeft = differenceInDays(tDate, today);
            
            let circleStatus: 'paid' | 'overdue' | 'urgent' | 'future' = 'future';
            
            if (exists) {
                circleStatus = 'paid';
            } else {
                if (isPastDate) circleStatus = 'overdue';
                else if (daysLeft <= 5) circleStatus = 'urgent';
                else circleStatus = 'future';
            }

            return { ...t, circleStatus, daysLeft };
        }).sort((a: any, b: any) => {
            const priority: Record<string, number> = { overdue: 0, urgent: 1, future: 2, paid: 3 };
            if (priority[a.circleStatus] !== priority[b.circleStatus]) {
                return (priority[a.circleStatus] ?? 0) - (priority[b.circleStatus] ?? 0);
            }
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        // Accounts Payable (Fixed + Card Bills)
        const accountsPayable = monthlyPredictions
            .filter((p: any) => {
                if (p.category.toLowerCase() === 'combustível') return false;
                // Se for cartão, sempre mostra se estiver fechado ou pendente neste carrossel
                if (p.isCardBill) return true;
                return p.circleStatus !== 'paid';
            })
            .sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Porcentagem de contas pagas da totalidade de contas previstas
        const totalPredictedCount = recurringDefinitions.length;
        const paidPredictedCount = recurringDefinitions.filter(rd => 
            currentMonthTransactions.some(t => 
                t.status !== 'deleted' && 
                t.type === 'expense' && 
                (t.subcategory === rd.subcategory || t.description?.toLowerCase().includes((rd.subcategory || '').toLowerCase()))
            )
        ).length;
        
        const billsPercentage = totalPredictedCount > 0 ? Math.round((paidPredictedCount / totalPredictedCount) * 100) : 0;

        const expensesByCategory: Record<string, number> = {};
        currentMonthTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            });

        const categoryData = Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value, percentage: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
            .map((item, index) => ({
                ...item,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

        const recentTransactions = [...currentMonthTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 4);

        return { 
            totalIncome, 
            totalExpense, 
            balance, 
            balanceDiff,
            billsPercentage, 
            categoryData, 
            recentTransactions, 
            monthlyPredictions,
            accountsPayable,
            cardBills,
            fixedExpensesTotal,
            variableAverage,
            predictedTotalCosts,
            predictedDiff,
            projections
        };
    }, [transactions, selectedMonth, predictedExpenses, cards]);

    // Use the imported formatCurrency instead of local redeclaration

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'moradia': 'home',
            'alimentação': 'restaurant',
            'transporte': 'directions_car',
            'saúde': 'health_and_safety',
            'educação': 'school',
            'lazer': 'sports_esports',
            'internet': 'router',
            'energia': 'electric_bolt',
        };
        return icons[category?.toLowerCase()] || 'shopping_bag';
    };

    // Função para carregar mais meses
    const loadMore = useCallback((direction: 'prev' | 'next', container: HTMLDivElement | null) => {
        if (!container) return;
        
        setLoadedMonths(current => {
            if (direction === 'next') {
                const last = current[current.length - 1];
                const nextFive = Array.from({ length: 5 }, (_, i) => addMonths(last, i + 1));
                const combined = [...current, ...nextFive];
                return combined.length > 25 ? combined.slice(-25) : combined;
            } else {
                const first = current[0];
                const prevFive = Array.from({ length: 5 }, (_, i) => subMonths(first, 5 - i));
                const combined = [...prevFive, ...current];
                const itemWidth = container.querySelector('.month-item')?.clientWidth || 0;
                setTimeout(() => {
                    container.scrollLeft += itemWidth * 5;
                }, 0);
                return combined.length > 25 ? combined.slice(0, 25) : combined;
            }
        });
    }, []);

    // Função para centralizar um mês
    const centerMonth = useCallback((date: Date, container: HTMLDivElement | null, smooth = true) => {
        if (!container) return;
        const monthElements = container.querySelectorAll('.month-item');
        const monthIndex = loadedMonths.findIndex(m => 
            m.getMonth() === date.getMonth() && m.getFullYear() === date.getFullYear()
        );
        
        if (monthIndex !== -1 && monthElements[monthIndex]) {
            const element = monthElements[monthIndex] as HTMLElement;
            const containerWidth = container.offsetWidth;
            const elementWidth = element.offsetWidth;
            const elementLeft = element.offsetLeft;
            const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
            setIsAutoScrolling(true);
            container.scrollTo({
                left: scrollLeft,
                behavior: smooth ? 'smooth' : 'auto'
            });
            setTimeout(() => setIsAutoScrolling(false), 500);
        }
    }, [loadedMonths]);

    // Função Helper para Parsing de Subcategoria
    const renderSubcategory = (sub: string) => {
        if (!sub) return null;
        if (sub.includes(':')) {
            const [name, icon] = sub.split(':');
            return (
                <div className="flex items-center justify-center gap-1">
                    {icon && <span className="material-symbols-outlined text-inherit opacity-80">{icon.trim()}</span>}
                    <span className="truncate">{name.trim()}</span>
                </div>
            );
        }
        return <span className="truncate">{sub}</span>;
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (isAutoScrolling) return;
        const { scrollLeft, scrollWidth, offsetWidth } = container;
        if (scrollLeft < 50) loadMore('prev', container);
        else if (scrollLeft + offsetWidth > scrollWidth - 50) loadMore('next', container);
        const scrollCenter = scrollLeft + (offsetWidth / 2);
        const monthElements = container.querySelectorAll('.month-item');
        let closestMonthIndex = -1;
        let minDistance = Infinity;
        monthElements.forEach((el, idx) => {
            const htmlEl = el as HTMLElement;
            const elCenter = htmlEl.offsetLeft + (htmlEl.offsetWidth / 2);
            const distance = Math.abs(scrollCenter - elCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestMonthIndex = idx;
            }
        });
        if (closestMonthIndex !== -1 && loadedMonths[closestMonthIndex]) {
            setDisplayYear(loadedMonths[closestMonthIndex].getFullYear());
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (monthsDragRefDesktop.current) centerMonth(selectedMonth, monthsDragRefDesktop.current, false);
            if (monthsDragRefMobile.current) centerMonth(selectedMonth, monthsDragRefMobile.current, false);
        };

        // ResizeObserver to detect layout changes (like sidebar toggle)
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        if (monthsDragRefDesktop.current?.parentElement) {
            resizeObserver.observe(monthsDragRefDesktop.current.parentElement);
        }

        const timer = setTimeout(handleResize, 100);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [selectedMonth, loadedMonths, centerMonth]);

    const handleMonthSelection = (date: Date, type: 'mobile' | 'desktop') => {
        setSelectedMonth(date);
        setDisplayYear(date.getFullYear());
        centerMonth(date, type === 'mobile' ? monthsDragRefMobile.current : monthsDragRefDesktop.current);
    };

    return (
        <div className="flex flex-col min-h-full w-full min-w-full overflow-x-hidden" onClick={() => setClickedIndex(-1)}>
            {/* Header Area */}
            <div className="bg-[rgb(28,44,28)] text-white w-full min-w-full pt-20 lg:pt-12 pb-20 lg:pb-12 rounded-b-[3rem] shadow-2xl relative z-10">
                <div className="fixed top-0 left-0 right-0 h-20 bg-[rgb(28,44,28)] w-full min-w-full" />
                
                <div className="max-w-[1400px] mx-auto flex flex-col gap-6 lg:gap-5 lg:-mb-10 px-6 lg:px-10">
                    {/* Saldo Principal */}
                    <div className="flex flex-col gap-1 mb-0 mt-6 lg:mt-4 z-10 relative">
                        <span className="text-xs font-medium text-white/60 block mb-1">Saldo disponível</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl lg:text-5xl font-bold text-white tracking-tight block">
                                {formatValue(stats.balance, formatCurrency)}
                            </span>
                            <div className="h-8 w-px bg-white/20 mx-2"></div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className={`material-symbols-outlined text-sm ${stats.balanceDiff >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {stats.balanceDiff >= 0 ? 'arrow_outward' : 'arrow_downward'}
                                    </span>
                                    <span className={`text-sm font-bold ${stats.balanceDiff >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {stats.balanceDiff > 0 ? '+' : ''}{stats.balanceDiff}%
                                    </span>
                                </div>
                                    <span className="text-[10px] text-white/50">{stats.balanceDiff >= 0 ? 'ganho' : 'perda'} vs período ant.</span>
                            </div>
                        </div>
                    </div>

                    {/* Grid Superior */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* Status Mensal */}
                        <div className="flex gap-6 w-full h-[120px] lg:h-[190px]">
                            <div className="w-[70%] bg-white/5 backdrop-blur-md rounded-xl p-3 lg:p-5 border border-white/10 flex items-center justify-between h-full relative group hover:bg-white/10 transition-colors">
                                <div className="absolute -right-10 -bottom-10 size-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                                <div className="flex flex-col justify-between h-full relative z-10">
                                    <div>
                                        <span className="text-[10px] lg:text-xs font-medium text-white/60 uppercase tracking-wider">Status Mensal</span>
                                        <div className="flex items-end gap-1 mt-1 lg:mt-2">
                                            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-white leading-none">{stats.billsPercentage}</h1>
                                            <span className="text-lg lg:text-2xl font-bold text-primary mb-1">%</span>
                                        </div>
                                        <span className="text-[10px] lg:text-sm font-medium text-white/80 leading-tight block mt-1">das contas pagas</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full w-fit">
                                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-white">Bom progresso</span>
                                    </div>
                                </div>
                                <div className="relative size-16 lg:size-23 flex items-center justify-center shrink-0">
                                    {/* Moldura Animada Girando */}
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-5px] rounded-full border border-dashed border-primary/30 z-0"
                                    />
                                    <motion.div 
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-8px] rounded-full border border-dotted border-white/10 z-0"
                                    />
                                    <div className="absolute inset-0 rounded-full animate-pulse-glow bg-primary/20 blur-xl z-0"></div>
                                    <svg className="size-full -rotate-90 relative z-10" viewBox="0 0 36 36">
                                        <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2"></path>
                                        <path className="text-primary drop-shadow-[0_0_12px_rgba(71,244,37,0.8)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${stats.billsPercentage}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                                    </svg>
                                    <span className="material-symbols-outlined text-white absolute text-xl lg:text-3xl z-20">check_circle</span>
                                </div>
                            </div>



                            {/* Card Média Custos */}
                            <div className="w-[30%] bg-white/5 backdrop-blur-md rounded-xl p-2 lg:p-4 border border-white/10 flex flex-col justify-between h-full hover:bg-white/10 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] lg:text-[10px] uppercase font-bold text-white/40 tracking-wider">Total Previsto</span>
                                    <span className="material-symbols-outlined text-primary text-sm lg:text-2xl">analytics</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-lg lg:text-xl font-bold text-white">
                                        {formatValue(stats.predictedTotalCosts, formatCurrency)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-black ${stats.predictedDiff > 0 ? 'text-red-400' : 'text-primary'}`}>
                                            {stats.predictedDiff > 0 ? '+' : ''}{Math.round(stats.predictedDiff)}%
                                        </span>
                                        <span className="text-[7px] text-white/30 uppercase tracking-tighter">vs mês ant.</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 overflow-hidden h-1 mt-1">
                                    <div className="flex-1 bg-primary/60 rounded-full" style={{ width: `${(stats.fixedExpensesTotal/stats.predictedTotalCosts)*100}%` }}></div>
                                    <div className="flex-1 bg-primary/20 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Contas a Vencer (Carousel - Desktop) */}
                        <div className="hidden lg:flex flex-col h-[200px] min-w-0">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span 
                                    onClick={() => (window as any).dispatchEvent(new CustomEvent('change-tab', { detail: 'Contas a Pagar' }))}
                                    className="text-[10px] font-black text-content/40 dark:text-white/40 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                                >
                                    Contas Fixas a Vencer
                                </span>
                            </div>
                            <div ref={billsDragRefDesktop} className="flex overflow-x-auto gap-4 no-scrollbar pb-6 px-1 cursor-grab active:cursor-grabbing scroll-smooth mt-6">
                                {stats.accountsPayable.length === 0 ? (
                                    <div className="bg-white/5 rounded-xl p-4 text-white/30 text-[10px] border border-white/10 w-full text-center flex items-center justify-center uppercase font-black tracking-widest">
                                        Nenhuma conta fixa pendente
                                    </div>
                                ) : (
                                    stats.accountsPayable.map((bill: any) => (
                                        <div key={bill.id} onClick={() => bill.isCardBill ? setSelectedCardDetail(bill) : setSelectedPrediction(bill)} 
                                            className="shrink-0 relative w-[210px] rounded-3xl p-4 shadow-sm border-2 backdrop-blur-md transition-all cursor-pointer hover:brightness-110 active:scale-95 bg-surface"
                                            style={{ 
                                                backgroundColor: bill.color || '#ffffff05',
                                                borderColor: bill.circleStatus === 'overdue' || bill.circleStatus === 'urgent' 
                                                    ? '#ef444490' 
                                                    : (bill.daysLeft > 15 ? '#ffffff10' : '#47f42590')
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="size-10 rounded-xl flex items-center justify-center bg-black/10 text-content">
                                                    <span className="material-symbols-outlined text-xl font-bold">{bill.icon || getCategoryIcon(bill.category)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${bill.circleStatus === 'urgent' || bill.circleStatus === 'overdue' ? 'bg-red-500 text-white animate-pulse' : 'bg-black/10 text-dim'}`}>
                                                        {bill.circleStatus === 'overdue' ? 'Vencido' : `${bill.daysLeft}d`}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="text-[11px] font-black text-content uppercase tracking-tight mb-0.5 truncate">{bill.subcategory || bill.description}</h4>
                                            <p className="text-xl font-black text-content tracking-tighter">{formatCurrency(bill.amount)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>


                    </div>

                    {/* Cartões (Novo Carousel - Desktop - Moved Layout) */}
                    <div className="hidden lg:flex flex-col min-w-0 mt-4 px-1">
                        <div className="flex justify-between items-center mb-4">
                            <span 
                                onClick={() => (window as any).dispatchEvent(new CustomEvent('change-tab', { detail: 'Meus Cartões' }))}
                                className="text-xs font-black text-content/60 dark:text-white/40 uppercase tracking-widest cursor-pointer hover:text-primary hover:opacity-100 transition-all"
                            >
                                Cartões
                            </span>
                        </div>
                        <div ref={cardBillsDragRefDesktop} className="flex overflow-x-auto gap-5 no-scrollbar pb-6 cursor-grab active:cursor-grabbing scroll-smooth w-full">
                            {stats.cardBills.length === 0 ? (
                                <div className="bg-white/5 rounded-xl p-3 text-white/20 text-[9px] border border-white/5 w-full text-center flex items-center justify-center uppercase font-black tracking-widest">
                                    Nenhuma fatura pendente
                                </div>
                            ) : (
                                stats.cardBills.map((bill: any) => (
                                    <div key={bill.id} onClick={() => setSelectedCardDetail(bill)} 
                                        className="shrink-0 relative w-[320px] lg:w-[30%] rounded-3xl p-5 shadow-sm border-2 backdrop-blur-md transition-all cursor-pointer hover:brightness-110 active:scale-95 bg-surface group"
                                        style={{ 
                                            backgroundColor: `${bill.color}15`,
                                            borderColor: bill.circleStatus === 'overdue' || bill.circleStatus === 'urgent' 
                                                ? '#ef444490' 
                                                : (bill.circleStatus === 'paid' ? '#47f42580' : '#ffffff10')
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-11 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: bill.color }}>
                                                    <span className="material-symbols-outlined text-xl text-secondary font-bold">
                                                        {bill.circleStatus === 'paid' ? 'check_circle' : 'credit_card'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className={`text-base font-black text-content uppercase tracking-tight truncate ${bill.circleStatus === 'paid' ? 'opacity-40' : ''}`}>{bill.subcategory}</h4>
                                                    <span className="text-[10px] font-bold text-dim uppercase tracking-widest mt-1">Venc. {format(new Date(bill.date), 'dd/MM')}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end shrink-0">
                                                <p className={`text-xl font-black text-content tracking-tighter leading-none ${bill.circleStatus === 'paid' ? 'opacity-40' : ''}`}>{formatValue(bill.amount, formatCurrency)}</p>
                                                <div className="mt-2 text-right">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                        bill.circleStatus === 'urgent' || bill.circleStatus === 'overdue' ? 'bg-red-500 text-white animate-pulse' : 
                                                        bill.circleStatus === 'paid' ? 'bg-primary/20 text-primary border border-primary/20' : 
                                                        'bg-black/10 text-dim'
                                                    }`}>
                                                        {bill.circleStatus === 'paid' ? 'Fechado' : (bill.circleStatus === 'overdue' ? 'Vencido' : `${bill.daysLeft}d`)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Month Selectors */}
                    <div className="flex lg:hidden flex-col items-center gap-1 mt-2">
                        <span className="text-[25px] md:text-[20px] font-bold text-white/40 uppercase tracking-widest leading-none">{displayYear}</span>
                        <div className="flex items-center w-full relative">
                            <div ref={monthsDragRefMobile} onScroll={handleScroll} className="flex items-center overflow-x-auto no-scrollbar scroll-smooth w-full cursor-grab active:cursor-grabbing pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <div className="shrink-0 w-[40%] md:w-[42.857%]" />
                                {loadedMonths.map((date) => {
                                    const isSelected = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                                    return (
                                        <div key={date.getTime()} onClick={() => handleMonthSelection(date, 'mobile')} className={`month-item flex flex-col items-center shrink-0 w-[20%] md:w-[14.285%] cursor-pointer transition-all duration-300 ${isSelected ? 'scale-110 z-10' : 'opacity-30 hover:opacity-100'}`}>
                                            <span className={`${isSelected ? 'text-lg font-extrabold text-white' : 'text-sm font-bold text-white/30'} uppercase tracking-wider text-center w-full`}>{format(date, 'MMM', { locale: ptBR })}</span>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1 shadow-[0_0_10px_rgba(71,244,37,0.8)]"></div>}
                                        </div>
                                    );
                                })}
                                <div className="shrink-0 w-[40%] md:w-[42.857%]" />
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:flex flex-col items-center gap-1 -mt-10 mb-10">
                        <span className="text-[20px] font-bold text-white/40 uppercase tracking-widest leading-none">{displayYear}</span>
                        <div className="flex items-center w-full relative">
                            <div ref={monthsDragRefDesktop} onScroll={handleScroll} className="flex items-center overflow-x-auto no-scrollbar scroll-smooth w-full cursor-grab active:cursor-grabbing pb-2">
                                <div className="shrink-0 w-[44.444%]" />
                                {loadedMonths.map((date) => {
                                    const isSelected = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                                    return (
                                        <div key={date.getTime()} onClick={() => handleMonthSelection(date, 'desktop')} className={`month-item flex flex-col items-center shrink-0 w-[11.111%] cursor-pointer transition-all duration-300 ${isSelected ? 'scale-110 z-10' : 'opacity-30 hover:opacity-100'}`}>
                                            <span className={`${isSelected ? 'text-lg font-extrabold text-white' : 'text-xs lg:text-sm font-bold text-white/30 dark:text-white/30'} uppercase tracking-wider text-center w-full`}>{format(date, 'MMM', { locale: ptBR })}</span>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1 shadow-[0_0_10px_rgba(71,244,37,0.8)]"></div>}
                                        </div>
                                    );
                                })}
                                <div className="shrink-0 w-[44.444%]" />
                            </div>
                        </div>
                    </div>    
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-3 lg:gap-2 pt-4 max-w-[1400px] mx-auto w-full px-6 lg:px-10 relative">
                {/* Contas a Vencer Mobile */}
                <div className="lg:hidden w-[calc(100%+3rem)] -mx-6 -mt-25 mb-1 relative z-20">
                    <div className="flex justify-between mx-6 items-center mb-1 px-1">
                        <span 
                            onClick={() => (window as any).dispatchEvent(new CustomEvent('change-tab', { detail: 'Contas' }))}
                            className="text-[10px] font-black text-white/40 uppercase tracking-widest"
                        >
                            Contas Fixas a Vencer
                        </span>
                    </div>
                    <div ref={billsDragRefMobile} className="flex overflow-x-auto gap-4 no-scrollbar pb-8 px-6 cursor-grab active:cursor-grabbing scroll-smooth">
                        {stats.accountsPayable.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white/40 text-xs border border-white/10 w-full text-center uppercase font-black tracking-widest">Nenhuma conta fixa</div>
                        ) : (
                            stats.accountsPayable.map((bill: any) => (
                                <div key={bill.id} onClick={() => setBillActionMenu({ isOpen: true, bill })} 
                                    className="shrink-0 relative w-[220px] rounded-3xl p-5 shadow-xl border-2 backdrop-blur-md transition-all cursor-pointer hover:brightness-110 active:scale-95"
                                    style={{ 
                                        backgroundColor: bill.color || '#ffffff05',
                                        borderColor: bill.circleStatus === 'overdue' || bill.circleStatus === 'urgent' 
                                            ? '#ef444490' 
                                            : (bill.daysLeft > 15 ? '#ffffff10' : '#47f42590')
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="size-10 rounded-xl flex items-center justify-center bg-black/10 text-content">
                                            <span className="material-symbols-outlined text-xl">{bill.icon || getCategoryIcon(bill.category)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${bill.circleStatus === 'urgent' || bill.circleStatus === 'overdue' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white/40'}`}>
                                                {bill.circleStatus === 'overdue' ? 'Vencido' : (isToday(new Date(bill.date)) ? 'Hoje' : `${bill.daysLeft}d`)}
                                            </span>
                                            <p className="text-[9px] font-bold text-dim mt-1 uppercase">{format(new Date(bill.date), 'dd/MM')}</p>
                                        </div>
                                    </div>
                                    <h4 className="text-[12px] font-black text-content uppercase tracking-tight mb-0.5 truncate">{bill.subcategory ? bill.subcategory.split(':')[0] : bill.description}</h4>
                                    <p className="text-2xl font-black text-content tracking-tighter">{formatCurrency(bill.amount)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Cartões Mobile */}
                <div className="lg:hidden w-[calc(100%+3rem)] -mx-6 -mt-10 mb-2 relative z-25">
                    <div className="flex justify-between mx-6 items-center mb-1 px-1">
                        <span 
                            onClick={() => (window as any).dispatchEvent(new CustomEvent('change-tab', { detail: 'Cartões' }))}
                            className="text-[10px] font-black uppercase tracking-widest"
                        >
                            Cartões
                        </span>
                    </div>
                    <div ref={cardBillsDragRefMobile} className="flex overflow-x-auto gap-3 no-scrollbar pb-8 px-6 cursor-grab active:cursor-grabbing scroll-smooth">
                        {stats.cardBills.length === 0 ? (
                            <div className="bg-white/5 rounded-xl p-4 text-white/20 text-[10px] border border-white/5 w-full text-center uppercase font-black tracking-widest">Nenhuma fatura</div>
                        ) : (
                            stats.cardBills.map((bill: any) => (
                                    <div key={bill.id} onClick={() => setSelectedCardDetail(bill)} 
                                    className="shrink-0 relative w-[230px] rounded-2xl p-4 shadow-lg border backdrop-blur-sm transition-all cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-between"
                                    style={{ 
                                        backgroundColor: `${bill.color}25`,
                                        borderColor: `${bill.color}60`
                                    }}
                                >
                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: bill.color }}>
                                                <span className="material-symbols-outlined text-lg text-secondary font-bold">credit_card</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h4 className="text-[11px] font-black text-content uppercase tracking-tight truncate max-w-full">{bill.subcategory}</h4>
                                                <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mt-1">{format(new Date(bill.date), 'dd/MM')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center min-w-[70px] h-full pl-2 border-l border-white/5">
                                        <p className="text-lg font-black text-content tracking-tighter leading-none">{formatCurrency(bill.amount)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Círculos de Status Mobile */}
                <div className="w-[calc(100%+3rem)] -mx-6 -mt-10 lg:hidden relative z-30">
                    <div ref={statusDragRef} className="overflow-x-auto no-scrollbar w-full cursor-grab active:cursor-grabbing pb-4 pl-6 pr-6">
                        <div className="flex gap-4 justify-start w-full min-w-max">
                             {stats.monthlyPredictions.map((pred: any, i: number) => (
                                <div 
                                    key={i} 
                                     onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setBillActionMenu({ isOpen: true, bill: pred });
                                    }}
                                    className="flex flex-col items-center gap-2 group w-[22vw] md:w-[18vw] shrink-0 transform transition-transform active:scale-95"
                                >
                                    <div className="relative p-0.5">
                                        <motion.div 
                                            initial={{ rotate: (i * 60) % 360 }}
                                            animate={{ rotate: ((i * 60) % 360) + 360 }}
                                            transition={{ 
                                                duration: 4 + (i % 3), 
                                                repeat: Infinity, 
                                                ease: "linear",
                                                delay: i * 0.1
                                            }}
                                            className="absolute inset-[-2px] rounded-full border border-primary/20 pointer-events-none"
                                        >
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 size-1.5 bg-primary rounded-full blur-[1px] shadow-[0_0_10px_#47f425]"></div>
                                        </motion.div>
                                        <div 
                                            className={`size-16 md:size-20 rounded-full flex items-center justify-center border-2 shadow-xl ${
                                                pred.circleStatus === 'paid' ? 'bg-primary border-primary/20 text-secondary' :
                                                pred.circleStatus === 'overdue' ? 'bg-red-600 border-white/20 text-white animate-pulse' :
                                                pred.circleStatus === 'urgent' ? 'bg-orange-500 border-white/20 text-white animate-pulse' :
                                                'bg-zinc-800/80 border-white/5 text-white/50'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl md:text-3xl">
                                                {pred.icon || getCategoryIcon(pred.category)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-black text-dim group-hover:text-primary truncate w-full text-center uppercase tracking-tighter">
                                        {pred.description || pred.subcategory || pred.category}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Círculos de Status - Previstos do Mês (Desktop) - Repositioned Here */}
                <div className="hidden -mt-25 lg:flex flex-col h-full min-w-0 justify-end pb-1 pt-4 relative z-30 px-2">
                    <div className="flex justify-between items-center mb-2 pl-2">
                        <span className="text-xs mt-2 font-black text-[#d7dce2] uppercase tracking-widest">Status Mensal</span>
                    </div>
                    <div 
                        ref={statusDragRefDesktop}
                        className="flex overflow-x-auto gap-8 no-scrollbar px-2 cursor-grab active:cursor-grabbing scroll-smooth w-full items-center"
                    >
                        {stats.monthlyPredictions.map((pred: any, i: number) => (
                            <div 
                                key={i} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setBillActionMenu({ isOpen: true, bill: pred });
                                }}
                                className="flex flex-col items-center gap-3 group cursor-pointer w-[12%] shrink-0"
                            >
                                <div className="relative p-0.5">
                                    {/* Orbital Giratório Randomizado */}
                                    <motion.div 
                                        initial={{ rotate: (i * 45) % 360 }}
                                        animate={{ rotate: ((i * 45) % 360) + 360 }}
                                        transition={{ 
                                            duration: 3 + (i % 4), 
                                            repeat: Infinity, 
                                            ease: "linear",
                                            delay: (i * 0.2)
                                        }}
                                        className="absolute inset-[-4px] rounded-full border border-primary/30 pointer-events-none"
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-2 bg-primary rounded-full blur-[2px] shadow-[0_0_12px_#47f425]"></div>
                                    </motion.div>

                                <div 
                                        className={`size-20 xl:size-24 rounded-full flex items-center justify-center border-4 shadow-xl transition-all group-hover:scale-110 shrink-0 ${
                                            pred.circleStatus === 'paid' ? 'bg-primary border-primary/20 text-secondary' :
                                            pred.circleStatus === 'overdue' ? 'bg-red-600 border-white/20 text-white animate-pulse' :
                                            pred.circleStatus === 'urgent' ? 'bg-orange-500 border-white/20 text-white animate-pulse' :
                                            'bg-zinc-800/80 border-white/5 text-white/50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-3xl xl:text-4xl">
                                            {pred.icon || getCategoryIcon(pred.category)}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] xl:text-[11px] font-bold text-content dark:text-white group-hover:text-primary truncate w-full text-center uppercase tracking-tighter drop-shadow-md py-1 px-2 rounded-lg bg-white/5 border border-white/5">
                                    {pred.description || pred.subcategory || pred.category}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cards abaixo dos círculos de status */}
                <div className="grid grid-cols-12 gap-4 lg:gap-6 min-h-[300px] px-4 lg:px-0">
                    <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-xl bg-surface p-5 lg:p-7 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-content flex items-center gap-2">
                                <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                                Por Categoria
                            </h3>
                            <button className="text-[10px] text-dim hover:text-primary transition-colors font-bold uppercase tracking-wider">Ver Detalhes</button>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 items-center min-h-[250px]">
                            <div 
                                className="relative h-[250px] flex items-center justify-center touch-none" 
                                onMouseMove={handleMouseMove} 
                                onMouseLeave={handleMouseLeave} 
                                onTouchMove={handleTouchMove} 
                                onTouchEnd={handleMouseLeave}
                                onClick={() => {
                                    if (clickedIndex !== -1) {
                                        setClickedIndex(-1);
                                    }
                                }}
                            >
                                <motion.div style={{ x: mouseXSpring, y: mouseYSpring, rotateX: rotateXSpring, rotateY: rotateYSpring, perspective: 1000 }} className="w-full h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={stats.categoryData} 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={65} 
                                                outerRadius={85} 
                                                paddingAngle={8} 
                                                dataKey="value" 
                                                stroke="none" 
                                                animationBegin={200} 
                                                animationDuration={1500} 
                                                className="spinning-pie"
                                                {...({
                                                    activeIndex: activeIndex !== -1 ? activeIndex : clickedIndex,
                                                    activeShape: renderActiveShape,
                                                    onMouseEnter: onPieEnter,
                                                    onMouseLeave: onPieLeave,
                                                    onClick: onPieClick
                                                } as any)}
                                            >
                                                {stats.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                        <AnimatePresence mode="wait">
                                            {(activeIndex !== -1 || clickedIndex !== -1) ? (
                                                <motion.div 
                                                    key="active"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex flex-col items-center"
                                                >
                                                    {(() => {
                                                        const data = activeIndex !== -1 ? stats.categoryData[activeIndex] : stats.categoryData[clickedIndex];
                                                        if (!data) return null;
                                                        return (
                                                            <>
                                                                <span className="text-[10px] uppercase font-black tracking-widest text-center" style={{ color: data.color }}>{data.name}</span>
                                                                <span className="text-2xl font-black text-content">{formatCurrency(data.value)}</span>
                                                                <span className="text-[9px] text-dim font-bold opacity-60">{data.percentage}% do total</span>
                                                            </>
                                                        );
                                                    })()}
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="total"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex flex-col items-center"
                                                >
                                                    <span className="text-[10px] text-gray-500 dark:text-dim uppercase font-black tracking-widest">Gasto Total</span>
                                                    <span className="text-2xl font-black text-black dark:text-content">{formatCurrency(stats.totalExpense)}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                            <div className="space-y-3">
                                {stats.categoryData.map((item, idx) => (
                                    <div key={idx} className="group cursor-pointer">
                                        <div className="flex items-center justify-between mb-1.5 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: item.color }}></div>
                                                <span className="text-xs font-bold text-content tracking-tight">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-content">{item.percentage}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-content/5 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 1, delay: idx * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: item.color }}></motion.div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col gap-4 lg:gap-6 h-full">
                         <div className="bg-surface rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-4 flex-1">
                            <h3 className="text-xs font-black text-content uppercase tracking-widest opacity-40 mb-2">Tendência de Gastos</h3>
                            
                            
                            <div 
                                className="h-64 lg:h-80 w-full mb-4 relative group touch-none mx-auto"
                                onMouseMove={(e) => {
                                    if (e.buttons !== 1) {
                                        if (pullState.active) setPullState({ ...pullState, active: false });
                                        return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    const index = Math.min(3, Math.max(0, Math.floor((x / rect.width) * 4)));
                                    const pullY = (y - rect.height / 2) * -0.8; 
                                    setPullState({ active: true, index, y: pullY });
                                }}
                                onTouchMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const touch = e.touches[0];
                                    const x = touch.clientX - rect.left;
                                    const y = touch.clientY - rect.top; 
                                    const index = Math.min(3, Math.max(0, Math.floor((x / rect.width) * 4)));
                                    const pullY = (y - rect.height / 2) * -0.8;
                                    setPullState({ active: true, index, y: pullY });
                                }}
                                onTouchEnd={() => setPullState({ ...pullState, active: false })}
                                onMouseUp={() => setPullState({ ...pullState, active: false })}
                                onMouseLeave={() => setPullState({ ...pullState, active: false })}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart 
                                        data={[
                                            { name: 'S1', value: stats.variableAverage * 0.2 },
                                            { name: 'S2', value: stats.variableAverage * 0.5 },
                                            { name: 'S3', value: stats.variableAverage * 0.8 },
                                            { name: 'S4', value: stats.variableAverage }
                                        ].map((p, i) => {
                                            if (!pullState.active && pullSpring.get() === 0) return p;
                                            const distance = Math.abs(i - pullState.index);
                                            const effect = Math.exp(-distance * 2);
                                            return { ...p, value: Math.max(0, p.value + (pullSpring.get() * effect)) };
                                        })}
                                    >
                                        <defs>
                                                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#47f425" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#47f425" stopOpacity={0}/>
                                                </linearGradient>
                                                <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                                                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                        </defs>
                                            <Area 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#47f425" 
                                                strokeWidth={4}
                                                fill="url(#trendGradient)" 
                                                filter="url(#glow)"
                                                animationDuration={1500}
                                                activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2, fill: '#47f425' }}
                                            />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-4 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                                {Object.entries(stats.projections).map(([cat, val]) => (
                                    <div key={cat} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-primary opacity-50 group-hover:opacity-100 transition-opacity">{getCategoryIcon(cat)}</span>
                                            <span className="text-xs font-bold text-content capitalize">{cat}</span>
                                        </div>
                                        <span className="text-xs font-black text-content">{formatCurrency(val)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-dim uppercase">Total Variável</span>
                                        <span className="text-lg font-black text-content">{formatCurrency(stats.variableAverage)}</span>
                                    </div>
                                    <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg font-bold">Expectativa</span>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Modal de Detalhes da Previsão */}
            <Modal
                isOpen={!!selectedPrediction}
                onClose={() => setSelectedPrediction(null)}
            >
                {selectedPrediction && (
                    <div className="p-8 md:p-10 bg-surface dark:bg-zinc-900 h-full overflow-y-auto">
                        <div className="flex items-center gap-6 mb-10">
                            <div className={`size-20 rounded-3xl flex items-center justify-center ${
                                selectedPrediction.circleStatus === 'paid' ? 'bg-primary text-secondary' :
                                selectedPrediction.circleStatus === 'overdue' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                                selectedPrediction.circleStatus === 'urgent' ? 'bg-orange-500 text-white' :
                                'bg-zinc-800 text-white/50'
                            }`}>
                                <span className="material-symbols-outlined text-4xl font-bold">{getCategoryIcon(selectedPrediction.category)}</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-3xl font-black text-content uppercase tracking-tight leading-none mb-2">
                                    {selectedPrediction.subcategory || selectedPrediction.description || selectedPrediction.category}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-black/5 dark:bg-white/10 rounded-full text-[10px] font-black text-dim uppercase tracking-widest">
                                        Vencimento: {format(new Date(selectedPrediction.date), 'dd/MM/yyyy')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-10 mb-8 text-center border border-white/5">
                            <span className="text-[10px] font-black text-dim uppercase tracking-widest block mb-1">{selectedPrediction && selectedPrediction.predictedAmount ? 'Gasto Atual' : 'Valor Previsto'}</span>
                            <div className="text-6xl font-black text-content tracking-tighter">
                                {formatCurrency(selectedPrediction?.amount || 0)}
                            </div>
                            {selectedPrediction && selectedPrediction.predictedAmount > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <span className="text-[10px] font-black text-dim uppercase tracking-widest block mb-2 opacity-50">Média Mensal Esperada</span>
                                    <div className="text-2xl font-black text-primary tracking-tight">
                                        {formatCurrency(selectedPrediction.predictedAmount)}
                                    </div>
                                    <div className="mt-3 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${selectedPrediction.amount > selectedPrediction.predictedAmount ? 'bg-red-500' : 'bg-primary'}`}
                                            style={{ width: `${Math.min(100, (selectedPrediction.amount / selectedPrediction.predictedAmount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedPrediction.notes && (
                            <div className="mb-10 px-4 py-6 bg-black/5 dark:bg-white/5 rounded-3xl border border-white/5 relative">
                                <span className="material-symbols-outlined absolute -top-3 left-6 bg-surface dark:bg-zinc-900 px-2 text-primary">format_quote</span>
                                <span className="text-[10px] font-black text-dim uppercase tracking-widest block mb-3 opacity-50">Observações</span>
                                <p className="text-base font-bold text-content leading-relaxed italic opacity-80">"{selectedPrediction.notes}"</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 mt-auto">
                            {selectedPrediction.circleStatus !== 'paid' && (
                                <button 
                                    onClick={() => handlePayPrediction(selectedPrediction)}
                                    className="w-full py-6 bg-primary text-secondary rounded-3xl font-black uppercase tracking-widest shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3 text-sm"
                                >
                                    <span className="material-symbols-outlined font-black">payments</span>
                                    Confirmar Gastos/Pagamento
                                </button>
                            )}
                            <button 
                                onClick={() => setSelectedPrediction(null)}
                                className="w-full py-6 bg-black/5 dark:bg-white/5 text-dim rounded-3xl font-black uppercase tracking-widest hover:text-content transition-all text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Detail Modals for Cards and Fuel */}
            <Modal isOpen={!!selectedCardDetail} onClose={() => setSelectedCardDetail(null)} className="overflow-visible">
                {selectedCardDetail && (
                    <>
                        {/* Desktop: Render Floating Card relative to Modal */}
                        <div className="hidden md:flex absolute -top-[270px] left-0 right-0 z-50 items-center justify-center pointer-events-none">
                            <div className="pointer-events-auto w-[60%] max-w-lg animate-in slide-in-from-bottom-8 duration-500">
                                <div 
                                    className="w-full aspect-[1.586/1] rounded-4xl shadow-2xl overflow-hidden border border-white/20 relative transform hover:scale-105 transition-transform duration-300"
                                    style={{ 
                                        backgroundColor: selectedCardDetail?.color,
                                        background: `linear-gradient(135deg, ${selectedCardDetail?.color} 0%, #000 150%)`,
                                    }}
                                >
                                     <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                    <div className="relative p-7 h-full flex flex-col justify-between text-white">
                                        <div className="flex justify-between items-start">
                                            <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                                <span className="font-black text-sm">
                                                    {(() => {
                                                        const card = cards.find(c => c.id === selectedCardDetail?.cardId);
                                                        return card?.initials || BANKS.find(b => b.id === card?.bank)?.sigla || selectedCardDetail?.subcategory?.slice(0, 2).toUpperCase();
                                                    })()}
                                                </span>
                                            </div>
                                            <span className="material-symbols-outlined opacity-60 text-3xl">contactless</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase opacity-70 font-medium tracking-widest leading-none text-left">Cartão</span>
                                                <span className="font-bold tracking-tight text-xl truncate max-w-[220px] text-left">{selectedCardDetail?.subcategory}</span>
                                            </div>
                                            {cards.find(c => c.id === selectedCardDetail?.cardId)?.brand === 'MASTER' ? (
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

                        <div className="flex flex-col h-full max-h-[85vh] p-1 overflow-y-auto custom-scrollbar relative">
                            {/* Modal Internal Header */}
                            <div className="flex items-center justify-between p-4 md:p-6 mb-2">
                        <div>
                            <h3 className="font-bold text-content text-lg uppercase tracking-tight">{selectedCardDetail?.subcategory}</h3>
                            <p className="text-[10px] text-dim font-bold uppercase tracking-widest">Fatura de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                        </div>
                        <button 
                            onClick={() => setSelectedCardDetail(null)}
                            className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-dim">close</span>
                        </button>
                    </div>

                    {/* Mobile: In-Flow Card Visual */}
                    <div className="md:hidden px-6 pb-6">
                        <div 
                            className="w-full aspect-[1.586/1] rounded-3xl shadow-lg run-ring border border-white/20 relative overflow-hidden transform transition-transform"
                            style={{ 
                                backgroundColor: selectedCardDetail?.color,
                                background: `linear-gradient(135deg, ${selectedCardDetail?.color} 0%, #000 150%)`
                            }}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                            <div className="relative p-5 h-full flex flex-col justify-between text-white">
                                <div className="flex justify-between items-start">
                                    <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                        <span className="font-black text-xs">
                                            {(() => {
                                                const card = cards.find(c => c.id === selectedCardDetail?.cardId);
                                                return card?.initials || BANKS.find(b => b.id === card?.bank)?.sigla || selectedCardDetail?.subcategory?.slice(0, 2).toUpperCase();
                                            })()}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined opacity-60 text-2xl">contactless</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-60 mb-1">{selectedCardDetail?.subcategory}</p>
                                        <p className="text-xl font-black tracking-tighter">{formatCurrency(selectedCardDetail?.amount || 0)}</p>
                                    </div>
                                    {cards.find(c => c.id === selectedCardDetail?.cardId)?.brand === 'MASTER' ? (
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

                    <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-6 pb-20 md:pb-8 custom-scrollbar">
                        

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 rotate-12">
                                    <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                                </div>
                                <span className="text-[10px] font-bold text-dim uppercase tracking-widest block mb-1">Total Atual</span>
                                <span className="text-xl font-black text-content tracking-tight">{formatCurrency(selectedCardDetail?.amount || 0)}</span>
                            </div>
                            <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150">
                                    <span className="material-symbols-outlined text-6xl text-primary">analytics</span>
                                </div>
                                <span className="text-[10px] font-bold text-dim uppercase tracking-widest block mb-1">Média Mensal</span>
                                <span className="text-xl font-black text-content tracking-tight">{formatCurrency(selectedCardDetail?.averageAmount || 0)}</span>
                            </div>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-2xl flex items-center justify-center ${selectedCardDetail?.circleStatus === 'paid' ? 'bg-primary text-secondary' : 'bg-orange-500/10 text-orange-500'}`}>
                                    <span className="material-symbols-outlined">{selectedCardDetail?.circleStatus === 'paid' ? 'check_circle' : 'pending'}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-dim uppercase tracking-widest leading-none">Status da Fatura</p>
                                    <p className="text-sm font-black text-content uppercase tracking-tight mt-1 truncate">
                                        {selectedCardDetail?.circleStatus === 'paid' ? 'Fatura Fechada' : 'Fatura Aberta'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleBillStatus(selectedCardDetail)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCardDetail?.circleStatus === 'paid' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-secondary shadow-glow'}`}
                            >
                                {selectedCardDetail?.circleStatus === 'paid' ? 'Abrir Fatura' : 'Fechar Fatura'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2 p-1 bg-background-light dark:bg-black/20 rounded-xl w-fit">
                                <button 
                                    onClick={() => setDetailTab('credit')}
                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${detailTab === 'credit' ? 'bg-white dark:bg-surface shadow-sm text-content' : 'text-dim hover:text-content'}`}
                                >
                                    Crédito
                                </button>
                                <button 
                                    onClick={() => setDetailTab('debit')}
                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${detailTab === 'debit' ? 'bg-white dark:bg-surface shadow-sm text-content' : 'text-dim hover:text-content'}`}
                                >
                                    Débito
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-dim uppercase tracking-[0.2em] px-1">Últimos Lançamentos</h4>
                                {((detailTab === 'credit' ? selectedCardDetail?.transactions : selectedCardDetail?.debitTransactions) || []).length === 0 ? (
                                    <div className="text-center py-10 text-dim/40 text-xs font-bold uppercase italic border-2 border-dashed border-white/5 rounded-2xl">Nenhuma transação encontrada</div>
                                ) : (
                                    (detailTab === 'credit' ? selectedCardDetail?.transactions : selectedCardDetail?.debitTransactions).map((t: any, idx: number) => (
                                        <div key={t.id + idx} className="flex items-center justify-between p-4 rounded-2xl bg-background-light dark:bg-black/10">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-content">
                                                    {t.description || (t.subcategory?.includes(':') ? t.subcategory.split(':')[0].trim() : t.subcategory) || t.category}
                                                </span>
                                                <span className="text-[9px] text-dim uppercase font-bold">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                                            </div>
                                            <span className="text-sm font-black text-content">{formatCurrency(t.amount)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button 
                                onClick={() => {
                                    setSelectedCardDetail(null);
                                    (window as any).dispatchEvent(new CustomEvent('change-tab', { detail: 'Meus Cartões' }));
                                }}
                                className="w-full py-4 bg-primary text-secondary rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">payments</span>
                                Ver Fatura Completa
                            </button>
                        </div>
                    </div>
                </div>
                

                    </>
                )}
            </Modal>

            <Modal isOpen={!!selectedFuelDetail} onClose={() => setSelectedFuelDetail(null)}>
                <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                        <div className="size-14 rounded-2xl flex items-center justify-center bg-primary/20 text-primary shadow-lg border border-primary/20">
                            <span className="material-symbols-outlined text-3xl">local_gas_station</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-content uppercase tracking-tight">Abastecimentos</h2>
                            <p className="text-xs text-dim font-bold uppercase tracking-widest">{selectedFuelDetail?.date ? format(new Date(selectedFuelDetail.date), 'MMMM', { locale: ptBR }) : ''}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <span className="text-[10px] font-bold text-primary uppercase block mb-1">Gasto Total</span>
                            <span className="text-2xl font-black text-primary">{formatCurrency(selectedFuelDetail?.amount || 0)}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-dim uppercase block mb-1">Gasto Previsto</span>
                            <span className="text-2xl font-black text-content/60">{formatCurrency(selectedFuelDetail?.predictedAmount || 0)}</span>
                        </div>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto no-scrollbar space-y-3">
                        {(selectedFuelDetail?.transactions || []).map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-content truncate max-w-[150px]">{t.description || 'Abastecimento'}</span>
                                    <span className="text-[10px] text-dim uppercase font-bold">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                                </div>
                                <span className="text-base font-black text-content">{formatCurrency(t.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <BottomSheetSelect 
                isOpen={billActionMenu.isOpen}
                onClose={() => setBillActionMenu({ isOpen: false, bill: null })}
                title="Ações da Conta"
                options={[
                    { id: 'pay', label: 'Pagar Conta', icon: 'payments' },
                    { id: 'edit', label: 'Editar', icon: 'edit' },
                    { id: 'delete', label: 'Excluir este mês', icon: 'delete' }
                ]}
                onSelect={(opt) => {
                    const bill = billActionMenu.bill;
                    if (opt.id === 'pay') {
                        window.dispatchEvent(new CustomEvent('open-add-transaction', {
                            detail: {
                                amount: bill.amount,
                                category: bill.category,
                                subcategory: bill.subcategory,
                                notes: bill.description || '',
                                date: bill.date
                            }
                        }));
                    } else if (opt.id === 'edit') {
                        if (bill.id === 'grouped-fuel') setSelectedFuelDetail(bill);
                        else if (bill.isCardBill) setSelectedCardDetail(bill);
                        else setSelectedPrediction(bill);
                    } else if (opt.id === 'delete') {
                        if (confirm('Deseja realmente ocultar esta conta este mês?')) {
                            alert('Funcionalidade de exclusão pontual será implementada na sincronização.');
                        }
                    }
                    setBillActionMenu({ isOpen: false, bill: null });
                }}
            />
        </div>
    );
};

export default Dashboard;
