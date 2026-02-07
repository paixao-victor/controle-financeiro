import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Transaction, Card, Account, PredictedExpense, PredictedIncome } from '@/types';
import { fetchAppData, syncAllData } from '../utils/syncService';
import { useAuth } from './AuthContext';

// Define Category Types


export type TransactionType = 'income' | 'expense';

export interface SubcategoryItem {
    label: string;
    icon: string;
}

export interface CategoryItem {
    id: string;
    label: string;
    icon: string;
    color?: string;
    subcategories: (string | SubcategoryItem)[];
}

export interface CategoryGroup {
    income: CategoryItem[];
    expense: CategoryItem[];
}

const DEFAULT_CATEGORIES: CategoryGroup = {
    income: [
        { id: 'salario', label: 'Salário', icon: 'payments', subcategories: ['Mensal', 'Adiantamento', '13º Salário'] },
        { id: 'bonus', label: 'Bônus', icon: 'workspace_premium', subcategories: ['Desempenho', 'PLR'] },
        { id: 'doacao', label: 'Doação', icon: 'volunteer_activism', subcategories: [] },
        { id: 'ferias', label: 'Férias', icon: 'beach_access', subcategories: [] },
        { id: 'pix', label: 'PIX', icon: 'account_balance', subcategories: [] },
        { id: 'dinheiro', label: 'Dinheiro', icon: 'attach_money', subcategories: [] },
        { id: 'comissao', label: 'Comissão', icon: 'receipt_long', subcategories: [] },
        { id: 'substituicao', label: 'Substituição', icon: 'swap_horiz', subcategories: [] },
        { id: 'outros_receitas', label: 'Outros', icon: 'more_horiz', subcategories: [] }
    ],
    expense: [
        { id: 'alimentacao', label: 'Alimentação', icon: 'restaurant', subcategories: ['Mercado', 'Restaurante', 'Ifood', 'Lanche'] },
        { id: 'transporte', label: 'Transporte', icon: 'directions_car', subcategories: ['Combustível', 'Uber', 'Manutenção', 'Estacionamento'] },
        { id: 'lazer', label: 'Lazer', icon: 'sports_esports', subcategories: ['Cinema', 'Streaming', 'Viagem', 'Jogos'] },
        { id: 'saude', label: 'Saúde', icon: 'health_and_safety', subcategories: ['Farmácia', 'Consulta', 'Exames', 'Seguro'] },
        { id: 'moradia', label: 'Moradia', icon: 'home', subcategories: ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet'] },
        { id: 'educacao', label: 'Educação', icon: 'school', subcategories: ['Faculdade', 'Cursos', 'Livros'] },
        { id: 'compras', label: 'Compras', icon: 'shopping_bag', subcategories: ['Roupas', 'Eletrônicos', 'Cosméticos'] }
    ]
};

interface TransactionsContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    restoreTransaction: (id: string) => void;
    setTransactions: (transactions: Transaction[]) => void;
    clearTransactions: () => void;
    removeDuplicates: () => void;
    calculateCurrentBalance: () => number;
    categories: string[]; // Used categories (derived)
    
    // Category Management
    availableCategories: CategoryGroup;
    addCategory: (type: 'income' | 'expense', category: CategoryItem) => void;
    updateCategory: (type: 'income' | 'expense', id: string, updates: Partial<CategoryItem>) => void;
    deleteCategory: (type: 'income' | 'expense', id: string) => void;
    addSubcategory: (type: 'income' | 'expense', categoryId: string, subcategory: string) => void;
    deleteSubcategory: (type: 'income' | 'expense', categoryId: string, subcategory: string) => void;
    renameSubcategory: (type: 'income' | 'expense', categoryId: string, oldName: string | SubcategoryItem, newName: string | SubcategoryItem) => void;
    currentCurrency: 'BRL' | 'USD';
    setCurrentCurrency: (currency: 'BRL' | 'USD') => void;
    isEditMode: boolean;
    setIsEditMode: (mode: boolean) => void;

    // Card Management
    cards: Card[];
    addCard: (card: Card) => void;
    updateCard: (id: string, updates: Partial<Card>) => void;
    deleteCard: (id: string) => void;

    // Account Management
    accounts: Account[];
    addAccount: (account: Account) => void;
    updateAccount: (id: string, updates: Partial<Account>) => void;
    deleteAccount: (id: string) => void;

    // Recurring Management
    predictedExpenses: PredictedExpense[];
    addPredictedExpense: (expense: PredictedExpense) => void;
    updatePredictedExpense: (expense: PredictedExpense) => void;
    deletePredictedExpense: (id: string) => void;

    // Predicted Incomes
    predictedIncomes: PredictedIncome[];
    addPredictedIncome: (income: PredictedIncome) => void;
    updatePredictedIncome: (income: PredictedIncome) => void;
    deletePredictedIncome: (id: string) => void;

    restoreBackup: (data: any) => void;
    
    // Sync states
    isSyncing: boolean;
    lastSync: Date | null;
    forceRefresh: () => Promise<void>;
    hasFullHistory: boolean;
    pullFullHistory: () => Promise<void>;
    accountBalances: Record<string, number>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const username = user?.username || '';
    const [transactions, setTransactionsState] = useState<Transaction[]>([]);
    const [availableCategories, setAvailableCategories] = useState<CategoryGroup>(DEFAULT_CATEGORIES);
    const [predictedExpenses, setPredictedExpenses] = useState<PredictedExpense[]>([]);
    const [predictedIncomes, setPredictedIncomes] = useState<PredictedIncome[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [currentCurrency, setCurrentCurrency] = useState<'BRL' | 'USD'>('BRL');
    const [isEditMode, setIsEditMode] = useState(false);
    const [cards, setCards] = useState<Card[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const firstLoadDone = useRef(false);

    const [hasFullHistory, setHasFullHistory] = useState(false);

    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        if (!accounts) return balances;
        accounts.forEach(acc => {
            const accTrans = transactions.filter(t => t.accountId === acc.id && t.status !== 'deleted');
            const inc = accTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const exp = accTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            balances[acc.id] = acc.balance + inc - exp;
        });
        return balances;
    }, [accounts, transactions]);

    // Helper to convert flat category list from backend to grouped structure
    const regroupCategories = (flatCategories: any[]): CategoryGroup => {
        if (!flatCategories || flatCategories.length === 0) return DEFAULT_CATEGORIES;
        
        const grouped: CategoryGroup = { income: [], expense: [] };
        flatCategories.forEach(cat => {
            const type = cat.type === 'income' ? 'income' : 'expense';
            grouped[type].push({
                id: cat.id,
                label: cat.label,
                icon: cat.icon,
                color: cat.color,
                subcategories: (Array.isArray(cat.subcategories) ? cat.subcategories : (cat.subcategories ? cat.subcategories.split(';') : [])).map((s: string) => {
                    if (typeof s === 'string' && s.includes(':')) {
                        const [label, icon] = s.split(':');
                        return { label, icon };
                    }
                    return s;
                })
            });
        });

        // If one side is empty, ensure it has defaults or at least exists
        if (grouped.income.length === 0) grouped.income = DEFAULT_CATEGORIES.income;
        if (grouped.expense.length === 0) grouped.expense = DEFAULT_CATEGORIES.expense;

        return grouped;
    };

    // Pull logic
    const pullFromSheets = useCallback(async (full = false) => {
        if (!username) return;
        try {
            setIsSyncing(true);
            const data = await fetchAppData(username, full);
            
            if (data.transactions) {
                setTransactionsState(data.transactions);
                if (full) setHasFullHistory(true);
            }
            if (data.accounts) setAccounts(data.accounts);
            if (data.cards) {
                setCards(prev => {
                    if (data.cards.length === 0 && prev.length > 0) return prev;
                    return data.cards;
                });
            }
            if (data.categories && Array.isArray(data.categories)) {
                setAvailableCategories(regroupCategories(data.categories));
            }
            if (data.predicted && Array.isArray(data.predicted)) {
                setPredictedExpenses(data.predicted);
            }
            if (data.predictedIncomes && Array.isArray(data.predictedIncomes)) {
                setPredictedIncomes(data.predictedIncomes);
            }
            
            setLastSync(new Date());
        } catch (err) {
            console.error('Falha ao puxar dados das Sheets:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [username]);

    const pullFullHistory = useCallback(async () => {
        return pullFromSheets(true);
    }, [pullFromSheets]);

    // Push logic (Individual or partial sync)
    const triggerAutoSync = useCallback(async (currentData?: any) => {
        if (!username) return;
        try {
            setIsSyncing(true);
            
            const transactionsToSync = currentData?.transactions || transactions;
            const accountsToSync = currentData?.accounts || accounts;
            const cardsToSync = currentData?.cards || cards;
            const predictedToSync = currentData?.predictedExpenses || predictedExpenses;
            const predictedIncomesToSync = currentData?.predictedIncomes || predictedIncomes;
            
            // Flatten categories
            const cats = currentData?.categories || availableCategories;
            const categoriesToSync: any[] = [
                ...cats.income.map((c: any) => ({ 
                    ...c, 
                    type: 'income',
                    subcategories: (c.subcategories || []).map((s: any) => typeof s === 'string' ? s : `${s.label}:${s.icon}`).join(';')
                })),
                ...cats.expense.map((c: any) => ({ 
                    ...c, 
                    type: 'expense',
                    subcategories: (c.subcategories || []).map((s: any) => typeof s === 'string' ? s : `${s.label}:${s.icon}`).join(';')
                }))
            ];

            await syncAllData({
                username,
                transactions: transactionsToSync,
                accounts: accountsToSync,
                cards: cardsToSync,
                categories: categoriesToSync,
                predicted: predictedToSync,
                predictedIncomes: predictedIncomesToSync
            });
            setLastSync(new Date());
        } catch (err) {
            console.error('Falha ao sincronizar dados nas Sheets:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [transactions, accounts, cards, availableCategories, predictedExpenses, predictedIncomes, username]);

    // Initial load from user-specific local storage
    useEffect(() => {
        if (!username) return;
        
        const txs = localStorage.getItem(`finance_${username}_transactions`);
        if (txs) setTransactionsState(JSON.parse(txs));
        else setTransactionsState([]);

        const cats = localStorage.getItem(`finance_${username}_categories`);
        if (cats) setAvailableCategories(JSON.parse(cats));
        else setAvailableCategories(DEFAULT_CATEGORIES);

        const curr = localStorage.getItem(`finance_${username}_currency`);
        if (curr) setCurrentCurrency(curr as 'BRL' | 'USD');
        else setCurrentCurrency('BRL');

        const crds = localStorage.getItem(`finance_${username}_cards`);
        if (crds) setCards(JSON.parse(crds));
        else setCards([]);

        const accs = localStorage.getItem(`finance_${username}_accounts`);
        if (accs) setAccounts(JSON.parse(accs));
        else setAccounts([]);

        const recs = localStorage.getItem(`finance_${username}_predicted`);
        if (recs) setPredictedExpenses(JSON.parse(recs));
        else setPredictedExpenses([]);

        const incs = localStorage.getItem(`finance_${username}_predicted_incomes`);
        if (incs) setPredictedIncomes(JSON.parse(incs));
        else setPredictedIncomes([]);
        
        pullFromSheets();
        firstLoadDone.current = true;
    }, [username, pullFromSheets]);

    // Lógica para processar receitas previstas automaticamente
    useEffect(() => {
        if (!firstLoadDone.current || predictedIncomes.length === 0) return;

        const processPredictedIncomes = async () => {
            const today = new Date();
            const todayKey = today.toISOString().split('T')[0];
            const processedKey = `finance_${username}_processed_incomes_${todayKey}`;
            
            // Check if already processed today
            if (localStorage.getItem(processedKey)) return;

            let hasChanges = false;
            const updatedAccounts = [...accounts];

            predictedIncomes.forEach(inc => {
                if (inc.status === 'deleted') return;

                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const safeDueDay = inc.receiveDay >= 31 ? lastDay : Math.min(inc.receiveDay, lastDay);
                
                if (today.getDate() === safeDueDay) {
                    const accountIndex = updatedAccounts.findIndex(a => a.id === inc.targetAccount);
                    if (accountIndex > -1) {
                        updatedAccounts[accountIndex] = {
                            ...updatedAccounts[accountIndex],
                            balance: (updatedAccounts[accountIndex].balance || 0) + inc.amount
                        };
                        
                        // For now we prioritize account balance
                        hasChanges = true;
                    }
                }
            });

            if (hasChanges) {
                setAccounts(updatedAccounts);
                localStorage.setItem(processedKey, 'true');
                triggerAutoSync({ accounts: updatedAccounts });
            }
        };

        processPredictedIncomes();
    }, [predictedIncomes, username, accounts, triggerAutoSync]);



    useEffect(() => {
        if (!username) return;
        localStorage.setItem(`finance_${username}_currency`, currentCurrency);
    }, [currentCurrency, username]);

    useEffect(() => {
        if (!username) return;
        localStorage.setItem(`finance_${username}_transactions`, JSON.stringify(transactions));
        const activeTransactions = transactions.filter(t => t.status !== 'deleted');
        const uniqueCategories = Array.from(new Set(activeTransactions.map(t => t.category))).sort();
        setCategories(uniqueCategories);
    }, [transactions, username]);

    useEffect(() => {
        if (!username) return;
        localStorage.setItem(`finance_${username}_categories`, JSON.stringify(availableCategories));
    }, [availableCategories, username]);

    useEffect(() => {
        if (username) {
            localStorage.setItem(`finance_${username}_transactions`, JSON.stringify(transactions));
            localStorage.setItem(`finance_${username}_accounts`, JSON.stringify(accounts));
            localStorage.setItem(`finance_${username}_categories`, JSON.stringify(availableCategories));
            localStorage.setItem(`finance_${username}_cards`, JSON.stringify(cards));
            localStorage.setItem(`finance_${username}_predicted`, JSON.stringify(predictedExpenses));
            localStorage.setItem(`finance_${username}_predicted_incomes`, JSON.stringify(predictedIncomes));
        }
    }, [transactions, accounts, availableCategories, cards, predictedExpenses, predictedIncomes, username]);

    const addTransaction = (transaction: Transaction) => {
        const newTx = { ...transaction, status: 'active' as const, createdAt: transaction.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
        const newState = [newTx, ...transactions];
        setTransactionsState(newState);
        triggerAutoSync({ transactions: newState });
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        const newState = transactions.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
        setTransactionsState(newState);
        triggerAutoSync({ transactions: newState });
    };

    const deleteTransaction = (id: string) => {
        const newState = transactions.map(t => t.id === id ? { ...t, status: 'deleted' as const, updatedAt: new Date().toISOString() } : t);
        setTransactionsState(newState);
        triggerAutoSync({ transactions: newState });
    };

    const restoreTransaction = (id: string) => {
        const newState = transactions.map(t => t.id === id ? { ...t, status: 'active' as const, updatedAt: new Date().toISOString() } : t);
        setTransactionsState(newState);
        triggerAutoSync({ transactions: newState });
    };

    const setTransactions = (newTransactions: Transaction[]) => {
        setTransactionsState(newTransactions);
    };

    const clearTransactions = () => {
        setTransactionsState([]);
    };

    const removeDuplicates = () => {
        setTransactionsState(prev => {
            const seen = new Set();
            return prev.filter(t => {
                const key = `${t.date}-${t.amount}-${t.description}-${t.category}-${t.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        });
    };



    const calculateCurrentBalance = () => {
        const activeAccounts = accounts.filter(a => a.status !== 'deleted');
        if (activeAccounts && activeAccounts.length > 0) {
            return activeAccounts.reduce((total, acc) => total + (acc.balance || 0), 0);
        }

        const activeTransactions = transactions.filter(t => t.status !== 'deleted');
        if (!activeTransactions || activeTransactions.length === 0) return 0;

        const initialBalanceTx = [...activeTransactions]
            .filter(t => t.category === 'Saldo Inicial' || t.category === '📈 Ajuste') 
            .sort((a, b) => {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;
                return b.createdAt.localeCompare(a.createdAt);
            })[0];

        if (!initialBalanceTx) {
            return activeTransactions.reduce((acc, t) => {
                return t.type === 'income' ? acc + t.amount : acc - t.amount;
            }, 0);
        }

        const baseValue = initialBalanceTx.amount;
        const checkpointDate = initialBalanceTx.date;
        const checkpointCreatedAt = initialBalanceTx.createdAt;

        const laterTransactions = activeTransactions.filter(t => {
            if (t.id === initialBalanceTx.id) return false;
            const isAfterDate = t.date > checkpointDate;
            const isSameDateButNewer = t.date === checkpointDate && t.createdAt > checkpointCreatedAt;
            return isAfterDate || isSameDateButNewer;
        });

        const delta = laterTransactions.reduce((acc, t) => {
            const activeCards = cards.filter(c => c.status !== 'deleted');
             if (t.type === 'expense' && t.paymentMethod === 'cartao') {
                const card = activeCards.find(c => c.id === t.cardId);
                if (card && (t.paymentOption === 'credit' || card.type === 'credit')) {
                    return acc;
                }
            }
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);

        return baseValue + delta;
    };

    // Card Methods
    const addCard = (card: Card) => {
        const newState = [...cards, { ...card, status: 'active' as const }];
        setCards(newState);
        triggerAutoSync({ cards: newState });
    };
    const updateCard = (id: string, updates: Partial<Card>) => {
        const now = new Date().toISOString();
        const newState = cards.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c);
        setCards(newState);
        localStorage.setItem(`finance_${username}_cards`, JSON.stringify(newState)); // Immediate save
        triggerAutoSync({ cards: newState });
    };
    const deleteCard = (id: string) => {
        setCards(cards.filter(card => card.id !== id));
        triggerAutoSync({ cards: cards.filter(card => card.id !== id) });
    };

    // Account Methods
    const addAccount = (account: Account) => {
        const newState = [...accounts, { ...account, status: 'active' as const }];
        setAccounts(newState);
        triggerAutoSync({ accounts: newState });
    };
    const updateAccount = (id: string, updates: Partial<Account>) => {
        const newState = accounts.map(a => a.id === id ? { ...a, ...updates } : a);
        setAccounts(newState);
        triggerAutoSync({ accounts: newState });
    };
    const deleteAccount = (id: string) => {
        const newState = accounts.map(a => a.id === id ? { ...a, status: 'deleted' as const } : a);
        setAccounts(newState);
        triggerAutoSync({ accounts: newState });
    };

    const addPredictedExpense = (expense: PredictedExpense) => {
        const newState = [...predictedExpenses, { ...expense, id: expense.id || Date.now().toString() }];
        setPredictedExpenses(newState);
        triggerAutoSync({ predictedExpenses: newState });
    };

    const updatePredictedExpense = (expense: PredictedExpense) => {
        const newState = predictedExpenses.map(e => e.id === expense.id ? expense : e);
        setPredictedExpenses(newState);
        triggerAutoSync({ predictedExpenses: newState });
    };

    const deletePredictedExpense = (id: string) => {
        const newState = predictedExpenses.filter(e => e.id !== id);
        triggerAutoSync({ predictedExpenses: newState });
    };

    const addPredictedIncome = (income: PredictedIncome) => {
        const newState = [...predictedIncomes, { ...income, id: income.id || Date.now().toString() }];
        setPredictedIncomes(newState);
        triggerAutoSync({ predictedIncomes: newState });
    };

    const updatePredictedIncome = (income: PredictedIncome) => {
        const newState = predictedIncomes.map(e => e.id === income.id ? income : e);
        setPredictedIncomes(newState);
        triggerAutoSync({ predictedIncomes: newState });
    };

    const deletePredictedIncome = (id: string) => {
        const newState = predictedIncomes.filter(e => e.id !== id);
        setPredictedIncomes(newState);
        triggerAutoSync({ predictedIncomes: newState });
    };

    // Category Management Methods
    const addCategory = (type: 'income' | 'expense', category: CategoryItem) => {
        const newState = {
            ...availableCategories,
            [type]: [...availableCategories[type], category]
        };
        setAvailableCategories(newState);
        triggerAutoSync({ categories: newState });
    };

    const updateCategory = (type: 'income' | 'expense', id: string, updates: Partial<CategoryItem>) => {
        const oldCategory = availableCategories[type].find(c => c.id === id);
        const newState = {
            ...availableCategories,
            [type]: availableCategories[type].map(c => c.id === id ? { ...c, ...updates } : c)
        };
        setAvailableCategories(newState);

        // If label changed, update all associated transactions and recurring expenses
        if (updates.label && oldCategory && updates.label !== oldCategory.label) {
            const newTxs = transactions.map(t => 
                t.category === oldCategory.label ? { ...t, category: updates.label! } : t
            );
            setTransactionsState(newTxs);

            const newPredicted = predictedExpenses.map(re => 
                re.category === oldCategory.label ? { ...re, category: updates.label! } : re
            );
            setPredictedExpenses(newPredicted);

            const newPredictedIncomes = predictedIncomes.map(re => 
                re.category === oldCategory.label ? { ...re, category: updates.label! } : re
            );
            setPredictedIncomes(newPredictedIncomes);
            
            triggerAutoSync({ categories: newState, transactions: newTxs, predictedExpenses: newPredicted, predictedIncomes: newPredictedIncomes });
        } else {
            triggerAutoSync({ categories: newState });
        }
    };

    const deleteCategory = (type: 'income' | 'expense', id: string) => {
        const newState = {
            ...availableCategories,
            [type]: availableCategories[type].filter(c => c.id !== id)
        };
        setAvailableCategories(newState);
        triggerAutoSync({ categories: newState });
    };

    const addSubcategory = (type: 'income' | 'expense', categoryId: string, subcategory: string) => {
        const newState = {
            ...availableCategories,
            [type]: availableCategories[type].map(c => 
                c.id === categoryId 
                    ? { ...c, subcategories: [...(c.subcategories || []), subcategory] }
                    : c
            )
        };
        setAvailableCategories(newState);
        triggerAutoSync({ categories: newState });
    };

    const deleteSubcategory = (type: 'income' | 'expense', categoryId: string, subcategory: string) => {
        const newState = {
            ...availableCategories,
            [type]: availableCategories[type].map(c => 
                c.id === categoryId 
                    ? { ...c, subcategories: (c.subcategories || []).filter(s => s !== subcategory) }
                    : c
            )
        };
        setAvailableCategories(newState);
        triggerAutoSync({ categories: newState });
    };

    const renameSubcategory = async (type: 'income' | 'expense', categoryId: string, oldName: string | SubcategoryItem, newName: string | SubcategoryItem) => {
        const categoryItem = availableCategories[type].find(c => c.id === categoryId);
        if (!categoryItem) return;

        const oldSubName = typeof oldName === 'string' ? oldName : oldName.label;
        const newSubName = typeof newName === 'string' ? newName : newName.label;

        // 1. Update Categories Structure
        const newCategories = {
            ...availableCategories,
            [type]: availableCategories[type].map(c => 
                c.id === categoryId 
                    ? { ...c, subcategories: (c.subcategories || []).map(s => {
                        const sName = typeof s === 'string' ? s : s.label;
                        return sName === oldSubName ? newName : s;
                    }) }
                    : c
            )
        };
        setAvailableCategories(newCategories);

        // 2. Update existing transactions
        const newTransactions = transactions.map(t => {
            if (t.category === categoryItem.label && t.subcategory === oldSubName) {
                return { ...t, subcategory: newSubName, updatedAt: new Date().toISOString() };
            }
            return t;
        });
        setTransactionsState(newTransactions);

        // 2b. Update predicted expenses
        const newPredicted = predictedExpenses.map(re => {
            if (re.category === categoryItem.label && re.subcategory === oldSubName) {
                return { ...re, subcategory: newSubName };
            }
            return re;
        });
        setPredictedExpenses(newPredicted);

        const newPredictedIncomes = predictedIncomes.map(re => {
            if (re.category === categoryItem.label && re.subcategory === oldSubName) {
                return { ...re, subcategory: newSubName };
            }
            return re;
        });
        setPredictedIncomes(newPredictedIncomes);

        // 3. Sync with Google Sheets if user is logged in
        if (username) {
            try {
                const { updateSubcategoryInSheets } = await import('../utils/syncService');
                await updateSubcategoryInSheets(username, oldSubName, newSubName, categoryId);
                
                // Trigger full sync to ensure consistency
                triggerAutoSync({ 
                    transactions: newTransactions, 
                    categories: newCategories,
                    predictedExpenses: newPredicted,
                    predictedIncomes: newPredictedIncomes
                });
            } catch (err) {
                console.error('Falha ao sincronizar renomeação de subcategoria:', err);
            }
        }
    };

    return (
        <TransactionsContext.Provider value={{
            transactions,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            restoreTransaction,
            setTransactions,
            clearTransactions,
            removeDuplicates,
            calculateCurrentBalance,
            categories,
            availableCategories,
            addCategory,
            updateCategory,
            deleteCategory,
            addSubcategory,
            deleteSubcategory,
            renameSubcategory,
            currentCurrency,
            setCurrentCurrency,
            isEditMode,
            setIsEditMode,
            cards,
            addCard,
            updateCard,
            deleteCard,
            accounts,
            addAccount,
            updateAccount,
            deleteAccount,
            predictedExpenses,
            addPredictedExpense,
            updatePredictedExpense,
            deletePredictedExpense,
            predictedIncomes,
            addPredictedIncome,
            updatePredictedIncome,
            deletePredictedIncome,
            restoreBackup: (data: any) => {
                if (data.transactions) setTransactionsState(data.transactions);
                if (data.categories) setAvailableCategories(data.categories);
                if (data.accounts) setAccounts(data.accounts);
                if (data.cards) setCards(data.cards);
                if (data.predictedExpenses) setPredictedExpenses(data.predictedExpenses);
                if (data.predictedIncomes) setPredictedIncomes(data.predictedIncomes);
            },
            isSyncing,
            lastSync,
            forceRefresh: pullFromSheets,
            hasFullHistory,
            pullFullHistory,
            accountBalances
        }}>
            {children}
        </TransactionsContext.Provider>
    );
};

export const useTransactions = () => {
    const context = useContext(TransactionsContext);
    if (!context) {
        throw new Error('useTransactions must be used within a TransactionsProvider');
    }
    return context;
};
