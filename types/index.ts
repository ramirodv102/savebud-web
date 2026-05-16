// All shared TypeScript types for SaveBud

export type PaymentMethod = {
  id: string;
  name: string;           // "Mercado Pago", "Efectivo", etc.
  icon: string;           // emoji for V1; key into asset map in V2
  color: string;          // hex brand color
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string;           // emoji
  color: string;
  monthlyBudget: number | null; // null = no per-category budget
  archived: boolean;
};

export type Expense = {
  id: string;
  amount: number;         // integer ARS, no cents
  paymentMethodId: string;
  categoryId: string;
  date: string;           // ISO date string "2024-05-15"
  note?: string;
  createdAt: string;      // ISO datetime string
  source: 'manual' | 'receipt_ai'; // always 'manual' in V1; 'receipt_ai' reserved for V2
};

export type Settings = {
  totalMonthlyBudget: number;
  currency: 'ARS';
  onboardingComplete: boolean;
};

// Derived stats — computed at render time from expenses, never stored in state
export type MonthStats = {
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  paceRatio: number;
  dailyAverage: number;
  expenseCount: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
};

// Public contract for all data access.
// Swap the implementation in store/repository.ts without touching any screen.
export interface Repository {
  getExpenses(): Promise<Expense[]>;
  addExpense(e: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
  updateExpense(id: string, patch: Partial<Expense>): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  upsertPaymentMethod(pm: PaymentMethod): Promise<void>;
  deletePaymentMethod(id: string): Promise<void>;

  getCategories(): Promise<Category[]>;
  upsertCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<void>;

  exportAllData(): Promise<string>;
  importAllData(json: string): Promise<void>;
  clearAllData(): Promise<void>;
}
