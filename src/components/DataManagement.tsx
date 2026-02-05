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
    <div className="flex flex-col gap-8 animate-fade-up max-w-4xl mx-auto w-full pb-20 px-4 lg:px-0">
      {/* 1. Status de Armazenamento */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">storage</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Armazenamento</h3>
        </div>
        <div className="nm-card p-6 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-2xl font-black text-content">{usedMB} <span className="text-sm text-dim font-bold">MB</span></p>
                    <p className="text-xs text-dim font-bold">Consumo local estimado</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-primary">{usagePercent}%</p>
                    <p className="text-[10px] text-dim font-black uppercase tracking-widest">Da cota</p>
                </div>
            </div>
            <div className="w-full bg-content/5 rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    className="h-full bg-primary shadow-glow"
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </div>
        </div>
      </section>

      {/* 2. Importação e Exportação */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">import_export</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Arquivos Externos</h3>
        </div>
        <div className="nm-card p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
            <button 
                onClick={() => setShowImport(!showImport)}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${showImport ? 'bg-primary/10 border-primary/20' : 'hover:bg-content/5'}`}
            >
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">download</span>
                    </div>
                    <div className="text-left">
                        <p className="font-black text-content text-sm">Importar CSV</p>
                        <p className="text-[10px] text-dim font-bold uppercase tracking-widest">Adicionar transações</p>
                    </div>
                </div>
                {showImport ? <span className="material-symbols-outlined text-primary">expand_less</span> : <span className="material-symbols-outlined text-dim">expand_more</span>}
            </button>

            <button 
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center justify-between p-4 hover:bg-content/5 rounded-2xl transition-all group text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">ios_share</span>
                    </div>
                    <div>
                        <p className="font-black text-content text-sm">Exportar Dados</p>
                        <p className="text-[10px] text-dim font-bold uppercase tracking-widest">Planilhas e CSV</p>
                    </div>
                </div>
                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
            </button>
        </div>

        {showImport && (
          <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <ImportTransaction />
          </div>
        )}
      </section>

      {/* 3. Backup e Nuvem */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">cloud</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-content/60">Backup & Cloud</h3>
        </div>
        <div className="nm-card p-4 space-y-4">
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">backup</span>
                    </div>
                    <div>
                        <p className="font-black text-content text-sm">Google Sheets</p>
                        {lastSync ? (
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest">Sinc. em {lastSync.toLocaleTimeString('pt-BR')}</p>
                        ) : (
                            <p className="text-[10px] text-dim font-black uppercase tracking-widest">Nunca sincronizado</p>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => setIsSyncModalOpen(true)}
                    disabled={isContextSyncing}
                    className="px-4 py-2 bg-primary text-secondary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow active:scale-95 transition-all"
                >
                    {isContextSyncing ? 'Agurade...' : 'Sincronizar'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={handleFullBackup}
                    className="flex items-center gap-4 p-4 hover:bg-content/5 rounded-2xl transition-all group text-left"
                >
                    <div className="size-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                        <span className="material-symbols-outlined">file_download</span>
                    </div>
                    <div>
                        <p className="font-black text-content text-xs">Criar Backup</p>
                        <p className="text-[9px] text-dim font-bold uppercase tracking-widest">Arquivo .JSON</p>
                    </div>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-4 p-4 hover:bg-content/5 rounded-2xl transition-all group text-left"
                >
                    <div className="size-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500">
                        <span className="material-symbols-outlined">settings_backup_restore</span>
                    </div>
                    <div>
                        <p className="font-black text-content text-xs">Restaurar Backup</p>
                        <p className="text-[9px] text-dim font-bold uppercase tracking-widest">Recuperar dados</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestoreBackup} />
                </button>
            </div>
        </div>
      </section>

      {/* 4. Manutenção de Sistema */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-red-500">engineering</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-red-500/60">Manutenção</h3>
        </div>
        <div className="nm-card p-2 space-y-1">
            <button 
                onClick={handleRemoveDuplicates}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/5 rounded-2xl transition-all group"
            >
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-orange-500">cleaning_services</span>
                    <span className="text-sm font-bold text-content">Remover Transações Duplicadas</span>
                </div>
                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
            </button>
            <button 
                onClick={() => setIsCleanOrphanModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/5 rounded-2xl transition-all group"
            >
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-orange-500">mystery_beam</span>
                    <span className="text-sm font-bold text-content">Limpar Dados Órfãos (Cloud)</span>
                </div>
                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
            </button>
            <button 
                onClick={() => setIsClearModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-red-500/5 rounded-2xl transition-all group"
            >
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-red-500">delete_forever</span>
                    <span className="text-sm font-bold text-red-500">Apagar Todos os Dados</span>
                </div>
                <span className="material-symbols-outlined text-dim text-sm">chevron_right</span>
            </button>
        </div>
      </section>

      <div className="pt-4 text-center">
        <p className="text-[10px] text-dim font-bold leading-relaxed max-w-sm mx-auto opacity-40">
            Seus dados são privados e ficam salvos em seu navegador. Recomendamos a realização de backups periódicos.
        </p>
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
  );
};

export default DataManagement;
