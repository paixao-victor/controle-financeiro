export type TransactionType = 'income' | 'expense';

export type CardType = 'debit' | 'credit' | 'both' | 'food';

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    photo?: string;
    currency: 'BRL' | 'USD' | 'EUR';
    createdAt: string;
    password?: string;
}

export interface Card {
    id: string;
    userId?: string;
    alias: string;
    bank: string;
    brand: string;
    color: string;
    closingDay: number;
    dueDay: number;
    limit: number;
    type: CardType;
    initials?: string;
    // Food Card specific fields
    rechargeValue?: number;
    rechargeDate?: number;
    linkedAccountId?: string;
    status?: 'active' | 'deleted';
    billStatusOverrides?: Record<string, 'open' | 'closed'>; // e.g., { "2023-10": "closed" }
}

export type NotificationType = 'alert' | 'info' | 'success' | 'warning';

export interface AppNotification {
    id: string;
    userId?: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
    type: NotificationType;
    actionLabel?: string;
    actionUrl?: string; // or internal route
}

export interface Account {
    id: string;
    userId?: string;
    name: string;
    icon: string;
    balance: number;
    status?: 'active' | 'deleted';
}

export type RecurrenceRule = 'monthly' | 'weekly' | null;

export interface Transaction {
    id: string;
    userId?: string;
    type: TransactionType;
    category: string;
    subcategory?: string | null;
    amount: number;
    date: string; // YYYY-MM-DD
    description?: string | null;
    icon?: string; // Added to fix build error
    isRecurring: boolean;
    recurrenceRule?: RecurrenceRule;
    paymentMethod?: 'banco' | 'cartao' | 'dinheiro'; // Updated to include 'dinheiro' as per request
    cardId?: string | null;
    accountId?: string | null; // Request mentioned accountId
    paymentOption?: 'debit' | 'credit'; // Para cartões 'both'
    installments?: number; // Total de parcelas
    currentInstallment?: number; // Parcela atual (ex: 1 de 3)
    parentTransactionId?: string; // ID da transação original para parcelados
    notes?: string | null;
    predictedExpenseId?: string | null;
    status?: 'active' | 'deleted';
    createdAt: string; // ISO
    updatedAt: string; // ISO
}

export interface ImportStats {
    total: number;
    success: number;
    errors: number;
    skipped: number;
}

export interface PredictedExpense {
    id: string;
    subcategory: string;
    amount: number;
    predictedAmount?: number;
    category: string;
    dueDay: number;
    icon: string;
    color?: string;
    notes?: string;
    paymentMethod?: 'banco' | 'cartao';
    cardId?: string;
    accountId?: string;
    status?: 'active' | 'deleted';
}

export interface PredictedIncome {
    id: string;
    subcategory: string;
    amount: number;
    predictedAmount?: number;
    category: string;
    receiveDay: number;
    icon: string;
    color?: string;
    notes?: string;
    targetAccount?: string;
    recurrencePeriod: 'once' | 'monthly' | 'yearly' | 'custom';
    customInterval?: number; // e.g. 3
    customPeriod?: 'days' | 'weeks' | 'months' | 'years'; // e.g. 'months'
    status?: 'active' | 'deleted';
}
