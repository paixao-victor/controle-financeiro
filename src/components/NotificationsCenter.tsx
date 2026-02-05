import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationsContext';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomSheetSelect from './BottomSheetSelect';

interface NotificationsCenterProps {
    onBack?: () => void;
}

const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onBack }) => {
    const { notifications, markAsRead, markAllAsRead, deleteNotification, settings, updateSettings } = useNotifications();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDaysSheetOpen, setIsDaysSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Grouping Logic
    const sortedDetails = [...notifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // ... (rest of the sorting logic remains same)
    const today = sortedDetails.filter(n => isToday(new Date(n.date)));
    const yesterday = sortedDetails.filter(n => isYesterday(new Date(n.date)));
    const older = sortedDetails.filter(n => !isToday(new Date(n.date)) && !isYesterday(new Date(n.date)));

    const renderNotificationItem = (notification: any) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key={notification.id}
            className={`
                group relative flex gap-4 p-5 rounded-3xl border transition-all duration-300
                ${!notification.read 
                    ? 'bg-surface border-primary/20 shadow-lg shadow-primary/5' 
                    : 'bg-surface/50 border-transparent hover:bg-surface hover:border-white/5'}
            `}
            onClick={() => markAsRead(notification.id)}
        >
            {/* ... (Item content remains same) */}
            {/* Icon */}
            <div className={`
                size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                ${notification.type === 'alert' ? 'bg-red-500/10 text-red-500' : 
                  notification.type === 'success' ? 'bg-green-500/10 text-green-500' :
                  notification.type === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-blue-500/10 text-blue-500'}
            `}>
                <span className="material-symbols-outlined text-2xl">
                    {notification.type === 'alert' ? 'warning' : 
                     notification.type === 'success' ? 'check_circle' :
                     notification.type === 'warning' ? 'priority_high' :
                     'info'}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-1">
                <div className="flex justify-between items-start gap-4 relative">
                    <h4 className={`text-base font-bold truncate ${!notification.read ? 'text-content' : 'text-dim'}`}>
                        {notification.title}
                    </h4>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-bold text-dim/50 uppercase tracking-widest whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: ptBR })}
                        </span>
                        
                        {/* Ações em Modo de Edição */}
                        {isEditMode && (
                            <div className="flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {!notification.read && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                        className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-secondary transition-all active:scale-90"
                                    >
                                        <span className="material-symbols-outlined text-sm">check</span>
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                    className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-dim mt-1 leading-relaxed">
                    {notification.message}
                </p>
                {notification.actionLabel && (
                     <button className="mt-3 text-xs font-bold text-primary uppercase tracking-wider hover:underline">
                         {notification.actionLabel}
                     </button>
                )}
            </div>

            {/* Actions (Hover) - Ocultar no modo de edição pois já estão expostas */}
            {!isEditMode && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                        className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                        title="Excluir"
                    >
                        <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                     {!notification.read && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-secondary transition-colors"
                            title="Marcar como lida"
                        >
                            <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                     )}
                </div>
            )}
            
            {/* Unread Indicator */}
            {!notification.read && (
                <div className="absolute top-5 right-5 size-2 bg-primary rounded-full animate-pulse group-hover:opacity-0 transition-opacity" />
            )}
        </motion.div>
    );

    const daysOptions = Array.from({ length: 35 }, (_, i) => ({
        id: (i + 1).toString(),
        label: `${i + 1} ${i + 1 === 1 ? 'dia' : 'dias'}`,
        icon: 'calendar_clock'
    }));

    return (
        <div className="w-full h-full flex flex-col max-h-screen">
             {/* Header */}
             <div className="shrink-0 p-6 md:p-10 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onBack && (
                         <button onClick={onBack} className="md:hidden size-10 flex items-center justify-center rounded-xl bg-surface active:scale-95 transition-all">
                             <span className="material-symbols-outlined">arrow_back</span>
                         </button>
                    )}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-content tracking-tight">Central de Notificações</h1>
                        <p className="text-sm text-dim font-medium mt-1">
                            Você tem <span className="text-primary font-bold">{notifications.filter(n => !n.read).length}</span> notificações não lidas
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Settings Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="size-10 rounded-xl bg-surface hover:bg-surface/80 flex items-center justify-center transition-colors text-dim hover:text-primary"
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>

                        <AnimatePresence>
                            {isSettingsOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 top-12 w-64 bg-surface dark:bg-zinc-900 border border-content/10 rounded-2xl shadow-xl z-50 p-4"
                                    >
                                        <h4 className="text-xs font-black uppercase tracking-widest text-content mb-3">Configurações</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-dim block mb-1">Notificar antes do vencimento:</label>
                                                <button 
                                                    onClick={() => setIsDaysSheetOpen(true)}
                                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-content flex items-center justify-between hover:border-primary/50 transition-colors"
                                                >
                                                    <span className="font-bold">{settings.daysInAdvance} {settings.daysInAdvance === 1 ? 'dia' : 'dias'}</span>
                                                    <span className="material-symbols-outlined text-dim text-sm">expand_more</span>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <BottomSheetSelect
                        isOpen={isDaysSheetOpen}
                        onClose={() => setIsDaysSheetOpen(false)}
                        title="Dias de Antecedência"
                        options={daysOptions}
                        selectedValue={settings.daysInAdvance.toString()}
                        onSelect={(opt) => {
                            updateSettings({ daysInAdvance: typeof opt.id === 'string' ? parseInt(opt.id) : opt.id });
                            setIsDaysSheetOpen(false);
                            // Keep settings menu open
                        }}
                    />

                    {/* Botão de Edição (Lápis) */}
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${isEditMode ? 'bg-primary text-secondary shadow-glow' : 'bg-surface text-dim hover:text-primary'}`}
                        title="Editar"
                    >
                        <span className="material-symbols-outlined text-xl">{isEditMode ? 'close' : 'edit'}</span>
                    </button>

                    {/* Botão Marcar Todas como Lidas (Pode aparecer só no modo de edição ou sempre) */}
                    {(isEditMode || (notifications.length > 0 && notifications.some(n => !n.read))) && (
                        <button 
                            onClick={markAllAsRead}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all group ${isEditMode ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface hover:bg-surface/80 border-transparent hover:border-primary/20'}`}
                        >
                            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">done_all</span>
                            <span className="hidden md:block text-xs font-black uppercase tracking-widest text-dim group-hover:text-content">Lidas</span>
                        </button>
                    )}
                </div>
             </div>

             {/* Scrollable Content */}
             <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-10">
                 <div className="max-w-4xl mx-auto space-y-8">
                    
                    {notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                             <div className="size-24 rounded-full bg-surface mb-6 flex items-center justify-center">
                                <span className="material-symbols-outlined text-5xl text-dim">notifications_off</span>
                             </div>
                             <h3 className="text-xl font-bold text-content">Tudo limpo por aqui!</h3>
                             <p className="text-dim mt-2">Você não tem novas notificações.</p>
                        </div>
                    )}

                    {today.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-dim uppercase tracking-[0.2em] mb-4 pl-2 border-l-4 border-primary">Hoje</h3>
                            <div className="flex flex-col gap-3">
                                {today.map(renderNotificationItem)}
                            </div>
                        </section>
                    )}

                    {yesterday.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-dim uppercase tracking-[0.2em] mb-4 pl-2 border-l-4 border-gray-500/30">Ontem</h3>
                            <div className="flex flex-col gap-3">
                                {yesterday.map(renderNotificationItem)}
                            </div>
                        </section>
                    )}

                    {older.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-dim uppercase tracking-[0.2em] mb-4 pl-2 border-l-4 border-gray-500/30">Antigos</h3>
                            <div className="flex flex-col gap-3">
                                {older.map(renderNotificationItem)}
                            </div>
                        </section>
                    )}
                 </div>
             </div>
        </div>
    );
};

export default NotificationsCenter;
