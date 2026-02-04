import React from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { exportCSV, exportJSON } from '@/utils/csvHandler';
import ImportTransaction from './ImportTransaction';

// APPS_SCRIPT_URL centralizado em syncService.ts

const DataManagement: React.FC = () => {
  const {
    transactions,
    clearTransactions,
    removeDuplicates,
    availableCategories,
    accounts,
    cards,
    isSyncing: isContextSyncing,
    lastSync,
    forceRefresh
  } = useTransactions();
  
  const { user } = useAuth();

  const [showImport, setShowImport] = React.useState(false);

  // Estados da sincronização com Google Sheets
  const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  // Estados do modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportType, setExportType] = React.useState<'complete' | 'period'>('complete');
  const [exportPeriod, setExportPeriod] = React.useState<'days' | 'months' | 'years'>('days');
  const [exportValue, setExportValue] = React.useState<number>(30);

  // Estados dos modais de confirmação perigosa
  const [isClearModalOpen, setIsClearModalOpen] = React.useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = React.useState(false);
  const [isCleanOrphanModalOpen, setIsCleanOrphanModalOpen] = React.useState(false);
  const [isCleaningOrphans, setIsCleaningOrphans] = React.useState(false);
  const [cleanOrphanResult, setCleanOrphanResult] = React.useState<string | null>(null);

  // Calcular tamanho estimado do armazenamento local
  const dataSize = JSON.stringify({
    transactions,
    categories: availableCategories,
    accounts,
  }).length;
  const usedMB = (dataSize / (1024 * 1024)).toFixed(2);
  const usagePercent = Math.min(
    100,
    (dataSize / (5 * 1024 * 1024)) * 100
  ).toFixed(1);

  const handleExportConfig = () => {
    const configData = {
      categories: availableCategories,
      accounts: accounts,
      cards: cards
    };
    exportJSON(configData, 'fincontrol_config');
  };

  const handleFullBackup = () => {
    const backupData = {
      user,
      transactions,
      categories: availableCategories,
      accounts,
      cards,
      version: '1.2',
      exportedAt: new Date().toISOString()
    };
    exportJSON(backupData, 'fincontrol_full_backup');
  };

  const { restoreBackup } = useTransactions();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions && data.categories) {
          if (confirm('Deseja realmente restaurar este backup? Isso substituirá todos os dados atuais por uma versão anterior.')) {
            restoreBackup(data);
            alert('Backup restaurado com sucesso!');
          }
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (e.target) e.target.value = '';
  };

  // postToScript removido daqui, centralizado em syncService.ts através do context

  async function handleConfirmSync() {
    try {
      setSyncError(null);
      setSyncResult(null);
      await forceRefresh(); // Pull first to ensure no conflicts (simple version)
      setSyncResult("✅ Dados atualizados com as Sheets!");
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setSyncResult(null);
      }, 3000);
    } catch (err: any) {
      setSyncError(`Erro: ${err.message}`);
    }
  }

  function handleExport() {
    let txToExport = transactions;

    if (exportType === 'period') {
      const now = new Date();
      let cutoffDate: Date;

      if (exportPeriod === 'days') {
        cutoffDate = new Date(now.getTime() - exportValue * 24 * 60 * 60 * 1000);
      } else if (exportPeriod === 'months') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - exportValue, 1);
      } else {
        cutoffDate = new Date(now.getFullYear() - exportValue, 0, 1);
      }

      txToExport = txToExport.filter((t) => new Date(t.date) >= cutoffDate);
    }

    // Exporta transações filtradas + contas + categorias
    exportCSV(txToExport);
    setIsExportModalOpen(false);
  }

  const handleClear = () => {
    clearTransactions();
    setIsClearModalOpen(false);
  };

  const handleRemoveDuplicates = () => {
    removeDuplicates();
    setIsDuplicatesModalOpen(false);
  };

  const handleCleanOrphans = async () => {
    if (!user?.username) {
      alert('Você precisa estar logado para limpar dados órfãos.');
      return;
    }

    try {
      setIsCleaningOrphans(true);
      setCleanOrphanResult(null);

      const { cleanOrphanData } = await import('@/utils/syncService');
      const result = await cleanOrphanData();

      if (result.success) {
        setCleanOrphanResult(`✅ Limpeza concluída! ${result.removed || 0} registros órfãos removidos.`);
        
        // Refresh data after cleanup
        setTimeout(() => {
          forceRefresh();
          setIsCleanOrphanModalOpen(false);
          setCleanOrphanResult(null);
        }, 3000);
      }
    } catch (err: any) {
      setCleanOrphanResult(`❌ Erro: ${err.message || 'Falha ao limpar dados órfãos'}`);
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const totalTransactions = transactions.length;
  const totalAccounts = accounts.length;
  const totalCategories =
    (availableCategories.income?.length || 0) +
    (availableCategories.expense?.length || 0);

  return (
    <div className="h-full flex flex-col animate-fade-up">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">

      {/* Cabeçalho */}
      <p className="px-6 text-dim text-base font-medium leading-normal pt-2">
        Controle total sobre suas informações financeiras e portabilidade.
      </p>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 px-6">
        {/* Indicador de Armazenamento */}
        <div className="py-6">
          <div className="rounded-2xl bg-surface shadow-lg p-6 transition-all border border-gray-100 dark:border-white/5 nm-card">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-black text-dim uppercase tracking-wider mb-1">
                  Armazenamento Local
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-content">
                    {usedMB}
                  </span>
                  <span className="text-sm font-semibold text-dim">MB usados</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-3xl">
                  database
                </span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-[#1f2b1c] rounded-full h-3 shadow-inner overflow-hidden relative">
              <div
                className="bg-primary h-3 rounded-full shadow-[0_0_10px_rgba(71,244,37,0.5)] transition-all duration-1000"
                style={{ width: `${Math.max(1, Number(usagePercent))}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-dim font-black text-right uppercase tracking-[0.05em]">
              {usagePercent}% da cota (estimado)
            </div>
          </div>
        </div>

        {/* Ações principais */}
        <div className="grid grid-cols-2 gap-5 mb-6 text-left">
          {/* Exportar CSV */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface nm-card p-6 transition-all active:scale-[0.98] border border-gray-100 dark:border-white/5 hover:border-primary/20 text-left"
          >
            <div className="flex items-center justify-center size-14 rounded-full bg-white/5 text-primary group-hover:scale-110 transition-transform shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                ios_share
              </span>
            </div>
            <div className="text-center">
              <p className="text-content text-lg font-black leading-tight">
                Exportar
              </p>
              <p className="text-dim text-xs font-bold mt-1">
                CSV (período ou completo)
              </p>
            </div>
          </button>

          {/* Importar CSV */}
          <button
            onClick={() => setShowImport(!showImport)}
            className={`group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface nm-card p-6 transition-all active:scale-[0.98] border border-gray-100 dark:border-white/5 ${
              showImport ? 'ring-2 ring-primary border-transparent' : ''
            }`}
          >
            <div className="flex items-center justify-center size-14 rounded-full bg-gray-200 dark:bg-white/5 text-gray-900 dark:text-content group-hover:scale-110 transition-transform shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                download
              </span>
            </div>
            <div className="text-center">
              <p className="text-content text-lg font-black leading-tight">
                Importar
              </p>
              <p className="text-dim text-xs font-bold mt-1">Inserir CSV</p>
            </div>
          </button>

          {/* Exportar Configurações */}
          <button
            onClick={handleExportConfig}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface nm-card p-6 transition-all active:scale-[0.98] border border-gray-100 dark:border-white/5 hover:border-primary/20 text-left"
          >
            <div className="flex items-center justify-center size-14 rounded-full bg-white/5 text-primary group-hover:scale-110 transition-transform shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                settings
              </span>
            </div>
            <div className="text-center">
              <p className="text-content text-lg font-black leading-tight">
                Configurações
              </p>
              <p className="text-dim text-xs font-bold mt-1">
                Cats, Contas, Cartões
              </p>
            </div>
          </button>

          {/* Backup Completo */}
          <button
            onClick={handleFullBackup}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface nm-card p-6 transition-all active:scale-[0.98] border border-gray-100 dark:border-white/5 hover:border-primary/20 text-left"
          >
            <div className="flex items-center justify-center size-14 rounded-full bg-white/5 text-emerald-500 group-hover:scale-110 transition-transform shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                backup
              </span>
            </div>
            <div className="text-center">
              <p className="text-content text-lg font-black leading-tight">
                Full Backup
              </p>
              <p className="text-dim text-xs font-bold mt-1">
                Tudo (JSON)
              </p>
            </div>
          </button>

          {/* Restaurar Backup */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface nm-card p-6 transition-all active:scale-[0.98] border border-gray-100 dark:border-white/5 hover:border-primary/20 text-left"
          >
            <div className="flex items-center justify-center size-14 rounded-full bg-white/5 text-blue-500 group-hover:scale-110 transition-transform shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                settings_backup_restore
              </span>
            </div>
            <div className="text-center">
              <p className="text-content text-lg font-black leading-tight">
                Restaurar
              </p>
              <p className="text-dim text-xs font-bold mt-1">
                Substituir dados
              </p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleRestoreBackup}
            />
          </button>
        </div>

        {showImport && (
          <div className="mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <ImportTransaction />
          </div>
        )}

        {/* Card de Sincronização com Google Sheets */}
        <div className="mb-6">
          <div className="rounded-2xl bg-surface nm-card p-6 border border-gray-100 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] font-black text-dim uppercase tracking-wider mb-1">
                  Sincronização com Google Sheets
                </p>
                <p className="text-sm text-dim leading-snug">
                  Envie seus dados para a planilha oficial (Transações, Contas,
                  Categorias)
                </p>
              </div>
              <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary relative">
                {isContextSyncing ? (
                    <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-[24px]">sync</span>
                )}
              </div>
            </div>

            {lastSync && (
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                    Última atualização: {lastSync.toLocaleTimeString('pt-BR')}
                </p>
            )}

            <ul className="text-[11px] text-dim space-y-1">
              <li>
                • <strong>{totalTransactions}</strong> transações
              </li>
              <li>
                • <strong>{totalAccounts}</strong> contas
              </li>
              <li>
                • <strong>{totalCategories}</strong> categorias
              </li>
            </ul>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              disabled={isContextSyncing}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-secondary text-[11px] font-black uppercase tracking-[0.2em] py-3 px-4 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">
                cloud_upload
              </span>
              {isContextSyncing ? 'Sincronizando...' : 'Sincronizar Banco de Dados'}
            </button>

            {user?.username && (
              <button
                onClick={() => setIsCleanOrphanModalOpen(true)}
                disabled={isCleaningOrphans}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/30 text-[11px] font-black uppercase tracking-[0.2em] py-3 px-4 hover:bg-orange-500/20 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">
                  cleaning_services
                </span>
                {isCleaningOrphans ? 'Limpando...' : 'Limpar Dados Órfãos'}
              </button>
            )}
          </div>
        </div>

        {/* Footer - Zona perigosa */}
        <div className="mt-8 px-4 py-8 text-center border-t border-white/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-dim text-sm">
              lock
            </span>
            <p className="text-dim text-[10px] font-black uppercase tracking-widest">
              Segurança de Dados
            </p>
          </div>
          <p className="text-dim/70 text-[11px] font-bold leading-relaxed max-w-[280px] mx-auto">
            Seus dados ficam salvos localmente. Use exportação ou sincronização para
            backup.
          </p>

          <div className="flex flex-col gap-2 mt-8">
            <button
              onClick={() => setIsDuplicatesModalOpen(true)}
              className="text-[10px] text-primary/70 hover:text-primary font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-primary/10 transition-colors border border-primary/20"
            >
              Remover duplicatas
            </button>
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="text-[10px] text-red-500 hover:text-red-400 font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              Apagar todos os dados
            </button>
          </div>
        </div>
      </div>

      {/* Modals outside of animated container to avoid fixed position issues */}
      
      {/* Modal de confirmação de sincronização */}
      {isSyncModalOpen && (
        <div 
            onClick={() => !isContextSyncing && setIsSyncModalOpen(false)}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-white/5 animate-in zoom-in-95 duration-200"
          >
            <h2 className="text-sm font-black text-content mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">sync</span>
              Sincronização
            </h2>
            
            {syncResult ? (
                <div className="py-4 space-y-4">
                    <div className="text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 whitespace-pre-line font-bold leading-relaxed">
                        {syncResult}
                    </div>
                    <p className="text-[10px] text-dim text-center animate-pulse">Fechando automaticamente em 5s...</p>
                </div>
            ) : syncError ? (
                <div className="py-4 space-y-4">
                    <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-bold leading-relaxed">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-sm">error</span>
                            ERRO
                        </div>
                        {syncError}
                    </div>
                    <p className="text-[10px] text-dim text-center">Tente novamente ou verifique suas credenciais.</p>
                </div>
            ) : (
                <>
                <p className="text-[11px] text-dim mb-3">
                  Isso enviará <strong>todos</strong> os seus dados para o Google Sheets:
                </p>
                <ul className="text-[11px] text-dim mb-4 space-y-1">
                  <li>• {totalTransactions} transações</li>
                  <li>• {totalAccounts} contas</li>
                  <li>• {totalCategories} categorias</li>
                </ul>
                <p className="text-[11px] text-dim/80 mb-4">
                  Seus dados locais não serão apagados.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsSyncModalOpen(false)}
                    disabled={isContextSyncing}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold text-dim hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSync}
                    disabled={isContextSyncing}
                    className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-secondary hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isContextSyncing && (
                      <span className="material-symbols-outlined text-[14px] animate-spin">
                        progress_activity
                      </span>
                    )}
                    {isContextSyncing ? 'Sincronizando...' : 'Confirmar'}
                  </button>
                </div>
                </>
            )}
          </div>
        </div>
      )}

      {/* Modal de exportação com período */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-white/5">
            <h2 className="text-sm font-black text-content mb-4">
              Exportar CSV
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-2">
                  Tipo de exportação
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportType('complete')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                      exportType === 'complete'
                        ? 'bg-primary text-secondary shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-dim'
                    }`}
                  >
                    Backup Completo
                  </button>
                  <button
                    onClick={() => setExportType('period')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                      exportType === 'period'
                        ? 'bg-primary text-secondary shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-dim'
                    }`}
                  >
                    Período
                  </button>
                </div>
              </div>

              {exportType === 'period' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-1">
                      Período
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExportPeriod('days')}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                          exportPeriod === 'days'
                            ? 'bg-primary text-secondary shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-dim'
                        }`}
                      >
                        Dias
                      </button>
                      <button
                        onClick={() => setExportPeriod('months')}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                          exportPeriod === 'months'
                            ? 'bg-primary text-secondary shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-dim'
                        }`}
                      >
                        Meses
                      </button>
                      <button
                        onClick={() => setExportPeriod('years')}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                          exportPeriod === 'years'
                            ? 'bg-primary text-secondary shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-dim'
                        }`}
                      >
                        Anos
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={exportPeriod === 'days' ? 365 : exportPeriod === 'months' ? 60 : 10}
                      value={exportValue}
                      onChange={(e) => setExportValue(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-content font-bold focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-dim hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-secondary hover:brightness-110 active:scale-[0.97] transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">
                  ios_share
                </span>
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação apagar dados */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-white/5">
            <h2 className="text-sm font-black text-content mb-2">
              Apagar TODOS os dados?
            </h2>
            <p className="text-[11px] text-red-500 mb-4">
              Isso vai <strong>deletar permanentemente</strong>:
            </p>
            <ul className="text-[11px] text-dim mb-4 space-y-1">
              <li>• {totalTransactions} transações</li>
              <li>• {totalAccounts} contas</li>
              <li>• {totalCategories} categorias</li>
            </ul>
            <p className="text-[11px] text-dim/80 mb-6">
              Use exportação ou sincronização para backup antes!
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-dim hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-red-500 text-white hover:brightness-110 active:scale-[0.97] transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">
                  delete_forever
                </span>
                Apagar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação remover duplicatas */}
      {isDuplicatesModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-white/5">
            <h2 className="text-sm font-black text-content mb-2">
              Remover transações duplicadas?
            </h2>
            <p className="text-[11px] text-dim mb-4">
              Isso removerá transações idênticas (mesma data, valor, descrição,
              categoria e tipo).
            </p>
            <p className="text-[11px] text-dim/80 mb-6">
              {totalTransactions} transações serão analisadas.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDuplicatesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-dim hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveDuplicates}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-secondary hover:brightness-110 active:scale-[0.97] transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">
                  delete_sweep
                </span>
                Remover Duplicatas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de limpeza de dados órfãos */}
      {isCleanOrphanModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-white/5">
            <h2 className="text-sm font-black text-content mb-2">
              Limpar Dados Órfãos?
            </h2>
            <p className="text-[11px] text-dim mb-4">
              Esta ação irá <strong>remover permanentemente</strong> todos os registros no Google Sheets que não possuem um <code className="bg-white/10 px-1 rounded">username</code> associado.
            </p>
            <p className="text-[11px] text-orange-500 mb-4">
              ⚠️ Isso inclui transações, contas, categorias e cartões órfãos.
            </p>

            {cleanOrphanResult && (
              <div className={`text-[11px] mb-4 p-3 rounded-xl ${
                cleanOrphanResult.startsWith('✅') 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {cleanOrphanResult}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCleanOrphanModalOpen(false);
                  setCleanOrphanResult(null);
                }}
                disabled={isCleaningOrphans}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-dim hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCleanOrphans}
                disabled={isCleaningOrphans}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-orange-500 text-white hover:brightness-110 active:scale-[0.97] transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isCleaningOrphans ? 'progress_activity' : 'cleaning_services'}
                </span>
                {isCleaningOrphans ? 'Limpando...' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>

  );
};

export default DataManagement;
