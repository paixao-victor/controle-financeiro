import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTransactions } from './TransactionsContext';
import { useSettings } from './SettingsContext';
import type { AppNotification } from '../types';

interface NotificationSettings {
    daysInAdvance: number;
}

interface NotificationsContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    settings: NotificationSettings;
    updateSettings: (settings: Partial<NotificationSettings>) => void;
    addSystemNotification: (notif: Omit<AppNotification, 'id' | 'read' | 'date'>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { cards, transactions } = useTransactions();
    const { savingsGoal } = useSettings();
    
    // Settings State
    const [settings, setSettings] = useState<NotificationSettings>(() => {
        const stored = localStorage.getItem('notification_settings');
        return stored ? JSON.parse(stored) : { daysInAdvance: 3 };
    });

    // Notifications State
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        const stored = localStorage.getItem('notifications');
        return stored ? JSON.parse(stored) : [];
    });

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem('notification_settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Derived State
    const unreadCount = notifications.filter(n => !n.read).length;

    // Helper to add unique notification (avoid dupes per day)
    const addSystemNotification = (notif: Omit<AppNotification, 'id' | 'read' | 'date'>) => {
        const todayStr = new Date().toISOString().split('T')[0];
        
        setNotifications(prev => {
            // Check if similar notification exists for today
            const exists = prev.some(n => 
                n.title === notif.title && 
                n.message === notif.message && 
                n.date.startsWith(todayStr)
            );
            
            if (exists) return prev;

            const newNotif: AppNotification = {
                id: Date.now().toString() + Math.random().toString(),
                date: new Date().toISOString(),
                read: false,
                ...notif
            };
            
            return [newNotif, ...prev];
        });
    };

    // Auto-Generate Notifications Logic
    useEffect(() => {
        const checkNotifications = () => {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + settings.daysInAdvance);

            cards.forEach(card => {
                // Check Closing Day
                const closingDate = new Date();
                closingDate.setDate(card.closingDay);
                
                // Adjust month if day passed
                if (closingDate.getDate() < today.getDate()) {
                    closingDate.setMonth(closingDate.getMonth() + 1);
                }

                // Calculate diff in days
                const diffTimeClosing = closingDate.getTime() - today.getTime();
                const diffDaysClosing = Math.ceil(diffTimeClosing / (1000 * 60 * 60 * 24)); 

                if (diffDaysClosing <= settings.daysInAdvance && diffDaysClosing >= 0) {
                     let message = '';
                     if (diffDaysClosing === 0) message = `A fatura do cartão ${card.alias} fecha hoje!`;
                     else message = `A fatura do cartão ${card.alias} fecha em ${diffDaysClosing} dias.`;

                     addSystemNotification({
                         title: 'Fechamento de Fatura',
                         message,
                         type: 'info'
                     });
                }

                // Check Due Day
                 const dueDate = new Date();
                dueDate.setDate(card.dueDay);
                
                // Adjust month if day passed
                if (dueDate.getDate() < today.getDate()) {
                    dueDate.setMonth(dueDate.getMonth() + 1);
                }

                 const diffTimeDue = dueDate.getTime() - today.getTime();
                const diffDaysDue = Math.ceil(diffTimeDue / (1000 * 60 * 60 * 24));

                if (diffDaysDue <= settings.daysInAdvance && diffDaysDue >= 0) {
                     let message = '';
                     if (diffDaysDue === 0) message = `A fatura do cartão ${card.alias} vence hoje!`;
                     else message = `A fatura do cartão ${card.alias} vence em ${diffDaysDue} dias.`;
                     
                     addSystemNotification({
                         title: 'Vencimento de Fatura',
                         message,
                         type: 'alert'
                     });
                }
            });
        };

        checkNotifications();
    }, [cards, settings.daysInAdvance]);

    // Goal Notifications Logic
    useEffect(() => {
        const checkGoalReached = () => {
            const now = new Date();
            const thisMonthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });

            const income = thisMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const expense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            const savingsPercent = income > 0 ? ((income - expense) / income) * 100 : 0;
            const goal = savingsGoal || 20;

            if (savingsPercent >= goal) {
                const title = 'Meta de Economia!';
                const message = `Parabéns! Você já economizou ${savingsPercent.toFixed(0)}% das suas receitas este mês (Meta: ${goal}%).`;
                
                addSystemNotification({
                    title,
                    message,
                    type: 'success'
                });

                // Browser Push Notification
                if (Notification.permission === 'granted') {
                    new Notification(title, { body: message, icon: '/favicon.ico' });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        };

        if (transactions.length > 0) {
            checkGoalReached();
        }
    }, [transactions]);


    // Actions
    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const updateSettings = (newSettings: Partial<NotificationSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            settings,
            updateSettings,
            addSystemNotification
        }}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};
