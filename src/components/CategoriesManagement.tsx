import React, { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import type { CategoryItem } from '@/contexts/TransactionsContext';
import { motion, AnimatePresence } from 'framer-motion';
import BottomSheetIconSelector from './BottomSheetIconSelector';

const CategoriesManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { availableCategories, addCategory, updateCategory, deleteCategory, addSubcategory, deleteSubcategory, renameSubcategory } = useTransactions();
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    
    // UI State
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    
    // Form States
    const [newSubcatName, setNewSubcatName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('category');
    const [editingSubcat, setEditingSubcat] = useState<string | null>(null);
    const [editingSubcatValue, setEditingSubcatValue] = useState('');
    
    // Icon Selector State
    const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false);
    const [iconSelectorTarget, setIconSelectorTarget] = useState<'new' | 'edit' | 'sub' | null>(null);
    const [selectedSubForIcon, setSelectedSubForIcon] = useState<string | null>(null);
    const [newSubcatIcon, setNewSubcatIcon] = useState('subdirectory_arrow_right');
    
    const CATEGORY_COLORS = [
        '#47f425', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
        '#06b6d4', '#10b981', '#f97316', '#a855f7', '#64748b', '#eab308'
    ];
    
    const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

    const toggleExpand = (id: string) => {
        setExpandedCategory(expandedCategory === id ? null : id);
    };

    const handleOpenEdit = (e: React.MouseEvent, cat: CategoryItem) => {
        e.stopPropagation();
        setEditingCategory(cat);
    };

    const handleSaveCategoryEdit = () => {
        if (editingCategory) {
            const updates: Partial<CategoryItem> = { 
                label: editingCategory.label, 
                icon: editingCategory.icon,
                color: editingCategory.color
            };

            // Auto-save pending subcategory if present
            if (newSubcatName.trim()) {
                // We add it to the list of subcategories to be saved
                updates.subcategories = [...(editingCategory.subcategories || []), newSubcatName.trim()];
                setNewSubcatName('');
            }

            updateCategory(activeTab, editingCategory.id, updates);
            setEditingCategory(null);
            setNewSubcatName('');
            setNewSubcatIcon('subdirectory_arrow_right');
        }
    };

    const handleAddSubcategoryInModal = () => {
        if (editingCategory && newSubcatName.trim()) {
            const subName = newSubcatName.trim();
            addSubcategory(activeTab, editingCategory.id, `${subName}:${newSubcatIcon}`);
            setNewSubcatName('');
            setNewSubcatIcon('subdirectory_arrow_right');
            setEditingCategory(prev => prev ? ({
                ...prev,
                subcategories: [...(prev.subcategories || []), { label: subName, icon: newSubcatIcon }]
            }) : null);
        }
    };

    const handleDeleteSubcategoryInModal = (sub: string | { label: string, icon: string }) => {
        if (editingCategory) {
            const subLabel = typeof sub === 'string' ? sub : sub.label;
            deleteSubcategory(activeTab, editingCategory.id, subLabel);
            setEditingCategory(prev => prev ? ({
                ...prev,
                subcategories: (prev.subcategories || []).filter(s => (typeof s === 'string' ? s : s.label) !== subLabel)
            }) : null);
        }
    };

    const handleStartRenameSubcat = (sub: string | { label: string, icon: string }) => {
        const subLabel = typeof sub === 'string' ? sub : sub.label;
        setEditingSubcat(subLabel);
        setEditingSubcatValue(subLabel);
    };

    const handleSaveRenameSubcat = (oldSub: string | { label: string, icon: string }) => {
        const oldSubLabel = typeof oldSub === 'string' ? oldSub : oldSub.label;
        const subIcon = typeof oldSub === 'string' ? 'subdirectory_arrow_right' : oldSub.icon;
        
        if (editingCategory && editingSubcatValue.trim() && editingSubcatValue !== oldSubLabel) {
            renameSubcategory(activeTab, editingCategory.id, oldSub, `${editingSubcatValue.trim()}:${subIcon}`);
            
            // Local state update for UI responsiveness
            setEditingCategory(prev => prev ? ({
                ...prev,
                subcategories: (prev.subcategories || []).map(s => {
                    const sLabel = typeof s === 'string' ? s : s.label;
                    return sLabel === oldSubLabel ? { label: editingSubcatValue.trim(), icon: subIcon } : s;
                })
            }) : null);
        }
        setEditingSubcat(null);
    };

    const handleAddNewCategory = () => {
        if (newCategoryName.trim()) {
            const newId = newCategoryName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            addCategory(activeTab, {
                id: newId,
                label: newCategoryName,
                icon: newCategoryIcon,
                color: newCategoryColor,
                subcategories: []
            });
            setNewCategoryName('');
            setNewCategoryIcon('category');
            setIsAddingCategory(false);
        }
    };

    const handleDeleteCategory = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta categoria?')) {
            deleteCategory(activeTab, id);
            setEditingCategory(null);
        }
    };

    const exportToCSV = () => {
        const headers = ['Tipo', 'Categoria', 'Ícone', 'Subcategorias'];
        const rows = [...availableCategories.expense.map(c => [
            'Despesa', 
            c.label, 
            c.icon, 
            (c.subcategories || []).map(s => typeof s === 'string' ? s : s.label).join(' | ')
        ]),
                      ...availableCategories.income.map(c => [
            'Receita', 
            c.label, 
            c.icon, 
            (c.subcategories || []).map(s => typeof s === 'string' ? s : s.label).join(' | ')
        ])];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `categorias_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full bg-background p-4 md:p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack}
                    className="size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-content">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight">Categorias</h1>
                    <p className="text-dim text-xs font-medium">Gerencie suas categorias</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="size-11 rounded-2xl bg-primary text-secondary flex items-center justify-center shadow-glow active:scale-90 transition-all font-bold"
                    title="Exportar CSV"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-surface rounded-2xl mb-6 shadow-sm border border-black/5 dark:border-white/5">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'expense' 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                            : 'text-dim hover:text-content'
                    }`}
                >
                    Despesas
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'income' 
                            ? 'bg-primary text-secondary shadow-lg shadow-primary/20' 
                            : 'text-dim hover:text-content'
                    }`}
                >
                    Receitas
                </button>
            </div>

            {/* Subtitle */}
            <h3 className="text-xs font-bold text-dim uppercase tracking-widest mb-4 px-1">Principais</h3>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 custom-scrollbar">
                {availableCategories[activeTab].map(cat => (
                    <div 
                        key={cat.id} 
                        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden transition-all hover:shadow-md"
                    >
                        {/* Card Header */}
                        <div 
                            onClick={() => toggleExpand(cat.id)}
                            className="p-4 flex items-center justify-between cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                {/* Icon */}
                                <div className={`size-12 rounded-2xl flex items-center justify-center shadow-sm ${
                                    activeTab === 'income' 
                                        ? 'bg-green-100 dark:bg-primary/10 text-green-600 dark:text-primary' 
                                        : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'
                                }`}>
                                    <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                                </div>
                                
                                {/* Name & Subcategory Count */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-base text-content">{cat.label}</h4>
                                        <button 
                                            onClick={(e) => handleOpenEdit(e, cat)}
                                            className="p-1 text-dim hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">edit</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-dim">
                                        {cat.subcategories?.length 
                                            ? `${cat.subcategories.length} subcategorias` 
                                            : 'Sem subcategorias'}
                                    </p>
                                </div>
                            </div>

                            {/* Expand Icon */}
                            <span className={`material-symbols-outlined text-dim transition-transform duration-300 ${
                                expandedCategory === cat.id ? 'rotate-180' : ''
                            }`}>
                                expand_more
                            </span>
                        </div>

                        {/* Expandable Subcategories */}
                        <AnimatePresence>
                            {expandedCategory === cat.id && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-black/5"
                                >
                                    <div className="p-4 space-y-2">
                                        {cat.subcategories && cat.subcategories.length > 0 ? (
                                            cat.subcategories.map((sub, idx) => {
                                                const subLabel = typeof sub === 'string' ? sub : sub.label;
                                                const subIcon = typeof sub === 'string' ? 'subdirectory_arrow_right' : sub.icon;
                                                return (
                                                    <div 
                                                        key={`${subLabel}-${idx}`} 
                                                        className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/50 rounded-xl border border-black/5 dark:border-white/5"
                                                    >
                                                        <span className="material-symbols-outlined text-dim text-sm">{subIcon}</span>
                                                        <span className="text-sm font-medium text-content flex-1">{subLabel}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center text-xs text-dim py-2">Nenhuma subcategoria cadastrada</p>
                                        )}
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(e, cat);
                                            }}
                                            className="w-full py-3 mt-2 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold uppercase hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">add_circle</span>
                                            Gerenciar Subcategorias
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {/* Add New Category Button */}
                <button 
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full py-4 rounded-3xl border-2 border-dashed border-dim/20 text-dim font-bold uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 mt-4"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Adicionar Categoria
                </button>
            </div>

            {/* Edit Category Modal */}
            <AnimatePresence>
                {editingCategory && (
                    <div 
                        onClick={() => setEditingCategory(null)}
                        className="fixed inset-0 z-5000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div 
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-black text-content uppercase tracking-wider">Editar Categoria</h3>
                                <button 
                                    onClick={() => setEditingCategory(null)} 
                                    className="text-dim hover:text-content transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* Category Name & Icon */}
                                <div className="flex gap-4 items-start">
                                    <div className={`size-14 rounded-2xl flex items-center justify-center shadow-lg ${
                                        activeTab === 'income' 
                                            ? 'bg-green-500 dark:bg-primary text-white dark:text-secondary' 
                                            : 'bg-red-500 text-white'
                                    }`}>
                                        <span className="material-symbols-outlined text-2xl">{editingCategory.icon}</span>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-dim uppercase tracking-wider">Nome da Categoria</label>
                                        <input
                                            value={editingCategory.label}
                                            onChange={e => setEditingCategory({...editingCategory, label: e.target.value})}
                                            className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary outline-none font-bold text-lg text-content py-1 transition-colors"
                                            placeholder="Ex: Alimentação"
                                        />
                                    </div>
                                </div>

                                {/* Icon Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-wider">Ícone</label>
                                    <button
                                        onClick={() => {
                                            setIconSelectorTarget('edit');
                                            setIsIconSelectorOpen(true);
                                        }}
                                        className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between group transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-content">{editingCategory.icon}</span>
                                            <span className="text-sm font-medium text-content">{editingCategory.icon}</span>
                                        </div>
                                        <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                    </button>
                                </div>

                                {/* Color Selector */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-wider">Cor da Categoria</label>
                                    <div className="flex flex-wrap gap-3">
                                        {CATEGORY_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setEditingCategory({ ...editingCategory, color })}
                                                className={`size-8 rounded-full transition-all ${editingCategory.color === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Subcategories Manager */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-dim uppercase tracking-wider">Subcategorias</label>
                                    
                                    {/* Add Subcategory Input */}
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                setIconSelectorTarget('sub');
                                                setIsIconSelectorOpen(true);
                                            }}
                                            className="size-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-dim hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined">{newSubcatIcon}</span>
                                        </button>
                                        <input
                                            value={newSubcatName}
                                            onChange={e => setNewSubcatName(e.target.value)}
                                            placeholder="Nova subcategoria..."
                                            className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl px-4 py-2 text-sm font-medium text-content outline-none focus:ring-2 ring-primary/50"
                                            onKeyDown={e => e.key === 'Enter' && handleAddSubcategoryInModal()}
                                        />
                                        <button 
                                            onClick={handleAddSubcategoryInModal}
                                            className="size-10 rounded-xl bg-primary text-secondary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>

                                    {/* Subcategories List */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {editingCategory.subcategories && editingCategory.subcategories.length > 0 ? (
                                            editingCategory.subcategories.map((sub, idx) => {
                                                const subLabel = typeof sub === 'string' ? sub : sub.label;
                                                const subIcon = typeof sub === 'string' ? 'subdirectory_arrow_right' : sub.icon;
                                                
                                                return (
                                                    <div 
                                                        key={`${subLabel}-${idx}`} 
                                                        className="flex items-center justify-between p-3 bg-surface dark:bg-zinc-800 rounded-xl border border-black/5 dark:border-white/5 group"
                                                    >
                                                        {editingSubcat === subLabel ? (
                                                            <input 
                                                                autoFocus
                                                                value={editingSubcatValue}
                                                                onChange={e => setEditingSubcatValue(e.target.value)}
                                                                onBlur={() => handleSaveRenameSubcat(sub)}
                                                                onKeyDown={e => e.key === 'Enter' && handleSaveRenameSubcat(sub)}
                                                                className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1 text-sm font-medium outline-none border border-primary/30"
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setSelectedSubForIcon(subLabel);
                                                                            setIconSelectorTarget('sub');
                                                                            setIsIconSelectorOpen(true);
                                                                        }}
                                                                        className="size-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-dim hover:text-primary transition-colors flex-shrink-0"
                                                                    >
                                                                        <span className="material-symbols-outlined text-base">{subIcon}</span>
                                                                    </button>
                                                                    <span className="text-sm font-medium text-content truncate">{subLabel}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button 
                                                                        onClick={() => handleStartRenameSubcat(sub)}
                                                                        className="size-8 rounded-lg text-dim hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteSubcategoryInModal(sub)}
                                                                        className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center text-xs text-dim py-4">Nenhuma subcategoria ainda</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-black/5 dark:border-white/5 flex gap-3">
                                <button 
                                    onClick={() => {
                                        handleDeleteCategory(editingCategory.id);
                                    }}
                                    className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                                <button 
                                    onClick={handleSaveCategoryEdit}
                                    className="flex-1 py-3 rounded-xl bg-primary text-secondary font-black uppercase tracking-widest hover:brightness-110 shadow-glow transition-all"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add New Category Modal */}
            <AnimatePresence>
                {isAddingCategory && (
                    <div className="fixed inset-0 z-5000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl space-y-6"
                        >
                            <h3 className="text-xl font-black text-content">Nova Categoria</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-dim uppercase">Nome</label>
                                    <input
                                        autoFocus
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="w-full bg-transparent border-b border-content/20 py-2 text-lg font-bold text-content outline-none focus:border-primary transition-colors"
                                        placeholder="Ex: Assinaturas"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dim uppercase">Ícone</label>
                                    <button 
                                        onClick={() => {
                                            setIconSelectorTarget('new');
                                            setIsIconSelectorOpen(true);
                                        }}
                                        className="w-full flex items-center gap-4 mt-2 bg-transparent border-b border-content/20 py-2 group hover:border-primary transition-colors"
                                    >
                                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined">{newCategoryIcon || 'category'}</span>
                                        </div>
                                        <span className="flex-1 text-left text-sm text-content font-medium">{newCategoryIcon || 'Selecionar ícone...'}</span>
                                        <span className="material-symbols-outlined text-dim group-hover:text-primary transition-colors">expand_more</span>
                                    </button>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold text-dim uppercase">Cor</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {CATEGORY_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCategoryColor(color)}
                                                className={`size-6 rounded-full transition-all ${newCategoryColor === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setIsAddingCategory(false)}
                                    className="flex-1 py-3 text-dim font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAddNewCategory}
                                    className="flex-1 py-3 bg-primary text-secondary font-bold rounded-xl shadow-glow hover:brightness-110 transition-all"
                                >
                                    Criar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BottomSheetIconSelector 
                isOpen={isIconSelectorOpen}
                onClose={() => setIsIconSelectorOpen(false)}
                title="Selecionar Ícone"
                selectedIcon={
                    iconSelectorTarget === 'new' 
                        ? newCategoryIcon 
                        : (iconSelectorTarget === 'sub' 
                            ? (selectedSubForIcon 
                                ? (typeof editingCategory?.subcategories.find(s => (typeof s === 'string' ? s : s.label) === selectedSubForIcon) === 'object' 
                                    ? (editingCategory?.subcategories.find(s => (typeof s === 'string' ? s : s.label) === selectedSubForIcon) as any).icon 
                                    : 'subdirectory_arrow_right')
                                : newSubcatIcon)
                            : (editingCategory?.icon || 'category'))
                }
                onSelect={(icon) => {
                    if (iconSelectorTarget === 'new') {
                        setNewCategoryIcon(icon);
                    } else if (iconSelectorTarget === 'sub') {
                        if (selectedSubForIcon && editingCategory) {
                            // Update icon for existing subcategory
                            const sub = editingCategory.subcategories.find(s => (typeof s === 'string' ? s : s.label) === selectedSubForIcon);
                            if (sub) {
                                const subLabel = typeof sub === 'string' ? sub : sub.label;
                                renameSubcategory(activeTab, editingCategory.id, sub, `${subLabel}:${icon}`);
                                setEditingCategory({
                                    ...editingCategory,
                                    subcategories: editingCategory.subcategories.map(s => 
                                        (typeof s === 'string' ? s : s.label) === selectedSubForIcon ? { label: subLabel, icon } : s
                                    )
                                });
                            }
                            setSelectedSubForIcon(null);
                        } else {
                            // Setting icon for new subcategory to be added
                            setNewSubcatIcon(icon);
                        }
                    } else if (editingCategory) {
                        setEditingCategory({ ...editingCategory, icon });
                    }
                    setIsIconSelectorOpen(false);
                }}
            />
        </div>
    );
};

export default CategoriesManagement;
