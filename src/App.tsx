import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { TransactionsProvider, useTransactions } from '@/contexts/TransactionsContext';
import { NotificationsProvider, useNotifications } from '@/contexts/NotificationsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import Dashboard from '@/components/Dashboard';
import TransactionsList from '@/components/TransactionsList';
import DataManagement from '@/components/DataManagement';
import AccountsPayable from './components/AccountsPayable';
import MyCards from './components/MyCards';
import AddTransaction from '@/components/AddTransaction';
import ErrorBoundary from '@/components/ErrorBoundary';
import Modal from '@/components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import UserProfile from '@/components/UserProfile';
import Settings from '@/components/Settings';

import NotificationPanel from '@/components/NotificationPanel';
import NotificationsCenter from '@/components/NotificationsCenter';
import LoginScreen from '@/components/auth/LoginScreen';
import RegisterScreen from '@/components/auth/RegisterScreen';
import SplashScreen from '@/components/SplashScreen';


// Definição de Abas
const TABS = {
  DASHBOARD: 'Dashboard',
  EXTRATO: 'Extrato',
  ACCOUNTS: 'Contas',
  CARDS: 'Cartões',
  NOTIFICATIONS: 'Notificações',
  PERFIL: 'Perfil',
  CONFIG: 'Configurações',
  IMPORT: 'Importar Dados',
} as const;

type ActiveTab = typeof TABS[keyof typeof TABS];

// Componente de Item da Sidebar Desktop
interface NavItemProps {
  icon: string;
  label?: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  isExpanded?: boolean;
}

const NavItem = ({ icon, label, isActive, onClick, badge, isExpanded = true }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`
                group relative flex items-center w-full h-12 rounded-xl transition-all duration-300
                ${isExpanded ? 'px-4' : 'justify-center px-0'}
                ${isActive
          ? 'bg-gray-100 dark:bg-white/10 text-content shadow-soft dark:shadow-glow'
          : 'opacity-50 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-white/5'
        }
            `}
    >
      <div className="flex items-center justify-center w-8 shrink-0 relative">
          <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-primary' : ''}`}>{icon}</span>
          {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-lg border-2 border-surface animate-bounce">
                  {badge > 9 ? '9+' : badge}
              </span>
          )}
      </div>
      
      <div className={`${isExpanded ? 'flex-1 ml-3 opacity-100 w-auto' : 'w-0 opacity-0 ml-0 flex-none'} flex items-center transition-all duration-300 overflow-hidden`}>
        <span className={`font-semibold text-sm whitespace-nowrap ${isActive ? 'text-content' : ''}`}>
          {label}
        </span>
      </div>

      {/* Indicador Ativo */}
      {isActive && (
        <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(71,244,37,0.8)] transition-all"></div>
      )}

      {/* Tooltip Tablet (Somente quando retraído) */}
      {!isExpanded && (
        <div className="hidden lg:group-hover:flex absolute left-16 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap backdrop-blur-md z-50 border border-white/10 shadow-2xl translate-x-2 group-hover:translate-x-0">
          {label || icon}
        </div>
      )}
    </button>
  )
}

// Componente de Item Mobile


function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { isEditMode, setIsEditMode } = useTransactions();
  const { unreadCount } = useNotifications();
  const { logout, user, updateUser } = useAuth();
  const { isPrivacyMode, setIsPrivacyMode } = useSettings();
  const { isSyncing } = useTransactions();
  const [activeTab, setActiveTab] = useState<typeof TABS[keyof typeof TABS]>(TABS.DASHBOARD);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [addTransactionInitialData, setAddTransactionInitialData] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);


  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 seconds to show the animation
    return () => clearTimeout(timer);
  }, []);

  // Perfil Global (Derivado do AuthContext)
  const userName = user?.name || 'Usuário';
  const userEmail = user?.email || (user?.username ? `${user.username}@finance.com` : '');
  const userPhoto = user?.photo || '';
  
  const appFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAppPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateUser({ photo: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };

  // Sidebar Hover Logic
  const hoverTimeoutRef = React.useRef<any>(null);

  const handleMouseEnter = () => {
    if (isSidebarCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setSidebarCollapsed(false);
      }, 800);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Sempre retrai ao sair o mouse, conforme solicitado
    if (!isSidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  };

  const toggleSidebar = (e: React.MouseEvent) => {
    // Evitar disparar ao clicar em botões específicos dentro da sidebar que já têm suas ações
    if ((e.target as HTMLElement).closest('button')) return;
    // Ao clicar, a sidebar deve se retrair (conforme solicitado: "ao ser clicado deve se retrair")
    setSidebarCollapsed(true);
  };

  const isExpanded = !isSidebarCollapsed;
  useEffect(() => {
    const handleOpenAddTransaction = (e: any) => {
      setAddTransactionInitialData(e.detail);
      setIsAddTransactionOpen(true);
    };

    window.addEventListener('open-add-transaction', handleOpenAddTransaction);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTransaction);
  }, []);

  // Sincroniza abas com o histórico do navegador (Botão Voltar do celular/navegador)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab(TABS.DASHBOARD);
      }
    };

    window.addEventListener('popstate', handlePopState);
    // Define estado inicial
    window.history.replaceState({ tab: TABS.DASHBOARD }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleChangeTab = (e: any) => {
      const tabName = e.detail;
      if (tabName) setActiveTab(tabName as any);
    };
    window.addEventListener('change-tab', handleChangeTab);
    return () => {
      window.removeEventListener('change-tab', handleChangeTab);
    };
  }, []);

  // Fecha o menu mobile ao trocar de aba e atualiza histórico
  const handleTabChange = (tab: ActiveTab) => {
    window.scrollTo(0, 0); // Reset scroll position
    
    // Desativa modo de edição ao sair do Extrato
    if (activeTab === TABS.EXTRATO && tab !== TABS.EXTRATO) {
      setIsEditMode(false);
    }
    // Também desativa ao entrar no Extrato (garantir estado limpo)
    if (tab === TABS.EXTRATO) {
      setIsEditMode(false);
    }
    if (tab !== activeTab) {
      window.history.pushState({ tab }, '');
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setIsNotificationPanelOpen(false); // Close notification panel on tab change
  };

  // Close Profile Popup on Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (isProfilePopupOpen && !target.closest('#profile-popup') && !target.closest('#profile-trigger')) {
            setIsProfilePopupOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfilePopupOpen]);

  // Logout Modal State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false); // Switch Account Modal State

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
    setMobileMenuOpen(false); // Close mobile menu if open
    setIsProfilePopupOpen(false); // Close profile popup if open
  };

  const handleSwitchRequest = () => {
    setShowSwitchConfirm(true);
    setIsProfilePopupOpen(false);
  };



  const onNavigateFromProfile = (target: string) => {
    if (target === 'Cartões') {
      setActiveTab(TABS.CARDS);
    } else if (target === 'Configurações') {
      setActiveTab(TABS.CONFIG);
    } else if (target === 'Despesas Previstas') {
      setActiveTab(TABS.ACCOUNTS);
    } else if (target === 'Importar CSV') {
      setActiveTab(TABS.IMPORT);
    }
  };

  const handleSaveSuccess = () => {
    setIsAddTransactionOpen(false);
    handleTabChange(TABS.EXTRATO);
  };

    const isSubPage = [TABS.IMPORT, TABS.CONFIG].includes(activeTab as any);

  const handleBack = () => {
    if (activeTab === TABS.IMPORT || activeTab === TABS.CONFIG) {
        handleTabChange(TABS.PERFIL);
    } else {
        handleTabChange(TABS.DASHBOARD);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case TABS.DASHBOARD:
        return <Dashboard />;
      case TABS.EXTRATO:
        return <TransactionsList searchQuery={globalSearchQuery} />;
      case TABS.ACCOUNTS:
        return <AccountsPayable />;
      case TABS.CARDS:
        return <MyCards onBack={() => setActiveTab(TABS.DASHBOARD)} />;
      case TABS.NOTIFICATIONS:
        return <NotificationsCenter onBack={() => setActiveTab(TABS.DASHBOARD)} />;
      case TABS.PERFIL:
        return (
          <UserProfile 
            onNavigate={onNavigateFromProfile} 
            onPhotoClick={() => setIsPhotoModalOpen(true)}
            profileAction={profileAction}
            setProfileAction={setProfileAction}
            onRequestLogout={handleLogoutRequest}
          />
        );
      case TABS.CONFIG:
        return <Settings onNavigate={handleTabChange} />;
      case TABS.IMPORT:
        return (
          <div className="max-w-4xl mx-auto mt-6">
            <DataManagement />
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  // Sidebar Desktop

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      {/* Modal de Confirmação de Troca de Conta (Padronizado) */}
      <ConfirmationModal
          isOpen={showSwitchConfirm}
          onClose={() => setShowSwitchConfirm(false)}
          onConfirm={() => {
              setShowSwitchConfirm(false);
              logout();
          }}
          title="Trocar de Conta?"
          message="Você vai sair da conta atual para entrar em outra."
          confirmText="Sim, Trocar Conta"
          cancelText="Manter Logado"
          icon="sync_alt"
          type="warning"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
              setShowLogoutConfirm(false);
              logout();
          }}
          title="Deseja Sair?"
          message="Você será desconectado da sua conta atual."
          confirmText="Sair do App"
          cancelText="Cancelar"
          icon="logout"
          type="danger"
      />


      <div className="flex h-screen w-full overflow-hidden bg-background text-content font-display selection:bg-primary/30 transition-colors duration-300">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <motion.aside 
        initial={false}
        animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="x"
        dragConstraints={{ left: -320, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, { offset, velocity }) => {
            if (offset.x < -80 || velocity.x < -300) {
                setMobileMenuOpen(false);
            }
        }}
        className={`fixed inset-y-0 left-0 z-80 w-80 glass-dock md:hidden flex flex-col overflow-y-auto pb-10 shadow-2xl`}
        style={{ touchAction: 'pan-y' }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-animated.svg" alt="Logo" className="size-8" />
            <span className="font-extrabold text-xl tracking-tight text-content">Controle<span className="text-primary"> Financeiro</span></span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-secondary/50 dark:text-white/50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 items-center px-4 space-y-2 overflow-y-auto w-full">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim opacity-50">Principal</span>
          </div>
          <NavItem icon="home" label="Início" isActive={activeTab === TABS.DASHBOARD} onClick={() => { handleTabChange(TABS.DASHBOARD); setMobileMenuOpen(false); }} />
          <NavItem icon="receipt_long" label="Extrato" isActive={activeTab === TABS.EXTRATO} onClick={() => { handleTabChange(TABS.EXTRATO); setMobileMenuOpen(false); }} />
          
          <button 
            onClick={() => { setIsAddTransactionOpen(true); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all my-2 group"
          >
            <span className="material-symbols-outlined font-black">add</span>
            <span className="text-sm font-black uppercase tracking-widest">Nova Transação</span>
          </button>

          <NavItem icon="checklist" label="Contas" isActive={activeTab === TABS.ACCOUNTS} onClick={() => { handleTabChange(TABS.ACCOUNTS); setMobileMenuOpen(false); }} />
          <NavItem icon="credit_card" label="Cartões" isActive={activeTab === TABS.CARDS} onClick={() => { handleTabChange(TABS.CARDS); setMobileMenuOpen(false); }} />
          <NavItem icon="notifications" label="Notificações" isActive={activeTab === TABS.NOTIFICATIONS} onClick={() => { handleTabChange(TABS.NOTIFICATIONS); setMobileMenuOpen(false); }} badge={unreadCount} />
          
          <div className="px-3 mt-6 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim opacity-50">Gerenciamento</span>
          </div>
          <NavItem icon="person" label="Perfil" isActive={activeTab === TABS.PERFIL} onClick={() => { handleTabChange(TABS.PERFIL); setMobileMenuOpen(false); }} />
        </nav>

        {/* Bottom Theme & Settings Mobile */}
        <div className="mt-auto p-6 border-t border-gray-100 dark:border-white/5 space-y-4">
           <div className="px-3 mb-2">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim opacity-50">Configurações</span>
           </div>
           
           <div className="flex items-center justify-between px-3 h-12">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-dim">palette</span>
                <span className="text-sm font-semibold">Tema</span>
              </div>
              <button 
                onClick={toggleTheme}
                className="size-10 flex items-center justify-center rounded-xl bg-content/5 text-dim relative overflow-hidden"
              >
                <div className="relative size-6">
                  <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                    <span className="material-symbols-outlined text-[20px]">light_mode</span>
                  </span>
                  <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`}>
                    <span className="material-symbols-outlined text-[20px] text-primary">dark_mode</span>
                  </span>
                </div>
              </button>
           </div>
           
           <NavItem icon="settings" label="Configurações" isActive={activeTab === TABS.CONFIG} onClick={() => handleTabChange(TABS.CONFIG)} isExpanded={true} />
           <button
             onClick={(e) => {
               e.stopPropagation();
               handleLogoutRequest();
             }}
             className="w-full flex items-center h-12 px-4 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors mt-2"
           >
             <div className="flex items-center justify-center w-8 shrink-0">
               <span className="material-symbols-outlined text-xl">logout</span>
             </div>
             <div className="ml-3 flex-1">
               <span className="text-sm font-bold">Sair</span>
             </div>
           </button>
        </div>
      </motion.aside>

      {/* Sidebar Desktop (Flutuante/Overlay) */}
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={toggleSidebar}
        className={`hidden md:flex flex-col glass-dock z-60 h-full fixed top-0 left-0 transition-all duration-300 py-8 overflow-y-auto custom-scrollbar cursor-pointer group/sidebar ${isExpanded ? 'w-64 shadow-2xl' : 'w-20'} items-stretch border-r border-white/5`}
      >
        <div className={`mb-8 flex items-center ${isExpanded ? 'px-4 justify-between' : 'justify-center'} gap-3 relative h-12`}>
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handleTabChange(TABS.DASHBOARD);
            }}
          >
            <img src="/logo-animated.svg" alt="Logo" className="size-16" />
            {isExpanded && (
              <span className="font-extrabold text-xl tracking-tight text-content animate-in fade-in slide-in-from-left-4 duration-300">
                Controle<span className="text-primary"> Financeiro</span>
              </span>
            )}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSidebarCollapsed(!isSidebarCollapsed);
            }}
            className={`
              absolute transition-all duration-500 flex items-center justify-center
              ${isExpanded 
                ? 'right-6 rotate-0 h-10 w-10 hover:bg-content/5 rounded-lg' 
                : 'left-[calc(3rem+6px)] rotate-180 h-3 w-3 text-primary'}
            `}
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 space-y-2 flex items-center flex-col w-full transition-all duration-300 ${isExpanded ? 'px-4' : 'px-0'}`}>
          <div className={`${isExpanded ? 'px-4' : 'px-0'} h-6 flex items-center mt-2 transition-all duration-300`}>
            {isExpanded ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim whitespace-nowrap animate-in fade-in duration-300">Principal</span>
            ) : (
              <div className="w-8 h-[2px] bg-gray-400/30 dark:bg-white/20 rounded-full mx-auto" />
            )}
          </div>
          
          <NavItem
            icon="home"
            label="Início"
            isActive={activeTab === TABS.DASHBOARD}
            onClick={() => handleTabChange(TABS.DASHBOARD)}
            isExpanded={isExpanded}
          />
          <NavItem
            icon="receipt_long"
            label="Extrato"
            isActive={activeTab === TABS.EXTRATO}
            onClick={() => handleTabChange(TABS.EXTRATO)}
            isExpanded={isExpanded}
          />

          <button 
            onClick={() => setIsAddTransactionOpen(true)}
            className={`
              my-4 flex items-center gap-3 bg-primary text-secondary font-bold rounded-2xl transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20
              ${!isExpanded ? 'size-12 justify-center mx-auto' : 'w-full py-4 px-6'}
            `}
            title={!isExpanded ? "Nova Transação" : ""}
          >
            <span className="material-symbols-outlined text-2xl font-bold">add</span>
            {isExpanded && <span className="uppercase tracking-widest text-[11px]">Nova Transação</span>}
          </button>

          <NavItem
            icon="checklist"
            label="Contas"
            isActive={activeTab === TABS.ACCOUNTS}
            onClick={() => handleTabChange(TABS.ACCOUNTS)}
            isExpanded={isExpanded}
          />
          <NavItem
            icon="credit_card"
            label="Cartões"
            isActive={activeTab === TABS.CARDS}
            onClick={() => handleTabChange(TABS.CARDS)}
            isExpanded={isExpanded}
          />
          <NavItem
            icon="notifications"
            label="Notificações"
            isActive={activeTab === TABS.NOTIFICATIONS}
            onClick={() => handleTabChange(TABS.NOTIFICATIONS)}
            badge={unreadCount}
            isExpanded={isExpanded}
          />

          <div className={`${isExpanded ? 'px-4' : 'px-0'} h-6 flex items-center mt-6 transition-all duration-300`}>
            {isExpanded ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim whitespace-nowrap animate-in fade-in duration-300">Gerenciamento</span>
            ) : (
              <div className="w-8 h-[2px] bg-gray-400/30 dark:bg-white/20 rounded-full mx-auto" />
            )}
          </div>
          <NavItem
            icon="person"
            label="Perfil"
            isActive={activeTab === TABS.PERFIL}
            onClick={() => handleTabChange(TABS.PERFIL)}
            isExpanded={isExpanded}
          />
        </nav>

        {/* Bottom Config & Toggle */}
        <div className={`mt-auto pt-6 border-t border-white/5 w-full ${isExpanded ? 'px-4' : 'px-0'} flex flex-col gap-1 items-stretch`}>
          {isExpanded && (
            <div className="px-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim opacity-50">Ajustes</span>
            </div>
          )}

          <NavItem
            icon="settings"
            label="Configurações"
            isActive={activeTab === TABS.CONFIG}
            onClick={() => handleTabChange(TABS.CONFIG)}
            isExpanded={isExpanded}
          />
          
          <div className={`flex items-center gap-3 h-12 ${!isExpanded ? 'justify-center' : 'px-4'}`}>
             <button 
                onClick={toggleTheme}
                className="size-10 flex items-center justify-center rounded-xl hover:bg-content/5 transition-all text-dim hover:text-primary active:scale-95"
             >
                <div className="relative size-6">
                  <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                    <span className="material-symbols-outlined text-[20px]">light_mode</span>
                  </span>
                  <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`}>
                    <span className="material-symbols-outlined text-[20px] text-primary">dark_mode</span>
                  </span>
                </div>
             </button>
             {isExpanded && <span className="text-xs font-bold text-dim animate-in fade-in duration-300">Tema</span>}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogoutRequest();
            }}
            className={`flex items-center h-12 rounded-xl text-red-500 hover:bg-red-500/10 transition-all mt-2 ${isExpanded ? 'px-4' : 'justify-center px-0 w-full'}`}
          >
            <div className="flex items-center justify-center w-8 shrink-0">
              <span className="material-symbols-outlined text-xl">logout</span>
            </div>
            <div className={`${isExpanded ? 'flex-1 ml-3 opacity-100 w-auto' : 'w-0 opacity-0 ml-0 flex-none'} transition-all duration-300 overflow-hidden`}>
              <span className="text-sm font-bold whitespace-nowrap">Sair</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Backdrop para fechar sidebar ao clicar fora (quando expandida) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarCollapsed(true)}
            className="hidden md:block fixed inset-0 bg-black/5 backdrop-blur-[1px] z-50 transition-opacity"
          />
        )}
      </AnimatePresence>
 
       {/* Main Content */}
       <div className={`flex-1 flex flex-col h-full bg-background relative overflow-hidden transition-all duration-300 md:pl-20`}>
        
        {/* Render Notification Panel */}
        <AnimatePresence>
            {isNotificationPanelOpen && (
                <NotificationPanel 
                    isOpen={isNotificationPanelOpen} 
                    onClose={() => setIsNotificationPanelOpen(false)} 
                    onViewAll={() => {
                        setIsNotificationPanelOpen(false);
                        setActiveTab(TABS.NOTIFICATIONS);
                    }}
                />
            )}
        </AnimatePresence>

        {/* Fixed Header Mobile with Blur */}
        <div className={`
          md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-all duration-500
          ${activeTab === TABS.DASHBOARD 
            ? 'bg-[rgb(28,44,28)] border-[rgb(28,44,28)] text-white' 
            : 'bg-surface/80 border-content/10 text-content'}
        `}>
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileMenuOpen(true)} className={`size-10 flex items-center justify-center ${activeTab === TABS.DASHBOARD ? 'text-white' : 'text-content'}`}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button 
              onClick={() => setIsPrivacyMode(!isPrivacyMode)} 
              className={`size-10 flex items-center justify-center transition-colors ${activeTab === TABS.DASHBOARD ? 'text-white' : 'text-content'}`}
              title={isPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
            >
              <span className="material-symbols-outlined">{isPrivacyMode ? 'visibility_off' : 'visibility'}</span>
            </button>
            {activeTab === TABS.EXTRATO && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`size-10 flex items-center justify-center transition-colors rounded-full ${isEditMode ? 'bg-primary/20 text-primary' : 'text-content'}`}
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{activeTab}</h1>
            {isSyncing && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="material-symbols-outlined text-primary text-sm animate-pulse"
              >
                cloud_sync
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSearchVisible(!isSearchVisible)} 
              className={`size-10 flex items-center justify-center transition-colors ${activeTab === TABS.DASHBOARD ? 'text-white' : 'text-content'}`}
            >
              <span className="material-symbols-outlined">{isSearchVisible ? 'close' : 'search'}</span>
            </button>
            
            {/* Notification Bell Mobile */}
            <button 
                  onClick={() => setIsNotificationPanelOpen(true)}
                  className={`relative size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${activeTab === TABS.DASHBOARD ? 'text-white' : 'text-content'}`}
            >
                   <span className="material-symbols-outlined">notifications</span>
                   {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full animate-pulse border-2 border-transparent shadow-sm"></span>
                   )}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                className="size-10 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-black text-xs">
                    {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>

              {/* Mini Card Perfil (Mobile) */}
              <AnimatePresence>
                {isProfilePopupOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-100" 
                      onClick={() => setIsProfilePopupOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-12 w-64 bg-surface dark:bg-zinc-900 border border-content/10 rounded-3xl shadow-2xl z-101 p-5 nm-card overflow-hidden"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="size-20 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border-4 border-primary/20 flex items-center justify-center overflow-hidden shadow-xl">
                          {userPhoto ? (
                            <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-black text-2xl uppercase">
                              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <h4 className="text-lg font-black text-content uppercase tracking-tight">{userName}</h4>
                          <p className="text-[10px] text-dim font-bold tracking-tight opacity-60">{userEmail}</p>
                        </div>
                        <button 
                          onClick={() => {
                            handleTabChange(TABS.PERFIL);
                            setIsProfilePopupOpen(false);
                          }}
                          className="w-full py-3 bg-primary text-secondary font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-glow mb-2"
                        >
                          Ver Perfil Completo
                        </button>
                        <button 
                          onClick={handleSwitchRequest}
                          className="w-full py-3 bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">sync_alt</span>
                          Trocar Conta
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search Bar Mobile Expanded */}
          <AnimatePresence>
              {isSearchVisible && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="absolute top-full left-0 right-0 bg-surface/95 backdrop-blur-md border-b border-content/10 px-4 py-3 flex items-center gap-2 md:hidden"
                  >
                    <div className="flex-1 bg-content/5 rounded-xl flex items-center px-4 py-2">
                      <span className="material-symbols-outlined text-dim text-sm mr-2">search</span>
                      <input 
                        autoFocus
                        type="text"
                        value={globalSearchQuery}
                        onChange={(e) => {
                          setGlobalSearchQuery(e.target.value);
                          if (e.target.value && activeTab !== TABS.EXTRATO) {
                            handleTabChange(TABS.EXTRATO);
                          }
                        }}
                        placeholder="Buscar transações, categorias..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                      />
                      {globalSearchQuery && (
                        <button onClick={() => setGlobalSearchQuery('')}>
                          <span className="material-symbols-outlined text-dim text-sm">cancel</span>
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setIsSearchVisible(false);
                        setGlobalSearchQuery('');
                      }}
                      className="text-xs font-bold text-primary px-2"
                    >
                      Cancelar
                    </button>
                  </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Header Topo Desktop (Nome Usuário) */}
        <header className={`
          hidden md:flex sticky top-0 z-50 items-center justify-between px-6 lg:px-10 py-4 transition-all duration-500 backdrop-blur-md
          ${activeTab === TABS.DASHBOARD 
            ? 'bg-[rgb(28,44,28)] text-white shadow-xl' 
            : 'bg-background/80 text-content border-b border-content/5'}
        `}>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold leading-tight">{activeTab}</h2>
              {isSyncing && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full"
                >
                  <span className="material-symbols-outlined text-primary text-sm animate-spin-slow">sync</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Sincronizando</span>
                </motion.div>
              )}
              <button 
                onClick={() => setIsPrivacyMode(!isPrivacyMode)} 
                className={`ml-2 size-10 flex items-center justify-center transition-colors rounded-full ${isPrivacyMode ? 'bg-primary/20 text-primary' : (activeTab === TABS.DASHBOARD ? 'text-white hover:bg-white/10' : 'text-content/60 hover:text-content hover:bg-content/10')}`}
                title={isPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
              >
                <span className="material-symbols-outlined">{isPrivacyMode ? 'visibility_off' : 'visibility'}</span>
              </button>
              {activeTab === TABS.EXTRATO && (
                <button 
                  onClick={() => setIsEditMode(!isEditMode)} 
                  className={`ml-2 size-10 flex items-center justify-center transition-colors rounded-full ${isEditMode ? 'bg-primary/20 text-primary' : 'text-content/60 hover:text-content hover:bg-content/10'}`}
                  title={isEditMode ? 'Desativar edição' : 'Ativar edição'}
                >
                  <span className="material-symbols-outlined">{isEditMode ? 'edit_off' : 'edit'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <AnimatePresence>
                  {isSearchVisible && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 240, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden bg-content/5 rounded-full flex items-center px-4 py-2 mr-2"
                    >
                      <input 
                        autoFocus
                        type="text"
                        value={globalSearchQuery}
                        onChange={(e) => {
                          setGlobalSearchQuery(e.target.value);
                          if (e.target.value && activeTab !== TABS.EXTRATO) {
                            handleTabChange(TABS.EXTRATO);
                          }
                        }}
                        placeholder="Buscar transações..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => {
                    setIsSearchVisible(!isSearchVisible);
                    if (isSearchVisible) setGlobalSearchQuery('');
                  }}
                  className={`relative size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${activeTab === TABS.DASHBOARD ? 'text-white hover:bg-white/20' : 'text-content hover:bg-black/5 dark:hover:bg-white/10'}`}
                >
                  <span className="material-symbols-outlined">{isSearchVisible ? 'close' : 'search'}</span>
                </button>
              </div>

               {/* Notification Bell Desktop */}
              <button 
                  onClick={() => setIsNotificationPanelOpen(true)}
                  className={`relative size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${activeTab === TABS.DASHBOARD ? 'text-white hover:bg-white/20' : 'text-content hover:bg-black/5 dark:hover:bg-white/10'}`}
              >
                   <span className="material-symbols-outlined">notifications</span>
                   {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full animate-pulse border-2 border-transparent shadow-sm"></span>
                   )}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold">{userName}</p>
                  <p className={`text-xs font-bold uppercase tracking-widest ${activeTab === TABS.DASHBOARD ? 'text-primary' : 'opacity-50'}`}>Premium</p>
                </div>
                <button 
                  onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                  className="size-10 rounded-full border-2 border-primary/20 hover:border-primary/50 transition-colors overflow-hidden active:scale-95 bg-surface flex items-center justify-center"
                >
                  {userPhoto ? (
                    <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-black text-xs uppercase">
                      {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  )}
                </button>

                {/* Mini Card Perfil (Desktop) */}
                <AnimatePresence>
                  {isProfilePopupOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsProfilePopupOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-14 w-72 bg-surface dark:bg-zinc-900 border border-content/10 rounded-3xl shadow-2xl z-50 p-6 nm-card overflow-hidden"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="size-24 rounded-full border-4 border-primary/20 overflow-hidden shadow-xl bg-surface flex items-center justify-center">
                            {userPhoto ? (
                              <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-primary font-black text-3xl uppercase">
                                {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="text-center">
                            <h4 className="text-xl font-black text-content uppercase tracking-tight">{userName}</h4>
                            <p className="text-xs text-dim font-bold tracking-tight opacity-60">{userEmail}</p>
                          </div>
                          <div className="w-full h-px bg-content/5 my-2"></div>
                          <button 
                            onClick={() => {
                              handleTabChange(TABS.PERFIL);
                              setIsProfilePopupOpen(false);
                            }}
                            className="w-full py-4 bg-primary text-secondary font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-glow mb-2"
                          >
                            Ver Perfil Completo
                          </button>
                          <button 
                            onClick={handleSwitchRequest}
                            className="w-full py-4 bg-red-500/10 text-red-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">sync_alt</span>
                            Trocar Conta
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        

        {/* Botão Voltar Global (Mobile) - Logo abaixo do Menu */}
        {isSubPage && (
          <div className="md:hidden fixed top-20 left-4 z-40 animate-in slide-in-from-left-4 fade-in duration-300">
            <button 
              onClick={handleBack}
              className="size-12 rounded-2xl bg-surface/90 backdrop-blur-md nm-card flex items-center justify-center text-primary shadow-xl active:scale-90 transition-all border border-white/5"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          </div>
        )}

        {/* Botão Voltar Global (Desktop) */}
        {isSubPage && (
          <div className="hidden md:block absolute top-[110px] left-10 z-40 animate-in fade-in duration-300">
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/50 hover:bg-surface text-dim hover:text-primary transition-all group border border-white/5"
            >
              <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="text-xs font-black uppercase tracking-widest">Voltar</span>
            </button>
          </div>
        )}

        {/* Área de Conteúdo Scrollável */}
        <div className={
          `relative z-10 flex-1 mx-0 overflow-y-auto overflow-x-hidden 
          w-[calc(100%+0.6rem)] ${isSubPage ? 'pt-24 md:pt-20' : (activeTab === TABS.DASHBOARD ? 'pt-0' : 'pt-16 md:pt-4')}
          ${activeTab === TABS.DASHBOARD ? 'px-0' : 'px-4 lg:px-10'}
          pb-28 md:pb-12 custom-scrollbar
        `}>
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </div>

      {/* Modal Foto de Perfil Ampliada */}
      <AnimatePresence>
        {isPhotoModalOpen && (
          <div 
            className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setIsPhotoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full flex flex-col items-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsPhotoModalOpen(false)}
                className="absolute -top-12 right-0 size-10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
              
              <div className="aspect-square w-full max-w-[400px] rounded-full overflow-hidden border-8 border-white/10 shadow-2xl bg-surface flex items-center justify-center">
                {userPhoto ? (
                  <img src={userPhoto} alt="Zoom Perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-black text-9xl uppercase tracking-tighter">
                    {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                        setProfileAction('crop_current');
                        setIsPhotoModalOpen(false);
                        handleTabChange(TABS.PERFIL);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white font-bold"
                  >
                      <span className="material-symbols-outlined">edit</span>
                      <span>Editar</span>
                  </button>
                  <button 
                    onClick={() => appFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white font-bold"
                  >
                      <span className="material-symbols-outlined">sync_alt</span>
                      <span>Trocar</span>
                  </button>
                  <input 
                      type="file" 
                      ref={appFileInputRef}
                      onChange={handleAppPhotoUpload}
                      className="hidden" 
                      accept="image/*"
                  />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button className="md:hidden fixed bottom-32 right-8 size-16 bg-primary rounded-full shadow-[0_8px_25px_rgba(71,244,37,0.5)] flex items-center justify-center text-secondary active:scale-95 transition-all z-70 hover:scale-110 border-4 border-white/30"
        onClick={() => setIsAddTransactionOpen(true)}
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>

      {/* Modal de Adicionar Transação */}
      <Modal isOpen={isAddTransactionOpen} onClose={() => { setIsAddTransactionOpen(false); setAddTransactionInitialData(null); }}>
        <AddTransaction 
          onClose={() => { setIsAddTransactionOpen(false); setAddTransactionInitialData(null); }} 
          onSaveSuccess={handleSaveSuccess} 
          initialData={addTransactionInitialData}
        />
      </Modal>

      {/* Mobile Bottom Nav - Truly Floating */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[85%] max-w-[340px]">
        <div className="w-full bg-secondary dark:bg-[#0d160b] border border-white/10 shadow-2xl rounded-full px-8 py-4 flex justify-between items-center backdrop-blur-xl">
          <button onClick={() => setActiveTab(TABS.DASHBOARD)} className={`flex flex-col items-center justify-center transition-colors hover:bg-white/5 rounded-full w-10 h-10 relative ${activeTab === TABS.DASHBOARD ? 'text-primary' : 'text-white/40 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[26px]">home</span>
            {activeTab === TABS.DASHBOARD && <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"></span>}
          </button>
          <button onClick={() => setActiveTab(TABS.EXTRATO)} className={`flex items-center justify-center transition-colors hover:bg-white/5 rounded-full w-10 h-10 ${activeTab === TABS.EXTRATO ? 'text-primary' : 'text-white/40 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[26px]">receipt_long</span>
          </button>
          <button onClick={() => setActiveTab(TABS.ACCOUNTS)} className={`flex items-center justify-center transition-colors hover:bg-white/5 rounded-full w-10 h-10 ${activeTab === TABS.ACCOUNTS ? 'text-primary' : 'text-white/40 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[26px]">checklist</span>
          </button>
          <button onClick={() => setActiveTab(TABS.PERFIL)} className={`flex items-center justify-center transition-colors hover:bg-white/5 rounded-full w-10 h-10 ${activeTab === TABS.PERFIL ? 'text-primary' : 'text-white/40 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[26px]">person</span>
          </button>
        </div>
      </nav>

    </div>
    </>
  );
}

// Auth Gate Component
function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const handleAuthSwitch = (e: CustomEvent) => {
      setAuthView(e.detail);
    };
    window.addEventListener('auth-switch', handleAuthSwitch as EventListener);
    return () => window.removeEventListener('auth-switch', handleAuthSwitch as EventListener);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthView('login');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return authView === 'login' ? <LoginScreen /> : <RegisterScreen />;
  }

  return (
    <SettingsProvider>
      <TransactionsProvider>
        <NotificationsProvider>
          <AppContent />
        </NotificationsProvider>
      </TransactionsProvider>
    </SettingsProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
