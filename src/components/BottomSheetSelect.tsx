import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    id: string | number;
    label: string;
    icon?: string;
}

interface BottomSheetSelectProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: Option[];
    selectedValue?: string | number;
    onSelect: (option: Option) => void;
}

const BottomSheetSelect: React.FC<BottomSheetSelectProps> = ({
    isOpen,
    onClose,
    title,
    options,
    selectedValue,
    onSelect
}) => {
    // Bloquear scroll do body quando aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-6000 flex items-end justify-center">
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-surface dark:bg-zinc-900 rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] border-t border-white/10 touch-none"
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center p-3 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-content/10 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-6 py-2 flex items-center justify-between border-b border-content/5">
                            <h3 className="text-lg font-black text-content uppercase tracking-wider">{title}</h3>
                            <button 
                                onClick={onClose}
                                className="size-10 flex items-center justify-center rounded-full bg-content/5 text-dim hover:text-content active:scale-90 transition-all font-bold"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Options List */}
                        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar overscroll-contain pb-12">
                            {options.map((option) => {
                                const isSelected = String(selectedValue) === String(option.label) || String(selectedValue) === String(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            onSelect(option);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                                            isSelected 
                                            ? 'bg-primary/20 text-primary border border-primary/20' 
                                            : 'bg-content/5 text-content hover:bg-content/10 border border-transparent'
                                        }`}
                                    >
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-primary text-secondary' : 'bg-surface dark:bg-zinc-800 text-dim'}`}>
                                            <span className="material-symbols-outlined text-xl font-bold">
                                                {option.icon || 'star'}
                                            </span>
                                        </div>
                                        <span className={`flex-1 text-left font-bold ${isSelected ? 'text-primary' : 'text-content'}`}>
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <span className="material-symbols-outlined text-primary font-bold">check</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BottomSheetSelect;
