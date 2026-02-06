import React, { useState } from 'react';

import { useTransactions } from '@/contexts/TransactionsContext';
import { formatCurrency } from '@/utils/formatters';
import { motion } from 'framer-motion';
import type { Card } from '@/types';
import Modal from './Modal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CardsManagement from './CardsManagement';

const BANKS = [
    { id: 'nubank', label: 'Nubank', color: '#820ad1', sigla: 'NU' },
    { id: 'itau', label: 'Itaú', color: '#ec7000', sigla: 'IT' },
    { id: 'bnb', label: 'BNB', color: '#ffcc00', sigla: 'BNB' },
    { id: 'bb', label: 'BB', color: '#0038a8', sigla: 'BB' },
];

const MyCards: React.FC<{ onBack: () => void }> = () => {
    const { cards, transactions, updateCard } = useTransactions();
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [detailTab, setDetailTab] = useState<'credit' | 'debit'>('credit');
    const activeCards = cards.filter(c => c.status !== 'deleted');
    const [cardStack, setCardStack] = useState<Card[]>(activeCards);
    const [showManagement, setShowManagement] = useState(false);
    const [dragStarted, setDragStarted] = useState(false);

    // Keep stack synced with context but preserve session order
    React.useEffect(() => {
        setCardStack(current => {
            const currentIds = current.map(c => c.id);
            const activeIds = activeCards.map(c => c.id);
            
            // If something was added or removed, reset/refine stack
            if (current.length !== activeCards.length || !activeIds.every(id => currentIds.includes(id))) {
                return activeCards;
            }
            return current;
        });
    }, [cards]);

    const [hasEntered, setHasEntered] = useState(false);
    
    React.useEffect(() => {
        const timer = setTimeout(() => setHasEntered(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Helper to get bill info
    const getBillInfo = (card: Card) => {
        const today = new Date();
        const monthKey = format(today, 'yyyy-MM');
        const manualStatus = card.billStatusOverrides?.[monthKey];
        
        // Simulating current amount for the card
        const cardTransactions = transactions.filter(t => t.cardId === card.id && t.status !== 'deleted');
        const currentAmount = cardTransactions.reduce((acc, t) => acc + t.amount, 0);
        
        const isPaid = manualStatus === 'closed';

        return {
            currentAmount,
            isPaid,
            manualStatus,
            monthKey
        };
    };

    const toggleBillStatus = (card: Card) => {
        const today = new Date();
        const monthKey = format(today, 'yyyy-MM');
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
    };
    
    const handleDragStart = () => setDragStarted(true);

    const handleDragEnd = (_event: any, info: any, _cardId: string, currentIndex: number) => {
        setTimeout(() => setDragStarted(false), 50);
        
        const yOffset = info.offset.y;
        const rowHeight = 40; // Altura visual de cada passo
        const movedRows = Math.round(yOffset / rowHeight);
        
        if (movedRows !== 0) {
            const newIndex = Math.max(0, Math.min(cardStack.length - 1, currentIndex + movedRows));
            
            if (newIndex !== currentIndex) {
                setCardStack(prev => {
                    const newStack = [...prev];
                    const [movedCard] = newStack.splice(currentIndex, 1);
                    newStack.splice(newIndex, 0, movedCard);
                    return newStack;
                });
            }
        }
    };

    if (showManagement) return <CardsManagement onBack={() => setShowManagement(false)} />;



    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-700 overflow-hidden relative">
            {/* Header Mobile Global Style - REMOVED Back Button */}
            <div className="md:hidden pt-6 px-6 flex items-center justify-between z-10">
                 {/* Placeholder to keep spacing if needed, or just remove if layout allows. Keeping empty div for safety if flex needs it, but usually standard header handles it. Removing button specifically. */}
            </div>

            {/* Desktop Header - REMOVED Back Button (Global one exists) */}
            <header className="hidden md:flex items-center justify-between p-8 md:mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Meus Cartões</h1>
                </div>
                <button 
                    onClick={() => setShowManagement(true)}
                    className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-2xl shadow-glow text-secondary font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Novo Cartão
                </button>
            </header>

            {/* Mobile "Novo Cartão" Floating / Bottom */}
            <div className="md:hidden px-4 mb-6">
                <button 
                    onClick={() => setShowManagement(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary py-4 rounded-2xl shadow-glow text-secondary font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Adicionar Novo Cartão
                </button>
            </div>

            {/* Archive Cards Container */}
            <main className="flex-1 relative flex flex-col items-center justify-start pt-10 overflow-visible no-scrollbar">
                {activeCards.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                        <span className="material-symbols-outlined text-6xl mb-4">credit_card_off</span>
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum cartão encontrado</p>
                    </div>
                ) : (
                    <div className="relative w-full max-w-[340px] h-[500px] mb-10">
                        {cardStack.map((card: Card, i: number) => {
                            const { currentAmount } = getBillInfo(card);
                            return (
                                <motion.div
                                    key={card.id}
                                    drag="y"
                                    dragConstraints={{ top: -((i) * 40), bottom: (cardStack.length - 1 - i) * 40 }}
                                    dragElastic={0.1}
                                    onDragStart={handleDragStart}
                                    onDragEnd={(e, info) => handleDragEnd(e, info, card.id, i)}
                                    initial={{ y: 100 * i, scale: 0.8, opacity: 0 }}
                                    animate={{ 
                                        y: i * 40, 
                                        x: 0,
                                        rotateZ: i * 0.5,
                                        scale: 1 - (i * 0.05), 
                                        opacity: 1,
                                        zIndex: cardStack.length - i 
                                    }}
                                    transition={{
                                        duration: hasEntered ? 0.4 : 0.8,
                                        ease: "easeOut",
                                        delay: hasEntered ? 0 : i * 0.15
                                    }}
                                    whileTap={{ cursor: 'grabbing', scale: 1.02 }}
                                    onClick={() => !dragStarted && setSelectedCard(card)}
                                    className={`absolute w-full aspect-[1.586/1] rounded-[2.5rem] shadow-2xl cursor-grab overflow-hidden group border border-white/20 ${selectedCard?.id === card.id ? 'z-50' : ''}`}
                                    style={{ 
                                        backgroundColor: card.color,
                                        background: `linear-gradient(135deg, ${card.color} 0%, #000 150%)`,
                                        touchAction: 'none'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                    <div className="relative p-7 h-full flex flex-col justify-between text-white">
                                        <div className="flex justify-between items-start">
                                            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                                                <span className="font-black text-sm">{card.initials || card.bank.slice(0, 2).toUpperCase()}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="material-symbols-outlined opacity-60 text-3xl">contactless</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="w-11 h-8 rounded-md bg-yellow-100/10 border border-yellow-200/20 mb-4" />
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mb-1.5">{card.alias}</p>
                                            <div className="flex justify-between items-end">
                                                <p className="text-2xl font-black tracking-tight">{formatCurrency(currentAmount)}</p>
                                                {card.brand === 'MASTER' ? (
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
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            <Modal isOpen={!!selectedCard} onClose={() => setSelectedCard(null)} className="overflow-visible">
                {selectedCard && (
                    <>
                        {/* Floating Card - Desktop Only - Positioned relative to Modal Top */}
                        <div className="hidden md:flex absolute -top-[270px] left-0 right-0 z-50 items-center justify-center pointer-events-none">
                             <div className="pointer-events-auto w-[60%] max-w-lg animate-in slide-in-from-bottom-8 duration-500">
                                 <div 
                                        className="w-full aspect-[1.586/1] rounded-4xl shadow-2xl overflow-hidden border border-white/20 relative transform hover:scale-105 transition-transform duration-300"
                                        style={{ 
                                            backgroundColor: selectedCard.color,
                                            background: `linear-gradient(135deg, ${selectedCard.color} 0%, #000 150%)`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                        <div className="relative p-7 h-full flex flex-col justify-between text-white">
                                            <div className="flex justify-between items-start">
                                                <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                                    <span className="font-black text-sm">
                                                        {selectedCard.initials || BANKS.find(b => b.id === selectedCard.bank)?.sigla || selectedCard.alias.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="material-symbols-outlined opacity-60 text-3xl">contactless</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase opacity-70 font-medium tracking-wider mb-0.5">Cartão</span>
                                                    <span className="font-bold tracking-wide text-sm truncate max-w-[180px]">{selectedCard.alias}</span>
                                                </div>
                                                {selectedCard.brand === 'MASTER' ? (
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


                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 md:p-6 mb-2">
                            <div>
                                <h3 className="font-bold text-content text-lg uppercase tracking-tight">{selectedCard.alias}</h3>
                                <p className="text-[10px] text-dim font-bold uppercase tracking-widest">
                                    {BANKS.find(b => b.id === selectedCard.bank)?.label || selectedCard.bank}
                                </p>
                            </div>
                            <button onClick={() => setSelectedCard(null)} className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-dim">close</span>
                            </button>
                        </div>

                        {/* Mobile: In-Flow Card Visual */}
                        <div className="md:hidden px-6 pb-6">
                            <div 
                                className="w-full aspect-[1.586/1] rounded-3xl shadow-lg run-ring border border-white/20 relative overflow-hidden transform transition-transform"
                                style={{ 
                                    backgroundColor: selectedCard.color,
                                    background: `linear-gradient(135deg, ${selectedCard.color} 0%, #000 150%)`
                                }}
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-[1px]"></div>
                                <div className="relative p-5 h-full flex flex-col justify-between text-white">
                                    <div className="flex justify-between items-start">
                                        <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                            <span className="font-black text-xs">
                                                {selectedCard.initials || BANKS.find(b => b.id === selectedCard.bank)?.sigla || selectedCard.bank.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="material-symbols-outlined opacity-60 text-2xl">contactless</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-60 mb-1">{selectedCard.alias}</p>
                                            <p className="text-xl font-black tracking-tighter">{formatCurrency(getBillInfo(selectedCard).currentAmount)}</p>
                                        </div>
                                        {selectedCard.brand === 'MASTER' ? (
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

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 pb-20 md:pb-8 space-y-6">
                            
                            {/* Card Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
                                        <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Limite Disponível</p>
                                    <p className="text-xl font-black text-content tracking-tight">{formatCurrency(selectedCard.limit)}</p>
                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full mt-3 overflow-hidden shadow-inner">
                                        <div className="h-full bg-primary shadow-glow" style={{ width: '65%' }}></div>
                                    </div>
                                </div>
                                <div className="bg-background-light dark:bg-black/20 p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                     <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 transition-transform group-hover:scale-175 duration-700">
                                        <span className="material-symbols-outlined text-6xl text-primary">event_available</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-content uppercase tracking-widest mb-1">Melhor dia de compra</p>
                                    <p className="text-xl font-black text-content tracking-tight">Dia {(selectedCard.closingDay % 31) + 1}</p>
                                    <p className="text-[9px] text-dim font-bold uppercase mt-2">Fechamento: Dia {selectedCard.closingDay}</p>
                                </div>
                            </div>

                            {/* Status Control */}
                            <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-2xl flex items-center justify-center ${getBillInfo(selectedCard).isPaid ? 'bg-primary text-secondary' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <span className="material-symbols-outlined">{getBillInfo(selectedCard).isPaid ? 'check_circle' : 'pending'}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-dim uppercase tracking-widest leading-none">Status da Fatura</p>
                                        <p className="text-sm font-black text-content uppercase tracking-tight mt-1">
                                            {getBillInfo(selectedCard).isPaid ? 'Fatura Fechada' : 'Fatura Aberta'}
                                        </p>
                                        {getBillInfo(selectedCard).isPaid && selectedCard.billStatusOverrides?.[`${getBillInfo(selectedCard).monthKey}-date`] && (
                                            <p className="text-[9px] text-primary font-bold uppercase mt-1">
                                                Fechada em {selectedCard.billStatusOverrides[`${getBillInfo(selectedCard).monthKey}-date`]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleBillStatus(selectedCard)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${getBillInfo(selectedCard).isPaid ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-secondary shadow-glow'}`}
                                >
                                    {getBillInfo(selectedCard).isPaid ? 'Abrir Fatura' : 'Fechar Fatura'}
                                </button>
                            </div>

                            {/* Tabs & Transactions List */}
                            <div className="space-y-4">
                                <div className="flex gap-2 p-1.5 bg-background-light dark:bg-black/20 rounded-2xl w-fit">
                                    <button 
                                        onClick={() => setDetailTab('credit')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'credit' ? 'bg-white dark:bg-surface shadow-sm text-content' : 'text-dim hover:text-content'}`}
                                    >
                                        Crédito
                                    </button>
                                    <button 
                                        onClick={() => setDetailTab('debit')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'debit' ? 'bg-white dark:bg-surface shadow-sm text-content' : 'text-dim hover:text-content'}`}
                                    >
                                        Débito
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-dim uppercase tracking-[0.2em] px-1">Últimos Lançamentos</h4>
                                    {transactions
                                        .filter(t => t.cardId === selectedCard.id && t.status !== 'deleted')
                                        .slice(0, 10)
                                        .map((t, idx) => (
                                            <div key={t.id + idx} className="flex items-center justify-between p-4 bg-background-light dark:bg-black/10 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-white dark:bg-surface shadow-sm flex items-center justify-center text-dim group-hover:text-primary transition-colors">
                                                        <span className="material-symbols-outlined text-xl">shopping_bag</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-content leading-none">{t.description || t.subcategory || t.category}</p>
                                                        <p className="text-[9px] text-dim font-bold mt-1 uppercase tracking-wider">{format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-content">{formatCurrency(t.amount)}</p>
                                                    <p className="text-[9px] text-dim font-bold uppercase tracking-wider">Aprovada</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </Modal>
            
        </div>
    );
};

export default MyCards;
