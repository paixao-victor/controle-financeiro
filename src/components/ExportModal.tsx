import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';
import { subDays, startOfMonth, startOfYear } from 'date-fns';
import { exportCSV } from '@/utils/csvHandler';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    filteredTransactions?: Transaction[];
}

type Period = 'all' | '7days' | '30days' | '60days' | 'month' | 'year' | 'custom' | 'current_filter';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, transactions, filteredTransactions }) => {
    const [period, setPeriod] = useState<Period>('month');
    const [removeDuplicates, setRemoveDuplicates] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleExport = (exportCurrentFilter: boolean = false) => {
        let filtered = exportCurrentFilter && filteredTransactions ? [...filteredTransactions] : [...transactions];
        const now = new Date();

        if (!exportCurrentFilter) {
            // 1. Filter by Period (Only if not exporting the already filtered list)
        if (period === '7days') {
            const start = subDays(now, 7);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        } else if (period === '30days') {
            const start = subDays(now, 30);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        } else if (period === '60days') {
            const start = subDays(now, 60);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        } else if (period === 'month') {
            const start = startOfMonth(now);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        } else if (period === 'year') {
            const start = startOfYear(now);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        } else if (period === 'custom') {
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= new Date(startDate) && tDate <= new Date(endDate);
            });
        }
    }

        // 2. Remove Duplicates (Content-based)
        if (removeDuplicates) {
            const seen = new Set();
            filtered = filtered.filter(t => {
                // Key based on content, ignoring ID
                const key = `${t.date}-${t.amount}-${t.description}-${t.category}-${t.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        exportCSV(filtered);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-surface border-border p-6 shadow-xl">
                <DialogHeader>
                    <DialogTitle>Exportar Transações</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Opção Rápida: Filtro do Extrato */}
                    {filteredTransactions && filteredTransactions.length > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-2">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-content">Visualização Atual</p>
                                    <p className="text-[10px] text-gray-400">Exportar apenas as {filteredTransactions.length} transações que você está vendo agora no extrato.</p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleExport(true)}
                                    className="shrink-0 bg-primary text-secondary font-bold hover:scale-105 transition-all"
                                >
                                    Exportar Filtro
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Período</label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={period === 'month' ? 'default' : 'outline'}
                                onClick={() => setPeriod('month')}
                                className="justify-start"
                            >
                                Mês Atual
                            </Button>
                            <Button
                                variant={period === '7days' ? 'default' : 'outline'}
                                onClick={() => setPeriod('7days')}
                                className="justify-start"
                            >
                                Últimos 7 dias
                            </Button>
                            <Button
                                variant={period === '30days' ? 'default' : 'outline'}
                                onClick={() => setPeriod('30days')}
                                className="justify-start"
                            >
                                Últimos 30 dias
                            </Button>
                            <Button
                                variant={period === '60days' ? 'default' : 'outline'}
                                onClick={() => setPeriod('60days')}
                                className="justify-start"
                            >
                                Últimos 60 dias
                            </Button>
                            <Button
                                variant={period === 'year' ? 'default' : 'outline'}
                                onClick={() => setPeriod('year')}
                                className="justify-start"
                            >
                                Este Ano
                            </Button>
                            <Button
                                variant={period === 'all' ? 'default' : 'outline'}
                                onClick={() => setPeriod('all')}
                                className="justify-start"
                            >
                                Todo o Período
                            </Button>
                            <Button
                                variant={period === 'custom' ? 'default' : 'outline'}
                                onClick={() => setPeriod('custom')}
                                className="justify-start col-span-2"
                            >
                                Período Personalizado
                            </Button>
                        </div>

                        {period === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Data Inicial</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-content text-sm focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-dim mb-1 block">Data Final</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-content text-sm focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <input
                        type="checkbox"
                        id="dedup"
                        checked={removeDuplicates}
                        onChange={(e) => setRemoveDuplicates(e.target.checked)}
                        className="rounded border-gray-600 bg-black/20 text-primary focus:ring-primary"
                    />
                    <label htmlFor="dedup" className="text-sm text-gray-300">
                        Remover linhas duplicadas (conteúdo idêntico)
                    </label>
                </div>

                <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <p className="text-xs text-primary">
                        Isso irá gerar um arquivo CSV compatível com Excel e Google Sheets.
                    </p>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => handleExport(false)} variant="default">
                        <span className="material-symbols-outlined text-sm mr-2">download</span>
                        Baixar CSV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
