import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/contexts/TransactionsContext';
import type { Transaction } from '@/types';

interface TransactionDetailModalProps {
    transaction: Transaction | null;
    onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, onClose }) => {
    const { currentCurrency } = useTransactions();
    if (!transaction) return null;

    const formatCurrency = (val: number) => {
        const locale = currentCurrency === 'BRL' ? 'pt-BR' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currentCurrency }).format(val);
    };

    return (
        <div
            className="fixed inset-0 z-5000 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">close</span>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${transaction.type === 'income'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-expense/10 text-expense'
                        }`}>
                        <span className="material-symbols-outlined text-sm">
                            {transaction.type === 'income' ? 'trending_up' : 'trending_down'}
                        </span>
                        <span className="text-xs font-bold uppercase">
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-content mb-1">
                        {formatCurrency(transaction.amount)}
                    </h2>
                </div>

                {/* Details */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</label>
                        <p className="text-sm font-semibold text-content capitalize mt-1">{transaction.category}</p>
                    </div>

                    {transaction.subcategory && (
                        <div>
                            <label className="text-xs font-medium text-dim uppercase tracking-wider">Subcategoria</label>
                            <p className="text-sm font-semibold text-content capitalize mt-1">{transaction.subcategory}</p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-dim uppercase tracking-wider">Data</label>
                        <p className="text-sm font-semibold text-content mt-1">
                            {format(new Date(transaction.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                    </div>

                    {transaction.description && (
                        <div>
                            <label className="text-xs font-medium text-dim uppercase tracking-wider">Descrição</label>
                            <p className="text-sm text-content mt-1">{transaction.description}</p>
                        </div>
                    )}

                    {transaction.isRecurring && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recorrência</label>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="material-symbols-outlined text-primary text-sm">repeat</span>
                                <p className="text-sm font-semibold text-primary capitalize">
                                    {transaction.recurrenceRule === 'monthly' ? 'Mensal' : transaction.recurrenceRule === 'weekly' ? 'Semanal' : 'Recorrente'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID da Transação</label>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">{transaction.id}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetailModal;
