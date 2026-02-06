import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    icon?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    icon = 'logout'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: 'text-red-500 bg-red-500/10 border-red-500/20',
        warning: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        info: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    };

    const confirmColors = {
        danger: 'bg-red-500 text-white hover:bg-red-600',
        warning: 'bg-orange-500 text-white hover:bg-orange-600',
        info: 'bg-blue-500 text-white hover:bg-blue-600'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
                    {/* Backdrop Blur Dark */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                    >
                        {/* Icon Circle */}
                        <div className={`size-24 rounded-full flex items-center justify-center mb-6 ${colors[type]} border`}>
                            <span className="material-symbols-outlined text-5xl">{icon}</span>
                        </div>

                        {/* Title & Message */}
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                            {title}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed px-4">
                            {message}
                        </p>

                        {/* Buttons Stack */}
                        <div className="w-full flex flex-col gap-3">
                            <button
                                onClick={onConfirm}
                                className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-transform active:scale-95 ${confirmColors[type]}`}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
