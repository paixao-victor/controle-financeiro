import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetIconSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    selectedIcon?: string;
    onSelect: (icon: string) => void;
}

const ICONS = [
    'attach_money', 'home', 'payments', 'shopping_cart', 'receipt', 'credit_card', 
    'account_balance', 'savings', 'trending_up', 'trending_down',
    'medical_services', 'school', 'directions_car', 'flight', 
    'restaurant', 'fitness_center', 'pets', 'work', 'build',
    'wifi', 'phone', 'lightbulb', 'water_drop', 'propane_tank', 'local_gas_station',
    'checkroom', 'movie', 'sports_esports', 'music_note', 'local_bar',
    'child_friendly', 'family_restroom', 'celebration', 'card_giftcard',
    'star', 'favorite', 'verified', 'lock', 'schedule', 'warning',
    'print', 'computer', 'smartphone'
];

const BottomSheetIconSelector: React.FC<BottomSheetIconSelectorProps> = ({
    isOpen,
    onClose,
    title,
    selectedIcon,
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

                        {/* Options List - Grid 4 Columns */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar overscroll-contain pb-12">
                            <div className="grid grid-cols-4 gap-4">
                                {ICONS.map((icon) => {
                                    const isSelected = selectedIcon === icon;
                                    return (
                                        <button
                                            key={icon}
                                            onClick={() => {
                                                onSelect(icon);
                                                onClose();
                                            }}
                                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-90 ${
                                                isSelected 
                                                ? 'bg-primary text-secondary shadow-lg shadow-primary/30 scale-105' 
                                                : 'bg-content/5 text-dim hover:bg-content/10 hover:text-content'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-3xl">
                                                {icon}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BottomSheetIconSelector;
