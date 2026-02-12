import { parseISO } from 'date-fns';
import type { Transaction } from "@/types";

export const capitalize = (s: string) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const getTransactionName = (transaction: Transaction): string => {
    // Priority: Subcategory > Description > Category
    const displayName = transaction.subcategory
        ? transaction.subcategory
        : (transaction.description || transaction.category);

    return capitalize(displayName);
};

// Remove accents for search
export const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const formatCurrency = (amount: number, currency: string = 'BRL') => {
    const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Use parseISO and remove 'Z' to force parsing as local time
    try {
        return parseISO(dateStr.replace(/Z$/, ''));
    } catch {
        return new Date(dateStr.replace(/Z$/, ''));
    }
};
