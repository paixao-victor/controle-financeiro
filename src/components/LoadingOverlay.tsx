import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
    show: boolean;
    message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, message = 'Sincronizando dados...' }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#121811]/90 backdrop-blur-md"
                >
                    <div className="relative w-48 h-48">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-[#47f425]/10 blur-[60px] rounded-full animate-pulse" />
                        
                        {/* Animated SVG Logo */}
                        <img 
                            src="/logo-animated.svg" 
                            alt="Carregando..." 
                            className="w-full h-full relative z-10"
                        />
                    </div>
                    
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 text-sm font-black text-[#47f425] uppercase tracking-[0.2em] animate-pulse"
                    >
                        {message}
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingOverlay;
