import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

interface CircularNumberSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    title?: string;
    theme?: 'light' | 'dark';
}

const CircularNumberSelector: React.FC<CircularNumberSelectorProps> = ({
    isOpen,
    onClose,
    value,
    onChange,
    min = 1,
    max = 80,
    title = "Quantidade de Meses",
    theme = 'dark'
}) => {
    const [localValue, setLocalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const dialRef = useRef<HTMLDivElement>(null);
    
    // Animação suave com spring physics
    const springValue = useSpring(localValue, {
        stiffness: 300,
        damping: 30,
        mass: 0.5
    });
    
    const rotation = useTransform(springValue, [0, max], [0, 360]);
    const progress = useTransform(springValue, [0, max], [0, 1]);
    const circumference = 2 * Math.PI * 122;
    const strokeDashoffset = useTransform(
        progress,
        [0, 1],
        [circumference, 0]
    );
    
    // Cores do tema
    const colors = theme === 'dark' ? {
        bg: '#1a1a1a',
        backdrop: 'bg-black/80',
        text: 'text-white',
        textDim: 'text-gray-500',
        border: 'border-white/10',
        ringBg: 'border-white/5',
        centerBg: 'linear-gradient(145deg, #1f1f1f, #151515)',
        centerShadow: '8px 8px 16px #0d0d0d, -8px -8px 16px #272727',
        buttonHover: 'hover:bg-white/5',
        buttonText: 'text-gray-400'
    } : {
        bg: '#ffffff',
        backdrop: 'bg-black/40',
        text: 'text-gray-900',
        textDim: 'text-gray-600',
        border: 'border-gray-200',
        ringBg: 'border-gray-200',
        centerBg: 'linear-gradient(145deg, #f5f5f5, #e8e8e8)',
        centerShadow: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff',
        buttonHover: 'hover:bg-gray-100',
        buttonText: 'text-gray-700'
    };
    
    // Sincronizar valor inicial
    useEffect(() => {
        if (isOpen) {
            setLocalValue(value);
            springValue.set(value);
        }
    }, [isOpen, value, springValue]);

    // Atualizar spring quando localValue muda
    useEffect(() => {
        springValue.set(localValue);
    }, [localValue, springValue]);

    // Bloquear scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.touchAction = 'auto';
        }
        return () => { 
            document.body.style.overflow = 'unset';
            document.body.style.touchAction = 'auto';
        };
    }, [isOpen]);

    const handleInteraction = (clientX: number, clientY: number) => {
        if (!dialRef.current) return;
        
        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        angle = (angle + 90 + 360) % 360;
        
        const range = max - min;
        let newValue = Math.round((angle / 360) * range) + min;
        
        newValue = Math.max(min, Math.min(max, newValue));
        
        setLocalValue(newValue);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        handleInteraction(e.clientX, e.clientY);
        
        const onMouseMove = (moveEvent: MouseEvent) => {
            handleInteraction(moveEvent.clientX, moveEvent.clientY);
        };
        
        const onMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = () => {
        setIsDragging(false);
    };

    const handleConfirm = () => {
        onChange(localValue);
        onClose();
    };

    // IMPORTANTE: Early return DEPOIS de todos os Hooks
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-9999 flex items-center justify-center p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    className={`absolute inset-0 ${colors.backdrop} backdrop-blur-xl`}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 25
                    }}
                    style={{ backgroundColor: colors.bg }}
                    className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl ${colors.border} border flex flex-col items-center gap-8`}
                >
                    {/* Header com valor */}
                    <header className="text-center">
                        <h3 className={`text-[10px] font-black ${colors.textDim} uppercase tracking-[0.2em] mb-2`}>
                            {title}
                        </h3>
                        <motion.div 
                            className={`text-6xl font-black ${colors.text} tracking-tighter`}
                            key={localValue}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {localValue}
                            <span className={`text-sm ${colors.textDim} ml-2 uppercase font-bold`}>
                                {localValue === 1 ? 'mês' : 'meses'}
                            </span>
                        </motion.div>
                    </header>

                    {/* Circular Dial */}
                    <div 
                        ref={dialRef}
                        className="relative w-64 h-64 flex items-center justify-center cursor-pointer select-none touch-none"
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        onTouchMove={(e) => {
                            handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchEnd={onTouchEnd}
                        style={{ touchAction: 'none' }}
                    >
                        {/* Outer Ring Background */}
                        <div 
                            className={`absolute inset-0 rounded-full border-4 ${colors.ringBg}`}
                            style={{
                                boxShadow: theme === 'dark' 
                                    ? 'inset 0 2px 8px rgba(0,0,0,0.3)'
                                    : 'inset 0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        />
                        
                        {/* SVG Progress Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <motion.circle
                                cx="50%"
                                cy="50%"
                                r="122"
                                fill="none"
                                stroke="url(#greenGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                style={{
                                    strokeDashoffset: strokeDashoffset
                                }}
                                className="transition-all"
                            />
                            <defs>
                                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#47f425" />
                                    <stop offset="50%" stopColor="#3dd91f" />
                                    <stop offset="100%" stopColor="#32bf19" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Dial Knob */}
                        <motion.div 
                            className="absolute w-12 h-12 rounded-full flex items-center justify-center z-10 top-0 left-1/2 -ml-6"
                            style={{ 
                                rotate: rotation,
                                transformOrigin: "center 128px",
                                backgroundColor: isDragging ? '#32bf19' : '#47f425',
                                boxShadow: isDragging 
                                    ? '0 0 30px rgba(71, 244, 37, 0.7), 0 0 60px rgba(71, 244, 37, 0.4)'
                                    : '0 0 20px rgba(71, 244, 37, 0.6), 0 0 40px rgba(71, 244, 37, 0.3)'
                            }}
                            transition={{ 
                                backgroundColor: { duration: 0.2 },
                                boxShadow: { duration: 0.2 }
                            }}
                        >
                            <motion.div 
                                className={`w-4 h-4 rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-gray-900'}`}
                                animate={{
                                    scale: isDragging ? 1.2 : 1
                                }}
                                transition={{ duration: 0.2 }}
                            />
                        </motion.div>

                        {/* Center Circle */}
                        <div 
                            className="w-40 h-40 rounded-full flex flex-col items-center justify-center relative"
                            style={{
                                background: colors.centerBg,
                                boxShadow: colors.centerShadow
                            }}
                        >
                            <motion.div
                                animate={{
                                    scale: isDragging ? [1, 1.1, 1] : 1,
                                    rotate: isDragging ? [0, 5, -5, 0] : 0
                                }}
                                transition={{
                                    duration: 0.3,
                                    repeat: isDragging ? Infinity : 0,
                                    repeatDelay: 0.1
                                }}
                            >
                                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </motion.div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="w-full grid grid-cols-2 gap-4">
                        <button 
                            onClick={onClose}
                            className={`py-4 rounded-2xl text-xs font-bold ${colors.buttonText} uppercase ${colors.buttonHover} transition-all active:scale-95`}
                        >
                            Cancelar
                        </button>
                        <motion.button 
                            onClick={handleConfirm}
                            className="py-4 rounded-2xl text-xs font-black uppercase relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #47f425, #32bf19)',
                                color: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                boxShadow: '0 0 20px rgba(71, 244, 37, 0.4)'
                            }}
                            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(71, 244, 37, 0.6)' }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Confirmar
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default CircularNumberSelector;