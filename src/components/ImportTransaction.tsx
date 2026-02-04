import React, { useState, useCallback } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { parseCSV } from '@/utils/csvHandler';
import type { ParseResult } from '@/utils/csvHandler';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, AlertTriangle, CheckCircle, FileUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const ImportTransaction = () => {
    const { addTransaction } = useTransactions();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ParseResult | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        try {
            const result = await parseCSV(selectedFile);
            setPreview(result);
        } catch (error) {
            console.error(error);
        }
    };

    const confirmImport = () => {
        if (preview && preview.data) {
            preview.data.forEach(t => addTransaction(t));
            setFile(null);
            setPreview(null);
            // Optional: Show success toast
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
    };

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className={cn(
                            "border-2 border-dashed transition-colors duration-300 cursor-pointer h-64 flex flex-col items-center justify-center gap-4 group",
                            dragActive ? "border-primary bg-primary/5" : "border-white/20 hover:border-white/40 hover:bg-white/5"
                        )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('csv-upload')?.click()}
                        >
                            <input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="p-4 rounded-full bg-content/5 group-hover:bg-primary/20 transition-colors">
                                <Upload className="w-8 h-8 text-dim group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-content mb-1">Arraste seu CSV ou clique</p>
                                <p className="text-sm text-dim">Suporta arquivos até 10MB</p>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="bg-surface-dark border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileUp className="text-primary w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">{file.name}</CardTitle>
                                        <p className="text-xs text-white/40">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={clearFile}>
                                    <X className="w-5 h-5 text-white/40 hover:text-white" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {preview && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Total Linhas</span>
                                                <p className="text-2xl font-bold text-white">{preview.meta.totalRows}</p>
                                            </div>
                                            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                                                <span className="text-xs text-primary/60 uppercase font-bold tracking-wider">Válidos</span>
                                                <p className="text-2xl font-bold text-primary">{preview.meta.validRows}</p>
                                            </div>
                                            <div className="bg-expense/10 p-3 rounded-lg border border-expense/20">
                                                <span className="text-xs text-expense/60 uppercase font-bold tracking-wider">Erros</span>
                                                <p className="text-2xl font-bold text-expense">{preview.errors.length}</p>
                                            </div>
                                        </div>

                                        {preview.errors.length > 0 && (
                                            <div className="bg-expense/5 border border-expense/20 rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="w-4 h-4 text-expense" />
                                                    <span className="text-sm font-bold text-expense">Erros Encontrados (serão ignorados)</span>
                                                </div>
                                                {preview.errors.map((err, i) => (
                                                    <p key={i} className="text-xs text-expense/80 font-mono">{err}</p>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4">
                                            <Button variant="outline" onClick={clearFile}>Cancelar</Button>
                                            <Button onClick={confirmImport} disabled={preview.meta.validRows === 0}>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Confirmar Importação
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ImportTransaction;
