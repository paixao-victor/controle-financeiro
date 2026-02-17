import React, { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import type { Transaction } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import EditTransactionModal from './EditTransactionModal';

const TransactionsManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { transactions, deleteTransaction, restoreTransaction, pullFullHistory, isSyncing, hasFullHistory, accounts, cards } = useTransactions();
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'7' | '15' | '30' | '60' | 'custom'>('30');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [displayLimit, setDisplayLimit] = useState(20);
    const [showDeleted, setShowDeleted] = useState(false);

    // Filtragem
    const filteredTransactions = transactions
        .filter(t => {
            // Se showDeleted for falso, esconde deletados
            if (!showDeleted && t.status === 'deleted') return false;
            // Se showDeleted for verdadeiro, só mostra os DELETADOS (ou todos? o usuário pediu "ver transações deletadas")
            // Vamos assumir que "Mostrar Deletados" mostra TODOS incluindo deletados, mas marcados.
            
            const matchesSearch = (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                                (t.category?.toLowerCase().includes(searchQuery.toLowerCase()) || '');
            
            if (!matchesSearch) return false;

            if (dateFilter === 'custom') {
                if (!customRange.start && !customRange.end) return true;
                const tDate = new Date(t.date);
                if (customRange.start && tDate < new Date(customRange.start)) return false;
                if (customRange.end && tDate > new Date(customRange.end)) return false;
                return true;
            }
            
            const days = parseInt(dateFilter);
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - days);
            return new Date(t.date) >= limitDate;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const displayedTransactions = filteredTransactions.slice(0, displayLimit);
    const hasMore = filteredTransactions.length > displayLimit;

    const handleLoadMore = () => {
        setDisplayLimit(prev => prev + 10);
    };

    const exportToCSV = () => {
        const headers = ['Data', 'Descrição', 'Categoria', 'Subcategoria', 'Tipo', 'Valor'];
        const rows = filteredTransactions.map(t => [
            new Date(t.date).toLocaleDateString('pt-BR'),
            t.description,
            t.category,
            t.subcategory || '',
            t.type === 'income' ? 'Receita' : 'Despesa',
            t.amount.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = (id: string) => {
        deleteTransaction(id);
        setShowDeleteConfirm(null);
    };



    return (
        <div className="flex flex-col h-full bg-background p-4 md:p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack}
                    className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-content">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Gerenciar Transações</h1>
                    <p className="text-dim text-xs font-medium">Edite ou exclua transações históricas</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined font-bold">download</span>
                </button>
            </div>

            {/* Toggle Deleted & Sync */}
            <div className="flex justify-center gap-3 mb-4">
                <button 
                    onClick={() => setShowDeleted(!showDeleted)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        showDeleted 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                        : 'bg-black/5 dark:bg-white/5 text-dim border border-transparent'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">
                        {showDeleted ? 'visibility' : 'visibility_off'}
                    </span>
                    {showDeleted ? 'Ocultar Deletadas' : 'Ver Deletadas'}
                </button>

                {!hasFullHistory && (
                    <button 
                        onClick={() => pullFullHistory()}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-secondary transition-all disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>
                            {isSyncing ? 'sync' : 'cloud_download'}
                        </span>
                        {isSyncing ? 'Sincronizando...' : 'Recuperar Histórico'}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap gap-2 justify-center">
                    {[
                        { label: '7 dias', value: '7' },
                        { label: '15 dias', value: '15' },
                        { label: '30 dias', value: '30' },
                        { label: '60 dias', value: '60' },
                        { label: 'Personalizado', value: 'custom' },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setDateFilter(opt.value as any);
                                setDisplayLimit(20);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                dateFilter === opt.value 
                                ? 'bg-primary text-secondary shadow-glow' 
                                : 'bg-black/5 dark:bg-white/5 text-dim hover:text-content'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {dateFilter === 'custom' && (
                    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-primary/20 animate-in slide-in-from-top-2 duration-200 lg:flex-row lg:items-end justify-center">
                        <div className="flex-1 max-w-xs mx-auto lg:mx-0">
                            <label className="text-[10px] font-bold text-dim uppercase mb-1 block ml-1">Início</label>
                            <input 
                                type="date" 
                                value={customRange.start}
                                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 py-2 text-content outline-none border border-transparent focus:border-primary/30"
                            />
                        </div>
                        <div className="flex-1 max-w-xs mx-auto lg:mx-0">
                            <label className="text-[10px] font-bold text-dim uppercase mb-1 block ml-1">Fim</label>
                            <input 
                                type="date" 
                                value={customRange.end}
                                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 py-2 text-content outline-none border border-transparent focus:border-primary/30"
                            />
                        </div>
                        <button 
                            onClick={() => setCustomRange({ start: '', end: '' })}
                            className="px-4 py-2 bg-black/5 dark:bg-white/5 text-xs font-bold text-dim rounded-xl hover:text-primary transition-colors h-10 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">history</span>
                            Todo o histórico
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-dim">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar transações..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 text-content outline-none focus:ring-2 ring-primary/50"
                    />
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 custom-scrollbar">
                {displayedTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-6xl text-dim mb-4">receipt_long</span>
                        <p className="text-dim">Nenhuma transação encontrada</p>
                    </div>
                ) : (
                    <>
                        {displayedTransactions.map(transaction => (
                            <div 
                                key={transaction.id}
                                onClick={() => setEditingTransaction(transaction)}
                                className={`rounded-2xl border transition-all cursor-pointer hover:border-primary/30 ${
                                    transaction.status === 'deleted' 
                                        ? 'bg-gray-50/50 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-70 p-3 scale-[0.98]' 
                                        : 'bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 p-4 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`size-10 rounded-xl flex items-center justify-center ${
                                                transaction.type === 'income' 
                                                    ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500'
                                                    : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'
                                            }`}>
                                                <span className="material-symbols-outlined text-lg">
                                                    {transaction.type === 'income' ? 'trending_up' : 'trending_down'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold text-content ${transaction.status === 'deleted' ? 'line-through' : ''}`}>
                                                        {transaction.description}
                                                    </p>
                                                    {transaction.status === 'deleted' && (
                                                        <span className="text-[8px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-black px-1.5 py-0.5 rounded-full tracking-widest uppercase">
                                                            Deletada
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="opacity-60">{transaction.category}</span>
                                                    {transaction.subcategory && (
                                                        <>
                                                            <span className="text-[10px] opacity-30">›</span>
                                                            <div className="flex items-center gap-1 font-bold">
                                                                {(() => {
                                                                    if (transaction.subcategory.includes(':')) {
                                                                        const [name, icon] = transaction.subcategory.split(':');
                                                                        return (
                                                                            <>
                                                                                <span className="material-symbols-outlined text-[12px] opacity-60">{icon.trim()}</span>
                                                                                <span>{name.trim()}</span>
                                                                            </>
                                                                        );
                                                                    }
                                                                    return <span>{transaction.subcategory}</span>;
                                                                })()}
                                                            </div>
                                                        </>
                                                    )}
                                                    <span className="text-[10px] opacity-30">•</span>
                                                    <div className="flex items-center gap-1 text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider">
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {transaction.paymentMethod === 'cartao' ? 'credit_card' : 'account_balance'}
                                                        </span>
                                                        <span>
                                                            {transaction.paymentMethod === 'cartao' 
                                                                ? (cards.find(c => c.id === transaction.cardId)?.alias || 'Cartão')
                                                                : (accounts.find(a => a.id === transaction.accountId)?.name || 'Conta')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                            <div className={`text-right ${transaction.status === 'deleted' ? 'opacity-50' : ''}`}>
                                                <p className={`font-black text-lg ${
                                                    transaction.status === 'deleted' ? 'line-through text-dim' :
                                                    transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                                }`}>
                                                    {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-dim">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            {transaction.status === 'deleted' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        restoreTransaction(transaction.id);
                                                    }}
                                                    className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-secondary transition-colors flex items-center justify-center"
                                                    title="Restaurar"
                                                >
                                                    <span className="material-symbols-outlined">restart_alt</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteConfirm(transaction.id);
                                                    }}
                                                    className="size-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            )}
                                        </div>
                                </div>
                        ))}

                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                className="w-full py-4 rounded-2xl bg-black/5 dark:bg-white/5 text-dim font-black uppercase tracking-widest hover:text-content hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">keyboard_double_arrow_down</span>
                                Carregar mais transações
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Edição de Transação Padronizado */}
            {editingTransaction && (
                <EditTransactionModal 
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                    onSaveSuccess={() => setEditingTransaction(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div 
                        onClick={() => setShowDeleteConfirm(null)}
                        className="fixed inset-0 z-1050 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    >
                        <motion.div 
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl space-y-6"
                        >
                            <div className="text-center">
                                <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
                                </div>
                                <h3 className="text-xl font-black text-content mb-2">Excluir Transação?</h3>
                                <p className="text-dim text-sm">Esta ação não pode ser desfeita. A transação será removida permanentemente do histórico.</p>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-3 text-dim font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => handleDelete(showDeleteConfirm)}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TransactionsManagement;
