
import type { Card, Account, AppNotification } from '@/types';

export const checkConsistency = (
    cards: Card[], 
    accounts: Account[],
    addNotification: (notif: Omit<AppNotification, 'id' | 'read' | 'date'>) => void
) => {
    let issuesFound = 0;

    // Check 1: Cards requiring linked accounts
    cards.forEach(card => {
        if (['debit', 'both', 'food'].includes(card.type)) {
            if (!card.linkedAccountId) {
                issuesFound++;
                addNotification({
                    title: 'Cartão sem Conta Vinculada',
                    message: `O cartão "${card.alias}" é do tipo ${card.type} mas não possui uma conta vinculada. Isso pode gerar erros em transações.`,
                    type: 'alert',
                    actionLabel: 'Corrigir Cartão',
                    actionUrl: '/cards' // Logic to navigate/open card edit would be ideal, but simple nav for now
                });
            } else {
                // Check if account still exists
                const accountExists = accounts.find(a => a.id === card.linkedAccountId);
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

    return issuesFound;
};
