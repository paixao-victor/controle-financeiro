import React, { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import type { Card, CardType, Account } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { exportCardsCSV } from '@/utils/csvHandler';
import BottomSheetSelect from './BottomSheetSelect';
import BottomSheetIconSelector from './BottomSheetIconSelector'; // Reuse for account icon

const CardsManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { cards, addCard, deleteCard, updateCard, accounts, addAccount } = useTransactions();
    const [isAdding, setIsAdding] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    // Form states for Card
    const [alias, setAlias] = useState('');
    const [bank, setBank] = useState('nubank');
    const [color, setColor] = useState('#820ad1');
    const [closingDay, setClosingDay] = useState(15);
    const [dueDay, setDueDay] = useState(25);
    const [limit, setLimit] = useState('');
    const [type, setType] = useState<CardType>('credit');
    const [logoSigla, setLogoSigla] = useState('NU');
    const [initials, setInitials] = useState('');
    const [brand, setBrand] = useState<'VISA' | 'MASTER'>('VISA');
    const [isClosingDaySheetOpen, setIsClosingDaySheetOpen] = useState(false);
    const [isDueDaySheetOpen, setIsDueDaySheetOpen] = useState(false);

    // Food Card specific states
    const [rechargeValue, setRechargeValue] = useState('');
    const [rechargeDate, setRechargeDate] = useState(1);
    const [linkedAccountId, setLinkedAccountId] = useState('');
    const [isRechargeDateSheetOpen, setIsRechargeDateSheetOpen] = useState(false);
    const [isLinkedAccountSheetOpen, setIsLinkedAccountSheetOpen] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // New Account Modal States
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountBalance, setNewAccountBalance] = useState('0,00');
    const [newAccountIcon, setNewAccountIcon] = useState('account_balance');
    const [isIconSheetOpen, setIsIconSheetOpen] = useState(false);


    const DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        label: `Dia ${i + 1}`,
        icon: 'calendar_today'
    }));

    const PRESET_COLORS = ['#820ad1', '#ec7000', '#0038a8', '#009688', '#e91e63', '#4caf50'];

    const BANKS = [
        { id: 'nubank', label: 'Nubank', color: '#820ad1', sigla: 'NU' },
        { id: 'itau', label: 'Itaú', color: '#ec7000', sigla: 'IT' },
        { id: 'bnb', label: 'BNB', color: '#ffcc00', sigla: 'BNB' },
        { id: 'bb', label: 'BB', color: '#0038a8', sigla: 'BB' },
    ];

    // Options for Linked Accounts
    const accountOptions = [
        ...accounts.filter(acc => acc.status !== 'deleted').map(acc => ({
            id: String(acc.id),
            label: acc.name,
            icon: acc.icon
        })),
        { id: 'NEW_ACCOUNT', label: '+ Adicionar Nova Conta', icon: 'add_circle', isAction: true }
    ];

    const needsLinkedAccount = type === 'debit' || type === 'both' || type === 'food';

    const handleSave = () => {
        setValidationError(null);
        if (!alias) return alert('Dê um apelido ao cartão.');

        if (needsLinkedAccount && !linkedAccountId) {
            setValidationError('linkedAccountId');
            return; // Stop save if validation fails
        }
        
        const newCard: Card = {
            id: editingCard?.id || Date.now().toString(),
            alias,
            bank,
            brand,
            color,
            closingDay,
            dueDay,
            limit: parseFloat(limit) || 0,
            type,
            initials: initials.slice(0, 3).toUpperCase(),
            rechargeValue: type === 'food' ? parseFloat(rechargeValue) || 0 : undefined,
            rechargeDate: type === 'food' ? rechargeDate : undefined,
            linkedAccountId: needsLinkedAccount ? linkedAccountId : undefined,
        };

        if (editingCard) {
            updateCard(editingCard.id, newCard);
            setEditingCard(null);
        } else {
            addCard(newCard);
        }
        
        resetForm();
        setIsAdding(false);
    };

    const handleSaveNewAccount = () => {
        if (!newAccountName) return alert("Nome da conta é obrigatório");
        const balance = parseFloat(newAccountBalance.replace(/\./g, '').replace(',', '.'));
        
        const newAccount: Account = {
            id: Date.now().toString(),
            name: newAccountName,
            icon: newAccountIcon,
            balance: balance
        };
        
        addAccount(newAccount);
        setLinkedAccountId(newAccount.id); // Auto-select new account
        setIsAddAccountModalOpen(false);
        setNewAccountName('');
        setNewAccountBalance('0,00');
        setNewAccountIcon('account_balance');
    };

    const handleNewAccountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') value = '0';
        if (value.length > 1) {
            value = value.replace(/^0+/, '');
            if (value === '') value = '0';
        }
        const floatValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(floatValue);
        setNewAccountBalance(formatted);
    };


    const resetForm = () => {
        setAlias('');
        setBank('nubank');
        setColor('#820ad1');
        setClosingDay(15);
        setDueDay(25);
        setLimit('');
        setType('credit');
        setLogoSigla('NU');
        setInitials('');
        setRechargeValue('');
        setRechargeDate(1);
        setLinkedAccountId('');
        setBrand('VISA');
        setValidationError(null);
    };

    const handleEdit = (card: Card) => {
        setEditingCard(card);
        setAlias(card.alias);
        setBank(card.bank);
        setColor(card.color);
        setClosingDay(card.closingDay);
        setDueDay(card.dueDay);
        setLimit(card.limit.toString());
        setType(card.type);
        const bankData = BANKS.find(b => b.id === card.bank);
        setLogoSigla(bankData?.sigla || '??');
        setInitials(card.initials || '');
        // Food fields
        setRechargeValue(card.rechargeValue?.toString() || '');
        setRechargeDate(card.rechargeDate || 1);
        setLinkedAccountId(card.linkedAccountId || '');
        setBrand(card.brand === 'MASTER' ? 'MASTER' : 'VISA');
        setValidationError(null);
        
        setIsAdding(true);
    };

    return (
        <div className="flex flex-col h-full bg-background p-4 md:p-8 animate-in fade-in duration-300 max-w-lg mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={() => {
                        if (isAdding) {
                            setIsAdding(false);
                            resetForm();
                            setEditingCard(null);
                        } else {
                            onBack();
                        }
                    }}
                    className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-content">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-content uppercase tracking-widest">Meus Cartões</h1>
                <button 
                    onClick={() => exportCardsCSV(cards)}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all font-bold"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            <main className="flex-1 space-y-8 pb-32 overflow-y-auto no-scrollbar">
                {/* Modal de Adição/Edição */}
                <Dialog open={isAdding} onOpenChange={(open) => { if (!open) { setIsAdding(false); resetForm(); setEditingCard(null); } }}>
                    <DialogContent className="sm:max-w-xl bg-surface border-border p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-9999">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-bold text-content uppercase tracking-widest">
                                    {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                                </DialogTitle>
                                <button 
                                    onClick={() => { setIsAdding(false); resetForm(); setEditingCard(null); }}
                                    className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined text-dim">close</span>
                                </button>
                            </div>
                        </DialogHeader>

                        <div className="space-y-8 py-4">
                            {/* Visual Card Preview */}
                            <section className="w-full flex justify-center py-2 animate-in slide-in-from-top-4 duration-300">
                                <div 
                                    className="relative w-full aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden text-white transition-all duration-500 transform"
                                    style={{ background: `linear-gradient(135deg, ${color} 0%, #000000 100%)` }}
                                >
                                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                                    <div className="relative h-full flex flex-col justify-between p-6 z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                                                <span className="font-bold text-lg tracking-widest text-white">{initials.slice(0, 3).toUpperCase() || logoSigla}</span>
                                            </div>
                                            <span className="material-symbols-outlined text-3xl opacity-80">contactless</span>
                                        </div>
                                        <div className="flex flex-col gap-5">
                                            <div className="w-11 h-8 rounded-md bg-yellow-100/20 border border-yellow-200/30 flex stroke-black/20" />
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase opacity-70 font-medium tracking-wider mb-0.5">Apelido</span>
                                                    <span className="font-bold tracking-wide text-sm truncate max-w-[180px]">{alias || 'NOME DO CARTÃO'}</span>
                                                </div>
                                                <div 
                                                    onClick={() => setBrand(prev => prev === 'VISA' ? 'MASTER' : 'VISA')}
                                                    className="flex flex-col items-end cursor-pointer select-none hover:scale-105 transition-transform"
                                                >
                                                    {brand === 'VISA' ? (
                                                        <span className="text-xl font-black italic tracking-tighter opacity-90 drop-shadow-md">VISA</span>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex -space-x-2">
                                                                <div className="size-5 rounded-full bg-[#eb001b] opacity-90" />
                                                                <div className="size-5 rounded-full bg-[#f79e1b] opacity-90" />
                                                            </div>
                                                            <span className="text-[7px] font-black uppercase tracking-tighter opacity-80 mt-0.5">mastercard</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Iniciais e Cores */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">Iniciais (3 letras)</label>
                                    <input 
                                        maxLength={3}
                                        value={initials}
                                        onChange={e => setInitials(e.target.value.toUpperCase())}
                                        placeholder="Ex: ABC"
                                        className="w-full nm-input bg-background/50 rounded-xl px-4 py-3 text-content font-black text-xl uppercase focus:ring-0 border-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-widest px-1">Cor do Cartão</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c}
                                                onClick={() => setColor(c)}
                                                className={`size-8 rounded-full border-2 transition-all ${color === c ? 'border-primary scale-110 shadow-glow' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <div className="relative size-8 group">
                                            <input 
                                                type="color"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                className="absolute inset-0 size-full opacity-0 cursor-pointer"
                                            />
                                            <div 
                                                className={`size-full rounded-full border-2 transition-all flex items-center justify-center ${!PRESET_COLORS.includes(color) ? 'border-primary' : 'border-content/20'}`}
                                                style={{ background: !PRESET_COLORS.includes(color) ? color : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                                            >
                                                <span className="material-symbols-outlined text-xs text-secondary-content">colorize</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tipo e Banco */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-dim uppercase tracking-widest px-1">Tipo de Cartão</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 nm-input rounded-2xl">
                                        {[
                                            { id: 'credit', label: 'Crédito' },
                                            { id: 'debit', label: 'Débito' },
                                            { id: 'both', label: 'Múltiplo' },
                                            { id: 'food', label: 'Alimentação' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setType(t.id as CardType)}
                                                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${type === t.id ? 'bg-primary text-secondary shadow-md' : 'text-dim hover:text-content'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Form Inputs */}
                            <div className="p-6 rounded-3xl bg-surface border border-white/5 space-y-6 shadow-xl">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Apelido do Cartão</label>
                                    <input 
                                        value={alias}
                                        onChange={e => setAlias(e.target.value)}
                                        placeholder="Ex: Cartão Compras"
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-content font-bold focus:border-primary outline-none transition-all placeholder:text-dim/50"
                                    />
                                </div>

                                {(type === 'credit' || type === 'both') && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Fechamento</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsClosingDaySheetOpen(true)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-content font-bold focus:border-primary outline-none text-left flex justify-between items-center group/btn"
                                            >
                                                <span>Dia {closingDay}</span>
                                                <span className="material-symbols-outlined text-dim group-hover/btn:text-primary transition-colors text-sm">expand_more</span>
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Vencimento</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsDueDaySheetOpen(true)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-content font-bold focus:border-primary outline-none text-left flex justify-between items-center group/btn"
                                            >
                                                <span>Dia {dueDay}</span>
                                                <span className="material-symbols-outlined text-dim group-hover/btn:text-primary transition-colors text-sm">expand_more</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <BottomSheetSelect 
                                    isOpen={isClosingDaySheetOpen}
                                    onClose={() => setIsClosingDaySheetOpen(false)}
                                    title="Dia de Fechamento"
                                    options={DAYS_OPTIONS}
                                    selectedValue={closingDay}
                                    onSelect={(val) => setClosingDay(Number(val.id))}
                                />

                                <BottomSheetSelect 
                                    isOpen={isDueDaySheetOpen}
                                    onClose={() => setIsDueDaySheetOpen(false)}
                                    title="Dia de Vencimento"
                                    options={DAYS_OPTIONS}
                                    selectedValue={dueDay}
                                    onSelect={(val) => setDueDay(Number(val.id))}
                                />

                                {(type === 'credit' || type === 'both') && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Limite Disponível</label>
                                        <div className="flex items-center gap-2 border-b border-white/10">
                                            <span className="text-dim font-bold">R$</span>
                                            <input 
                                                value={limit}
                                                onChange={e => setLimit(e.target.value)}
                                                type="number"
                                                placeholder="0,00"
                                                className="w-full bg-transparent py-2 text-content font-bold focus:ring-0 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {type === 'food' && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Valor Recarga</label>
                                            <div className="flex items-center gap-2 border-b border-white/10">
                                                <span className="text-dim font-bold">R$</span>
                                                <input 
                                                    value={rechargeValue}
                                                    onChange={e => setRechargeValue(e.target.value)}
                                                    type="number"
                                                    placeholder="0,00"
                                                    className="w-full bg-transparent py-2 text-content font-bold focus:ring-0 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-dim uppercase tracking-widest">Dia Recarga</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsRechargeDateSheetOpen(true)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-content font-bold focus:border-primary outline-none text-left flex justify-between items-center group/btn"
                                            >
                                                <span>Dia {rechargeDate}</span>
                                                <span className="material-symbols-outlined text-dim group-hover/btn:text-primary transition-colors text-sm">expand_more</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {needsLinkedAccount && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <label className={`text-[10px] font-bold uppercase tracking-widest ${validationError === 'linkedAccountId' ? 'text-red-500' : 'text-dim'}`}>
                                                Conta Vinculada *
                                            </label>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setIsLinkedAccountSheetOpen(true)}
                                            className={`w-full bg-transparent border-b py-2 text-content font-bold focus:border-primary outline-none text-left flex justify-between items-center group/btn ${validationError === 'linkedAccountId' ? 'border-red-500' : 'border-white/10'}`}
                                        >
                                            <span className={linkedAccountId ? 'text-content' : 'text-dim'}>
                                                {accounts.find(acc => String(acc.id) === String(linkedAccountId))?.name || 'Selecione uma conta...'}
                                            </span>
                                            <span className={`material-symbols-outlined text-dim group-hover/btn:text-primary transition-colors text-sm ${linkedAccountId ? 'text-primary' : ''}`}>expand_more</span>
                                        </button>
                                        {validationError === 'linkedAccountId' && (
                                            <p className="text-[10px] text-red-500 font-bold tracking-wide">Campo obrigatório para cartões deste tipo</p>
                                        )}
                                    </div>
                                )}

                                <BottomSheetSelect 
                                    isOpen={isRechargeDateSheetOpen}
                                    onClose={() => setIsRechargeDateSheetOpen(false)}
                                    title="Dia de Recarga"
                                    options={DAYS_OPTIONS}
                                    selectedValue={rechargeDate}
                                    onSelect={(val) => setRechargeDate(Number(val.id))}
                                />

                                <BottomSheetSelect
                                    isOpen={isLinkedAccountSheetOpen}
                                    onClose={() => setIsLinkedAccountSheetOpen(false)}
                                    title="Vincular Conta"
                                    options={accountOptions}
                                    selectedValue={linkedAccountId}
                                    onSelect={(val) => {
                                        if (val.id === 'NEW_ACCOUNT') {
                                            setIsLinkedAccountSheetOpen(false);
                                            setIsAddAccountModalOpen(true);
                                        } else {
                                            setLinkedAccountId(val.id.toString());
                                            setValidationError(null);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-3 mt-4">
                            <Button variant="ghost" onClick={() => { setIsAdding(false); resetForm(); setEditingCard(null); }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-primary text-secondary font-black uppercase tracking-widest">
                                Salvar Cartão
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Modal para Adicionar Nova Conta */}
                <Dialog open={isAddAccountModalOpen} onOpenChange={setIsAddAccountModalOpen}>
                    <DialogContent className="sm:max-w-md bg-surface border-border p-6 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-content uppercase tracking-widest">Nova Conta Bancária</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-4 py-4">
                             <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Nome da Conta</label>
                                <input
                                    autoFocus
                                    value={newAccountName}
                                    onChange={e => setNewAccountName(e.target.value)}
                                    placeholder="Ex: Nubank..."
                                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/20 rounded-xl px-4 py-3 font-bold text-content outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Saldo Inicial</label>
                                <input
                                    inputMode="numeric"
                                    value={newAccountBalance}
                                    onChange={handleNewAccountAmountChange}
                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 h-12 font-black text-content outline-none"
                                />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-dim uppercase mb-2 block tracking-widest">Ícone</label>
                                <button 
                                    onClick={() => setIsIconSheetOpen(true)}
                                    className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 rounded-xl text-content font-bold text-sm flex items-center gap-3 justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xl">{newAccountIcon}</span>
                                        <span className="text-dim text-xs">Alterar</span>
                                    </div>
                                    <span className="material-symbols-outlined text-dim">expand_more</span>
                                </button>
                            </div>
                        </div>
                         <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setIsAddAccountModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveNewAccount} className="bg-primary text-secondary font-bold uppercase tracking-widest">Salvar Conta</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <BottomSheetIconSelector 
                    isOpen={isIconSheetOpen}
                    onClose={() => setIsIconSheetOpen(false)}
                    title="Selecionar Ícone"
                    selectedIcon={newAccountIcon}
                    onSelect={(icon) => setNewAccountIcon(icon)}
                />

                <div className="space-y-4">
                    {cards.filter(c => c.status !== 'deleted').length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <span className="material-symbols-outlined text-4xl text-dim mb-2">add_card</span>
                            <p className="text-dim text-sm font-bold uppercase tracking-widest">Nenhum cartão cadastrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {cards.filter(c => c.status !== 'deleted').map(card => (
                                <div 
                                    key={card.id}
                                    onClick={() => handleEdit(card)}
                                    className="bg-surface p-4 rounded-2xl border border-white/5 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="size-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg"
                                            style={{ backgroundColor: card.color }}
                                        >
                                            {card.initials || card.bank.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-content">{card.alias}</h3>
                                            <p className="text-[10px] text-dim uppercase tracking-wider">{card.type === 'credit' ? 'Crédito' : card.type === 'debit' ? 'Débito' : card.type === 'both' ? 'Múltiplo' : 'Alimentação'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if(confirm('Excluir este cartão?')) deleteCard(card.id);
                                        }}
                                        className="size-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors z-10"
                                        title="Excluir cartão"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full py-6 rounded-3xl border-2 border-dashed border-dim/20 text-dim font-bold uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Adicionar Novo Cartão
                    </button>
                </div>
            </main>
        </div>
    );
};

export default CardsManagement;
