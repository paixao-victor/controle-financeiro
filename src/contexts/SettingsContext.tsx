import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
    isPrivacyMode: boolean;
    setIsPrivacyMode: (value: boolean) => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    savingsGoal: number;
    setSavingsGoal: (goal: number) => void;
    lastFilterPeriod: string;
    setLastFilterPeriod: (period: string) => void;
    formatValue: (value: number | string, formatter?: (v: any) => string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Privacy Mode State
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        return localStorage.getItem('privacy_mode') === 'true';
    });

    // Primary Color State
    const [primaryColor, setPrimaryColor] = useState(() => {
        return localStorage.getItem('theme_primary_color') || '#47f425';
    });

    // Savings Goal State
    const [savingsGoal, setSavingsGoal] = useState(() => {
        return Number(localStorage.getItem('savings_goal')) || 20;
    });

    // Filter Period State
    const [lastFilterPeriod, setLastFilterPeriod] = useState(() => {
        return localStorage.getItem('last_filter_period') || 'month';
    });

    // Persistence
    useEffect(() => {
        localStorage.setItem('privacy_mode', String(isPrivacyMode));
    }, [isPrivacyMode]);

    useEffect(() => {
        localStorage.setItem('theme_primary_color', primaryColor);
        // Apply primary color to CSS variable
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        // Calculate a darker version for hover/active states if needed
        // For simplicity, we just use the same or a slightly modified one
        document.documentElement.style.setProperty('--color-primary-dark', primaryColor);
    }, [primaryColor]);

    useEffect(() => {
        localStorage.setItem('savings_goal', String(savingsGoal));
    }, [savingsGoal]);

    useEffect(() => {
        localStorage.setItem('last_filter_period', lastFilterPeriod);
    }, [lastFilterPeriod]);

    // Value Formatter with Privacy Support
    const formatValue = (value: number | string, formatter?: (v: any) => string) => {
        if (isPrivacyMode) return '••••••';
        if (formatter) return formatter(value);
        return String(value);
    };

    return (
        <SettingsContext.Provider value={{
            isPrivacyMode,
            setIsPrivacyMode,
            primaryColor,
            setPrimaryColor,
            savingsGoal,
            setSavingsGoal,
            lastFilterPeriod,
            setLastFilterPeriod,
            formatValue
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
