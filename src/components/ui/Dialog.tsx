import * as React from "react"
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion"


import { cn } from "@/lib/utils"

const Dialog = ({
    children,
    open,
    onOpenChange,
}: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}) => {
    const [isOpen, setIsOpen] = React.useState(open || false)

    React.useEffect(() => {
        setIsOpen(open || false)
    }, [open])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-5000 bg-black/80 backdrop-blur-sm"
                        onClick={() => onOpenChange?.(false)}
                    />
                    <div 
                        className="fixed inset-0 z-5000 flex items-center justify-center p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onOpenChange?.(false);
                        }}
                    >
                        {children}
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

const DialogContent = React.forwardRef<
    HTMLDivElement,
    HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
    <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
            "relative w-full max-w-lg gap-4 rounded-xl border bg-background p-6 shadow-lg duration-200 sm:rounded-2xl",
            className
        )}
        {...props}
    >
        {children}
    </motion.div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
