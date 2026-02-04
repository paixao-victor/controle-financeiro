// No changes needed if no explicit import.
// But to be safe and force a rebuild/refresh, I will add a comment or small change.
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useTheme } from '@/contexts/ThemeContext'; // Assuming ThemeContext is available
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onViewAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onViewAll }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    
    // Sort by date (desc) and take top 5
    const recentNotifications = [...notifications]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop click to close */}
            <div className="fixed inset-0 z-40" onClick={onClose}></div>

            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-20 top-20 md:left-24 md:top-6 z-50 w-80 md:w-96 bg-surface dark:bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 dark:bg-black/20 backdrop-blur-md">
                    <h3 className="font-black text-content uppercase tracking-widest text-sm">Notificações</h3>
                    <div className="flex gap-2">
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
                            {recentNotifications.map(notification => (
                                <div 
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id)}
                                    className={`p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group ${!notification.read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="flex gap-3">
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
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <p className={`text-sm font-bold truncate pr-2 ${!notification.read ? 'text-content' : 'text-dim'}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && <span className="size-2 bg-primary rounded-full shrink-0 mt-1.5 animate-pulse"></span>}
                                            </div>
                                            <p className="text-xs text-dim line-clamp-2 leading-relaxed">{notification.message}</p>
                                            <p className="text-[10px] text-dim/60 mt-2 font-medium tracking-wide">
                                                {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
