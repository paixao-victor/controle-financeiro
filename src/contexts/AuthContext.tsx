import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { loginUser as cloudLogin, registerUser as cloudRegister, updateProfileOnCloud, loginWithGoogle as cloudGoogleLogin } from '../utils/syncService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, password?: string) => Promise<void>;
    loginWithGoogle: (email: string, name: string, photo?: string) => Promise<void>;
    register: (name: string, username: string, email: string, password?: string, currency?: 'BRL' | 'USD' | 'EUR') => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('finance_user_data');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        } else {
            // Legacy migration: check old keys
            const storedEmail = localStorage.getItem('finance_user_email');
            const storedUsername = localStorage.getItem('finance_user_name'); // used to be name
            if (storedEmail || storedUsername) {
               // Force logout of legacy users to refresh with new structure
               logout();
            }
        }
    }, []);

    const login = async (username: string, password?: string) => {
        try {
            const response = await cloudLogin(username, password);
            if (response.success && response.user) {
                const cloudUser: User = response.user;
                setUser(cloudUser);
                localStorage.setItem('finance_user_data', JSON.stringify(cloudUser));
            } else {
                throw new Error(response.error || "Erro desconhecido no login.");
            }
        } catch (error: any) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const loginWithGoogle = async (email: string, name: string, photo?: string) => {
        try {
            const response = await cloudGoogleLogin(email, name, photo);
            if (response.success && response.user) {
                const cloudUser: User = response.user;
                setUser(cloudUser);
                localStorage.setItem('finance_user_data', JSON.stringify(cloudUser));
            } else {
                throw new Error(response.error || "Erro ao fazer login com Google.");
            }
        } catch (error: any) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const register = async (name: string, username: string, email: string, password?: string, currency: 'BRL' | 'USD' | 'EUR' = 'BRL') => {
        try {
            const newUser: any = {
                id: uuidv4(),
                username: username.toLowerCase().trim(),
                name,
                email,
                password,
                currency,
                createdAt: new Date().toISOString()
            };

            const response = await cloudRegister(newUser);
            if (response.success && response.user) {
                const registeredUser = response.user;
                delete registeredUser.password;
                setUser(registeredUser);
                localStorage.setItem('finance_user_data', JSON.stringify(registeredUser));
            } else {
                throw new Error(response.error || "Erro ao registrar usuário.");
            }
        } catch (error: any) {
            console.error("Register Error:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('finance_user_data');
        // Clear all keys to be safe
        localStorage.removeItem('finance_user_id');
        localStorage.removeItem('finance_user_email');
        localStorage.removeItem('finance_user_name');
    };

    const updateUser = async (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        
        // Optimistic update
        setUser(updatedUser);
        localStorage.setItem('finance_user_data', JSON.stringify(updatedUser));

        try {
            await updateProfileOnCloud({ ...updates, username: user.username });
        } catch (error) {
            console.error("Failed to update profile on cloud", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginWithGoogle, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
