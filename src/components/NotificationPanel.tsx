// No changes needed if no explicit import.
// But to be safe and force a rebuild/refresh, I will add a comment or small change.
import React from 'react';
import { motion } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onViewAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onViewAll }) => {
    const { notifications, markAsRead, markAllAsRead, deleteNotification, markAsUnread } = useNotifications();
    
    // Sort by date (desc) and take top 5
    const recentNotifications = [...notifications]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const [isEditMode, setIsEditMode] = React.useState(false);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop click to close */}
            <div className="fixed inset-0 z-40" onClick={onClose}></div>

            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`absolute z-50 w-80 md:w-96 bg-surface dark:bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden ${
                    window.innerWidth < 768 
                        ? 'top-16 right-4 left-4 w-auto' // Mobile: Full width com margens, abaixo do header
                        : 'top-16 right-10' // Desktop: Abaixo do header, alinhado à direita
                }`}
                onClick={e => e.stopPropagation()}
                style={{ position: 'fixed' }} // Garantir fixed em relação à window para mobile/desktop consistente
            >
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 dark:bg-black/20 backdrop-blur-md">
                    <h3 className="font-black text-content uppercase tracking-widest text-sm">Notificações</h3>
                    <div className="flex gap-2">
                        <button 
                             onClick={() => setIsEditMode(!isEditMode)}
                             className={`rounded-full size-6 flex items-center justify-center transition-colors ${isEditMode ? 'bg-primary/20 text-primary' : 'hover:bg-black/10 dark:hover:bg-white/10 text-dim'}`}
                             title={isEditMode ? "Concluir edição" : "Editar notificações"}
                        >
                            <span className="material-symbols-outlined text-sm">{isEditMode ? 'check' : 'edit'}</span>
                        </button>
                        {recentNotifications.some(n => !n.read) && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-[10px] sm:text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                            >
                                Marcar lidas
                            </button>
                        )}
                        <button onClick={onClose} className="rounded-full size-6 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {recentNotifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center opacity-50">
                            <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                            <p className="text-xs font-bold">Nenhuma notificação recente</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentNotifications.map(notification => {
                                const daysSince = Math.floor((new Date().getTime() - new Date(notification.date).getTime()) / (1000 * 3600 * 24));
                                const showDate = daysSince > 5;

                                return (
                                <div 
                                    key={notification.id}
                                    className={`relative p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group ${!notification.read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="grid grid-cols-[40px_1fr_60px] gap-3 items-start">
                                        {/* Coluna 1: Ícone */}
                                        <div className={`
                                            size-10 rounded-xl flex items-center justify-center shrink-0
                                            ${notification.type === 'alert' ? 'bg-red-500/10 text-red-500' : 
                                              notification.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                              notification.type === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                                              'bg-blue-500/10 text-blue-500'}
                                        `}>
                                            <span className="material-symbols-outlined text-xl">
                                                {notification.type === 'alert' ? 'warning' : 
                                                 notification.type === 'success' ? 'check_circle' :
                                                 notification.type === 'warning' ? 'priority_high' :
                                                 'info'}
                                            </span>
                                        </div>

                                        {/* Coluna 2: Conteúdo */}
                                        <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className={`text-sm font-bold truncate ${!notification.read ? 'text-content' : 'text-dim'}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && <span className="size-2 bg-primary rounded-full shrink-0 animate-pulse"></span>}
                                            </div>
                                            <p className="text-xs text-dim line-clamp-2 leading-relaxed">{notification.message}</p>
                                        </div>

                                        {/* Coluna 3: Data / Ações */}
                                        <div className="flex flex-col items-end justify-between h-full min-h-[40px]">
                                            {/* Data (visível se > 5 dias) */}
                                            {showDate ? (
                                                <span className="text-[9px] text-dim/60 font-medium tracking-wide whitespace-nowrap">
                                                    {new Date(notification.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-dim/60 font-medium tracking-wide whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            )}

                                            {/* Ações (Visíveis no Hover ou EditMode) */}
                                            <div className={`flex items-center gap-1 transition-opacity mt-auto pt-1 ${isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        notification.read ? markAsUnread(notification.id) : markAsRead(notification.id); 
                                                    }}
                                                    className="size-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-dim hover:text-primary transition-colors"
                                                    title={notification.read ? "Marcar como não lida" : "Marcar como lida"}
                                                >
                                                    <span className="material-symbols-outlined text-base">
                                                        {notification.read ? 'check_box' : 'check_box_outline_blank'}
                                                    </span>
                                                </button>
                                                <button 
                                                     onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                                     className="size-6 rounded-full hover:bg-expense/10 flex items-center justify-center text-dim hover:text-expense transition-colors"
                                                     title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );})}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-white/5 bg-background">
                    <button 
                        onClick={onViewAll}
                        className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-secondary text-content text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        Ver Todas
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </motion.div>
        </>
    );
};

export default NotificationPanel;
