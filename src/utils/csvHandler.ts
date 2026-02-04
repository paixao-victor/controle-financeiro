import Papa from 'papaparse';
import type { Transaction, TransactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { parse, isValid, format } from 'date-fns';

export interface CSVRow {
    [key: string]: any;
}

export interface ParseResult {
    data: Transaction[];
    errors: string[];
    meta: {
        totalRows: number;
        validRows: number;
    };
}

// Mapeamento de Colunas Flexível (PT-BR / EN)
const COLUMN_MAP: Record<string, string[]> = {
    category: ['category', 'categoria', 'cat'],
    subcategory: ['subcategory', 'subcategoria', 'sub'],
    amount: ['amount', 'valor', 'valor pago', 'valor previsto', 'preço', 'custo'],
    date: ['date', 'data', 'data do pagamento', 'data do vencimento', 'dia'],
    description: ['description', 'descrição', 'comentário', 'obs', 'detalhes'],
    type: ['type', 'tipo', 'natureza'],
    isRecurring: ['isrecurring', 'recorrente', 'repetir'],
    recurrenceRule: ['recurrencerule', 'regra de recorrência', 'frequência']
};

const findValue = (row: CSVRow, field: string): any => {
    const possibleKeys = COLUMN_MAP[field];
    if (!possibleKeys) return undefined;

    for (const key of possibleKeys) {
        // Busca exata (case insensitive)
        const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key);
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
            return row[foundKey];
        }
    }
    return undefined;
};

export const validateRow = (row: CSVRow): { isValid: boolean; error?: string; normalized?: Partial<Transaction> } => {
    // 1. Extração de Dados usando Mapeamento
    const rawCategory = findValue(row, 'category');
    const rawSubcategory = findValue(row, 'subcategory');
    const rawAmount = findValue(row, 'amount');
    const rawDate = findValue(row, 'date');
    const rawType = findValue(row, 'type');
    const rawDesc = findValue(row, 'description');
    const rawRecurring = findValue(row, 'isRecurring');

    // 2. Validação de Campos Obrigatórios
    if (!rawCategory) return { isValid: false, error: 'Categoria não encontrada' };
    if (!rawAmount) return { isValid: false, error: 'Valor não encontrado' };
    if (!rawDate) return { isValid: false, error: 'Data não encontrada' };

    // 3. Normalização de Tipo
    // Se não tiver coluna 'tipo', tentamos inferir ou assumimos 'expense' (comum em extratos bancários/planilhas de gastos)
    let type: TransactionType = 'expense';
    if (rawType) {
        const t = String(rawType).toLowerCase().trim();
        if (t === 'income' || t === 'receita' || t === 'entrada' || t === 'crédito') type = 'income';
    } else {
        // Inferência básica: Categoria "Salário" ou "Investimento" -> Income ?
        // Melhor manter padrão expense para segurança, ou verificar sinal do valor se for planilha bancária
    }

    // 4. Normalização de Valor
    let amountStr = String(rawAmount).replace('R$', '').trim();
    // Se formato brasileiro (1.000,00), converter para (1000.00)
    if (amountStr.includes(',') && !amountStr.includes('.')) {
        amountStr = amountStr.replace('.', '').replace(',', '.'); // 1.200,50 -> 1200.50
    } else if (amountStr.includes('.') && amountStr.includes(',')) {
        // Formato misto complicado, assumir padrao PT-BR se tiver virgula no fim
        if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
            amountStr = amountStr.replace('.', '').replace(',', '.');
        }
    }

    let amount = parseFloat(amountStr);
    if (isNaN(amount)) return { isValid: false, error: `Valor inválido: ${rawAmount}` };

    // Se o valor for negativo na planilha, transformamos em positivo e garantimos que é Expense?
    // Ou respeitamos o sinal? Geralmente app financeiro guarda valor absoluto + tipo.
    if (amount < 0) {
        type = 'expense';
        amount = Math.abs(amount);
    }

    // 5. Normalização de Data
    let dateObj: Date | null = null;
    const dateStr = String(rawDate).trim();

    // Tenta DD-MM-YYYY ou DD/MM/YYYY (PT-BR)
    if (dateStr.match(/^\d{2}[-/]\d{2}[-/]\d{4}$/)) {
        dateObj = parse(dateStr.replace(/-/g, '/'), 'dd/MM/yyyy', new Date());
    }
    // Tenta YYYY-MM-DD (ISO)
    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateObj = parse(dateStr, 'yyyy-MM-dd', new Date());
    }

    if (!dateObj || !isValid(dateObj)) {
        return { isValid: false, error: `Data inválida (esperado DD/MM/AAAA ou AAAA-MM-DD): ${rawDate}` };
    }

    const formattedDate = format(dateObj, 'yyyy-MM-dd');

    // 6. Recorrência (Sim/Não/Yes/No)
    let isRecurring = false;
    if (rawRecurring) {
        const r = String(rawRecurring).toLowerCase().trim();
        isRecurring = r === 'sim' || r === 'yes' || r === 's' || r === 'true';
    }

    return {
        isValid: true,
        normalized: {
            id: uuidv4(),
            type,
            category: String(rawCategory).trim(),
            subcategory: rawSubcategory ? String(rawSubcategory).trim() : null,
            amount,
            date: formattedDate,
            description: rawDesc ? String(rawDesc).trim() : null,
            isRecurring,
            recurrenceRule: null, // Deixar null por enquanto a menos que venha explicito
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };
};

export const parseCSV = (file: File): Promise<ParseResult> => {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8", // Tentar forçar UTF-8, mas papaparse geralmente detecta
            complete: (results) => {
                const errors: string[] = [];
                const transactions: Transaction[] = [];

                results.data.forEach((row: any, index) => {
                    // Pular linhas vazias disfarçadas (objetos vazios ou só com indices)
                    if (Object.keys(row).length < 2) return;

                    const validation = validateRow(row);
                    if (validation.isValid && validation.normalized) {
                        transactions.push(validation.normalized as Transaction);
                    } else {
                        // Só reportar erro se a linha parecer ter conteúdo relevante
                        if (Object.values(row).some(v => v)) {
                            errors.push(`Linha ${index + 2}: ${validation.error}`); //  - Dados: ${JSON.stringify(row)}
                        }
                    }
                });

                resolve({
                    data: transactions,
                    errors,
                    meta: {
                        totalRows: results.data.length,
                        validRows: transactions.length
                    }
                });
            },
            error: (error) => {
                resolve({
                    data: [],
                    errors: [error.message],
                    meta: { totalRows: 0, validRows: 0 }
                });
            }
        });
    });
};

export const exportCSV = (transactions: Transaction[]) => {
    // Exportar mantendo padrão interno ou PT-BR? 
    // Vamos manter padrão ISO para reimportação fácil, mas com headers claros
    const csv = Papa.unparse(transactions.map(t => ({
        // Mapear para headers amigáveis PT-BR na exportação também?
        // Ou manter consistência com o que aceitamos na importação.
        // Vamos usar IDs internos para garantir robustez, mas user pode querer PT-BR.
        // Por consistência técnica, mantemos chaves em inglês, user pode renomear no Excel se quiser.
        id: t.id,
        type: t.type,
        category: t.category,
        subcategory: t.subcategory,
        amount: t.amount,
        date: t.date,
        description: t.description,
        isRecurring: t.isRecurring ? 'yes' : 'no',
        recurrenceRule: t.recurrenceRule,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fincontrol_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportCardsCSV = (cards: any[]) => {
    const csv = Papa.unparse(cards.map(c => ({
        id: c.id,
        alias: c.alias,
        bank: c.bank,
        type: c.type,
        limit: c.limit,
        closingDay: c.closingDay,
        dueDay: c.dueDay,
        color: c.color,
        initials: c.initials || ''
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cartoes_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportJSON = (data: any, fileName: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${format(new Date(), 'dd-MM-yyyy')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
