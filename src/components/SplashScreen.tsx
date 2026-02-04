import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-9999 bg-secondary flex items-center justify-center overflow-hidden">
            <div className="relative flex flex-col items-center">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
                
                {/* Logo Container */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-10"
                >
                    <img 
                        src="/logo-animated.svg" 
                        alt="Logo" 
                        className="w-48 h-48 md:w-64 md:h-64"
                    />
                </motion.div>
            </div>
        </div>
    );
};

export default SplashScreen;
