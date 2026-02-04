import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransactionsProvider, useTransactions } from '@/contexts/TransactionsContext';
import { NotificationsProvider, useNotifications } from '@/contexts/NotificationsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import TransactionsList from '@/components/TransactionsList';
import DataManagement from '@/components/DataManagement';
import AccountsPayable from './components/AccountsPayable';
import MyCards from './components/MyCards';
import AddTransaction from '@/components/AddTransaction';
import ErrorBoundary from '@/components/ErrorBoundary';
import Modal from '@/components/Modal';
import UserProfile from '@/components/UserProfile';
import Settings from '@/components/Settings';
import CardsManagement from '@/components/CardsManagement';
import AccountsManagement from '@/components/AccountsManagement';
import NotificationPanel from '@/components/NotificationPanel';
import NotificationsCenter from '@/components/NotificationsCenter';
import LoginScreen from '@/components/auth/LoginScreen';
import RegisterScreen from '@/components/auth/RegisterScreen';
import SplashScreen from '@/components/SplashScreen';
import LoadingOverlay from '@/components/LoadingOverlay';

// Definição de Abas
const TABS = {
  DASHBOARD: 'Dashboard',
  EXTRATO: 'Extrato',
  RELATORIOS: 'Contas',
  PERFIL: 'Perfil',
  CONFIG: 'Configurações',
  IMPORT: 'Importar CSV',
  CARDS: 'Meus Cartões',
  ACCOUNTS: 'Contas',
  NOTIFICATIONS: 'Notificações'
} as const;

type ActiveTab = typeof TABS[keyof typeof TABS];

// Componente de Item da Sidebar Desktop
interface NavItemProps {
  icon: string;
  label?: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem = ({ icon, label, isActive, onClick, badge }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`
                group relative flex items-center w-full h-12 rounded-xl transition-all duration-300
                ${label ? 'justify-start px-3' : 'justify-center'}
                ${isActive
          ? 'bg-gray-100 dark:bg-white/10 text-content shadow-soft dark:shadow-glow'
          : 'opacity-50 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-white/5'
        }
            `}
    >
      <div className="relative">
          <span className={`material-symbols-outlined text-2xl shrink-0 ${isActive ? 'text-primary' : ''}`}>{icon}</span>
          {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full animate-bounce">
                  {badge > 9 ? '9+' : badge}
              </span>
          )}
      </div>
      {label && <span className={`ml-3 font-semibold text-sm transition-opacity duration-300 ${isActive ? 'text-content' : ''}`}>{label}</span>}

      {/* Indicador Ativo */}
      {isActive && (
        <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(71,244,37,0.8)]"></div>
      )}

      {/* Tooltip Mobile/Tablet (Somente quando sem label) */}
      {!label && (
        <div className="lg:hidden absolute left-14 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md z-50">
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
  const { isSyncing } = useTransactions();
  const [activeTab, setActiveTab] = useState<typeof TABS[keyof typeof TABS]>(TABS.DASHBOARD);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [addTransactionInitialData, setAddTransactionInitialData] = useState<any>(null);
  const [showManagement, setShowManagement] = useState(false);
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

  // No longer using hover delay for sidebar
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
    return () => window.removeEventListener('change-tab', handleChangeTab);
  }, []);

  // Fecha o menu mobile ao trocar de aba e atualiza histórico
  const handleTabChange = (tab: ActiveTab) => {
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

  const onNavigateFromProfile = (target: string) => {
    if (target === 'Cartões') {
      setActiveTab(TABS.CARDS);
    } else if (target === 'Configurações') {
      setActiveTab(TABS.CONFIG);
    } else if (target === 'Despesas Previstas') {
      setActiveTab(TABS.RELATORIOS);
    } else if (target === 'Importar CSV') {
      setActiveTab(TABS.IMPORT);
    }
  };

  const handleSaveSuccess = () => {
    setIsAddTransactionOpen(false);
    handleTabChange(TABS.EXTRATO);
  };

  const isSubPage = activeTab === TABS.CONFIG || activeTab === TABS.IMPORT || activeTab === TABS.CARDS || activeTab === TABS.ACCOUNTS;

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
        return <TransactionsList searchQuery={searchQuery} />;
      case TABS.RELATORIOS:
        return <AccountsPayable />;
      case TABS.CARDS:
        return <MyCards onBack={() => setActiveTab(TABS.DASHBOARD)} />;
      case TABS.ACCOUNTS:
        return <AccountsManagement onBack={() => setActiveTab(TABS.PERFIL)} />;
      case TABS.NOTIFICATIONS:
        return <NotificationsCenter onBack={() => setActiveTab(TABS.DASHBOARD)} />;
      case TABS.IMPORT:
        return (
          <div className="max-w-4xl mx-auto mt-6">
            <DataManagement />
          </div>
        );
      case TABS.PERFIL:
        return (
          <UserProfile 
            onNavigate={onNavigateFromProfile} 
            onPhotoClick={() => setIsPhotoModalOpen(true)}
            profileAction={profileAction}
            setProfileAction={setProfileAction}
          />
        );
      case TABS.CONFIG:
        return <Settings onNavigate={handleTabChange} />;
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

      <LoadingOverlay show={isSyncing} />

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
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto w-full">
          <NavItem icon="home" label="Início" isActive={activeTab === TABS.DASHBOARD} onClick={() => handleTabChange(TABS.DASHBOARD)} />
          <NavItem icon="receipt_long" label="Extrato" isActive={activeTab === TABS.EXTRATO} onClick={() => handleTabChange(TABS.EXTRATO)} />
          <NavItem icon="upload_file" label="Importar" isActive={activeTab === TABS.IMPORT} onClick={() => handleTabChange(TABS.IMPORT)} />
          <NavItem icon="pie_chart" label="Relatórios" isActive={activeTab === TABS.RELATORIOS} onClick={() => handleTabChange(TABS.RELATORIOS)} />
          <NavItem icon="notifications" label="Notificações" isActive={activeTab === TABS.NOTIFICATIONS} onClick={() => handleTabChange(TABS.NOTIFICATIONS)} badge={unreadCount} />
          <NavItem icon="person" label="Perfil" isActive={activeTab === TABS.PERFIL} onClick={() => handleTabChange(TABS.PERFIL)} />
        </nav>

        {/* Bottom Theme & Settings Mobile */}
        <div className="mt-auto p-6 border-t border-gray-100 dark:border-white/5 space-y-4">
           {/* Theme Toggle Mobile */}
           <div className="flex items-center justify-between px-3">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary/40 dark:text-white/40">Tema</span>
              <button 
                 onClick={toggleTheme}
                 className={`
                   relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                   ${theme === 'dark' ? 'bg-primary/20' : 'bg-gray-200'}
                 `}
              >
                 <span className={`
                    pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}
                 `}>
                    <span className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}`}>
                       <span className="material-symbols-outlined text-[12px] text-gray-400">light_mode</span>
                    </span>
                    <span className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
                       <span className="material-symbols-outlined text-[12px] text-primary">dark_mode</span>
                    </span>
                 </span>
              </button>
           </div>
           
           <NavItem icon="settings" label="Configurações" isActive={activeTab === TABS.CONFIG} onClick={() => handleTabChange(TABS.CONFIG)} />
           <button
             onClick={logout}
             className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors mt-2"
           >
             <span className="material-symbols-outlined text-xl">logout</span>
             <span className="text-sm font-bold">Sair</span>
           </button>
        </div>
      </motion.aside>

      {/* Sidebar Desktop */}
      <aside 
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        className={`hidden md:flex flex-col glass-dock z-40 h-full relative transition-all duration-300 py-8 overflow-y-auto custom-scrollbar cursor-pointer ${isExpanded ? 'w-64 items-stretch' : 'w-20 items-center overflow-x-hidden'}`}
      >
        <div className={`mb-8 flex items-center px-6 gap-3 ${!isExpanded ? 'justify-center' : ''}`}>
          {!isExpanded ? (
            <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
              <span className="font-extrabold text-xl tracking-tight text-content">Fintech<span className="text-primary">.</span></span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-2 flex flex-col w-full px-4">
          <NavItem
            icon="home"
            label={isExpanded ? "Início" : ""}
            isActive={activeTab === TABS.DASHBOARD}
            onClick={() => setActiveTab(TABS.DASHBOARD)}
          />
          <NavItem
            icon="receipt_long"
            label={isExpanded ? "Extrato" : ""}
            isActive={activeTab === TABS.EXTRATO}
            onClick={() => setActiveTab(TABS.EXTRATO)}
          />
          <NavItem
            icon="notifications"
            label={isExpanded ? "Notificações" : ""}
            isActive={isNotificationPanelOpen}
            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
            badge={unreadCount}
          />
          <NavItem
            icon="upload_file"
            label={isExpanded ? "Importar" : ""}
            isActive={activeTab === TABS.IMPORT}
            onClick={() => setActiveTab(TABS.IMPORT)}
          />
          <NavItem
            icon="pie_chart"
            label={isExpanded ? "Contas" : ""}
            isActive={activeTab === TABS.RELATORIOS}
            onClick={() => setActiveTab(TABS.RELATORIOS)}
          />
          <NavItem
            icon="person"
            label={isExpanded ? "Perfil" : ""}
            isActive={activeTab === TABS.PERFIL}
            onClick={() => setActiveTab(TABS.PERFIL)}
          />

          <button 
            onClick={(e) => { e.stopPropagation(); setIsAddTransactionOpen(true); }}
            className={`
              mt-6 flex items-center gap-3 bg-primary text-secondary font-bold rounded-2xl transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20
              ${!isExpanded ? 'size-12 justify-center' : 'w-full py-4 px-6'}
            `}
          >
            <span className="material-symbols-outlined text-2xl font-bold">add</span>
            {isExpanded && <span className="uppercase tracking-widest text-[11px]">Nova Transação</span>}
          </button>
        </nav>

        {/* Bottom Config & Toggle */}
        <div className="mt-auto pt-6 border-t border-white/5 w-full px-4 flex flex-col gap-2">
          <NavItem
            icon="settings"
            label={isExpanded ? "Configurações" : ""}
            isActive={activeTab === TABS.CONFIG}
            onClick={() => setActiveTab(TABS.CONFIG)}
          />
          
          {/* Theme Toggle Switch */}
          <div className={`flex items-center gap-3 p-2 mt-2 border-t border-white/5 ${!isExpanded ? 'justify-center' : 'px-3'}`}>
             {isExpanded && (
               <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">Tema</span>
             )}
             <button 
                onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-white/10
                  ${theme === 'dark' ? 'bg-primary/20' : 'bg-gray-200'}
                `}
             >
                <span className="sr-only">Toggle Theme</span>
                <span
                  className={`
                    pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${theme === 'dark' ? 'translate-x-[20px]' : 'translate-x-0'}
                  `}
                >
                  <span
                    className={`
                      absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
                      ${theme === 'dark' ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}
                    `}
                  >
                    <span className="material-symbols-outlined text-[10px] text-gray-400">light_mode</span>
                  </span>
                  <span
                    className={`
                      absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
                      ${theme === 'dark' ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}
                    `}
                  >
                     <span className="material-symbols-outlined text-[10px] text-primary">dark_mode</span>
                  </span>
                </span>
             </button>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(!isSidebarCollapsed); }}
            className="flex items-center justify-center p-2 text-content/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">
              {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
          
          {/* Logout Button */}
          <button
            onClick={(e) => { e.stopPropagation(); logout(); }}
            className={`flex items-center gap-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-2 ${!isExpanded ? 'justify-center p-2' : 'w-full px-3 py-2'}`}
          >
            <span className="material-symbols-outlined">logout</span>
            {isExpanded && <span className="text-sm font-bold">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        
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
            {activeTab === TABS.EXTRATO && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`size-10 flex items-center justify-center transition-colors rounded-full ${isEditMode ? 'bg-primary/20 text-primary' : 'text-content'}`}
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            )}
          </div>
          <h1 className="text-lg font-bold">{activeTab}</h1>
          <div className="flex items-center gap-2">
            {activeTab === TABS.EXTRATO && (
              <div className="relative">
                {isSearchOpen ? (
                  <div className="absolute right-0 top-0 flex items-center gap-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full px-4 py-2 shadow-lg z-100 animate-in slide-in-from-right">
                    <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-sm text-content placeholder-content/50 w-40"
                      placeholder="Buscar..."
                      type="text"
                    />
                    <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)} className="size-10 flex items-center justify-center text-content">
                    <span className="material-symbols-outlined">search</span>
                  </button>
                )}
              </div>
            )}
            
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
                          onClick={logout}
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
            <div className="flex items-center gap-4">
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
                            onClick={logout}
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
          <button onClick={() => setActiveTab(TABS.RELATORIOS)} className={`flex items-center justify-center transition-colors hover:bg-white/5 rounded-full w-10 h-10 ${activeTab === TABS.RELATORIOS ? 'text-primary' : 'text-white/40 hover:text-white'}`}>
            <span className="material-symbols-outlined text-[26px]">pie_chart</span>
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
    <TransactionsProvider>
      <NotificationsProvider>
        <AppContent />
      </NotificationsProvider>
    </TransactionsProvider>
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
