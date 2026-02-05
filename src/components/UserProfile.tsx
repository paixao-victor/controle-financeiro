import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import LiquidGauge from './LiquidGauge';
import { useTransactions } from '../contexts/TransactionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { checkConsistency } from '@/utils/consistencyChecker';
import CategoriesManagement from './CategoriesManagement';
import TransactionsManagement from './TransactionsManagement';
import AccountsManagement from './AccountsManagement';
import PredictedExpensesManagement from './PredictedExpensesManagement';
import PredictedIncomesManagement from './PredictedIncomesManagement';
import CardsManagement from './CardsManagement';
import Modal from './Modal';

interface UserProfileProps {
    onNavigate: (tab: any) => void;
    onPhotoClick: () => void;
    profileAction?: any;
    setProfileAction?: any;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
    onNavigate, 
    onPhotoClick,
    profileAction,
    setProfileAction
}) => {
    const { addTransaction, calculateCurrentBalance, transactions, cards, accounts, updateAccount } = useTransactions() as any;
    const { logout, user, updateUser } = useAuth();
    
    // Values from auth
    const userName = user?.name || 'Usuário';
    const userEmail = user?.email || (user?.username ? `${user.username}@finance.com` : '');
    const userPhoto = user?.photo || '';
    const { addSystemNotification } = useNotifications();
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [targetBalance, setTargetBalance] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const cropContainerRef = React.useRef<HTMLDivElement>(null);

    // Temp States for Preview (ONLY Persist on Save)
    const [tempPhoto, setTempPhoto] = useState(userPhoto);
    const [tempName, setTempName] = useState(userName);
    const [tempEmail, setTempEmail] = useState(userEmail);

    // UI States
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // States for Photo Editor
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [backgroundMode, setBackgroundMode] = useState<'color' | 'blur'>('blur');
    const [backgroundColor, setBackgroundColor] = useState('#000000');
    const [showDirectConfirm, setShowDirectConfirm] = useState(false);
    const [pendingDirectPhoto, setPendingDirectPhoto] = useState<string | null>(null);
    const [showMainPhotoOptions, setShowMainPhotoOptions] = useState(false);
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // Parallax Motion Values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 150 };
    const mouseXSpring = useSpring(mouseX, springConfig);
    const mouseYSpring = useSpring(mouseY, springConfig);

    const rotateX = useTransform(mouseYSpring, [-100, 100], [15, -15]);
    const rotateY = useTransform(mouseXSpring, [-100, 100], [-15, 15]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const currentBalance = calculateCurrentBalance();

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
                setCropZoom(1);
                setCropPosition({ x: 0, y: 0 });
                setBackgroundMode('blur'); // Reset to default
                setIsCropModalOpen(true);
                setShowPhotoOptions(false);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; 
    };

    // Handle external actions (e.g. from Large Photo View)
    React.useEffect(() => {
        if (profileAction === 'crop_current' && userPhoto) {
            setImageToCrop(userPhoto);
            setCropZoom(1);
            setCropPosition({ x: 0, y: 0 });
            setBackgroundMode('blur');
            setIsCropModalOpen(true);
            if (setProfileAction) setProfileAction(null);
        }
    }, [profileAction, userPhoto, setProfileAction]);

    const handleEditCurrentPhoto = () => {
        if (tempPhoto) {
            setImageToCrop(tempPhoto);
            setCropZoom(1);
            setCropPosition({ x: 0, y: 0 });
            setBackgroundMode('blur');
            setIsCropModalOpen(true);
            setShowPhotoOptions(false);
        }
    };

    const handleApplyCrop = () => {
        if (!imageToCrop || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.src = imageToCrop;
        
        img.onload = () => {
            const size = 300; // Final size reduced for performance
            canvas.width = size;
            canvas.height = size;
            
            ctx?.clearRect(0, 0, size, size);
            
            // Draw Background
            if (backgroundMode === 'color') {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, size, size);
            } else if (backgroundMode === 'blur') {
                ctx.save();
                ctx.filter = 'blur(15px) brightness(0.6)';
                const scale = Math.max(size / img.width, size / img.height);
                const bgWidth = img.width * scale;
                const bgHeight = img.height * scale;
                ctx.drawImage(img, (size - bgWidth) / 2, (size - bgHeight) / 2, bgWidth, bgHeight);
                ctx.restore();
            }

            const aspect = img.width / img.height;
            let drawWidth, drawHeight;
            
            if (aspect > 1) {
                drawHeight = size * cropZoom;
                drawWidth = drawHeight * aspect;
            } else {
                drawWidth = size * cropZoom;
                drawHeight = drawWidth / aspect;
            }
            
            let uiSize = 300;
            if (cropContainerRef.current) {
                uiSize = cropContainerRef.current.clientWidth;
            }
            const scaleFactor = size / uiSize;

            const dx = (size - drawWidth) / 2 + (cropPosition.x * scaleFactor);
            const dy = (size - drawHeight) / 2 + (cropPosition.y * scaleFactor);
            
            ctx?.drawImage(img, dx, dy, drawWidth, drawHeight);
            
            // Reduced quality for faster cloud sync
            const croppedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            if (isEditingProfile) {
                setTempPhoto(croppedBase64);
                // In profile edit mode, we are done with the crop modal
                setIsCropModalOpen(false);
                setImageToCrop(null); 
            } else {
                setPendingDirectPhoto(croppedBase64);
                setShowDirectConfirm(true);
                // DO NOT clear imageToCrop here, to allow "Back to Edit"
                setIsCropModalOpen(false);
            }
        };
    };

    const handleConfirmDirectPhoto = () => {
        if (pendingDirectPhoto) {
            updateUser({ photo: pendingDirectPhoto });
            setPendingDirectPhoto(null);
            setShowDirectConfirm(false);
            setImageToCrop(null); // Clean up here
        }
    };

    const handleCancelDirectPhoto = () => {
        setPendingDirectPhoto(null);
        setShowDirectConfirm(false);
        setImageToCrop(null); // Clean up here
    };

    const handleBackToEdit = () => {
        // Close confirm, reopen crop with current settings
        setShowDirectConfirm(false);
        setIsCropModalOpen(true);
        // Note: imageToCrop, zoom, position are already preserved in state
    };

    const handleConfirmDelete = () => {
        setTempPhoto('');
        setShowDeleteConfirm(false);
    };

    const handleSaveProfile = () => {
        updateUser({ 
            name: tempName, 
            email: tempEmail, 
            photo: tempPhoto 
        });
        setIsEditingProfile(false);
    };

    const handleCancelProfile = () => {
        setTempName(userName);
        setTempEmail(userEmail);
        setTempPhoto(userPhoto);
        setIsEditingProfile(false);
    };

    const handleSaveBalance = () => {
        const target = parseFloat(targetBalance.replace(',', '.'));
        if (isNaN(target)) return;

        const current = calculateCurrentBalance();
        const diff = target - current;

        // Create Adjustment Transaction
        if (diff !== 0) {
            const adjustmentTx: any = {
                id: crypto.randomUUID(),
                description: 'Ajuste Manual de Saldo',
                amount: Math.abs(diff),
                date: new Date().toISOString().split('T')[0],
                category: '📈 Ajuste',
                type: diff > 0 ? 'income' : 'expense',
                paymentMethod: 'Outros',
                recurring: false,
                installments: 1,
                isPaid: true,
                createdAt: new Date().toISOString()
            };
            addTransaction(adjustmentTx);

            // Also update the main account balance if accounts system is active
            if (accounts && accounts.length > 0) {
                // Find main account (highest balance or first) or just first
                const mainAccount = accounts[0];
                if (mainAccount) {
                    updateAccount(mainAccount.id, { 
                        balance: (mainAccount.balance || 0) + diff 
                    });
                }
            }
        }

        setIsEditingBalance(false);
        setTargetBalance('');
    };

    // Renderização condicional movida para dentro do return principal como Modais


    return (
        <div className="flex flex-col gap-8 animate-fade-up max-w-5xl mx-auto w-full pb-20 px-4 lg:px-0">
            {/* 1. Header do Perfil */}
            <section className="nm-card p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                
                <motion.div 
                    className="relative group perspective-1000"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d"
                    }}
                >
                    <motion.div 
                        className="absolute -inset-2 rounded-full border-2 border-dashed border-primary/40 pointer-events-none"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        style={{ transformStyle: "preserve-3d" }}
                    />
                    
                    <motion.button 
                        onClick={onPhotoClick}
                        className="size-32 md:size-40 rounded-full p-1 bg-linear-to-tr from-primary to-transparent shadow-2xl relative"
                        style={{ translateZ: 50 }}
                    >
                        <div className="size-full rounded-full overflow-hidden border-4 border-background bg-surface flex items-center justify-center">
                            {userPhoto ? (
                                <img alt="Perfil" className="w-full h-full object-cover" src={userPhoto} />
                            ) : (
                                <span className="text-primary font-black text-5xl uppercase tracking-tighter">{getInitials(userName)}</span>
                            )}
                        </div>
                    </motion.button>
                    
                    <button 
                        onClick={(e) => {
                            setShowMainPhotoOptions(!showMainPhotoOptions);
                        }}
                        className="absolute bottom-1 right-1 size-10 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary border border-white/10 hover:scale-110 transition-transform z-[100]"
                        style={{ transform: 'translateZ(150px)', transformStyle: 'preserve-3d' }}
                    >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                </motion.div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h2 className="text-3xl font-black text-content uppercase tracking-tight">{userName}</h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Premium
                        </span>
                    </div>
                    <p className="text-dim font-bold">{userEmail}</p>
                    <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                        <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="px-6 py-2.5 bg-primary text-secondary rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-glow"
                        >
                            Editar Perfil
                        </button>
                        <button 
                            onClick={() => onNavigate('Configurações')}
                            className="px-6 py-2.5 bg-surface border border-white/5 rounded-xl font-black text-xs text-dim uppercase tracking-widest hover:text-content transition-all"
                        >
                            Preferências
                        </button>
                    </div>
                </div>
            </section>

            {/* 2. Resumo Financeiro */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                    onClick={() => {
                        setTargetBalance(currentBalance.toFixed(2).replace('.', ','));
                        setIsEditingBalance(true);
                    }}
                    className="nm-card p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/30 transition-all group"
                >
                    <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60">Saldo Consolidado</span>
                    <div className="text-center group-hover:scale-105 transition-transform">
                        <p className="text-3xl font-black text-content">
                            <span className="text-primary text-lg mr-1">R$</span>
                            {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <span className="text-[9px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-xs">edit</span> Ajustar Saldo
                    </span>
                </div>

                <div className="flex grid grid-cols-2 lg:grid-cols-1 md:grid-cols-2 gap-6 md:contents">
                    <div className="nm-card p-6 flex flex-col items-center justify-center gap-4">
                        <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60 text-center">Uso da Renda</span>
                        <LiquidGauge 
                            value={(() => {
                                const income = (transactions || []).filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
                                if (income <= 0) return 0;
                                return Math.min(100, Math.max(0, (currentBalance / income) * 100));
                            })()} 
                            size={70} 
                        />
                    </div>

                    <div className="nm-card p-6 flex flex-col items-center justify-center gap-4">
                        <span className="text-[10px] font-black text-dim uppercase tracking-widest opacity-60 text-center">Taxa Economia</span>
                        <div className="text-center">
                            <p className="text-2xl md:text-3xl font-black text-green-500">24%</p>
                            <p className="text-[10px] font-bold text-dim mt-1">Este mês</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 3. Meus Dados (Gestão Principal) */}
                <div className="lg:col-span-8 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Meus Dados</h3>
                        </div>
                        <div className="nm-card p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                            <DataNavItem 
                                icon="category" 
                                label="Categorias" 
                                sub="Personalize seus gastos" 
                                onClick={() => setProfileAction?.('categories')} 
                            />
                            <DataNavItem 
                                icon="payments" 
                                label="Transações" 
                                sub="Histórico e edições" 
                                onClick={() => setProfileAction?.('transactions')} 
                            />
                            <DataNavItem 
                                icon="account_balance" 
                                label="Contas Bancárias" 
                                sub="Gerencie seus bancos" 
                                onClick={() => setProfileAction?.('accounts')} 
                            />
                            <DataNavItem 
                                icon="credit_card" 
                                label="Cartões" 
                                sub="Limites e bandeiras" 
                                onClick={() => setProfileAction?.('cards')} 
                            />
                            <DataNavItem 
                                icon="calendar_clock" 
                                label="Despesas Previstas" 
                                sub="Gastos recorrentes" 
                                onClick={() => setProfileAction?.('recurring')} 
                            />
                            <DataNavItem 
                                icon="trending_up" 
                                label="Receitas Previstas" 
                                sub="Entradas mensais" 
                                onClick={() => setProfileAction?.('recurring_incomes')} 
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">settings</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Preferências Rápidas</h3>
                        </div>
                        <div className="nm-card p-4 space-y-4">
                            <button 
                                onClick={() => onNavigate('Configurações')}
                                className="w-full flex items-center justify-between p-4 bg-content/5 rounded-2xl hover:bg-content/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary">settings</span>
                                    <span className="font-bold text-content">Configurações do Aplicativo</span>
                                </div>
                                <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                            <button 
                                onClick={() => {
                                    const count = checkConsistency(cards, accounts, addSystemNotification);
                                    if (count > 0) alert(`Foram encontradas ${count} inconsistências.`);
                                    else alert('Tudo parece certo!');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-content/5 rounded-2xl hover:bg-content/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary">fact_check</span>
                                    <span className="font-bold text-content">Verificar Consistência</span>
                                </div>
                                <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        </div>
                    </section>
                </div>

                {/* 4. Segurança e Conta (Sidebar) */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-primary">security</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Segurança</h3>
                        </div>
                        <div className="nm-card p-4 space-y-1">
                            <button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center justify-between p-3 hover:bg-content/5 rounded-xl transition-colors group"
                            >
                                <span className="text-content font-bold text-sm">Alterar Senha</span>
                                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-3 hover:bg-content/5 rounded-xl transition-colors group">
                                <span className="text-content font-bold text-sm">Biometria / PIN</span>
                                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-red-500">account_circle</span>
                            <h3 className="text-sm font-black uppercase tracking-widest text-red-500/60">Minha Conta</h3>
                        </div>
                        <div className="nm-card p-4 space-y-4">
                            <button 
                                onClick={() => setShowSwitchConfirm(true)}
                                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all text-red-500 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/10 group"
                            >
                                <span className="material-symbols-outlined text-lg">sync_alt</span>
                                Trocar de Conta
                            </button>
                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all text-red-500 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/10"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Sair do App
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal de Edição de Perfil */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="nm-card w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Editar Perfil</h3>
                        </div>
                        
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group/edit">
                                <div className="size-32 rounded-full p-1 bg-primary/20">
                                    <div className="size-full rounded-full overflow-hidden border-4 border-background bg-surface shadow-inner flex items-center justify-center">
                                        {tempPhoto ? (
                                            <img 
                                                alt="Foto Preview" 
                                                className="w-full h-full object-cover" 
                                                src={tempPhoto} 
                                            />
                                        ) : (
                                            <span className="text-primary font-black text-4xl uppercase">
                                                {getInitials(tempName)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 flex gap-2">
                                    {tempPhoto && (
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="size-9 bg-expense text-white rounded-full shadow-lg flex items-center justify-center hover:brightness-110 active:scale-90 transition-all"
                                            title="Remover Foto"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    )}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                            className="size-9 bg-primary text-secondary rounded-full shadow-lg flex items-center justify-center hover:brightness-110 active:scale-90 transition-all"
                                            title="Opções de Foto"
                                        >
                                            <span className="material-symbols-outlined text-base">photo_camera</span>
                                        </button>

                                        {/* Menu de Opções de Foto */}
                                        {showPhotoOptions && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowPhotoOptions(false)} />
                                                <div className="absolute bottom-full right-0 mb-2 w-40 bg-surface border border-white/10 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in slide-in-from-bottom-2">
                                                    {tempPhoto && (
                                                        <button 
                                                            onClick={handleEditCurrentPhoto}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-content font-bold text-xs"
                                                        >
                                                            <span className="material-symbols-outlined text-lg opacity-60">crop_rotate</span>
                                                            Editar
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-content font-bold text-xs"
                                                    >
                                                        <span className="material-symbols-outlined text-lg opacity-60">upload</span>
                                                        Trocar
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Confirmação de Exclusão */}
                                {showDeleteConfirm && (
                                    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in">
                                        <p className="text-white text-[10px] font-black uppercase mb-3">Excluir foto?</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                                            >
                                                <span className="material-symbols-outlined text-xl">close</span>
                                            </button>
                                            <button 
                                                onClick={handleConfirmDelete}
                                                className="size-10 rounded-full bg-expense flex items-center justify-center text-white"
                                            >
                                                <span className="material-symbols-outlined text-xl">check</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input 
                                        autoFocus
                                        type="text"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-14 rounded-2xl px-6 text-lg font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                        placeholder="Seu Nome"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Endereço de E-mail</label>
                                    <input 
                                        type="email"
                                        value={tempEmail}
                                        onChange={(e) => setTempEmail(e.target.value)}
                                        className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-14 rounded-2xl px-6 text-lg font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                        placeholder="seu.email@exemplo.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleSaveProfile}
                                className="w-full bg-primary text-secondary h-14 rounded-full font-black text-lg shadow-glow hover:brightness-105 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                Salvar Alterações
                            </button>
                            <button 
                                onClick={handleCancelProfile}
                                className="w-full text-dim font-black py-4 hover:text-content transition-colors uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Saldo */}
            {isEditingBalance && (
                 <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsEditingBalance(false)}
                >
                    <div 
                        className="bg-surface dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Editar Saldo</h3>
                            <button 
                                onClick={() => setIsEditingBalance(false)}
                                className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-dim">close</span>
                            </button>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-dim uppercase">Novo Saldo</label>
                            <input
                                autoFocus
                                value={targetBalance}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    value = (parseInt(value) / 100).toFixed(2).replace('.', ',');
                                    if (value === 'NaN') value = '0,00';
                                    setTargetBalance(value);
                                }}
                                className="w-full bg-transparent border-b-2 border-primary py-2 text-3xl font-black text-content outline-none text-center"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditingBalance(false)}
                                className="flex-1 py-3 text-dim font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveBalance}
                                className="flex-1 py-3 bg-primary text-secondary font-bold rounded-xl shadow-glow hover:brightness-110 transition-all"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Mini Editor de Foto (Crop) */}
            {isCropModalOpen && imageToCrop && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex flex-col items-center w-full max-w-xl gap-8">
                        <div className="text-center group">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ajustar Foto</h3>
                            <p className="text-white/40 text-sm font-bold mt-1">Arraste e redimensione para o centro</p>
                        </div>

                        {/* Área do Cropper */}
                        <div 
                            ref={cropContainerRef}
                            className="relative size-[450px] md:size-[450px] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl border-4 border-white/5 cursor-move touch-none"
                            style={{ touchAction: 'none' }}
                            onMouseDown={(e) => {
                                const startX = e.clientX - cropPosition.x;
                                const startY = e.clientY - cropPosition.y;
                                
                                const handleMouseMove = (mmE: MouseEvent) => {
                                    setCropPosition({
                                        x: mmE.clientX - startX,
                                        y: mmE.clientY - startY
                                    });
                                };
                                
                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                            onTouchStart={(e) => {
                                e.stopPropagation();
                                const touch = e.touches[0];
                                const startX = touch.clientX - cropPosition.x;
                                const startY = touch.clientY - cropPosition.y;
                                
                                const handleTouchMove = (tmE: TouchEvent) => {
                                    tmE.stopPropagation();
                                    tmE.preventDefault(); // Prevent scrolling
                                    const touchMove = tmE.touches[0];
                                    setCropPosition({
                                        x: touchMove.clientX - startX,
                                        y: touchMove.clientY - startY
                                    });
                                };
                                
                                const handleTouchEnd = () => {
                                    document.removeEventListener('touchmove', handleTouchMove);
                                    document.removeEventListener('touchend', handleTouchEnd);
                                };
                                
                                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                document.addEventListener('touchend', handleTouchEnd);
                            }}
                        >
                            {/* Background Preview Layer */}
                            <div className="absolute inset-0 z-0">
                                {backgroundMode === 'color' ? (
                                    <div 
                                        className="w-full h-full"
                                        style={{ backgroundColor }}
                                    ></div>
                                ) : (
                                    <div className="w-full h-full relative overflow-hidden">
                                        <img 
                                            src={imageToCrop}
                                            className="w-full h-full object-cover blur-xl opacity-60 scale-110" 
                                            alt="bg"
                                        />
                                        <div className="absolute inset-0 bg-black/20"></div>
                                    </div>
                                )}
                            </div>

                            {/* Imagem a ser recortada */}
                            <div 
                                className="absolute inset-0 flex items-center justify-center z-10" 
                            >
                                <img 
                                    src={imageToCrop} 
                                    alt="Para recortar" 
                                    className="max-w-none transition-transform pointer-events-none"
                                    style={{
                                        transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                                    }}
                                />
                            </div>

                            {/* Overlay Circular de Recorte (Hole) */}
                            <div className="absolute inset-0 pointer-events-none z-20">
                                {/* Darken area outside circle */}
                                <div className="absolute inset-0 bg-black/50 mask-[radial-gradient(circle,transparent_150px,black_180px)] md:mask-[radial-gradient(circle,transparent_100px,black_180px)]"></div>
                                
                                {/* Circle Border */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-[400px] md:size-[400px] border-2 border-white/80 rounded-full shadow-[0_0_0_200px_rgba(0,0,0,0.5)]"></div>
                                </div>

                                {/* 3x3 Grid (Google Photos Style) */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-50">
                                    <div className="size-[400px] md:size-[400px] grid grid-cols-3 grid-rows-3">
                                        <div className="border-r border-b border-white"></div>
                                        <div className="border-r border-b border-white"></div>
                                        <div className="border-b border-white"></div>
                                        <div className="border-r border-b border-white"></div>
                                        <div className="border-r border-b border-white"></div>
                                        <div className="border-b border-white"></div>
                                        <div className="border-r border-white"></div>
                                        <div className="border-r border-white"></div>
                                        <div></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controles de Fundo */}
                        <div className="flex gap-4 p-2 bg-white/5 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => setBackgroundMode('blur')}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                                    ${backgroundMode === 'blur' ? 'bg-primary text-secondary' : 'text-dim hover:bg-white/5'}
                                `}
                            >
                                <span className="material-symbols-outlined text-lg">blur_on</span>
                                Blur
                            </button>
                            <div className="flex items-center gap-2 px-2">
                                <button
                                    onClick={() => {
                                        setBackgroundMode('color');
                                        setBackgroundColor('#000000');
                                    }}
                                    className={`size-6 rounded-full bg-black border border-white/20 transition-transform hover:scale-110 ${backgroundMode === 'color' && backgroundColor === '#000000' ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-900' : ''}`}
                                />
                                <button
                                    onClick={() => {
                                        setBackgroundMode('color');
                                        setBackgroundColor('#ffffff');
                                    }}
                                    className={`size-6 rounded-full bg-white border border-white/20 transition-transform hover:scale-110 ${backgroundMode === 'color' && backgroundColor === '#ffffff' ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-900' : ''}`}
                                />
                                 {/* Custom Color Input Wrapper */}
                                 <div className={`relative size-6 rounded-full overflow-hidden transition-transform hover:scale-110 border border-white/20 ${backgroundMode === 'color' && backgroundColor !== '#000000' && backgroundColor !== '#ffffff' ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-900' : ''}`}>
                                     <input 
                                        type="color" 
                                        value={backgroundColor}
                                        onChange={(e) => {
                                            setBackgroundMode('color');
                                            setBackgroundColor(e.target.value);
                                        }}
                                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 cursor-pointer border-0"
                                     />
                                 </div>
                            </div>
                        </div>

                        {/* Controles de Zoom */}
                        <div className="w-full max-w-xs flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <span className="material-symbols-outlined text-white/50">zoom_out</span>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="3" 
                                step="0.05" 
                                value={cropZoom}
                                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="material-symbols-outlined text-white/50">zoom_in</span>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-4 w-full px-8">
                            <button 
                                onClick={() => {
                                    setIsCropModalOpen(false);
                                    setImageToCrop(null);
                                }}
                                className="flex-1 py-4 bg-white/5 text-white/60 font-black text-sm uppercase rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleApplyCrop}
                                className="flex-1 py-4 bg-primary text-secondary font-black text-sm uppercase rounded-2xl shadow-glow hover:brightness-110 transition-all active:scale-95"
                            >
                                Escolher Foto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Alteração Direta */}
            {showDirectConfirm && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="nm-card w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Confirmar Foto</h3>
                            <p className="text-dim text-sm mt-2 font-medium">Deseja aplicar esta nova foto ao seu perfil agora?</p>
                        </div>
                        
                        <div className="flex justify-center">
                            <div className="size-32 rounded-full p-1 bg-primary/20">
                                <div className="size-full rounded-full overflow-hidden border-4 border-background bg-surface shadow-lg">
                                    {pendingDirectPhoto && (
                                        <img 
                                            alt="Nova Foto" 
                                            className="w-full h-full object-cover" 
                                            src={pendingDirectPhoto} 
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleConfirmDirectPhoto}
                                className="w-full bg-primary text-secondary h-14 rounded-full font-black text-lg shadow-glow hover:brightness-105 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                Confirmar e Salvar
                            </button>
                            <button 
                                onClick={handleCancelDirectPhoto}
                                className="w-full text-dim font-black py-4 hover:text-content transition-colors uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleBackToEdit}
                                className="w-full text-primary font-black py-2 hover:brightness-110 transition-colors uppercase text-xs tracking-widest"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-base">arrow_back</span>
                                    Voltar para Edição
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Alteração de Senha */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="nm-card w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Alterar Senha</h3>
                            <p className="text-dim text-xs mt-2 font-bold uppercase tracking-widest">Segurança da Conta</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Senha Atual</label>
                                <input 
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Nova Senha</label>
                                <input 
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                                <input 
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                    className="w-full bg-surface-dark/5 dark:bg-white/5 border border-content/10 h-12 rounded-xl px-4 text-sm font-bold text-content focus:outline-none focus:ring-2 ring-primary/50 transition-all shadow-inner"
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={async () => {
                                    if (!passwords.current || !passwords.new || !passwords.confirm) {
                                        alert('Preencha todos os campos!');
                                        return;
                                    }
                                    if (passwords.new.length < 8) {
                                        alert('A nova senha deve ter pelo menos 8 caracteres!');
                                        return;
                                    }
                                    if (passwords.new !== passwords.confirm) {
                                        alert('As senhas novas não coincidem!');
                                        return;
                                    }
                                    
                                    try {
                                        // Validar senha atual
                                        if (user?.password && passwords.current !== user.password) {
                                            alert('A senha atual está incorreta!');
                                            return;
                                        }

                                        // A função updateUser já envia para o cloud em AuthContext
                                        await updateUser({ 
                                            password: passwords.new
                                        });

                                        alert('Senha alterada com sucesso!');
                                        setIsPasswordModalOpen(false);
                                        setPasswords({ current: '', new: '', confirm: '' });
                                    } catch (err: any) {
                                        alert(`Erro ao alterar senha: ${err.message}`);
                                    }
                                }}
                                className="w-full bg-primary text-secondary h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-glow hover:brightness-105 active:scale-95 transition-all"
                            >
                                Confirmar Alteração
                            </button>
                            <button 
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="w-full text-dim font-black py-2 hover:text-content transition-colors uppercase text-[10px] tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Troca de Conta */}
            {showSwitchConfirm && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSwitchConfirm(false)}>
                    <div className="nm-card w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
                        <div className="size-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="material-symbols-outlined text-4xl">sync_alt</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-content uppercase tracking-widest">Trocar de Conta?</h3>
                            <p className="text-dim text-sm mt-3 font-bold">Você vai sair da conta atual para entrar em outra.</p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    setShowSwitchConfirm(false);
                                    logout();
                                }}
                                className="w-full bg-red-500 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg"
                            >
                                Sim, Desejo Sair
                            </button>
                            <button 
                                onClick={() => setShowSwitchConfirm(false)}
                                className="w-full text-dim font-black py-2 hover:text-content transition-colors uppercase text-[10px] tracking-widest"
                            >
                                Manter Logado
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais de Gerenciamento */}
            <Modal isOpen={profileAction === 'categories'} onClose={() => setProfileAction?.(null)}>
                <CategoriesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'transactions'} onClose={() => setProfileAction?.(null)}>
                <TransactionsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'accounts'} onClose={() => setProfileAction?.(null)}>
                <AccountsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
            
            <Modal isOpen={profileAction === 'recurring'} onClose={() => setProfileAction?.(null)}>
                <PredictedExpensesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>

            <Modal isOpen={profileAction === 'recurring_incomes'} onClose={() => setProfileAction?.(null)}>
                <PredictedIncomesManagement onBack={() => setProfileAction?.(null)} />
            </Modal>

            <Modal isOpen={profileAction === 'cards'} onClose={() => setProfileAction?.(null)}>
                <CardsManagement onBack={() => setProfileAction?.(null)} />
            </Modal>
        </div>
    );
};

const DataNavItem: React.FC<{ icon: string, label: string, sub: string, onClick: () => void }> = ({ icon, label, sub, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center justify-between p-4 hover:bg-content/5 rounded-2xl transition-all group text-left"
    >
        <div className="flex items-center gap-4">
            <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
                <p className="font-black text-content text-sm leading-tight">{label}</p>
                <p className="text-[10px] font-bold text-dim uppercase tracking-widest mt-0.5">{sub}</p>
            </div>
        </div>
        <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
    </button>
);

export default UserProfile;
