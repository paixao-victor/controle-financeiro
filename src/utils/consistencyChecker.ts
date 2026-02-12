
import type { Card, Account, AppNotification, Transaction, PredictedExpense, PredictedIncome } from '@/types';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const checkConsistency = (
    cards: Card[], 
    accounts: Account[],
    addNotification: (notif: Omit<AppNotification, 'id' | 'read' | 'date'>) => void,
    transactions?: Transaction[],
    predictedExpenses?: PredictedExpense[],
    predictedIncomes?: PredictedIncome[]
) => {
    let issuesFound = 0;

    // ══════════════════════════════════════════════════
    // Check 1: Cartões sem Conta Vinculada
    // ══════════════════════════════════════════════════
    cards.filter(c => c.status !== 'deleted').forEach(card => {
        if (['debit', 'both', 'food'].includes(card.type)) {
            if (!card.linkedAccountId) {
                issuesFound++;
                addNotification({
                    title: 'Cartão sem Conta Vinculada',
                    message: `O cartão "${card.alias}" é do tipo ${card.type} mas não possui uma conta vinculada. Isso pode gerar erros em transações.`,
                    type: 'alert',
                    actionLabel: 'Corrigir Cartão',
                    actionUrl: '/cards'
                });
            } else {
                const accountExists = accounts.find(a => a.id === card.linkedAccountId && a.status !== 'deleted');
                if (!accountExists) {
                    issuesFound++;
                    addNotification({
                        title: 'Conta Vinculada Inexistente',
                        message: `O cartão "${card.alias}" está vinculado a uma conta que não existe mais. Por favor, vincule a uma nova conta.`,
                        type: 'alert',
                        actionLabel: 'Corrigir Cartão',
                    });
                }
            }
        }
    });

    // ══════════════════════════════════════════════════
    // Check 2: Cartões de Crédito sem Limite
    // ══════════════════════════════════════════════════
    cards.filter(c => c.status !== 'deleted').forEach(card => {
        if (['credit', 'both'].includes(card.type) && (!card.limit || card.limit <= 0)) {
            issuesFound++;
            addNotification({
                title: 'Cartão sem Limite Definido',
                message: `O cartão "${card.alias}" é de crédito mas não possui limite definido. Configure o limite para acompanhar o uso.`,
                type: 'warning',
                actionLabel: 'Configurar Limite',
            });
        }
    });

    // ══════════════════════════════════════════════════
    // Check 3: Cartões sem Dia de Fechamento/Vencimento
    // ══════════════════════════════════════════════════
    cards.filter(c => c.status !== 'deleted').forEach(card => {
        if (['credit', 'both'].includes(card.type)) {
            if (!card.closingDay || !card.dueDay) {
                issuesFound++;
                addNotification({
                    title: 'Cartão sem Datas Configuradas',
                    message: `O cartão "${card.alias}" não possui ${!card.closingDay ? 'dia de fechamento' : ''}${!card.closingDay && !card.dueDay ? ' e ' : ''}${!card.dueDay ? 'dia de vencimento' : ''} definidos.`,
                    type: 'warning',
                    actionLabel: 'Configurar Cartão',
                });
            }
        }
    });

    // ══════════════════════════════════════════════════
    // Check 4: Previsões de Despesa vs Média Real (últimos 3 meses)
    // ══════════════════════════════════════════════════
    if (transactions && predictedExpenses) {
        const now = new Date();
        const threeMonthsAgo = startOfMonth(subMonths(now, 3));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        
        const recentTransactions = transactions.filter(t => 
            t.status !== 'deleted' && 
            t.type === 'expense' &&
            isWithinInterval(new Date(t.date), { start: threeMonthsAgo, end: lastMonthEnd })
        );

        predictedExpenses.filter(pe => pe.status !== 'deleted').forEach(pe => {
            const subcatLower = (pe.subcategory || '').toLowerCase().split(':')[0];
            const catLower = (pe.category || '').toLowerCase();
            
            // Encontrar transações correspondentes
            const matchingTx = recentTransactions.filter(t => {
                const txSubcat = (t.subcategory || '').toLowerCase().split(':')[0];
                const txCat = (t.category || '').toLowerCase();
                return txSubcat === subcatLower && txCat === catLower;
            });

            if (matchingTx.length === 0) return; // Sem histórico para comparar

            const totalSpent = matchingTx.reduce((sum, t) => sum + t.amount, 0);
            
            // Calcular quantos meses distintos existem para fazer média correta
            const uniqueMonths = new Set(matchingTx.map(t => t.date.substring(0, 7)));
            const monthCount = Math.max(1, uniqueMonths.size);
            const monthlyAverage = totalSpent / monthCount;
            
            const predicted = pe.amount || 0;
            if (predicted <= 0) return;

            // Margem de tolerância: 40% de diferença
            const tolerance = 0.4;
            const diff = Math.abs(monthlyAverage - predicted) / predicted;

            if (diff > tolerance) {
                const isOver = monthlyAverage > predicted;
                issuesFound++;
                addNotification({
                    title: 'Previsão Desatualizada',
                    message: `"${pe.subcategory?.split(':')[0] || pe.category}" tem previsão de R$ ${predicted.toFixed(2).replace('.', ',')} mas a média real dos últimos ${monthCount} meses é R$ ${monthlyAverage.toFixed(2).replace('.', ',')} (${isOver ? 'acima' : 'abaixo'} da previsão em ${Math.round(diff * 100)}%).`,
                    type: isOver ? 'warning' : 'info',
                    actionLabel: 'Revisar Previsão',
                });
            }
        });
    }

    // ══════════════════════════════════════════════════
    // Check 5: Previsões de Receita vs Média Real (últimos 3 meses)
    // ══════════════════════════════════════════════════
    if (transactions && predictedIncomes) {
        const now = new Date();
        const threeMonthsAgo = startOfMonth(subMonths(now, 3));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        
        const recentIncomes = transactions.filter(t => 
            t.status !== 'deleted' && 
            t.type === 'income' &&
            isWithinInterval(new Date(t.date), { start: threeMonthsAgo, end: lastMonthEnd })
        );

        predictedIncomes.filter(pi => pi.status !== 'deleted').forEach(pi => {
            const subcatLower = (pi.subcategory || '').toLowerCase().split(':')[0];
            const catLower = (pi.category || '').toLowerCase();
            
            const matchingTx = recentIncomes.filter(t => {
                const txSubcat = (t.subcategory || '').toLowerCase().split(':')[0];
                const txCat = (t.category || '').toLowerCase();
                return txSubcat === subcatLower && txCat === catLower;
            });

            if (matchingTx.length === 0) return;

            const totalReceived = matchingTx.reduce((sum, t) => sum + t.amount, 0);
            const uniqueMonths = new Set(matchingTx.map(t => t.date.substring(0, 7)));
            const monthCount = Math.max(1, uniqueMonths.size);
            const monthlyAverage = totalReceived / monthCount;
            
            const predicted = pi.amount || 0;
            if (predicted <= 0) return;

            const tolerance = 0.4;
            const diff = Math.abs(monthlyAverage - predicted) / predicted;

            if (diff > tolerance) {
                const isOver = monthlyAverage > predicted;
                issuesFound++;
                addNotification({
                    title: 'Receita Prevista Desatualizada',
                    message: `"${pi.subcategory?.split(':')[0] || pi.category}" tem previsão de R$ ${predicted.toFixed(2).replace('.', ',')} mas a média real é R$ ${monthlyAverage.toFixed(2).replace('.', ',')} (${isOver ? 'acima' : 'abaixo'} em ${Math.round(diff * 100)}%).`,
                    type: 'info',
                    actionLabel: 'Revisar Receita',
                });
            }
        });
    }

    // ══════════════════════════════════════════════════
    // Check 6: Transações sem Categoria ou Método de Pagamento
    // ══════════════════════════════════════════════════
    if (transactions) {
        const missingCategory = transactions.filter(t => 
            t.status !== 'deleted' && (!t.category || t.category.trim() === '')
        );
        if (missingCategory.length > 0) {
            issuesFound++;
            addNotification({
                title: 'Transações sem Categoria',
                message: `Encontradas ${missingCategory.length} transações sem categoria definida. Isso pode afetar seus relatórios.`,
                type: 'info',
                actionLabel: 'Ver Extrato',
            });
        }
    }

    // ══════════════════════════════════════════════════
    // Check 7: Contas com saldo Negativo
    // ══════════════════════════════════════════════════
    accounts.filter(a => a.status !== 'deleted').forEach(account => {
        if (account.balance < 0) {
            issuesFound++;
            addNotification({
                title: 'Conta com Saldo Negativo',
                message: `A conta "${account.name}" está com saldo negativo (R$ ${account.balance.toFixed(2).replace('.', ',')}). Verifique se há registros faltando.`,
                type: 'warning',
            });
        }
    });

    return issuesFound;
};
