import { Component, type ErrorInfo, type ReactNode } from "react";
import Lottie from "lottie-react";
import errorAnimation from "../../public/Man and robot with computers sitting together in workplace.json";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center select-none overflow-hidden text-content transition-colors duration-500">
                    <div className="relative mb-8 w-80 h-80 md:w-[450px] md:h-[450px]">
                        <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
                        <Lottie 
                            animationData={errorAnimation} 
                            loop={true}
                            className="w-full h-full relative z-10 scale-110"
                        />
                    </div>

                    <h1 className="mb-3 text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                        Ops! O dinheiro sumiu...(?)
                    </h1>
                    <p className="mb-6 text-base text-zinc-600 dark:text-white/60 max-w-sm">
                        Ocorreu um erro inesperado. Mas não se preocupe, estamos trabalhando para resolver isto.
                    </p>
                    <p className="mb-6 text-base text-zinc-600 dark:text-white/60 max-w-sm">
                        Seus dados estão seguros!
                    </p>

                    <div className="w-full max-w-md mb-8">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-expense opacity-80">
                            <span className="material-symbols-outlined text-sm">bug_report</span>
                            Detalhes Técnicos
                        </div>
                        <div className="max-h-32 overflow-y-auto rounded-2xl bg-black/20 backdrop-blur-md p-4 font-mono text-xs text-expense border border-white/5 text-left custom-scrollbar">
                            {this.state.error && this.state.error.toString()}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
                        <button
                            className="flex-1 rounded-2xl bg-primary px-6 py-4 text-sm font-black text-secondary hover:brightness-110 transition-all active:scale-95 shadow-[0_8px_20px_rgba(71,244,37,0.3)] flex items-center justify-center gap-2"
                            onClick={() => window.location.reload()}
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            RECARREGAR
                        </button>
                    </div>

                    <p className="mt-8 text-[10px] text-zinc-800 dark:text-white/50 font-bold uppercase tracking-widest">
                        Dica: Tente recarregar a página para resolver.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
