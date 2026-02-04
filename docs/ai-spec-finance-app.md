# Especificação Base – App de Controle Financeiro

Este documento descreve as regras, estruturas e dados padrão que a IA deve conhecer antes de responder a qualquer prompt relacionado ao desenvolvimento deste app.

---

## 1. Visão Geral do App

- App de **controle financeiro pessoal**, focado em entradas/saídas, cartões, contas bancárias e relatórios.
- Front-end em **React/TypeScript** com gerenciamento global via contextos (`TransactionsContext`, `NotificationsContext`, `ThemeContext`).
- Dados inicialmente salvos em `localStorage`, com plano de migração/sincronização para Google Sheets via Apps Script.
- Abas principais (TABS):
  - `Dashboard`
  - `Extrato`
  - `Relatórios`
  - `Perfil`
  - `Configurações`
  - `Importar CSV`
  - `Cartões`
  - `Contas`
  - `Notificações`

---

## 2. Entidades de Domínio

### 2.1. Transação (`Transaction`)

**Campos obrigatórios:**

| Campo         | Tipo                        | Descrição                                      |
|---------------|-----------------------------|------------------------------------------------|
| `id`          | `string`                    | Identificador único                            |
| `date`        | `string`                    | Data no formato `yyyy-MM-dd`                   |
| `amount`      | `number`                    | Valor da transação (sempre positivo)           |
| `description` | `string`                    | Descrição da transação                         |
| `category`    | `string`                    | Categoria                                      |
| `type`        | `'income' \| 'expense'`     | Tipo: receita ou despesa                       |
| `createdAt`   | `string`                    | Data/hora de criação (ISO)                     |

**Campos opcionais:**

| Campo           | Tipo     | Descrição                                       |
|-----------------|----------|-------------------------------------------------|
| `subcategory`   | `string` | Subcategoria selecionada                        |
| `paymentMethod` | `string` | `pix`, `dinheiro`, `cartao`, `transferencia`   |
| `paymentOption` | `string` | `credit` ou `debit`                            |
| `cardId`        | `string` | ID do cartão se `paymentMethod = 'cartao'`     |
| `accountId`     | `string` | ID da conta associada                          |
| `updatedAt`     | `string` | Data/hora da última atualização (ISO)          |

**Regras:**

- `type = 'income'` → soma ao saldo.
- `type = 'expense'` → subtrai do saldo, exceto despesas de cartão de crédito ainda não lançadas na conta.
- Duplicidade: transação é duplicada se tiver mesma `date`, `amount`, `description`, `category` e `type`.

---

### 2.2. Categorias e Subcategorias

**Tipos TypeScript:**

```ts
interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  subcategories: string[];
}

interface CategoryGroup {
  income: CategoryItem[];
  expense: CategoryItem[];
}

Operações no contexto:

addCategory(type, category)

updateCategory(type, id, updates)

deleteCategory(type, id)

addSubcategory(type, categoryId, subcategory)

deleteSubcategory(type, categoryId, subcategory)

2.3. Cartão (Card)
ts
interface Card {
  id: string;
  alias: string;
  type: 'credit' | 'debit' | 'both' | 'food';
  lastDigits?: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
  icon: string;
}
Operações:

addCard(card)

updateCard(id, updates)

deleteCard(id)

2.4. Conta Bancária (Account)
ts
interface Account {
  id: string;
  name: string;
  icon: string;
  balance: number;
}
Operações:

addAccount(account)

updateAccount(id, updates)

deleteAccount(id)

2.5. Perfil do Usuário
Salvo em localStorage:

finance_user_name

finance_user_email

finance_user_photo

Usado em cabeçalho e aba Perfil.

3. Dados Padrão (Default) para Conta Nova
Quando não houver dados em localStorage, o app deve inicializar com valores padrão.

3.1. Categorias de Receita (income)
ts
const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'salario', label: 'Salário', icon: 'payments', subcategories: ['Mensal', 'Adiantamento', '13º Salário'] },
  { id: 'bonus', label: 'Bônus', icon: 'workspace_premium', subcategories: ['Desempenho', 'PLR'] },
  { id: 'ferias', label: 'Férias', icon: 'beach_access', subcategories: ['Abono', 'Saldo'] },
  { id: 'pix', label: 'PIX', icon: 'account_balance', subcategories: ['Transferência', 'Recebimento'] },
  { id: 'dinheiro', label: 'Dinheiro', icon: 'attach_money', subcategories: [] },
  { id: 'comissao', label: 'Comissão', icon: 'receipt_long', subcategories: [] },
  { id: 'investimento', label: 'Investimento', icon: 'trending_up', subcategories: ['Dividendos', 'Rendimento', 'Resgate'] },
  { id: 'doacao', label: 'Doação', icon: 'volunteer_activism', subcategories: [] },
  { id: 'substituicao', label: 'Substituição', icon: 'swap_horiz', subcategories: [] },
  { id: 'outros_receitas', label: 'Outros', icon: 'more_horiz', subcategories: [] }
];
3.2. Categorias de Despesa (expense)
ts
const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  // MORADIA / CASA
  { id: 'casa', label: 'Casa', icon: 'home', subcategories: ['Aluguel', 'Condomínio', 'IPTU', 'Manutenção', 'Lote'] },
  { id: 'energia', label: 'Energia', icon: 'bolt', subcategories: ['Conta de Luz'] },
  { id: 'agua', label: 'Água', icon: 'water_drop', subcategories: ['Conta de Água'] },
  { id: 'internet', label: 'Internet', icon: 'wifi', subcategories: ['Fibra', 'Banda Larga'] },
  { id: 'celular', label: 'Celular', icon: 'smartphone', subcategories: ['Plano', 'Recarga'] },

  // TRANSPORTE
  { id: 'transporte', label: 'Transporte', icon: 'directions_car', subcategories: ['Combustível', 'Uber', 'Manutenção', 'Estacionamento', 'IPVA', 'Seguro', 'Pedágio'] },
  { id: 'carro', label: 'Carro', icon: 'directions_car', subcategories: ['Combustível', 'Manutenção', 'Seguro', 'IPVA', 'Lavagem'] },

  // ALIMENTAÇÃO
  { id: 'alimentacao', label: 'Alimentação', icon: 'restaurant', subcategories: ['Mercado', 'Restaurante', 'iFood', 'Lanche', 'Padaria'] },
  { id: 'consumo', label: 'Consumo', icon: 'shopping_cart', subcategories: ['Supermercado', 'Feira', 'Hortifruti'] },

  // SAÚDE
  { id: 'saude', label: 'Saúde', icon: 'health_and_safety', subcategories: ['Farmácia', 'Consulta', 'Exames', 'CAMED', 'Plano de Saúde'] },

  // EDUCAÇÃO
  { id: 'educacao', label: 'Educação', icon: 'school', subcategories: ['Escola', 'Faculdade', 'Cursos', 'Livros', 'Material'] },
  { id: 'escola', label: 'Escola', icon: 'school', subcategories: ['Mensalidade', 'Material', 'Uniforme', 'Transporte Escolar'] },

  // LAZER
  { id: 'lazer', label: 'Lazer', icon: 'sports_esports', subcategories: ['Cinema', 'Streaming', 'Viagem', 'Jogos', 'Eventos'] },

  // FINANCEIRAS
  { id: 'financeiras', label: 'Financeiras', icon: 'account_balance', subcategories: ['Banco', 'Tarifa', 'IOF', 'Juros', 'Cooperforte', 'Capef'] },
  { id: 'cartao', label: 'Cartão de Crédito', icon: 'credit_card', subcategories: ['Fatura', 'Anuidade', 'Parcelamento'] },

  // COMPRAS
  { id: 'compras', label: 'Compras', icon: 'shopping_bag', subcategories: ['Roupas', 'Eletrônicos', 'Cosméticos', 'Presentes'] },

  // EXTRAS
  { id: 'extras', label: 'Extras', icon: 'more_horiz', subcategories: ['Imprevistos', 'Diversos'] },
  { id: 'outros_despesas', label: 'Outros', icon: 'category', subcategories: [] }
];
3.3. Contas Bancárias Padrão
ts
const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: 'Conta Principal', icon: 'account_balance', balance: 0 },
  { id: '2', name: 'Carteira', icon: 'wallet', balance: 0 }
];
3.4. Cartões Padrão
ts
const DEFAULT_CARDS: Card[] = [];
// Cartões iniciam vazios. O usuário adiciona os seus.
3.5. Configurações Padrão
Chave	Valor Padrão
finance_currency	'BRL'
finance_user_name	''
finance_user_email	''
finance_user_photo	''
4. Estado Global e Persistência
4.1. Chaves de localStorage
Chave	Conteúdo
finance_transactions	Transaction[]
finance_categories	CategoryGroup
finance_cards	Card[]
finance_accounts	Account[]
finance_currency	'BRL' | 'USD'
finance_user_name	string
finance_user_email	string
finance_user_photo	string (URL/base64)
4.2. Regras
Não acessar localStorage direto em componentes.

Usar sempre os métodos do TransactionsContext, que já faz sync via useEffect.

5. Navegação e Abas
ts
const TABS = {
  DASHBOARD: 'Dashboard',
  EXTRATO: 'Extrato',
  RELATORIOS: 'Relatórios',
  PERFIL: 'Perfil',
  CONFIG: 'Configurações',
  IMPORT: 'Importar CSV',
  CARDS: 'Cartões',
  ACCOUNTS: 'Contas',
  NOTIFICATIONS: 'Notificações'
} as const;
activeTab controla a aba visível.

Usa history.pushState / popstate para suportar o botão voltar do navegador.

isEditMode deve ser desligado ao sair do Extrato.

6. Cálculo de Saldo
Se existirem contas com balance, o saldo atual é a soma dos balance das contas.

Caso não existam contas, usar fallback de ledger:

Encontrar transações de Saldo Inicial ou 📈 Ajuste.

Somar/subtrair transações posteriores para chegar ao saldo atual.

Despesa em cartão de crédito (paymentOption = 'credit') não debita imediatamente o saldo da conta.

7. Integração com Google Sheets (conceito)
Backend é uma planilha no Google Sheets com abas:

Transactions, Categories, Accounts, Cards.

Apps Script expõe um endpoint web com ações:

syncTransactions

syncAccounts

syncCategories

O app React faz POST de JSON para sincronizar dados.

8. Checklist para a IA
Antes de gerar código/mudanças, a IA deve verificar:

 Vai mexer em transações, categorias, contas, cartões ou cálculo de saldo?
 Vai mexer em navegação (TABS, activeTab, histórico)?
 Mantém compatibilidade com Google Sheets (colunas e tipos)?
 Usa métodos de contexto em vez de localStorage direto?
 Respeita a separação receita vs despesa?
 Trata corretamente cartão de crédito?
 Gera IDs únicos para novos registros?

Fim do documento base.