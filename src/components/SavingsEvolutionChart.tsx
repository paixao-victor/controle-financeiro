import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/contexts/TransactionsContext';

export const SavingsEvolutionChart: React.FC = () => {
    const { transactions } = useTransactions();

    const chartData = useMemo(() => {
        const now = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));

        return last6Months.map(month => {
            const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), month));
            
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((acc, t) => acc + t.amount, 0);
            
            const expense = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((acc, t) => acc + t.amount, 0);
            
            const savings = income - expense;
            const savingsPercent = income > 0 ? (savings / income) * 100 : 0;

            return {
                name: format(month, 'MMM', { locale: ptBR }),
                savings: savings,
                percent: Math.round(savingsPercent),
                rawDate: month
            };
        });
    }, [transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="w-full h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#47f425" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#47f425" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888888' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#18181b', 
                            border: 'none', 
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#47f425' }}
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Economia']}
                        labelStyle={{ color: '#888888', marginBottom: '4px' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="savings" 
                        stroke="#47f425" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorSavings)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-center text-dim mt-2 italic">
                Evolução do saldo livre nos últimos 6 meses
            </p>
        </div>
    );
};
