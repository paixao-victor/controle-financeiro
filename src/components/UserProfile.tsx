import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { createPortal } from 'react-dom';
import LiquidGauge from './LiquidGauge';
import { useTransactions } from '@/contexts/TransactionsContext';
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
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

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
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* Cabeçalho removido (usando o global do App.tsx) */}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
                <div className="lg:col-span-4 space-y-6">
                    <section className="nm-card p-8 flex flex-col items-center relative group/profile">
                        {/* Botão Editar Perfil (Lápis) */}
                        <button 
                            onClick={() => {
                                setTempName(userName);
                                setTempEmail(userEmail);
                                setTempPhoto(userPhoto);
                                setIsEditingProfile(true);
                            }}
                            className="absolute top-4 right-4 size-10 rounded-2xl bg-surface border border-white/5 flex items-center justify-center text-dim hover:text-primary transition-colors hover:border-primary/20 shadow-lg"
                        >
                            <span className="material-symbols-outlined text-xl">edit</span>
                        </button>

                        <motion.div 
                            className="relative group perspective-1000"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onTouchMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const touch = e.touches[0];
                                const x = touch.clientX - rect.left - rect.width / 2;
                                const y = touch.clientY - rect.top - rect.height / 2;
                                mouseX.set(x * 2.5); // Multiplier for better mobile sensitivity
                                mouseY.set(y * 2.5);
                            }}
                            onTouchEnd={handleMouseLeave}
                            style={{
                                rotateX,
                                rotateY,
                                transformStyle: "preserve-3d"
                            }}
                        >
                            {/* Círculo Verde Giratório */}
                            <motion.div 
                                className="absolute -inset-2 rounded-full border-2 border-dashed border-primary/40 pointer-events-none"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                            
                            <motion.button 
                                onClick={onPhotoClick}
                                whileTap={{ scale: 0.95, translateZ: -20 }}
                                drag
                                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                                dragElastic={0.1}
                                onDragStart={() => {
                                    (window as any).isDraggingPhoto = true;
                                }}
                                onDragEnd={() => {
                                    setTimeout(() => (window as any).isDraggingPhoto = false, 100);
                                }}
                                onClickCapture={(e) => {
                                    if ((window as any).isDraggingPhoto) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                                className="size-40 rounded-full p-1 bg-linear-to-tr from-primary to-transparent transition-shadow hover:shadow-[0_0_30px_rgba(76,175,80,0.3)] relative"
                                style={{ translateZ: 50 }}
                            >
                                <div className="size-full rounded-full overflow-hidden border-4 border-background bg-surface flex items-center justify-center pointer-events-none">
                                    {userPhoto ? (
                                        <img 
                                            alt="Foto de Perfil" 
                                            className="w-full h-full object-cover" 
                                            src={userPhoto} 
                                        />
                                    ) : (
                                        <span className="text-primary font-black text-6xl uppercase tracking-tighter">
                                            {getInitials(userName)}
                                        </span>
                                    )}
                                </div>
                            </motion.button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handlePhotoUpload} 
                                className="hidden" 
                                accept="image/*"
                            />
                            <button 
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPos({ top: rect.bottom + 10, left: rect.left });
                                    setShowMainPhotoOptions(!showMainPhotoOptions);
                                }}
                                className="absolute bottom-2 right-2 size-10 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary border border-white/10 hover:brightness-110 active:scale-95 transition-all z-50 pointer-events-auto"
                                style={{ transform: "translateZ(100px)" }}
                            >
                                <span className="material-symbols-outlined text-base">photo_camera</span>
                            </button>

                            {/* Menu de Opções de Foto Principal */}
                        </motion.div>

                        {/* Menu de Opções de Foto Principal - Movido para fora do container 3D */}
                        {/* Menu de Opções de Foto Principal - Portal */}
                        {showMainPhotoOptions && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setShowMainPhotoOptions(false)} />
                                <div 
                                    className="fixed z-[9999] w-56 bg-surface border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                                    style={{ 
                                        top: menuPos.top, 
                                        left: menuPos.left,
                                        transform: 'translate(-10%, -10%)' // Adjust to overlap slightly nicely
                                    }}
                                >
                                    {userPhoto && (
                                        <button 
                                            onClick={() => {
                                                setImageToCrop(userPhoto);
                                                setCropZoom(1);
                                                setCropPosition({ x: 0, y: 0 });
                                                setBackgroundMode('blur');
                                                setIsCropModalOpen(true);
                                                setShowMainPhotoOptions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-content font-bold text-xs"
                                        >
                                            <span className="material-symbols-outlined text-lg opacity-60">crop_rotate</span>
                                            Editar Atual
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                            setShowMainPhotoOptions(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-content font-bold text-xs"
                                    >
                                        <span className="material-symbols-outlined text-lg opacity-60">upload</span>
                                        Substituir Foto
                                    </button>
                                </div>
                            </>,
                            document.body
                        )}
                        <div className="text-center mt-6">
                            <h2 className="text-2xl font-black text-content uppercase tracking-tight">{userName}</h2>
                            <p className="text-dim text-sm mt-1 font-bold">{userEmail}</p>
                        </div>
                    </section>

                    <div 
                        onClick={() => {
                            setTargetBalance(currentBalance.toFixed(2).replace('.', ','));
                            setIsEditingBalance(true);
                        }}
                        className="nm-card p-6 flex flex-col items-center justify-center gap-6 relative group cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                    >
                        <div className="text-center">
                            <p className="text-[10px] font-black text-dim uppercase tracking-widest leading-none mb-3">Saldo Atual</p>
                            <h3 className="text-4xl font-black text-content flex items-center justify-center gap-1">
                                <span className="text-primary text-xl">R$</span>
                                {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[10px] font-bold text-primary mt-2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Clicar para editar
                            </p>
                        </div>
                        
                        <div className="relative">
                            <LiquidGauge 
                                value={(() => {
                                    const income = (transactions || [])
                                        .filter((t: any) => t.type === 'income')
                                        .reduce((acc: number, t: any) => acc + t.amount, 0);
                                    if (income <= 0) return 0;
                                    const percent = (currentBalance / income) * 100;
                                    return Math.max(0, percent);
                                })()} 
                                size={120} 
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="nm-card p-6 text-left">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                                    <span className="material-symbols-outlined">settings</span>
                                </div>
                                <h3 className="font-black text-content uppercase text-sm tracking-widest">Ajustes</h3>
                            </div>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setProfileAction?.('categories')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Editar Categorias</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => setProfileAction?.('transactions')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Editar Transações</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => setProfileAction?.('accounts')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Editar Contas</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => setProfileAction?.('recurring')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Despesas Previstas</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => setProfileAction?.('recurring_incomes')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Receitas Previstas</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => setProfileAction?.('cards')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Meus Cartões</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform text-sm">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => onNavigate('Configurações')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group border-t border-white/5 mt-2"
                                >
                                    <span className="text-dim font-black text-[10px] uppercase tracking-widest">Preferências do App</span>
                                    <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform text-sm">settings</span>
                                </button>
                            </div>
                        </div>

                        <div className="nm-card p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                    <span className="material-symbols-outlined">database</span>
                                </div>
                                <h3 className="font-black text-content uppercase text-sm tracking-widest">Dados</h3>
                            </div>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => onNavigate('Importar CSV')}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-xs uppercase tracking-widest">Meus Dados</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        const count = checkConsistency(cards, accounts, addSystemNotification);
                                        if (count > 0) {
                                            alert(`Foram encontradas ${count} inconsistências. Verifique suas notificações.`);
                                        } else {
                                            alert('Nenhuma inconsistência encontrada. Tudo parece certo!');
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-dim font-black text-xs uppercase tracking-widest">Verificar Pendências</span>
                                    <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">fact_check</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="nm-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                                <span className="material-symbols-outlined">security</span>
                            </div>
                            <h3 className="font-black text-content uppercase text-sm tracking-widest">Privacidade</h3>
                        </div>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                                <span className="text-dim font-black text-xs uppercase tracking-widest">Alterar Senha</span>
                                <span className="material-symbols-outlined text-dim group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-500 font-black mt-2 text-xs uppercase tracking-widest border border-red-500/20 active:scale-95"
                            >
                                <span className="material-symbols-outlined">sync_alt</span>
                                <span>Trocar Conta</span>
                            </button>
                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 transition-colors text-red-500 font-black mt-2 text-xs uppercase tracking-widest active:scale-95"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                <span>Sair do Aplicativo</span>
                            </button>
                        </div>
                    </div>
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

export default UserProfile;
