import type { Transaction } from "@/types";

export const capitalize = (s: string) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const getTransactionName = (transaction: Transaction): string => {
    // Priority: Subcategory > Description > Category
    // However, usually Description is specific (e.g. "Uber 12:30") and Category/Subcategory is generic.
    // The user requested: "título principal... para o nome da subcategoria."
    // So if Subcategory exists, use it.
    // If not, use Description? Or Category?
    // Request says: "Se aparece a despesa o nome deve ser da subcategoria"
    // So Subcategory is top priority.

    // Logic from previous steps:
    // t.subcategory ? t.subcategory : (t.description || t.category)

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
