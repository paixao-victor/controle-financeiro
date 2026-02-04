import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <motion.div whileFocus={{ scale: 1.01 }} className="w-full">
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white placeholder:text-white/30 transition-all",
                        error && "border-expense focus-visible:ring-expense",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </motion.div>
        );
    }
);
Input.displayName = "Input";

export { Input };
