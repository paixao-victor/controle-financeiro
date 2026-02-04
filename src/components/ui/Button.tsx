import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-secondary hover:bg-primary-dark shadow-[0_0_15px_rgba(71,244,37,0.3)] hover:shadow-[0_0_20px_rgba(71,244,37,0.5)]",
                destructive: "bg-expense text-white hover:bg-red-600 shadow-[0_0_15px_rgba(255,82,82,0.3)]",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground border-white/10 text-primary hover:bg-white/5",
                secondary: "bg-secondary text-white hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground hover:bg-white/5",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-lg px-3",
                lg: "h-11 rounded-xl px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

interface ButtonProps extends HTMLMotionProps<"button">, VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <motion.button
                className={cn(buttonVariants({ variant, size, className }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
