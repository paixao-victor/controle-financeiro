import React, { useState, useMemo } from 'react';
import { format, isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { useTransactions } from '@/contexts/TransactionsContext';
import Modal from './Modal';

interface BankStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: any;
    accountBalance: number;
}

const BankStatementModal: React.FC<BankStatementModalProps> = ({ isOpen, onClose, account, accountBalance }) => {
    const { transactions, currentCurrency } = useTransactions();
    const [viewMonth, setViewMonth] = useState(new Date());

    const { accountTransactions, monthRealized, groupedTransactions } = useMemo(() => {
        if (!account) return { accountTransactions: [], monthRealized: { income: 0, expense: 0 }, groupedTransactions: {} };

        const allAccountTrans = transactions
            .filter(t => t.accountId === account.id && t.status !== 'deleted')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const monthStart = startOfMonth(viewMonth);
        const monthEnd = endOfMonth(viewMonth);
        
        const monthTrans = allAccountTrans.filter(t => 
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
        );

        const monthRealized = {
            income: monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
        };

        // Para o saldo, precisamos considerar o saldo 'real' hj e ajustar para o mês de visualização?
        // Ou apenas mostrar o saldo atual da conta e o fluxo do mês.
        // O requisito pede "ver os meses anteriores". Mostrar o saldo histórico é complexo sem processamento pesado.
        // Vou manter o Saldo Atual (real) no topo e o fluxo do mês selecionado abaixo.

        const grouped = monthTrans.reduce((groups: any, transaction) => {
            const date = transaction.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(transaction);
            return groups;
        }, {});

        return { 
            accountTransactions: monthTrans, 
            monthRealized, 
            groupedTransactions: grouped
        };
    }, [account, transactions, viewMonth, accountBalance]);

    if (!account) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="overflow-hidden">
            <div className="flex flex-col h-full bg-surface dark:bg-zinc-900 w-full">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 bg-surface dark:bg-zinc-900 z-10 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                                <span className="material-symbols-outlined text-3xl">{account.icon || 'account_balance'}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-content uppercase tracking-tight">{account.name}</h2>
                                <p className="text-dim text-xs font-bold uppercase tracking-widest">Extrato Bancário</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-dim">close</span>
                        </button>
                    </div>

                    {/* Month Selector Mini */}
                    <div className="flex items-center justify-center gap-4 mb-6 bg-black/5 dark:bg-white/5 p-2 rounded-2xl w-fit mx-auto">
                        <button 
                            onClick={() => setViewMonth(prev => subMonths(prev, 1))}
                            className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-dim"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <div className="text-center min-w-[120px]">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{format(viewMonth, 'yyyy')}</p>
                            <p className="text-sm font-bold text-content uppercase">{format(viewMonth, 'MMMM', { locale: ptBR })}</p>
                        </div>
                        <button 
                            onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                            className="size-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-dim"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block">Saldo da Conta</span>
                            <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(accountBalance, currentCurrency)}</span>
                        </div>
                        <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 block">Entradas no mês</span>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-blue-500 tracking-tight">{formatCurrency(monthRealized.income, currentCurrency)}</span>
                            </div>
                        </div>
                        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1 block">Saídas no mês</span>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-red-500 tracking-tight">{formatCurrency(monthRealized.expense, currentCurrency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
                    {Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black uppercase tracking-widest text-dim opacity-60">
                                    {isToday(parseISO(date)) ? 'Hoje' : format(parseISO(date), "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                                <div className="h-px flex-1 bg-white/5"></div>
                            </div>
                            {groupedTransactions[date].map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                                            <span className="material-symbols-outlined text-lg">{t.category === 'Pagamento' ? 'credit_card' : (t.type === 'income' ? 'arrow_downward' : 'arrow_upward')}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-content">{t.description || t.subcategory || t.category}</p>
                                            <p className="text-[10px] font-bold text-dim uppercase tracking-wider">{t.category} {t.subcategory ? `• ${t.subcategory}` : ''}</p>
                                        </div>
                                    </div>
                                    <span className={`text-base font-black ${t.type === 'income' ? 'text-primary' : 'text-content'}`}>
                                        {t.type === 'expense' ? '- ' : '+ '}{formatCurrency(t.amount, currentCurrency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    {accountTransactions.length === 0 && (
                        <div className="py-20 text-center opacity-30">
                            <span className="material-symbols-outlined text-6xl mb-4">receipt_long</span>
                            <p className="uppercase font-black text-sm tracking-widest">Nenhuma transação neste mês</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default BankStatementModal;
